/* Dargah Hub: everyday tools (prayer times, Qibla, tasbeeh, duas, Hijri calendar, daily prayer log).
   Everything is calculated or stored on the phone. Nothing is sent anywhere. */
(function (root) {
  'use strict';
  var Core = root.NoorCore, Cities = root.NoorCities;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sget(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function sset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var NAMES = { fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };
  var ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'], FIVE = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  /* ---- location, method ---- */
  var DEF = { name: 'Hyderabad', lat: 17.385, lon: 78.4867, tz: 'Asia/Kolkata' };
  function loc() { var l = sget('hub_loc', null); return l && typeof l.lat === 'number' ? l : DEF; }
  function opts() { return { method: sget('hub_method', 'karachi'), asr: sget('hub_asr', 'hanafi') }; }
  function locate(done) {
    if (!navigator.geolocation) { done('This browser cannot share a location.'); return; }
    navigator.geolocation.getCurrentPosition(function (p) {
      var n = Cities && Cities.nearest(p.coords.latitude, p.coords.longitude, 60);
      sset('hub_loc', { name: n ? n.name : 'Your location', lat: p.coords.latitude, lon: p.coords.longitude, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }); done('');
    }, function () { done('Location was not shared. Pick your city instead.'); }, { timeout: 12000, maximumAge: 600000 });
  }
  function next() { var l = loc(); return Core.nextPrayer(Date.now(), l.lat, l.lon, l.tz, opts()); }
  function clock(ms) { return Core.formatClock(ms, loc().tz); }
  function countdown(ms) { var m = Math.max(0, Math.round(ms / 60000)), h = Math.floor(m / 60); return h ? h + ' h ' + (m % 60) + ' min' : m + ' min'; }

  /* ---- Hijri ---- */
  var HM = ['Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani", 'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qa'dah", 'Dhu al-Hijjah'];
  function hijri(date) {
    var mp = window.HubMoon && HubMoon.parts(date || new Date()); if (mp) return mp;
    try {
      var p = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(window.HubMoon ? HubMoon.shift(date || new Date()) : (date || new Date())), o = {};
      p.forEach(function (x) { if (x.type !== 'literal') o[x.type] = parseInt(x.value, 10); });
      if (!o.month || !o.day) return null; return { d: o.day, m: o.month, y: parseInt(String(o.year).replace(/\D/g, ''), 10) };
    } catch (e) { return null; }
  }
  function hijriText(date) { var h = hijri(date); return h ? h.d + ' ' + HM[h.m - 1] + ' ' + h.y + ' AH' : ''; }

  /* ---- screens: each returns { title, html, bind(rootEl) } ---- */
  function citySelect() {
    var l = loc(); return '<select id="cty" aria-label="City">' + (Cities ? Cities.LIST : []).map(function (c) { return '<option value="' + esc(c[0]) + '"' + (c[0] === l.name ? ' selected' : '') + '>' + esc(c[0]) + '</option>'; }).join('') + (!Cities || !Cities.LIST.some(function (c) { return c[0] === l.name; }) ? '<option selected>' + esc(l.name) + '</option>' : '') + '</select>';
  }
  function prayer() {
    var l = loc(), n = next(), t = n && (n.tomorrow && n.name === 'fajr' && Date.now() > (n.times.isha || 0) ? n.times : n.times), cd = Core.civilDate(Date.now(), l.tz);
    var times = n ? n.times : null, nm = n ? n.name : '';
    var rows = times ? ORDER.map(function (k) { return '<div class="prow' + (k === nm && !n.tomorrow ? ' now' : '') + '"><span>' + NAMES[k] + '</span><b>' + clock(times[k]) + '</b></div>'; }).join('') : '<div class="box">Prayer times could not be worked out for this place.</div>';
    var o = opts(), M = Core.METHODS;
    return {
      title: 'Prayer times',
      html: '<div class="box"><div class="muted">Showing times for</div><div class="loc">' + citySelect() + '<button class="btn ghost sm" id="gps" type="button">Use my location</button></div><div class="muted" id="gpsMsg"></div></div>' +
        (n ? '<div class="nextcard"><div>Next: <b>' + NAMES[n.name] + '</b></div><div class="big">' + clock(n.at) + '</div><div class="muted2">in ' + countdown(n.msUntil) + '</div></div>' : '') +
        '<div class="plist">' + rows + '</div>' +
        '<h2>Method</h2><div class="box"><label class="fld">Calculation<select id="mth">' + Object.keys(M).map(function (k) { return '<option value="' + k + '"' + (o.method === k ? ' selected' : '') + '>' + esc(M[k].name) + '</option>'; }).join('') + '</select></label><label class="fld">Asr<select id="asr"><option value="standard"' + (o.asr === 'standard' ? ' selected' : '') + '>Standard (Shafi, Maliki, Hanbali)</option><option value="hanafi"' + (o.asr === 'hanafi' ? ' selected' : '') + '>Hanafi</option></select></label><div class="muted">Calculated on your phone. Check with your local masjid for the exact adhan time.</div></div>',
      bind: function (el, redraw) {
        el.querySelector('#cty').addEventListener('change', function (e) { var c = (Cities.LIST.filter(function (x) { return x[0] === e.target.value; })[0]); if (c) { sset('hub_loc', { name: c[0], lat: c[1], lon: c[2], tz: c[3] }); redraw(); } });
        el.querySelector('#gps').addEventListener('click', function () { el.querySelector('#gpsMsg').textContent = 'Finding your location…'; locate(function (err) { if (err) el.querySelector('#gpsMsg').textContent = err; else redraw(); }); });
        el.querySelector('#mth').addEventListener('change', function (e) { sset('hub_method', e.target.value); redraw(); });
        el.querySelector('#asr').addEventListener('change', function (e) { sset('hub_asr', e.target.value); redraw(); });
      }
    };
  }
  function qibla() {
    var l = loc(), b = Core.qiblaBearing(l.lat, l.lon), km = Math.round(Core.distanceKm(l.lat, l.lon));
    return {
      title: 'Qibla',
      html: '<div class="box center"><div class="muted">From ' + esc(l.name) + '</div><div class="big">' + Math.round(b) + '° ' + esc(Core.compassPoint(b)) + '</div><div class="muted">' + km.toLocaleString() + ' km to the Kaaba</div></div>' +
        '<div class="compass" id="cmp"><div class="ring"><span class="n">N</span></div><div class="needle" id="ndl" style="transform:rotate(' + b + 'deg)"></div><div class="kaaba">🕋</div></div>' +
        '<button class="btn full" id="cmpBtn" type="button">Turn on the compass</button><div class="muted center" id="cmpMsg">Without the compass, face ' + Math.round(b) + '° from north (use any compass). Keep the phone flat and away from metal.</div>',
      bind: function (el) {
        var ndl = el.querySelector('#ndl'), msg = el.querySelector('#cmpMsg'), ring = el.querySelector('.ring');
        function start() {
          function on(e) { var h = Core.headingFromEvent(e); if (h == null) return; ring.style.transform = 'rotate(' + (-h) + 'deg)'; ndl.style.transform = 'rotate(' + (b - h) + 'deg)'; }
          root.addEventListener('deviceorientationabsolute', on, true); root.addEventListener('deviceorientation', on, true); msg.textContent = 'Turn until the arrow points up. That is the Qibla.';
        }
        el.querySelector('#cmpBtn').addEventListener('click', function () {
          if (root.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().then(function (r) { if (r === 'granted') start(); else msg.textContent = 'Compass permission was not given.'; }).catch(function () { msg.textContent = 'The compass is not available.'; });
          else if (root.DeviceOrientationEvent) start(); else msg.textContent = 'This device has no compass.';
        });
      }
    };
  }
  function tasbeeh() {
    var st = sget('hub_tasbeeh', { n: 0, goal: 33 });
    return {
      title: 'Tasbeeh',
      html: '<div class="chips" id="goals">' + [33, 99, 100, 0].map(function (g) { return '<a class="chip' + (st.goal === g ? ' on' : '') + '" data-g="' + g + '" role="button">' + (g || 'No goal') + '</a>'; }).join('') + '</div>' +
        '<button class="tbtn" id="tap" type="button" aria-label="Count one"><span id="cnt">' + st.n + '</span><small id="goalTxt">' + (st.goal ? 'of ' + st.goal : 'tap to count') + '</small></button>' +
        '<button class="btn ghost full" id="rst" type="button">Reset</button><p class="muted center">Counts stay on this phone.</p>',
      bind: function (el, redraw) {
        function paint() { el.querySelector('#cnt').textContent = st.n; el.querySelector('#goalTxt').textContent = st.goal ? 'of ' + st.goal : 'tap to count'; }
        el.querySelector('#tap').addEventListener('click', function () { st.n++; sset('hub_tasbeeh', st); if (navigator.vibrate) navigator.vibrate(st.goal && st.n % st.goal === 0 ? [60, 40, 60] : 12); paint(); });
        el.querySelector('#rst').addEventListener('click', function () { st.n = 0; sset('hub_tasbeeh', st); paint(); });
        el.querySelector('#goals').addEventListener('click', function (e) { var g = e.target.getAttribute && e.target.getAttribute('data-g'); if (g == null) return; st.goal = +g; sset('hub_tasbeeh', st); redraw(); });
      }
    };
  }
  var DUAS = [
    ['Before eating', 'بِسْمِ اللَّهِ', 'Bismillah', 'In the name of Allah.', 'Abu Dawud, Tirmidhi'],
    ['After eating', 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ', 'Alhamdu lillahil-ladhi at\'amana wa saqana wa ja\'alana muslimin', 'All praise is for Allah who fed us, gave us drink and made us Muslims.', 'Abu Dawud, Tirmidhi'],
    ['Entering the masjid', 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ', 'Allahumma iftah li abwaba rahmatik', 'O Allah, open for me the doors of Your mercy.', 'Muslim'],
    ['Leaving the masjid', 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ', 'Allahumma inni as\'aluka min fadlik', 'O Allah, I ask You for Your bounty.', 'Muslim'],
    ['Leaving home', 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', 'Bismillahi tawakkaltu \'alallahi wa la hawla wa la quwwata illa billah', 'In the name of Allah. I trust in Allah. There is no power or strength except with Allah.', 'Abu Dawud, Tirmidhi'],
    ['Before sleeping', 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', 'Bismika Allahumma amutu wa ahya', 'In Your name, O Allah, I die and I live.', 'Bukhari'],
    ['On waking', 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', 'Alhamdu lillahil-ladhi ahyana ba\'da ma amatana wa ilayhin-nushur', 'All praise is for Allah who gave us life after death, and to Him is the return.', 'Bukhari'],
    ['For good in both worlds', 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', 'Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina \'adhaban-nar', 'Our Lord, give us good in this world and good in the next, and protect us from the punishment of the Fire.', "Qur'an 2:201"]
  ];
  function duas() {
    return { title: 'Duas', html: DUAS.map(function (d) { return '<details class="box dua"><summary>' + esc(d[0]) + '</summary><div class="ar" dir="rtl" lang="ar">' + esc(d[1]) + '</div><div class="tr">' + esc(d[2]) + '</div><div>' + esc(d[3]) + '</div><div class="muted">Source: ' + esc(d[4]) + '</div></details>'; }).join('') + '<p class="muted">Short, well-known duas. Please check the wording with a teacher when you memorise.</p>', bind: function () {} };
  }
  function calendar() {
    var h = hijri(), sacred = { 1: 1, 7: 1, 11: 1, 12: 1 };
    return {
      title: 'Hijri calendar',
      html: h ? '<div class="box center"><div class="big">' + h.d + ' ' + esc(HM[h.m - 1]) + '</div><div class="muted">' + h.y + ' AH. ' + esc(new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) + '</div></div>' +
        '<h2>The twelve months</h2><div class="plist">' + HM.map(function (n, i) { return '<div class="prow' + (h.m === i + 1 ? ' now' : '') + '"><span>' + (i + 1) + '. ' + esc(n) + '</span><b>' + (sacred[i + 1] ? 'Sacred' : '') + '</b></div>'; }).join('') + '</div><p class="muted">Dates follow the Umm al-Qura calendar and can differ by a day from your local moon sighting.</p>' : '<div class="box">This browser cannot work out Hijri dates.</div>',
      bind: function () {}
    };
  }
  function key(d) { var p = Core.civilDate(d.getTime(), loc().tz); return p[0] + '-' + (p[1] < 10 ? '0' : '') + p[1] + '-' + (p[2] < 10 ? '0' : '') + p[2]; }
  function iman() {
    var log = sget('hub_iman', {}), today = key(new Date()), days = [];
    for (var i = 6; i >= 0; i--) days.push(key(new Date(Date.now() - i * 86400000)));
    var done = 0; days.forEach(function (k) { FIVE.forEach(function (p) { if (log[k] && log[k][p]) done++; }); }); var pct = Math.round(done / 35 * 100);
    var label = !done ? 'Not started yet' : pct >= 85 ? 'Flourishing' : pct >= 65 ? 'Steady' : pct >= 40 ? 'Growing' : 'Just beginning';
    return {
      title: 'Daily prayers',
      html: '<div class="box center"><div class="big">' + pct + '%</div><div><b>' + label + '</b></div><div class="muted">Prayers marked in the last 7 days</div></div>' +
        '<h2>Today</h2><div class="plist">' + FIVE.map(function (p) { var on = log[today] && log[today][p]; return '<button type="button" class="prow tg' + (on ? ' now' : '') + '" data-p="' + p + '"><span>' + NAMES[p] + '</span><b>' + (on ? 'Prayed ✓' : 'Mark as prayed') + '</b></button>'; }).join('') + '</div>' +
        '<div class="week">' + days.map(function (k) { var n = 0; FIVE.forEach(function (p) { if (log[k] && log[k][p]) n++; }); return '<div><i style="opacity:' + (0.15 + n * 0.17) + '"></i><small>' + k.slice(8) + '</small></div>'; }).join('') + '</div>' +
        '<p class="muted">A private reminder, never a judgment. Stored only on this phone. The full Iman Health tracker (masjid on time, fasting, dhikr, good deeds) is in the Noor-ul-Hasrat app.</p>',
      bind: function (el, redraw) { el.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.tg'); if (!b) return; var p = b.getAttribute('data-p'); log[today] = log[today] || {}; log[today][p] = log[today][p] ? 0 : 1; sset('hub_iman', log); redraw(); }); }
    };
  }
  root.HubTools = { screens: { prayer: prayer, qibla: qibla, tasbeeh: tasbeeh, duas: duas, calendar: calendar, iman: iman }, next: next, clock: clock, countdown: countdown, hijriText: hijriText, loc: loc, NAMES: NAMES };
})(typeof self !== 'undefined' ? self : this);
