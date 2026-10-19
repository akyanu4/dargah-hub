/* Sends one push alert to everyone who turned on offer alerts (OneSignal).
   Only a signed-in Dargah Hub admin can call it: the caller's Firebase sign-in token is checked by reading their own
   admins/<uid> document through Firestore (the security rules allow that read only for the admin themself).
   Secrets live in Vercel environment variables, never in the code:
     ONESIGNAL_APP_ID   the OneSignal App ID
     ONESIGNAL_API_KEY  the OneSignal REST API key
     SITE_URL           optional, defaults to https://dargah-hub.vercel.app */
const { clean, adminCheck, sendPush } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  if (!clean(process.env.ONESIGNAL_APP_ID) || !clean(process.env.ONESIGNAL_API_KEY)) return res.status(503).json({ error: 'Alerts are not set up yet. Add ONESIGNAL_APP_ID and ONESIGNAL_API_KEY in Vercel settings, then redeploy.' });
  const a = await adminCheck(req);
  if (!a.ok) return res.status(a.status).json({ error: a.status === 403 ? 'Only the Dargah Hub admin can send alerts.' : a.error });
  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  const title = String((b && b.title) || '').trim().slice(0, 60), message = String((b && b.message) || '').trim().slice(0, 150);
  if (!title || !message) return res.status(400).json({ error: 'Add a title and a message.' });
  const r = await sendPush(title, message, '/#/offers');
  if (!r.id) return res.status(r.status || 502).json({ error: r.error });
  return res.status(200).json({ ok: true, id: r.id });
};
