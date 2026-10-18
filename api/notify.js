/* Sends one push alert to everyone who turned on offer alerts (OneSignal).
   Only a signed-in Dargah Hub admin can call it: the caller's Firebase sign-in token is checked by reading their own
   admins/<uid> document through Firestore (the security rules allow that read only for the admin themself).
   Secrets live in Vercel environment variables, never in the code:
     ONESIGNAL_APP_ID   the OneSignal App ID
     ONESIGNAL_API_KEY  the OneSignal REST API key
     SITE_URL           optional, defaults to https://dargah-hub.vercel.app */
const PROJECT = 'siddiqgulshan-25903';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  const clean = (v) => String(v || '').replace(/[\s"']/g, '');
  const appId = clean(process.env.ONESIGNAL_APP_ID), key = clean(process.env.ONESIGNAL_API_KEY);
  if (!appId || !key) return res.status(503).json({ error: 'Alerts are not set up yet. Add ONESIGNAL_APP_ID and ONESIGNAL_API_KEY in Vercel settings, then redeploy.' });
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) return res.status(401).json({ error: 'Please sign in again.' });
  let uid;
  try { uid = JSON.parse(Buffer.from(m[1].split('.')[1], 'base64url').toString()).user_id; } catch (e) { uid = ''; }
  if (!uid || !/^[A-Za-z0-9_-]{6,128}$/.test(uid)) return res.status(401).json({ error: 'Please sign in again.' });
  try {
    const chk = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/admins/${uid}`, { headers: { Authorization: 'Bearer ' + m[1] } });
    if (chk.status !== 200) return res.status(403).json({ error: 'Only the Dargah Hub admin can send alerts.' });
  } catch (e) { return res.status(502).json({ error: 'Could not check your admin access. Try again.' }); }
  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  const title = String((b && b.title) || '').trim().slice(0, 60), message = String((b && b.message) || '').trim().slice(0, 150);
  if (!title || !message) return res.status(400).json({ error: 'Add a title and a message.' });
  const site = (process.env.SITE_URL || 'https://dargah-hub.vercel.app').replace(/\/$/, '');
  try {
    const r = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Key ' + key },
      body: JSON.stringify({ app_id: appId, target_channel: 'push', included_segments: ['Subscribed Users'], headings: { en: title }, contents: { en: message }, url: site + '/#/offers' })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: (j.errors && JSON.stringify(j.errors).slice(0, 200)) || 'OneSignal refused the alert.' });
    if (!j.id) return res.status(409).json({ error: 'OneSignal accepted the request but nobody received it. No phone is subscribed yet, or the subscription is not active. Turn on alerts on the phone first.' });
    return res.status(200).json({ ok: true, id: j.id });
  } catch (e) { return res.status(502).json({ error: 'Could not reach OneSignal. Try again.' }); }
};
