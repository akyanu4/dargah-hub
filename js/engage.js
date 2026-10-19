/* Dargah Hub: reasons to come back. Upcoming Urs and Gyarvi dates (worked out from each dargah's events),
   dargahs near me, following dargahs and shops, saved items, and sharing. Everything is stored on the device only. */
(function (root) {
  'use strict';
  var S = root.HubScreens = root.HubScreens || {}, mem = {};
  function H() { return root.HubApp; }
  function D() { return H().D(); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lsGet(k, d) { if (mem[k] !== undefined) return mem[k]; try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- Hijri dates ---------- */
  var HM = ['Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani", 'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qa'dah", 'Dhu al-Hijjah'];
  var MONTH_RX = [
    [/muharram|moharram/, 1], [/safar/, 2], [/rabi\W*(ul|al|u)?\W*(awwal|awal|auwal|1|i)\b/, 3], [/rabi\W*(ul|al|u)?\W*(thani|sani|akhir|akhir|2|ii)\b/, 4],
    [/jumad\w*\W*(ul|al|u)?\W*(ula|ola|awwal|awal|1|i)\b/, 5], [/jumad\w*\W*(ul|al|u)?\W*(akhir\w*|thani|sani|ukhra|2|ii)\b/, 6],
    [/rajab/, 7], [/sha\W?ban|shaban/, 8], [/ramadan|ramzan|ramazan/, 9], [/shawwal|shawal/, 10],
    [/(dhu|zu|zil|zul)\W*(al|ul|l)?\W*qa\W?d/, 11], [/(dhu|zu|zil|zul)\W*(al|ul|l)?\W*hij/, 12]
  ];
  var WD = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  var fmt = null;
  function hij(date) {
    var mp = window.HubMoon && HubMoon.parts(date); if (mp) return { d: mp.d, m: mp.m };
    try {
      fmt = fmt || new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' });
      var o = {}; fmt.formatToParts(window.HubMoon ? HubMoon.shift(date) : date).forEach(function (x) { if (x.type !== 'literal') o[x.type] = parseInt(x.value, 10); });
      return o.month && o.day ? { d: o.day, m: o.month } : null;
    } catch (e) { return null; }
  }
  var calCache = null;
  function cal() {
    var t = new Date(), key = t.getFullYear() + '-' + t.getMonth() + '-' + t.getDate() + '-' + (window.HubMoon ? HubMoon.key() : 0);
    if (calCache && calCache.key === key) return calCache.days;
    var days = [];
    for (var i = 0; i < 400; i++) { var dt = new Date(t.getFullYear(), t.getMonth(), t.getDate() + i, 12); days.push({ date: dt, h: hij(dt), wd: dt.getDay() }); }
    calCache = { key: key, days: days }; return days;
  }

  /* Reads text such as "5 Rajab", "16, 17 and 18 Shawwal", "11th monthly" or "Every Friday after Asr". */
  function parseWhen(text) {
    var s = String(text || '').toLowerCase().replace(/[’'`ʼʿ]/g, '').replace(/-/g, ' '), mo = 0, mi = -1, m;
    for (var i = 0; i < MONTH_RX.length; i++) { m = MONTH_RX[i][0].exec(s); if (m) { mo = MONTH_RX[i][1]; mi = m.index; break; } }
    function nums(str) { var out = [], r = /\b(\d{1,2})(?:st|nd|rd|th)?\b/g, x; while ((x = r.exec(str))) { var n = +x[1]; if (n >= 1 && n <= 30) out.push(n); } return out; }
    if (mo) {
      var days = nums(s.slice(0, mi)); if (!days.length) days = nums(s.slice(mi));
      return days.length ? { kind: 'h', month: mo, days: days.slice(0, 4) } : null;
    }
    if (/monthly|every month|each month/.test(s)) { var n = nums(s); return n.length ? { kind: 'm', days: [n[0]] } : null; }
    for (var w = 0; w < 7; w++) if (s.indexOf(WD[w]) >= 0) return { kind: 'w', wd: w };
    return null;
  }
  function nextDate(p) {
    if (!p) return null;
    var ds = cal();
    for (var i = 0; i < ds.length; i++) {
      var x = ds[i];
      if (p.kind === 'w') { if (x.wd === p.wd) return { date: x.date, days: i }; }
      else if (x.h && p.days.indexOf(x.h.d) >= 0 && (p.kind === 'm' || x.h.m === p.month)) return { date: x.date, days: i };
    }
    return null;
  }
  function away(n) { return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : 'In ' + n + ' days'; }
  function dstr(d) { try { return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return ''; } }

  /* Every event with a date we can work out, soonest first. Weekly events are left out of the shared list so the real Urs dates show. */
  function upcoming(opts) {
    opts = opts || {}; var out = [], f = follows(), maxDays = opts.maxDays || 120;
    (D().dargahs || []).forEach(function (g) {
      if (opts.onlyFollowed && f.d.indexOf(g.id) < 0) return;
      (g.events || []).forEach(function (e) {
        var p = parseWhen(e.when); if (!p) return; if (p.kind === 'w' && !opts.weekly) return;
        var n = nextDate(p); if (!n || n.days > maxDays) return;
        out.push({ did: g.id, dname: g.name, city: g.city, title: e.title, when: e.when, date: n.date, days: n.days, followed: f.d.indexOf(g.id) >= 0, kind: p.kind });
      });
    });
    out.sort(function (a, b) { return a.days - b.days || (b.followed ? 1 : 0) - (a.followed ? 1 : 0); });
    return out;
  }
  function evRow(e) {
    return '<a class="card ev" href="#/d/' + esc(e.did) + '"><div class="evd"><b>' + e.date.getDate() + '</b><span>' + esc(e.date.toLocaleDateString([], { month: 'short' })) + '</span></div><div><b>' + esc(e.title) + '</b><div class="muted">' + esc(e.dname) + (e.city ? ', ' + esc(e.city) : '') + '</div><div class="muted">' + esc(dstr(e.date)) + ' · ' + esc(away(e.days)) + (e.followed ? ' · Following' : '') + '</div></div></a>';
  }
  /* A small line under an event on the dargah page, e.g. "Next: Fri 20 Dec (in 12 days)". */
  function eventNote(e) {
    var p = parseWhen(e && e.when), n = p && nextDate(p); if (!n) return '';
    return '<div class="muted nx">Next: ' + esc(dstr(n.date)) + ' (' + esc(away(n.days).toLowerCase()) + ')</div><div class="muted nx">May move by a day with the moon.</div>';
  }
  function homeBlock() {
    var f = follows(), list = upcoming({ maxDays: 90 }), mine = list.filter(function (x) { return x.followed; });
    var show = (mine.length ? mine : list).slice(0, 3);
    if (!show.length) return '';
    return '<div class="sech"><h2>' + (mine.length ? 'Coming up at dargahs you follow' : 'Coming up') + '</h2><a href="#/upcoming">See all</a></div><div class="dgl">' + show.map(evRow).join('') + '</div>' +
      (f.d.length || f.v.length ? '' : '<p class="muted">Tap Follow on a dargah to see its dates here first.</p>');
  }

  /* ---------- follow and save ---------- */
  function follows() { var f = lsGet('hub_follow', null); return f && Array.isArray(f.d) && Array.isArray(f.v) ? f : { d: [], v: [] }; }
  function isFollow(kind, id) { return follows()[kind].indexOf(id) >= 0; }
  function toggleFollow(kind, id) { var f = follows(), i = f[kind].indexOf(id); if (i >= 0) f[kind].splice(i, 1); else f[kind].push(id); lsSet('hub_follow', f); return i < 0; }
  function saved() { var a = lsGet('hub_saved', []); return Array.isArray(a) ? a : []; }
  function toggleSave(id) { var a = saved(), i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else a.unshift(id); lsSet('hub_saved', a.slice(0, 100)); return i < 0; }
  function followBtn(kind, id, cls) {
    var on = isFollow(kind, id);
    return '<button class="' + (cls || 'act') + '" type="button" data-follow="' + kind + ':' + esc(id) + '" aria-pressed="' + on + '">' + (cls ? '' : '<i>' + (on ? '★' : '☆') + '</i>') + (on ? 'Following' : 'Follow') + '</button>';
  }
  function saveBtn(id) { var on = saved().indexOf(id) >= 0; return '<button class="btn ghost full" type="button" data-save="' + esc(id) + '" aria-pressed="' + on + '">' + (on ? '♥ Saved' : '♡ Save for later') + '</button>'; }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-follow]');
    if (b) {
      var p = b.getAttribute('data-follow').split(':'), on = toggleFollow(p[0], p.slice(1).join(':')), plain = b.className.indexOf('act') < 0 || b.className === 'btn ghost sm';
      b.setAttribute('aria-pressed', on); b.innerHTML = (b.className === 'act' ? '<i>' + (on ? '★' : '☆') + '</i>' : '') + (on ? 'Following' : 'Follow'); return;
    }
    b = e.target.closest && e.target.closest('[data-save]');
    if (b) { var s = toggleSave(b.getAttribute('data-save')); b.setAttribute('aria-pressed', s); b.textContent = s ? '♥ Saved' : '♡ Save for later'; }
  });

  /* ---------- sharing ---------- */
  function share(title, text, url) {
    var full = text + (url ? '\n' + url : '');
    if (navigator.share) return navigator.share({ title: title, text: text, url: url }).catch(function () {});
    root.open('https://wa.me/?text=' + encodeURIComponent(full), '_blank', 'noopener'); return Promise.resolve();
  }
  function dargahShare(d) {
    var n = upcoming({ maxDays: 120 }).filter(function (x) { return x.did === d.id; })[0];
    return d.name + (d.city ? ', ' + d.city : '') + (n ? '. ' + n.title + ': ' + dstr(n.date) + ' (' + away(n.days).toLowerCase() + ')' : '') + '. On Dargah Hub:';
  }

  /* ---------- near me ---------- */
  function km(a, b, c, d) { var r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((d - b) * r / 2), h = x * x + Math.cos(a * r) * Math.cos(c * r) * y * y; return 12742 * Math.asin(Math.sqrt(h)); }
  function pos() { var p = lsGet('hub_pos', null); return p && typeof p.lat === 'number' ? p : null; }
  function locate(done) {
    if (!navigator.geolocation) return done('This browser cannot share a location.');
    navigator.geolocation.getCurrentPosition(function (p) { lsSet('hub_pos', { lat: p.coords.latitude, lon: p.coords.longitude, at: Date.now() }); done(); },
      function () { done('Location was not shared. You can still search by name or city.'); }, { timeout: 12000, maximumAge: 600000 });
  }
  function dist(d) { var p = pos(); return p && typeof d.lat === 'number' && typeof d.lon === 'number' ? km(p.lat, p.lon, d.lat, d.lon) : null; }
  function kmText(x) { return x < 1 ? 'Under 1 km' : x < 10 ? x.toFixed(1) + ' km' : Math.round(x) + ' km'; }

  /* ---------- screens ---------- */
  S.dargahs = function () {
    return { title: 'Dargahs', html: '<input class="search" id="dq" type="search" placeholder="Search dargahs by name or city" aria-label="Search dargahs"><div class="chips" id="dch"></div><div id="dmsg"></div><div class="dgl" id="dl"></div><p class="muted">Are you a keeper? <a href="#/join"><b>List your dargah</b></a>.</p>',
      bind: function (view) {
        var mode = 'all', q = '', msg = view.querySelector('#dmsg'), list = view.querySelector('#dl'), chips = view.querySelector('#dch');
        var MODES = [['all', 'All'], ['near', 'Near me'], ['follow', 'Following'], ['conf', 'Confirmed']];
        function draw() {
          var f = follows(), d = D().dargahs.slice(), nearOn = mode === 'near' && pos();
          chips.innerHTML = MODES.map(function (m) { return '<a class="chip' + (mode === m[0] ? ' on' : '') + '" role="button" data-m="' + m[0] + '">' + m[1] + '</a>'; }).join('');
          if (q) d = d.filter(function (x) { return (x.name + ' ' + x.city + ' ' + x.tagline).toLowerCase().indexOf(q) >= 0; });
          if (mode === 'follow') d = d.filter(function (x) { return f.d.indexOf(x.id) >= 0; });
          if (mode === 'conf') d = d.filter(function (x) { return x.confirmed || x.verified || !x.live; });
          if (nearOn) { d.forEach(function (x) { x._km = dist(x); }); d.sort(function (a, b) { return (a._km == null ? 1e9 : a._km) - (b._km == null ? 1e9 : b._km); }); }
          msg.innerHTML = mode === 'near' && !nearOn ? '<div class="box">Finding dargahs near you…</div>' : mode === 'near' && !d.some(function (x) { return x._km != null; }) ? '<div class="box muted">No dargah here has a map pin yet, so they cannot be sorted by distance.</div>' : '';
          list.innerHTML = d.length ? d.map(function (x, i) {
            var html = H().dcard(x, i); return nearOn && x._km != null ? html.replace('<div class="muted">', '<div class="muted"><b>' + kmText(x._km) + '</b> · ') : html;
          }).join('') : '<div class="box">' + (mode === 'follow' ? 'You are not following any dargah yet. Open a dargah and tap Follow.' : 'No dargah found.') + '</div>';
        }
        chips.addEventListener('click', function (e) {
          var a = e.target.closest && e.target.closest('[data-m]'); if (!a) return; mode = a.getAttribute('data-m'); draw();
          if (mode === 'near') locate(function (err) { if (err) { msg.innerHTML = '<div class="note err">' + esc(err) + '</div>'; } else draw(); });
        });
        view.querySelector('#dq').addEventListener('input', function (e) { q = e.target.value.trim().toLowerCase(); draw(); });
        draw();
      } };
  };
  S.upcoming = function () {
    return { title: 'Upcoming', html: '<h1>Upcoming dates</h1><p class="muted">Worked out from each dargah\'s listed events and the moon, using the month start predicted for India. The moon committee may announce a day earlier or later, so confirm with the dargah.</p><div class="chips" id="uch"></div><div class="dgl" id="ul"></div><div id="ualert"></div>',
      bind: function (view) {
        var only = false;
        function draw() {
          var f = follows(), l = upcoming({ maxDays: 365, onlyFollowed: only });
          view.querySelector('#uch').innerHTML = '<a class="chip' + (!only ? ' on' : '') + '" role="button" data-o="0">All dargahs</a><a class="chip' + (only ? ' on' : '') + '" role="button" data-o="1">Following</a>';
          view.querySelector('#ul').innerHTML = l.length ? l.map(evRow).join('') : '<div class="box">' + (only && !f.d.length ? 'Follow a dargah to see its dates here.' : 'No dated events yet. Dargahs can add their Urs and Gyarvi dates from the keeper page.') + '</div>';
        }
        view.querySelector('#uch').addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-o]'); if (a) { only = a.getAttribute('data-o') === '1'; draw(); } });
        draw();
        if (root.HubOffers && root.HubOffers.alertCard) { var ua = view.querySelector('#ualert'); if (ua) { ua.innerHTML = root.HubOffers.alertCard(); root.HubOffers.bindAlert(view); } }
      } };
  };
  S.following = function () {
    return { title: 'Following', html: '<div id="fv"></div>', bind: function (view) {
      var f = follows(), dg = D().dargahs.filter(function (x) { return f.d.indexOf(x.id) >= 0; }), vs = (D().vendors || []).filter(function (x) { return f.v.indexOf(x.id) >= 0; }), ev = upcoming({ maxDays: 365, onlyFollowed: true });
      view.querySelector('#fv').innerHTML = '<h1>Following</h1><p class="muted">' + (window.HubAccount ? HubAccount.hint() : 'Kept on this phone only.') + '</p>' +
        (ev.length ? '<h2>Coming up</h2><div class="dgl">' + ev.slice(0, 6).map(evRow).join('') + '</div>' : '') +
        '<h2>Dargahs</h2>' + (dg.length ? '<div class="dgl">' + dg.map(function (x, i) { return H().dcard(x, i); }).join('') + '</div>' : '<div class="box">None yet. Open a dargah and tap Follow.</div>') +
        '<h2>Shops</h2>' + (vs.length ? '<div class="list">' + vs.map(function (v) { return '<a href="#/v/' + esc(v.id) + '"><span>' + esc(v.name) + '<br><small class="muted">' + esc(v.city) + '</small></span><i>›</i></a>'; }).join('') + '</div>' : '<div class="box">None yet. Open a shop and tap Follow.</div>');
    } };
  };
  S.saved = function () {
    return { title: 'Saved', html: '<div id="sv"></div>', bind: function (view) {
      var ids = saved(), ps = ids.map(function (id) { return D().products.filter(function (p) { return p.id === id; })[0]; }).filter(Boolean);
      view.querySelector('#sv').innerHTML = '<h1>Saved items</h1><p class="muted">' + (window.HubAccount ? HubAccount.hint() : 'Kept on this phone only.') + '</p>' + (ps.length ? '<div class="grid">' + ps.map(function (p, i) { return H().card(p, i); }).join('') + '</div>' : '<div class="box">Nothing saved yet. Open an item and tap Save for later.<br><a href="#/shop"><b>Browse the shop</b></a></div>');
    } };
  };

  function snapshot() { return { follow: follows(), saved: saved() }; }
  function apply(s) { if (s && s.follow) lsSet('hub_follow', s.follow); if (s && Array.isArray(s.saved)) lsSet('hub_saved', s.saved.slice(0, 100)); }
  root.HubEngage = { snapshot: snapshot, apply: apply, homeBlock: homeBlock, eventNote: eventNote, followBtn: followBtn, saveBtn: saveBtn, share: share, dargahShare: dargahShare, upcoming: upcoming, parseWhen: parseWhen, nextDate: nextDate, isFollow: isFollow };
})(typeof self !== 'undefined' ? self : this);
