/* Noor core logic — pure functions, no DOM, no network. Tested in node (see noor-dev/tests). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NoorCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KAABA = { lat: 21.422487, lon: 39.826206 };
  var EARTH_KM = 6371.0088;
  var DAY = 86400000;

  function rad(d) { return d * Math.PI / 180; }
  function deg(r) { return r * 180 / Math.PI; }

  /* ---------- Qibla ---------- */

  // Initial great-circle bearing from (lat, lon) to the Kaaba, degrees clockwise from true north.
  function qiblaBearing(lat, lon) {
    var p1 = rad(lat), p2 = rad(KAABA.lat), dl = rad(KAABA.lon - lon);
    var y = Math.sin(dl) * Math.cos(p2);
    var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (deg(Math.atan2(y, x)) + 360) % 360;
  }

  function distanceKm(lat, lon) {
    var p1 = rad(lat), p2 = rad(KAABA.lat), dp = p2 - p1, dl = rad(KAABA.lon - lon);
    var a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  var POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  function compassPoint(d) { return POINTS[Math.round((((d % 360) + 360) % 360) / 22.5) % 16]; }

  // Signed shortest rotation from a to b, in (-180, 180].
  function angleDiff(a, b) {
    var d = ((b - a) % 360 + 540) % 360 - 180;
    return d === -180 ? 180 : d;
  }

  // Device heading (degrees clockwise from north) from a deviceorientation event-like object.
  // iOS exposes webkitCompassHeading directly; Android's absolute alpha is counter-clockwise.
  function headingFromEvent(e) {
    if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) return e.webkitCompassHeading;
    if (e.absolute === true && typeof e.alpha === 'number') return (360 - e.alpha) % 360;
    return null; // relative alpha is not a compass heading — do not guess
  }

  /* ---------- Halqa schedule (fixed wall-clock time in one timezone) ---------- */

  var HALQA = { weekday: 6, hour: 20, minute: 30, durationMin: 60, offsetMin: 330, earlyMin: 15 };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function istDateString(ms, offsetMin) { return new Date(ms + offsetMin * 60000).toISOString().slice(0, 10); }

  // nowMs: epoch ms. Returns the current-or-next occurrence and what state it is in.
  function nextHalqa(nowMs, cfg) {
    var o = Object.assign({}, HALQA, cfg || {});
    var wall = new Date(nowMs + o.offsetMin * 60000);       // UTC fields hold the local wall clock
    var ahead = (o.weekday - wall.getUTCDay() + 7) % 7;
    var start = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() + ahead, o.hour, o.minute) - o.offsetMin * 60000;
    var end = start + o.durationMin * 60000;
    if (nowMs >= end) { start += 7 * DAY; end += 7 * DAY; }
    var state = 'upcoming';
    if (nowMs >= start && nowMs < end) state = 'live';
    else if (nowMs >= start - o.earlyMin * 60000 && nowMs < start) state = 'opening';
    return { start: start, end: end, state: state, msUntilStart: start - nowMs, weekKey: istDateString(start, o.offsetMin) };
  }

  function formatCountdown(ms) {
    if (ms <= 0) return 'now';
    var m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
    m = m % 60;
    if (d > 0) return d + 'd ' + h + 'h';
    if (h > 0) return h + 'h ' + m + 'm';
    return Math.max(1, m) + 'm';
  }

  /* ---------- Calendar file (.ics) with a weekly repeat and an alarm ---------- */

  function icsEscape(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  // RFC 5545: lines max 75 octets, continuation lines start with one space.
  function icsFold(line) {
    var out = [], bytes = 0, cur = '';
    for (var ch of line) {
      var n = unescape(encodeURIComponent(ch)).length;
      if (bytes + n > (out.length === 0 ? 75 : 74)) { out.push(cur); cur = ''; bytes = 0; }
      cur += ch; bytes += n;
    }
    out.push(cur);
    return out.map(function (l, i) { return i === 0 ? l : ' ' + l; }).join('\r\n');
  }

  function icsLocal(ms, offsetMin) {
    var d = new Date(ms + offsetMin * 60000);
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00';
  }
  function icsUtc(ms) {
    var d = new Date(ms);
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  }

  function buildHalqaICS(nowMs, opts) {
    var o = Object.assign({
      title: 'Halqa-e-Zikr', description: '', location: '', url: '',
      alarmMin: 30, uid: 'halqa-weekly@noor-app'
    }, opts || {});
    var h = nextHalqa(nowMs, o.schedule);
    var cfg = Object.assign({}, HALQA, o.schedule || {});
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Noor//Halqa//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VTIMEZONE', 'TZID:Asia/Kolkata',
      'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0530', 'TZOFFSETTO:+0530', 'TZNAME:IST', 'END:STANDARD',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      'UID:' + o.uid,
      'DTSTAMP:' + icsUtc(nowMs),
      'DTSTART;TZID=Asia/Kolkata:' + icsLocal(h.start, cfg.offsetMin),
      'DTEND;TZID=Asia/Kolkata:' + icsLocal(h.end, cfg.offsetMin),
      'RRULE:FREQ=WEEKLY;BYDAY=SA',
      'SUMMARY:' + icsEscape(o.title)
    ];
    if (o.description) lines.push('DESCRIPTION:' + icsEscape(o.description));
    if (o.location) lines.push('LOCATION:' + icsEscape(o.location));
    if (o.url) lines.push('URL:' + o.url);
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(o.title + ' starts soon'),
               'TRIGGER:-PT' + o.alarmMin + 'M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR');
    return lines.map(icsFold).join('\r\n') + '\r\n';
  }

  /* ---------- Classifying YouTube uploads ---------- */

  var SERIES = {
    madrasa: { name: '5 Minutes Madrasa', cadence: 'Daily' },
    imaniyat: { name: 'Dars-e-Imaniyat wa Aqaayid', cadence: 'Course' },
    islaah: { name: "Weekly Islaahe Aqaayed-o-A'maal", cadence: 'Weekly' },
    sunnat: { name: 'Sunnat-wo-Masayil', cadence: 'Lecture series' },
    mahfil: { name: "32nd Year's — 7 Days Mahafile Zikre Aal-o-Ashaabe Rasul ﷺ", cadence: 'Special series' },
    other: { name: 'More classes', cadence: 'Lecture' }
  };

  var SPEAKER_PATTERNS = [
    ['shahbaz', /Shahbaz\s+Anwari/i], ['khaleel', /Khaleelullah/i], ['muzaffer', /Muzaffer\s+Ali/i],
    ['shakir', /Shakir\s+Siddiqui/i], ['irfan', /Irfan\s+Khan/i], ['mujahid', /Mujahid/i]
  ];

  function classifyUpload(title, description) {
    var text = (title || '') + '\n' + (description || '');
    var key = 'other', ep = '', m;
    if (/5\s*Minutes\s*(ka\s*)?Madrasa/i.test(text)) { key = 'madrasa'; m = /Day\s*#?\s*(\d+)/i.exec(text); if (m) ep = 'Day ' + m[1]; }
    else if (/Mahaf\w*\s+Zikr|7\s*Days\s+Mahaf/i.test(text)) { key = 'mahfil'; m = /Day[_\s:#]*(\d+)/i.exec(text); if (m) ep = 'Day ' + m[1]; }
    else if (/Islaah\w*\s+Aq\w+/i.test(text)) { key = 'islaah'; m = /Lecture\s*#?\s*(\d+)/i.exec(text); if (m) ep = 'Lecture ' + m[1]; }
    else if (/Sunnat[\s-]*wo[\s-]*Masayil/i.test(text)) key = 'sunnat';
    else if (/Dars-e-Imaniyat|^\s*D#\d+/i.test(text)) { key = 'imaniyat'; m = /Dars\s*#?\s*(\d+)|D#\s*(\d+)/i.exec(text); if (m) ep = 'Dars ' + (m[1] || m[2]); }
    var spk = null;
    for (var i = 0; i < SPEAKER_PATTERNS.length; i++) if (SPEAKER_PATTERNS[i][1].test(text)) { spk = SPEAKER_PATTERNS[i][0]; break; }
    return { series: SERIES[key].name, cadence: SERIES[key].cadence, ep: ep, spk: spk };
  }

  // Combine hand-curated entries (richer, trusted) with the live feed (newer, automatic).
  function mergeFeed(curated, feed) {
    var byId = {};
    curated.forEach(function (c) { byId[c.yt] = c; });
    var seen = {}, out = [];
    (feed || []).forEach(function (f) {
      if (seen[f.id]) return;
      seen[f.id] = true;
      var base = byId[f.id];
      if (base) out.push(Object.assign({}, base, { publishedAt: f.publishedAt, live: true }));
      else {
        var k = classifyUpload(f.title, f.description);
        out.push({ series: k.series, cadence: k.cadence, ep: k.ep, title: f.title, spk: k.spk, ch: 'darulilm', yt: f.id, publishedAt: f.publishedAt, live: true });
      }
    });
    curated.forEach(function (c) { if (!seen[c.yt]) out.push(Object.assign({}, c)); });
    return out.sort(function (a, b) { return (Date.parse(b.publishedAt || 0) || 0) - (Date.parse(a.publishedAt || 0) || 0); });
  }

  // Channel id -> its "uploads" playlist id (YouTube's documented UC -> UU convention).
  function uploadsPlaylistId(channelId) { return /^UC/.test(channelId) ? 'UU' + channelId.slice(2) : null; }

  /* ---------- Prayer times (calculated on the device, works offline) ----------
   * Sun position from the NOAA / Meeus low-precision formulas. Cross-checked against the open-source
   * "adhan" library in noor-dev/tests/prayer.test.js. Times are exact moments (ms), shown in the place's own time zone. */

  var METHODS = {
    karachi: { name: 'Karachi (Univ. of Islamic Sciences)', fajr: 18, isha: 18 },
    mwl:     { name: 'Muslim World League', fajr: 18, isha: 17 },
    isna:    { name: 'North America (ISNA)', fajr: 15, isha: 15 },
    egypt:   { name: 'Egyptian General Authority', fajr: 19.5, isha: 17.5 },
    makkah:  { name: 'Umm al-Qura (Makkah)', fajr: 18.5, ishaInterval: 90, noDhuhrPad: true }
  };
  var PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  function julianDay0(y, m, d) {           // Julian day at 00:00 UT of the calendar date
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }
  function sunPos(jd) {                    // declination (deg) and equation of time (minutes)
    var T = (jd - 2451545) / 36525;
    var L0 = (280.46646 + T * (36000.76983 + 0.0003032 * T)) % 360;
    var M = 357.52911 + T * (35999.05029 - 0.0001537 * T), Mr = rad(M);
    var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    var Cc = Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * Mr) * (0.019993 - 0.000101 * T) + Math.sin(3 * Mr) * 0.000289;
    var omega = 125.04 - 1934.136 * T;
    var lambda = L0 + Cc - 0.00569 - 0.00478 * Math.sin(rad(omega));
    var eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(rad(omega));
    var decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda))));
    var yy = Math.pow(Math.tan(rad(eps / 2)), 2), L0r = rad(L0);
    var eot = 4 * deg(yy * Math.sin(2 * L0r) - 2 * e * Math.sin(Mr) + 4 * e * yy * Math.sin(Mr) * Math.cos(2 * L0r) -
                      0.5 * yy * yy * Math.sin(4 * L0r) - 1.25 * e * e * Math.sin(2 * Mr));
    return { decl: decl, eot: eot };
  }
  function hourAngleHours(lat, decl, alt) {
    var c = (Math.sin(rad(alt)) - Math.sin(rad(lat)) * Math.sin(rad(decl))) / (Math.cos(rad(lat)) * Math.cos(rad(decl)));
    return (c < -1 || c > 1) ? NaN : deg(Math.acos(c)) / 15;
  }

  // Raw moments (ms) for one calendar date at a place; NaN where the sun never reaches that angle.
  function rawTimes(y, m, d, lat, lon, method, asrFactor) {
    var jd0 = julianDay0(y, m, d), base = Date.UTC(y, m - 1, d);
    function at(t) { return sunPos(jd0 + t / 24); }
    var transit = 12 - lon / 15;
    for (var i = 0; i < 3; i++) transit = 12 - lon / 15 - at(transit).eot / 60;
    function ev(alt, sign) {
      var t = transit;
      for (var k = 0; k < 4; k++) { var h = hourAngleHours(lat, at(t).decl, alt); if (isNaN(h)) return NaN; t = transit + sign * h; }
      return t;
    }
    var decl = at(transit).decl;
    var asrAlt = deg(Math.atan(1 / (asrFactor + Math.tan(rad(Math.abs(lat - decl))))));
    function ms(h) { return isNaN(h) ? NaN : base + h * 3600000; }
    var sunset = ev(-0.8333, 1);
    return {
      fajr: ms(ev(-method.fajr, -1)), sunrise: ms(ev(-0.8333, -1)),
      dhuhr: ms(transit + (method.noDhuhrPad ? 0 : 1 / 60)), asr: ms(ev(asrAlt, 1)), maghrib: ms(sunset),
      isha: method.ishaInterval ? ms(sunset + method.ishaInterval / 60) : ms(ev(-method.isha, 1))
    };
  }

  function nextDate(y, m, d, n) { var t = new Date(Date.UTC(y, m - 1, d + n)); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; }
  var minute = 60000;
  function roundMin(v) { return isNaN(v) ? v : Math.round(v / minute) * minute; }

  // opts: {method:'karachi'|..., asr:'standard'|'hanafi'}. Returns {fajr,sunrise,dhuhr,asr,maghrib,isha} (ms) or null when the sun does not rise/set.
  function prayerTimes(y, m, d, lat, lon, opts) {
    opts = opts || {};
    var method = METHODS[opts.method] || METHODS.karachi, factor = opts.asr === 'hanafi' ? 2 : 1;
    var t = rawTimes(y, m, d, lat, lon, method, factor);
    if (isNaN(t.sunrise) || isNaN(t.maghrib)) return null;
    if (Math.abs(lat) > 48 || isNaN(t.fajr) || isNaN(t.isha)) {
      // Far from the equator the twilight angle may not be reached, or the nights are very short:
      // limit Fajr and Isha to one seventh of the night (a common, accepted rule).
      var n = nextDate(y, m, d, 1), tn = rawTimes(n[0], n[1], n[2], lat, lon, method, factor);
      if (isNaN(tn.sunrise)) return null;
      var portion = (tn.sunrise - t.maghrib) / 7;
      var fajrLimit = t.sunrise - portion, ishaLimit = t.maghrib + portion;
      t.fajr = isNaN(t.fajr) ? fajrLimit : Math.max(t.fajr, fajrLimit);
      if (!method.ishaInterval) t.isha = isNaN(t.isha) ? ishaLimit : Math.min(t.isha, ishaLimit);
    }
    var out = {}; Object.keys(t).forEach(function (k) { out[k] = roundMin(t[k]); });
    return out;
  }

  function civilDate(ms, tz) {              // "YYYY-MM-DD" as seen in the time zone
    var s = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
    return s.split('-').map(Number);
  }

  // What is the next prayer, and when? Rolls over to tomorrow's Fajr after Isha.
  function nextPrayer(nowMs, lat, lon, tz, opts) {
    var ymd = civilDate(nowMs, tz), today = prayerTimes(ymd[0], ymd[1], ymd[2], lat, lon, opts);
    if (!today) return null;
    for (var i = 0; i < PRAYERS.length; i++) {
      if (today[PRAYERS[i]] > nowMs) return { name: PRAYERS[i], at: today[PRAYERS[i]], times: today, msUntil: today[PRAYERS[i]] - nowMs };
    }
    var n = nextDate(ymd[0], ymd[1], ymd[2], 1), tom = prayerTimes(n[0], n[1], n[2], lat, lon, opts);
    if (!tom) return null;
    return { name: 'fajr', at: tom.fajr, times: today, tomorrow: tom, msUntil: tom.fajr - nowMs };
  }

  function formatClock(ms, tz) {
    try { return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: tz }); }
    catch (e) { return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  }

  return {
    KAABA: KAABA, HALQA: HALQA, SERIES: SERIES,
    qiblaBearing: qiblaBearing, distanceKm: distanceKm, compassPoint: compassPoint,
    angleDiff: angleDiff, headingFromEvent: headingFromEvent,
    nextHalqa: nextHalqa, formatCountdown: formatCountdown, buildHalqaICS: buildHalqaICS,
    classifyUpload: classifyUpload, mergeFeed: mergeFeed, uploadsPlaylistId: uploadsPlaylistId,
    METHODS: METHODS, PRAYERS: PRAYERS, prayerTimes: prayerTimes, nextPrayer: nextPrayer, civilDate: civilDate, formatClock: formatClock
  };
});
