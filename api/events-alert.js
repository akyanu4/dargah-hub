/* Automatic alerts, run once a day by Vercel Cron (see vercel.json, 10:00 India time):
     1. The day before an Urs or special event listed on a dargah page ("Urs tomorrow").
     2. On Thursday, when approved offers for the new week exist ("New offers this week").
   It can also be called by a signed-in admin to preview (dry run) or send now.
   Secrets are Vercel environment variables, never in the code:
     CRON_SECRET        any long random text; Vercel sends it with the daily call
     ONESIGNAL_APP_ID, ONESIGNAL_API_KEY   as for the manual alerts
     ALERT_MONTHLY      set to 1 to also alert the day before each monthly Gyarvi (off by default, it is frequent) */
const crypto = require('crypto');
const { adminCheck, sendPush, runQuery, eq, siteUrl } = require('./_lib');
const { parseWhen, matches, istDay, addDays, ymd } = require('./_hijri');

const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

async function loadDargahs() {
  const out = {};
  try {
    const idx = await (await fetch(siteUrl() + '/data/dargahs/index.json')).json();
    for (const id of Array.isArray(idx) ? idx : []) {
      try { const g = await (await fetch(siteUrl() + '/data/dargahs/' + encodeURIComponent(id) + '.json')).json(); if (g && !g.sample) out[id] = { id, name: g.name, events: g.events || [] }; } catch (e) { /* skip one bad file */ }
    }
  } catch (e) { /* the site list is optional */ }
  try {
    (await runQuery('dargahs', [eq('hidden', false)], 300)).forEach((g) => {
      if (/^test[-\s]/i.test(String(g.name || ''))) return;   // test pages never alert
      out['fs-' + g.id] = { id: g.id, name: g.name, events: Array.isArray(g.events) ? g.events : [] };
    });
  } catch (e) { /* Firestore optional */ }
  return Object.values(out);
}

/* Which events fall on the target day. */
function dueEvents(dargahs, target, monthly) {
  const due = [];
  dargahs.forEach((g) => (g.events || []).forEach((e) => {
    const p = parseWhen(e && e.when); if (!p || p.kind === 'w' || (p.kind === 'm' && !monthly)) return;
    if (matches(p, target)) due.push({ dargah: g.name, title: String((e && e.title) || 'Event'), when: String(e.when || '') });
  }));
  return due;
}
function eventMessage(due, label) {
  if (!due.length) return null;
  const first = due[0], rest = due.length - 1;
  const title = (due.length === 1 ? first.title : 'Urs and events') + ' ' + label;
  let msg = first.title + ' at ' + first.dargah + (rest ? ' and ' + rest + ' more' : '') + '. Dates follow moon sighting.';
  return { title: title.slice(0, 60), message: msg.slice(0, 150) };
}

async function plan(nowMs, opts) {
  opts = opts || {};
  const today = istDay(nowMs), ahead = opts.days == null ? 1 : opts.days, target = addDays(today, ahead);
  const label = ahead === 0 ? 'today' : ahead === 1 ? 'tomorrow' : 'in ' + ahead + ' days';
  const items = [];
  const due = dueEvents(await loadDargahs(), target, opts.monthly);
  const em = eventMessage(due, label);
  if (em) items.push({ kind: 'events', title: em.title, message: em.message, path: '/#/upcoming', count: due.length });
  if (today.getUTCDay() === 4 && !opts.skipOffers) {
    try {
      const offers = await runQuery('offers', [eq('status', 'approved'), eq('week', ymd(today))], 200);
      const shops = new Set(offers.map((o) => o.vendorId)).size;
      if (shops) items.push({ kind: 'offers', title: 'New offers this week', message: shops + ' shop' + (shops === 1 ? ' has' : 's have') + ' offers until next Thursday. Tap to see them.', path: '/#/offers', count: shops });
    } catch (e) { /* no offers alert if they cannot be read */ }
  }
  return { day: ymd(today), target: ymd(target), items };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Use GET or POST.' });
  const bearer = (/^Bearer (.+)$/.exec(req.headers.authorization || '') || [])[1] || '';
  const secret = process.env.CRON_SECRET;
  let admin = false;
  if (!(secret && bearer && same(bearer, secret))) {
    const a = await adminCheck(req); if (!a.ok) return res.status(a.status).json({ error: a.error }); admin = true;
  }
  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  const q = req.query || {};
  const dry = admin && (b.dry === true || q.dry === '1');
  const days = admin && b.days != null ? Math.max(0, Math.min(7, parseInt(b.days, 10) || 0)) : 1;
  const p = await plan(Date.now(), { days, monthly: process.env.ALERT_MONTHLY === '1' });
  if (dry) return res.status(200).json({ dry: true, ...p });
  const results = [];
  for (const it of p.items) {
    const r = await sendPush(it.title, it.message, it.path);
    results.push({ kind: it.kind, title: it.title, ok: !!r.id, error: r.error || null });
  }
  return res.status(200).json({ dry: false, day: p.day, target: p.target, sent: results });
};
module.exports.plan = plan; module.exports.dueEvents = dueEvents; module.exports.eventMessage = eventMessage;
