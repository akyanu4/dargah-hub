/* Dargah Hub: a small data-driven site. All content lives in /data (JSON). No tracking, no accounts. */
(function () {
  'use strict';
  var app = document.getElementById('app'), D = {}, cache = {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) { u = String(u || ''); return /^(https:\/\/|http:\/\/|#\/|mailto:)/i.test(u) ? u : ''; }
  function money(n) { return (D.platform.currency || '') + Number(n).toLocaleString(); }
  function get(p) { return cache[p] || (cache[p] = fetch(p, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(p); return r.json(); })); }
  function sampleTag(x) { return x && x.sample ? '<span class="tag">Sample</span>' : ''; }
  function verTag(x) { return x && x.verified ? '<span class="tag v">Verified</span>' : ''; }
  function ads(slot) {
    return (D.ads || []).filter(function (a) { return a.slot === slot; }).map(function (a) {
      var l = safeUrl(a.link);
      return '<div class="ad"><span class="tag">Sponsored</span>' + sampleTag(a) + '<b> ' + esc(a.title) + '</b><div class="muted">' + esc(a.text) + (a.sponsor ? ' · ' + esc(a.sponsor) : '') + '</div>' + (l ? '<a class="btn line" href="' + esc(l) + '"' + (/^http/.test(l) ? ' target="_blank" rel="noopener sponsored"' : '') + '>' + esc(a.cta || 'Learn more') + '</a>' : '') + '</div>';
    }).join('');
  }
  var TONE = ['#d9c9b0', '#b9c4d8', '#c4d3c8', '#d8bfc6'];
  function catName(id) { var c = (D.categories || []).filter(function (x) { return x.id === id; })[0]; return c ? c.name : ''; }
  function art(p, i) {
    var img = p.img && /^(photos\/|https:\/\/)/.test(p.img) ? '<img loading="lazy" alt="' + esc(p.name) + '" src="' + esc(p.img) + '">' : '';
    return '<div class="art" style="--tone:' + TONE[(i || 0) % 4] + '">' + img + (img ? '' : '<span>' + esc(catName(p.cat)) + '</span>') + '</div>';
  }
  function vendor(id) { return (D.vendors || []).filter(function (v) { return v.id === id; })[0]; }
  function card(p, i) { var v = vendor(p.vendor); return '<a class="card p" href="#/p/' + esc(p.id) + '">' + art(p, i) + '<div class="pad"><b>' + esc(p.name) + '</b><span class="price">' + money(p.price) + '</span><div class="muted">' + esc(v ? v.name : '') + '</div></div></a>'; }
  function dcard(d, i) { return '<a class="card dg" href="#/d/' + esc(d.id) + '"><div class="dot">' + esc((d.short || d.name).charAt(0)) + '</div><div><b>' + esc(d.name) + '</b><div>' + sampleTag(d) + verTag(d) + '</div><div class="muted">' + esc(d.city) + '. ' + esc(d.tagline) + '</div></div></a>'; }


  var T = root_tools();
  function root_tools() { return window.HubTools; }
  function nextCard() {
    var n = T && T.next(); if (!n) return '';
    return '<a class="nextcard" href="#/prayer"><div class="muted2">Next prayer in ' + esc(T.loc().name) + '</div><div class="row2"><b>' + esc(T.NAMES[n.name]) + '</b><span class="big">' + esc(T.clock(n.at)) + '</span></div><div class="muted2">in ' + esc(T.countdown(n.msUntil)) + '</div></a>';
  }
  var ICON = {
    prayer: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    qibla: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 5l3 8-3-1-3 1z"/></svg>',
    tasbeeh: '<svg viewBox="0 0 24 24"><circle cx="6" cy="8" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="17" cy="15" r="2"/><circle cx="7" cy="15" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
    duas: '<svg viewBox="0 0 24 24"><path d="M4 5h7a3 3 0 013 3v11a2 2 0 00-2-2H4zM20 5h-7a3 3 0 00-3 3v11a2 2 0 012-2h8z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    iman: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/></svg>',
    quran: '<svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11"/></svg>',
    app: '<svg viewBox="0 0 24 24"><path d="M3 21V10l9-6 9 6v11M9 21v-6h6v6"/></svg>'
  };
  var TOOLS = [['prayer', 'Prayer times', '#/prayer'], ['qibla', 'Qibla', '#/qibla'], ['tasbeeh', 'Tasbeeh', '#/tasbeeh'], ['duas', 'Duas', '#/duas'], ['calendar', 'Hijri calendar', '#/calendar'], ['iman', 'Daily prayers', '#/iman'], ['quran', "Qur'an", 'https://quran.com'], ['app', 'Noor-ul-Hasrat app', 'https://noor-ul-hasrat.vercel.app/']];
  function toolTile(t) { var ext = /^https/.test(t[2]); return '<a class="ttile" href="' + esc(t[2]) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '><i>' + ICON[t[0]] + '</i><span>' + esc(t[1]) + '</span></a>'; }

  var R = {
    home: function () {
      return nextCard() + '<div class="trow">' + TOOLS.slice(0, 6).map(toolTile).join('') + '</div>' + ads('home') +
        '<div class="sech"><h2>Dargahs</h2><a href="#/dargahs">See all</a></div><div class="dgl">' + D.dargahs.slice(0, 3).map(dcard).join('') + '</div>' +
        '<div class="sech"><h2>In the shop</h2><a href="#/shop">See all</a></div><div class="hscroll">' + D.products.map(function (p, i) { return card(p, i); }).join('') + '</div>' +
        '<h2>Join in</h2><div class="who"><a class="tile" href="#/join"><b>Keep a dargah?</b><span>Get a page for your events, photos and videos. Free to start.</span><u>List your dargah</u></a><a class="tile" href="#/join"><b>Sell something?</b><span>Open a vendor shop and send buyers straight to you.</span><u>Become a vendor</u></a></div>';
    },
    dargahs: function () { return '<div class="dgl">' + D.dargahs.map(dcard).join('') + '</div><p class="muted">Are you a keeper? <a href="#/join"><b>List your dargah</b></a>.</p>'; },
    tools: function () { return '<div class="tgrid">' + TOOLS.map(toolTile).join('') + '</div>'; },
    more: function () {
      return '<div class="list"><a href="#/join"><span>List your dargah or shop</span><i>›</i></a><a href="#/advertise"><span>Advertise</span><i>›</i></a><a href="terms.html"><span>Terms</span><i>›</i></a><a href="privacy.html"><span>Privacy</span><i>›</i></a></div>' +
        '<div class="box muted">' + esc(D.platform.note || '') + '</div><p class="muted center">' + esc(D.platform.name) + ' ' + esc(D.platform.tagline || '') + '</p>';
    },
    dargah: function (id) {
      var d = D.dargahs.filter(function (x) { return x.id === id; })[0]; if (!d) return nf();
      var m = safeUrl(d.map), a = safeUrl(d.website), ph = String(d.phone || '').replace(/[^\d+]/g, ''), wa = String(d.whatsapp || '').replace(/\D/g, ''), hasGeo = typeof d.lat === 'number' && typeof d.lon === 'number';
      var about = Array.isArray(d.about) ? d.about : (d.about ? [d.about] : []);
      var photos = (d.gallery || []).filter(function (g) { return /^(photos\/|https:\/\/)/.test(g.src || ''); });
      var acts = '';
      if (ph) acts += '<a class="act" href="tel:' + esc(ph) + '"><i>📞</i>Call</a>';
      if (wa) acts += '<a class="act" target="_blank" rel="noopener" href="https://wa.me/' + esc(wa) + '"><i>💬</i>WhatsApp</a>';
      if (hasGeo) acts += '<a class="act" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + d.lat + ',' + d.lon + '"><i>🧭</i>Directions</a>';
      else if (m) acts += '<a class="act" target="_blank" rel="noopener" href="' + esc(m) + '"><i>🧭</i>Map</a>';
      acts += '<button class="act" type="button" id="shr" data-t="' + esc(d.name) + '"><i>↗</i>Share</button>';
      var info = '';
      if (d.address) info += '<div class="irow"><span>Address</span><div>' + esc(d.address) + '</div></div>';
      (d.timings || []).forEach(function (t) { info += '<div class="irow"><span>' + esc(t.label) + '</span><div>' + esc(t.time) + '</div></div>'; });
      if (ph) info += '<div class="irow"><span>Phone</span><div><a href="tel:' + esc(ph) + '">' + esc(d.phone) + '</a></div></div>';
      if (d.email) info += '<div class="irow"><span>Email</span><div><a href="mailto:' + esc(d.email) + '">' + esc(d.email) + '</a></div></div>';
      if (a) info += '<div class="irow"><span>Website</span><div><a target="_blank" rel="noopener" href="' + esc(a) + '">' + esc(a.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</a></div></div>';
      var cover = photos[0] ? '<img class="cover" alt="' + esc(photos[0].caption) + '" src="' + esc(photos[0].src) + '">' : '';
      return '<div class="hero dh">' + cover + '<div class="hb"><h1>' + esc(d.name) + '</h1><p>' + esc(d.city) + (d.tagline ? '. ' + esc(d.tagline) : '') + '</p><div>' + sampleTag(d) + verTag(d) + '</div></div></div>' +
        '<div class="acts">' + acts + '</div>' +
        (about.length ? '<h2>About</h2><div class="box">' + about.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div>' : '') +
        (d.facts && d.facts.length ? '<div class="box facts">' + d.facts.map(function (f) { return '<div class="irow"><span>' + esc(f[0]) + '</span><div>' + esc(f[1]) + '</div></div>'; }).join('') + '</div>' : '') +
        (info ? '<h2>Visit and contact</h2><div class="box facts">' + info + '</div>' : '<div class="box muted">Contact details have not been added yet. The keeper can send them through <a href="#/join"><b>Join</b></a>.</div>') +
        (hasGeo ? '<div class="box mapbox" id="mapbox"><button class="btn ghost full" type="button" id="showmap" data-lat="' + d.lat + '" data-lon="' + d.lon + '">Show the map here</button><div class="muted">Loading the map shares your IP address with Google.</div></div>' : '') +
        (m ? '<a class="btn ghost full" target="_blank" rel="noopener" href="' + esc(m) + '">Open in Google Maps</a>' : '') +
        (d.events && d.events.length ? '<h2>Events</h2>' + d.events.map(function (e) { return '<div class="box"><b>' + esc(e.title) + '</b><div class="muted">' + esc(e.when) + (e.note ? '. ' + esc(e.note) : '') + '</div></div>'; }).join('') : '') +
        (photos.length ? '<h2>Photos</h2><div class="gal">' + photos.map(function (g) { return '<a class="gi" href="' + esc(g.src) + '" data-lb="' + esc(g.src) + '" data-cap="' + esc(g.caption) + '"><img loading="lazy" alt="' + esc(g.caption) + '" src="' + esc(g.src) + '"></a>'; }).join('') + '</div>' : '') +
        (d.videos && d.videos.length ? '<h2>Videos</h2>' + d.videos.filter(function (v) { return /^[A-Za-z0-9_-]{11}$/.test(v.id || ''); }).map(function (v) { return '<div class="box"><a target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=' + esc(v.id) + '">▶ ' + esc(v.title) + '</a></div>'; }).join('') : '') +
        (d.sources && d.sources.length ? '<h2>Sources</h2><div class="box muted">' + d.sources.map(function (x) { var u = safeUrl(x.url); return u ? '<div><a target="_blank" rel="noopener" href="' + esc(u) + '">' + esc(x.title) + '</a></div>' : ''; }).join('') + '</div>' : '') +
        '<p class="muted">' + (d.updated ? 'Last updated ' + esc(d.updated) + '. ' : '') + 'Something wrong or out of date? <a href="mailto:' + encodeURIComponent(D.platform.contact || '') + '?subject=' + encodeURIComponent('Correction: ' + d.name) + '"><b>Tell us</b></a>.</p>';
    },
    shop: function (cat) {
      var list = D.products.filter(function (p) { return !cat || p.cat === cat; });
      return '<h1>The shop</h1><p class="muted">Independent vendors sell here. ' + esc(D.platform.name) + ' does not take payment or deliver: you buy straight from the vendor.</p>' + ads('shop') +
        '<div class="chips"><a class="chip' + (!cat ? ' on' : '') + '" href="#/shop">All</a>' + D.categories.map(function (c) { return '<a class="chip' + (cat === c.id ? ' on' : '') + '" href="#/shop/' + esc(c.id) + '">' + esc(c.name) + '</a>'; }).join('') + '</div>' +
        (list.length ? '<div class="grid">' + list.map(card).join('') + '</div>' : '<div class="box">Nothing in this category yet. Vendors can <a href="#/join"><b>apply to list here</b></a>.</div>');
    },
    product: function (id) {
      var p = D.products.filter(function (x) { return x.id === id; })[0]; if (!p) return nf(); var v = vendor(p.vendor), b = safeUrl(p.buy), i0 = D.products.indexOf(p);
      return '<p><a href="#/shop"><b>‹ Back to the shop</b></a></p><div class="pcard"><div class="card">' + art(p, i0) + '</div><div><h1>' + esc(p.name) + '</h1><div>' + sampleTag(p) + '</div><span class="price" style="font-size:22px;padding:3px 14px">' + money(p.price) + '</span><p>' + esc(p.desc) + '</p>' +
        (v ? '<div class="box">Sold by <a href="#/v/' + esc(v.id) + '"><b>' + esc(v.name) + '</b></a> ' + verTag(v) + '<div class="muted">' + esc(v.city) + '</div></div>' : '') +
        (b ? '<a class="btn full" target="_blank" rel="noopener" href="' + esc(b) + '">Buy from the vendor</a>' : '<div class="box muted">This is a sample product with no buy link. A real listing sends buyers to the vendor\'s own page or WhatsApp.</div>') +
        '<p class="muted">The vendor sells and delivers. Check the product and return terms with them before you pay.</p></div></div>';
    },
    vendor: function (id) {
      var v = vendor(id); if (!v) return nf();
      return '<div class="hero"><h1>' + esc(v.name) + '</h1><p>' + esc(v.city) + '</p><div>' + sampleTag(v) + verTag(v) + '</div></div><div class="box">' + esc(v.about) + '</div><h2>Products</h2><div class="grid">' + D.products.filter(function (p) { return p.vendor === id; }).map(card).join('') + '</div>';
    },
    join: function () {
      var mail = 'mailto:' + encodeURIComponent(D.platform.contact || '') + '?subject=';
      return '<div class="hero"><h1>Join ' + esc(D.platform.name) + '</h1><p>Two ways in. Both start with a short email, and we approve every listing by hand.</p></div>' +
        '<h2>Keep a dargah</h2><div class="box"><ul><li>A page with your name, photos, events, videos and map pin.</li><li>The basic listing is free. Notifications and extra media are optional.</li></ul><div class="muted">Send your dargah name, city, a short About text, photos you own, and the keeper\'s contact.</div><a class="btn full" href="' + mail + encodeURIComponent('List our dargah') + '">Email to list your dargah</a></div>' +
        '<h2>Sell as a vendor</h2><div class="box"><ul><li>Show your products and send buyers to your own checkout or WhatsApp.</li><li>A yearly listing fee. Featured placement is optional and always marked Sponsored.</li><li>You are the seller and handle delivery and returns.</li></ul><a class="btn full" href="' + mail + encodeURIComponent('Vendor listing') + '">Email to become a vendor</a></div>' +
        '<h2>How it works</h2><div class="steps"><div>You email us your details.</div><div>We check who you are and approve your listing.</div><div>Your page goes live on the hub.</div></div><p class="muted">Read the <a href="terms.html"><b>terms</b></a> first.</p>';
    },
    advertise: function () {
      return '<div class="hero"><h1>Be seen by the community</h1><p>Every ad is labelled Sponsored and never shown on Qur\'an or prayer content.</p></div>' +
        '<h2>Where your ad can appear</h2><table><tr><th>Slot</th><th>Where</th></tr><tr><td>Home banner</td><td>Top of the home page</td></tr><tr><td>Shop banner</td><td>Top of the shop</td></tr><tr><td>Featured product</td><td>First in its category</td></tr><tr><td>Dargah sponsor line</td><td>An event or page, with the dargah\'s consent</td></tr></table>' +
        '<p class="muted">Prices are set per slot. Ask for the current rate card.</p><a class="btn full" href="mailto:' + encodeURIComponent(D.platform.contact || '') + '?subject=Advertise">Ask about advertising</a>';
    }
  };
  function nf() { return '<h2>Not found</h2><p><a href="#/">Go home</a></p>'; }

  var TITLES = { home: 'Dargah Hub', dargahs: 'Dargahs', d: 'Dargah', shop: 'Shop', p: 'Product', v: 'Vendor', tools: 'Tools', more: 'More', join: 'Join', advertise: 'Advertise' };
  var TAB = { home: 'home', dargahs: 'dargahs', d: 'dargahs', shop: 'shop', p: 'shop', v: 'shop', tools: 'tools', prayer: 'tools', qibla: 'tools', tasbeeh: 'tools', duas: 'tools', calendar: 'tools', iman: 'tools', more: 'more', join: 'more', advertise: 'more' };
  var timer = null;
  document.addEventListener('click', function (e) {
    var t = e.target, b;
    if ((b = t.closest && t.closest('#shr'))) { var u = location.href, tt = b.getAttribute('data-t'); if (navigator.share) navigator.share({ title: tt, url: u }).catch(function () {}); else if (navigator.clipboard) navigator.clipboard.writeText(u).then(function () { b.lastChild.textContent = 'Copied'; }); return; }
    if ((b = t.closest && t.closest('#showmap'))) { var la = parseFloat(b.getAttribute('data-lat')), lo = parseFloat(b.getAttribute('data-lon')); if (isFinite(la) && isFinite(lo)) b.parentNode.innerHTML = '<iframe title="Map" loading="lazy" referrerpolicy="no-referrer" src="https://www.google.com/maps?q=' + la + ',' + lo + '&z=16&output=embed" style="border:0;width:100%;height:280px;border-radius:12px"></iframe>'; return; }
    if ((b = t.closest && t.closest('[data-lb]'))) { e.preventDefault(); var o = document.createElement('div'); o.className = 'lbx'; var im = document.createElement('img'); im.src = b.getAttribute('data-lb'); im.alt = b.getAttribute('data-cap') || ''; var c = document.createElement('div'); c.textContent = b.getAttribute('data-cap') || ''; o.appendChild(im); o.appendChild(c); o.addEventListener('click', function () { o.remove(); }); document.body.appendChild(o); }
  });
  function route() {
    var h = (location.hash || '#/').replace(/^#\/?/, '').split('/'), r = h[0] || 'home', html, title, bind = null, view = document.createElement('div');
    clearInterval(timer);
    if (T && T.screens[r]) { var sc = T.screens[r](); html = sc.html; title = sc.title; bind = sc.bind; }
    else {
      var fn = { home: R.home, dargahs: R.dargahs, tools: R.tools, more: R.more, join: R.join, advertise: R.advertise }[r];
      if (fn) html = fn(); else if (r === 'd') html = R.dargah(h[1]); else if (r === 'shop') html = R.shop(h[1]); else if (r === 'p') html = R.product(h[1]); else if (r === 'v') html = R.vendor(h[1]); else { html = nf(); r = 'home'; }
      title = TITLES[r];
    }
    view.innerHTML = html; app.innerHTML = ''; app.appendChild(view); window.scrollTo(0, 0);
    var home = r === 'home';
    document.getElementById('ttl').textContent = home ? D.platform.name : title; document.getElementById('back').hidden = home || ['dargahs', 'shop', 'tools', 'more'].indexOf(r) >= 0;
    document.getElementById('hj').textContent = T ? T.hijriText() : '';
    var tab = TAB[r] || 'home'; [].forEach.call(document.querySelectorAll('.nav a'), function (a) { a.classList.toggle('on', a.getAttribute('data-n') === tab); });
    if (bind) bind(view, route);
    if (r === 'prayer' || r === 'home') timer = setInterval(function () { if (r === 'home') { var c = view.querySelector('.nextcard'); if (c) c.outerHTML = nextCard(); } else route(); }, 60000);
  }
  document.getElementById('back').addEventListener('click', function () { if (history.length > 1) history.back(); else location.hash = '#/'; });
  Promise.all([get('data/platform.json'), get('data/dargahs/index.json'), get('data/vendors.json'), get('data/products.json'), get('data/ads.json'), get('data/categories.json')]).then(function (r) {
    D.platform = r[0]; D.vendors = r[2]; D.products = r[3]; D.ads = r[4]; D.categories = r[5];
    return Promise.all(r[1].map(function (id) { return get('data/dargahs/' + id + '.json'); }));
  }).then(function (ds) {
    D.dargahs = ds; document.title = D.platform.name; route(); window.addEventListener('hashchange', route);
  }).catch(function () { app.innerHTML = '<h2>Could not load</h2><p class="muted">Check your connection and reload.</p>'; });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
