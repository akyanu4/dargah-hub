/* Moon sighting. Hijri dates come from the built-in Umm al-Qura calendar, which can run a day or two ahead of the moon
   sighting in India. The Hub admin sets the shift (in days) when the moon is sighted; everyone's Urs dates then follow it. */
(function (root) {
  var PROJECT = 'siddiqgulshan-25903', KEY = 'hub_moon';
  var M = { offset: 0, auto: true };
  function clamp(n) { n = parseInt(n, 10); return isNaN(n) ? 0 : Math.max(-2, Math.min(2, n)); }
  try { var sv = JSON.parse(localStorage.getItem(KEY) || '{}'); M.offset = clamp(sv.offset); M.auto = sv.auto !== false; } catch (e) {}
  M.set = function (n, auto) { M.offset = clamp(n); M.auto = auto !== false; try { localStorage.setItem(KEY, JSON.stringify({ offset: M.offset, auto: M.auto })); } catch (e) {} };
  M.key = function () { return (M.auto ? 'a' : M.offset); };
  /* Manual shift of the built-in calendar (used only when automatic is off). */
  M.shift = function (date) { return !M.auto && M.offset ? new Date(date.getTime() + M.offset * 86400000) : date; };
  /* Automatic: { d, m, y } as kept in India, predicted from the moon. null when manual or unavailable. */
  M.parts = function (date) {
    if (!M.auto || !root.HubMoonSight) return null;
    try { return HubMoonSight.hijriOfDay(HubMoonSight.dayNum(date.getFullYear(), date.getMonth() + 1, date.getDate())); } catch (e) { return null; }
  };
  M.load = function () {
    if (!root.fetch || (root.HUB_CONFIG && root.HUB_CONFIG.mock)) return;
    fetch('https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents/settings/hijri')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { var fl = j && j.fields; if (!fl) return; var f = fl.offset, au = fl.auto ? fl.auto.booleanValue !== false : (f ? false : true); M.set(f ? (f.integerValue != null ? f.integerValue : f.doubleValue) : 0, au); })
      .catch(function () {});
  };
  root.HubMoon = M; M.load();
})(window);
