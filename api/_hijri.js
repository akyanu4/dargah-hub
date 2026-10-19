/* Reads event dates such as "5 Rajab", "16, 17 and 18 Shawwal" or "11th monthly" and works out which Hijri day a date falls on.
   The same rules as the app (js/engage.js), so the alerts agree with the Upcoming page. Dates follow the Umm al-Qura calendar and can differ by a day with moon sighting. */
const MONTH_RX = [
  [/muharram|moharram/, 1], [/safar/, 2], [/rabi\W*(ul|al|u)?\W*(awwal|awal|auwal|1|i)\b/, 3], [/rabi\W*(ul|al|u)?\W*(thani|sani|akhir|akhir|2|ii)\b/, 4],
  [/jumad\w*\W*(ul|al|u)?\W*(ula|ola|awwal|awal|1|i)\b/, 5], [/jumad\w*\W*(ul|al|u)?\W*(akhir\w*|thani|sani|ukhra|2|ii)\b/, 6],
  [/rajab/, 7], [/sha\W?ban|shaban/, 8], [/ramadan|ramzan|ramazan/, 9], [/shawwal|shawal/, 10],
  [/(dhu|zu|zil|zul)\W*(al|ul|l)?\W*qa\W?d/, 11], [/(dhu|zu|zil|zul)\W*(al|ul|l)?\W*hij/, 12]
];
const WD = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function parseWhen(text) {
  const s = String(text || '').toLowerCase().replace(/[’'`ʼʿ]/g, '').replace(/-/g, ' ');
  let mo = 0, mi = -1, m;
  for (let i = 0; i < MONTH_RX.length; i++) { m = MONTH_RX[i][0].exec(s); if (m) { mo = MONTH_RX[i][1]; mi = m.index; break; } }
  const nums = (str) => { const out = [], r = /\b(\d{1,2})(?:st|nd|rd|th)?\b/g; let x; while ((x = r.exec(str))) { const n = +x[1]; if (n >= 1 && n <= 30) out.push(n); } return out; };
  if (mo) {
    let days = nums(s.slice(0, mi)); if (!days.length) days = nums(s.slice(mi));
    return days.length ? { kind: 'h', month: mo, days: days.slice(0, 4) } : null;
  }
  if (/monthly|every month|each month/.test(s)) { const n = nums(s); return n.length ? { kind: 'm', days: [n[0]] } : null; }
  for (let w = 0; w < 7; w++) if (s.indexOf(WD[w]) >= 0) return { kind: 'w', wd: w };
  return null;
}

let fmt = null;
let AUTO = true;
let OFFSET = 0; // days the moon-sighted calendar is ahead (+) or behind (-) Umm al-Qura
const setMode = (auto, n) => { AUTO = auto !== false; setOffset(n); };
const setOffset = (n) => { n = parseInt(n, 10); OFFSET = isNaN(n) ? 0 : Math.max(-2, Math.min(2, n)); };
/* dateUtcNoon: a Date at 12:00 UTC on the calendar day wanted. */
function hijriOf(dateUtcNoon) {
  if (AUTO) { try { const a = require('../js/moonsight.js').hijriOfDay(Math.floor(dateUtcNoon.getTime() / 86400000)); if (a) return { d: a.d, m: a.m }; } catch (e) { /* fall back to Umm al-Qura */ } }
  try {
    fmt = fmt || new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' });
    const o = {}; fmt.formatToParts(OFFSET ? new Date(dateUtcNoon.getTime() + OFFSET * 86400000) : dateUtcNoon).forEach((x) => { if (x.type !== 'literal') o[x.type] = parseInt(x.value, 10); });
    return o.month && o.day ? { d: o.day, m: o.month } : null;
  } catch (e) { return null; }
}
function matches(p, dateUtcNoon) {
  if (!p) return false;
  if (p.kind === 'w') return dateUtcNoon.getUTCDay() === p.wd;
  const h = hijriOf(dateUtcNoon);
  return !!h && p.days.indexOf(h.d) >= 0 && (p.kind === 'm' || h.m === p.month);
}
/* The calendar day in India (UTC+5:30) right now, as a Date at 12:00 UTC. */
function istDay(nowMs) {
  const t = new Date((nowMs == null ? Date.now() : nowMs) + 5.5 * 3600 * 1000);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 12));
}
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const ymd = (d) => d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');

module.exports = { setMode, setOffset, parseWhen, hijriOf, matches, istDay, addDays, ymd };
