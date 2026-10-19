/* Shared helpers for the alert functions. Files that start with an underscore are not public endpoints. */
const PROJECT = 'siddiqgulshan-25903';
const clean = (v) => String(v || '').replace(/[\s"']/g, '');

/* Is the caller a signed-in Dargah Hub admin? Reads admins/<uid> with the caller's own Firebase token. */
async function adminCheck(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) return { ok: false, status: 401, error: 'Please sign in again.' };
  let uid;
  try { uid = JSON.parse(Buffer.from(m[1].split('.')[1], 'base64url').toString()).user_id; } catch (e) { uid = ''; }
  if (!uid || !/^[A-Za-z0-9_-]{6,128}$/.test(uid)) return { ok: false, status: 401, error: 'Please sign in again.' };
  try {
    const chk = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/admins/${uid}`, { headers: { Authorization: 'Bearer ' + m[1] } });
    if (chk.status !== 200) return { ok: false, status: 403, error: 'Only the Dargah Hub admin can do this.' };
  } catch (e) { return { ok: false, status: 502, error: 'Could not check your admin access. Try again.' }; }
  return { ok: true, uid };
}

const siteUrl = () => (process.env.SITE_URL || 'https://dargah-hub.vercel.app').replace(/\/$/, '');

/* Sends one push to everyone subscribed. Returns { id } on success or { error, status }. */
async function sendPush(title, message, path) {
  const appId = clean(process.env.ONESIGNAL_APP_ID), key = clean(process.env.ONESIGNAL_API_KEY);
  if (!appId || !key) return { status: 503, error: 'Alerts are not set up yet. Add ONESIGNAL_APP_ID and ONESIGNAL_API_KEY in Vercel settings, then redeploy.' };
  const send = async (segment) => {
    const r = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Key ' + key },
      body: JSON.stringify({ app_id: appId, target_channel: 'push', included_segments: [segment], headings: { en: title }, contents: { en: message }, url: siteUrl() + (path || '/#/offers') })
    });
    const j = await r.json().catch(() => ({}));
    return { r, j };
  };
  try {
    let { r, j } = await send('Subscribed Users');
    if (r.ok && !j.id) { const again = await send('Total Subscriptions'); if (again.r.ok && again.j.id) { r = again.r; j = again.j; } }
    if (!r.ok) return { status: 502, error: (j.errors && JSON.stringify(j.errors).slice(0, 200)) || 'OneSignal refused the alert.' };
    if (!j.id) return { status: 409, error: 'OneSignal accepted the request but nobody received it. ' + (j.errors ? 'OneSignal says: ' + JSON.stringify(j.errors).slice(0, 200) : 'No active subscription was found.') };
    return { id: j.id };
  } catch (e) { return { status: 502, error: 'Could not reach OneSignal. Try again.' }; }
}

/* Firestore REST values to plain JS. */
function decode(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
  if ('mapValue' in v) { const o = {}; Object.entries(v.mapValue.fields || {}).forEach(([k, x]) => { o[k] = decode(x); }); return o; }
  return null;
}
async function runQuery(collection, filters, limit) {
  const where = filters.length === 1 ? filters[0] : { compositeFilter: { op: 'AND', filters } };
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], where, limit: limit || 300 } })
  });
  if (!r.ok) throw new Error('Firestore ' + r.status);
  const rows = await r.json();
  return (Array.isArray(rows) ? rows : []).filter((x) => x.document).map((x) => { const o = decode({ mapValue: { fields: x.document.fields || {} } }); o.id = String(x.document.name || '').split('/').pop(); return o; });
}
const eq = (field, value) => ({ fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: typeof value === 'boolean' ? { booleanValue: value } : { stringValue: String(value) } } });

module.exports = { PROJECT, clean, adminCheck, sendPush, runQuery, eq, siteUrl };
