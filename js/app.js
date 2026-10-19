/* Dargah Hub: a small data-driven site. All content lives in /data (JSON). No tracking, no accounts. */
(function () {
  'use strict';
  function curMode() { try { var m = localStorage.getItem('hub_mode'); return m === 'light' || m === 'dark' ? m : 'auto'; } catch (e) { return 'auto'; } }
  function applyMode(m) {
    try { if (m === 'auto') localStorage.removeItem('hub_mode'); else localStorage.setItem('hub_mode', m); } catch (e) {}
    if (m === 'light' || m === 'dark') document.documentElement.setAttribute('data-mode', m); else document.documentElement.removeAttribute('data-mode');
    var dark = m === 'dark' || (m === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches), tc = document.querySelector('meta[name=theme-color]');
    if (tc) tc.setAttribute('content', dark ? '#0a0f22' : '#111936');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#modeseg [data-mode]'); if (!b) return;
    applyMode(b.getAttribute('data-mode'));
    Array.prototype.forEach.call(document.querySelectorAll('#modeseg button'), function (x) { x.className = x === b ? 'on' : ''; });
  });
  try { var q = /[?&]theme=(\w+)/.exec(location.search); if (q) localStorage.setItem('hub_theme', q[1]); var th = localStorage.getItem('hub_theme'); if (th && th !== 'default') document.documentElement.setAttribute('data-theme', th); } catch (e) {}
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
  function catName(id) { var c = (D.categories || []).filter(function (x) { return x.id === id; })[0]; return c ? c.name : String(id || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); }); }
  function art(p, i) {
    var img = p.img && /^(photos\/|https:\/\/|data:image\/jpeg;base64,)/.test(p.img) ? '<img loading="lazy" alt="' + esc(p.name) + '" src="' + esc(p.img) + '">' : '';
    return '<div class="art' + (img ? ' ph' : '') + '" style="--tone:' + TONE[(i || 0) % 4] + '">' + img + (img ? '' : '<span>' + esc(catName(p.cat)) + '</span>') + '</div>';
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
      return nextCard() + '<div class="trow">' + TOOLS.slice(0, 6).map(toolTile).join('') + '</div>' + ads('home') + (window.HubOffers ? HubOffers.homeBlock() : '') + (window.HubEngage ? HubEngage.homeBlock() : '') +
        '<div class="sech"><h2>Dargahs</h2><a href="#/dargahs">See all</a></div><div class="dgl">' + D.dargahs.slice(0, 3).map(dcard).join('') + '</div>' +
        '<div class="sech"><h2>In the shop</h2><a href="#/shop">See all</a></div><div class="hscroll">' + D.products.map(function (p, i) { return card(p, i); }).join('') + '</div>' +
        '<h2>Join in</h2><div class="who"><a class="tile" href="#/join"><b>Keep a dargah?</b><span>Get a page for your events, photos and videos. Free to start.</span><u>List your dargah</u></a><a class="tile" href="#/sell"><b>Sell something?</b><span>List your shop here, or create one with your items and photos.</span><u>Sell on the hub</u></a></div>';
    },
    dargahs: function () { return '<div class="dgl">' + D.dargahs.map(dcard).join('') + '</div><p class="muted">Are you a keeper? <a href="#/join"><b>List your dargah</b></a>.</p>'; },
    tools: function () { return '<div class="tgrid">' + TOOLS.map(toolTile).join('') + '</div>'; },
    more: function () {
      return '<div class="list"><a href="#/offers"><span>Weekly offers</span><i>›</i></a><a href="#/mycodes"><span>My saved deals</span><i>›</i></a><a href="#/upcoming"><span>Upcoming Urs and events</span><i>›</i></a><a href="#/following"><span>Following</span><i>›</i></a><a href="#/saved"><span>Saved items</span><i>›</i></a><a href="#/cart"><span>My cart</span><i>›</i></a><a href="#/orders"><span>My orders</span><i>›</i></a><a href="#/sell"><span>Sell on Dargah Hub</span><i>›</i></a><a href="#/join"><span>List your dargah</span><i>›</i></a><a href="#/mydargah"><span>Keeper: edit my dargah page</span><i>›</i></a><a href="#/advertise"><span>Advertise</span><i>›</i></a><a href="#/contact"><span>Contact and complaints</span><i>›</i></a><a href="terms.html"><span>Terms</span><i>›</i></a><a href="privacy.html"><span>Privacy</span><i>›</i></a></div>' +
        '<div class="box"><b>Appearance</b><div class="muted">Auto follows your phone. Your choice is remembered on this device.</div><div class="seg" id="modeseg">' + [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(function (m) { return '<button type="button" data-mode="' + m[0] + '" class="' + (curMode() === m[0] ? 'on' : '') + '">' + m[1] + '</button>'; }).join('') + '</div></div>' + '<div class="box muted">' + esc(D.platform.note || '') + '</div><p class="muted center">' + esc(D.platform.name) + ' ' + esc(D.platform.tagline || '') + '</p>';
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
      else if (d.address || d.name) acts += '<a class="act" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((d.name || '') + ', ' + (d.address || d.city || '')) + '"><i>🧭</i>Find on map</a>';
      if (window.HubEngage) acts += HubEngage.followBtn('d', d.id);
      acts += '<button class="act" type="button" id="shr" data-t="' + esc(d.name) + '" data-x="' + esc(window.HubEngage ? HubEngage.dargahShare(d) : d.name) + '"><i>↗</i>Share</button>';
      var info = '';
      if (d.address) info += '<div class="irow"><span>Address</span><div>' + esc(d.address) + '</div></div>';
      (d.timings || []).forEach(function (t) { info += '<div class="irow"><span>' + esc(t.label) + '</span><div>' + esc(t.time) + '</div></div>'; });
      if (ph) info += '<div class="irow"><span>Phone</span><div><a href="tel:' + esc(ph) + '">' + esc(d.phone) + '</a></div></div>';
      if (d.email) info += '<div class="irow"><span>Email</span><div><a href="mailto:' + esc(d.email) + '">' + esc(d.email) + '</a></div></div>';
      if (a) info += '<div class="irow"><span>Website</span><div><a target="_blank" rel="noopener" href="' + esc(a) + '">' + esc(a.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</a></div></div>';
      var cover = photos[0] ? '<img class="cover" alt="' + esc(photos[0].caption) + '" src="' + esc(photos[0].src) + '">' : '';
      return '<div class="hero dh">' + cover + '<div class="hb"><h1>' + esc(d.name) + '</h1><p>' + esc(d.city) + (d.tagline ? '. ' + esc(d.tagline) : '') + '</p><div>' + sampleTag(d) + verTag(d) + '</div></div></div>' +
        '<div class="acts">' + acts + '</div>' +
        (d.live ? (d.confirmed ? '<div class="box"><span class="tag v">Confirmed by the dargah</span>' + (d.updated ? '<div class="muted">Last verified ' + esc(d.updated) + '</div>' : '') + '</div>' : '<div class="box"><b>Listed from public sources</b><div class="muted">This page has not been confirmed by the dargah yet. Dates and details may be incomplete.' + (d.source ? ' Source: ' + esc(d.source) + '.' : '') + ' To correct or remove this page, use Report.</div><a class="btn ghost sm" style="margin-top:8px" href="#/claim/d/' + esc(d.id) + '">Is this your dargah? Claim it</a></div>') : '') +
        (about.length ? '<h2>About</h2><div class="box">' + about.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div>' : '') +
        (d.facts && d.facts.length ? '<div class="box facts">' + d.facts.map(function (f) { return '<div class="irow"><span>' + esc(f[0]) + '</span><div>' + esc(f[1]) + '</div></div>'; }).join('') + '</div>' : '') +
        (info ? '<h2>Visit and contact</h2><div class="box facts">' + info + '</div>' : '<div class="box muted">Contact details have not been added yet. The keeper can send them through <a href="#/join"><b>Join</b></a>.</div>') +
        (hasGeo ? '<div class="box mapbox" id="mapbox"><button class="btn ghost full" type="button" id="showmap" data-lat="' + d.lat + '" data-lon="' + d.lon + '">Show the map here</button><div class="muted">Loading the map shares your IP address with Google.</div></div>' : '') +
        (m ? '<a class="btn ghost full" target="_blank" rel="noopener" href="' + esc(m) + '">Open in Google Maps</a>' : '') +
        (d.events && d.events.length ? '<h2>Events</h2>' + d.events.map(function (e) { return '<div class="box"><b>' + esc(e.title) + '</b><div class="muted">' + esc(e.when) + (e.note ? '. ' + esc(e.note) : '') + '</div>' + (window.HubEngage ? HubEngage.eventNote(e) : '') + '</div>'; }).join('') : '') +
        (photos.length ? '<h2>Photos</h2><div class="gal">' + photos.map(function (g) { return '<a class="gi" href="' + esc(g.src) + '" data-lb="' + esc(g.src) + '" data-cap="' + esc(g.caption) + '"><img loading="lazy" alt="' + esc(g.caption) + '" src="' + esc(g.src) + '"></a>'; }).join('') + '</div>' : '') +
        (d.videos && d.videos.length ? '<h2>Videos</h2>' + d.videos.filter(function (v) { return /^[A-Za-z0-9_-]{11}$/.test(v.id || ''); }).map(function (v) { return '<div class="box"><a target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=' + esc(v.id) + '">▶ ' + esc(v.title) + '</a></div>'; }).join('') : '') +
        (d.sources && d.sources.length ? '<h2>Sources</h2><div class="box muted">' + d.sources.map(function (x) { var u = safeUrl(x.url); return u ? '<div><a target="_blank" rel="noopener" href="' + esc(u) + '">' + esc(x.title) + '</a></div>' : ''; }).join('') + '</div>' : '') +
        '<p class="muted">' + (d.updated ? 'Last updated ' + esc(d.updated) + '. ' : '') + 'Something wrong or out of date? <a href="#/report/d/' + esc(d.id) + '"><b>Tell us</b></a>.</p>';
    },
    shop: function (cat) {
      var known = D.categories.map(function (c) { return c.id; }), cats = D.categories.filter(function (c) { return D.products.some(function (p) { return p.cat === c.id; }); });
      D.products.forEach(function (p) { if (p.cat && known.indexOf(p.cat) < 0 && !cats.some(function (c) { return c.id === p.cat; })) cats.push({ id: p.cat, name: catName(p.cat) }); });
      var list = D.products.filter(function (p) { return !cat || p.cat === cat; });
      return '<h1>The shop</h1><p class="muted">Independent vendors sell here, from attar and books to food, clothing and gifts. ' + esc(D.platform.name) + ' does not take payment or deliver: you send an order request and pay the vendor directly.</p><input class="search" id="q" type="search" placeholder="Search products and vendors" aria-label="Search the shop"><a class="btn ghost full" href="#/offers">This week\'s offers (Thursday to Thursday)</a>' + ads('shop') +
        '<div class="chips"><a class="chip' + (!cat ? ' on' : '') + '" href="#/shop">All</a>' + cats.map(function (c) { return '<a class="chip' + (cat === c.id ? ' on' : '') + '" href="#/shop/' + esc(c.id) + '">' + esc(c.name) + '</a>'; }).join('') + '</div>' +
        '<div id="plist">' + shopGrid(list) + '</div><h2>Vendors</h2><div class="list">' + D.vendors.map(function (v) { return '<a href="#/v/' + esc(v.id) + '"><span>' + esc(v.name) + '<br><small class="muted">' + esc(v.city) + '</small></span><i>›</i></a>'; }).join('') + '</div><p class="muted">Sell something different? <a href="#/sell"><b>Sell on the hub</b></a>. Any kind of halal product or service is welcome.</p>';
    },
    product: function (id) {
      var p = D.products.filter(function (x) { return x.id === id; })[0]; if (!p) return nf(); var v = vendor(p.vendor), i0 = D.products.indexOf(p), wa = v ? String(v.whatsapp || '').replace(/\D/g, '') : '';
      var thumbs = (p.imgs || []).length > 1 ? '<div class="gal th">' + p.imgs.map(function (g, k) { return '<a class="gi" href="' + esc(g) + '" data-lb="' + esc(g) + '" data-cap="' + esc(p.name) + '"><img loading="lazy" alt="' + esc(p.name) + ' photo ' + (k + 1) + '" src="' + esc(g) + '"></a>'; }).join('') + '</div>' : '';
      var buy = '';
      if (p.live) {
        buy = p.soldOut ? '<div class="box"><b>Sold out</b><div class="muted">The vendor has marked this item as unavailable right now.</div></div>' :
          '<button class="btn full" type="button" data-add="' + esc(p.id) + '">Add to cart</button><a class="btn ghost full" href="#/cart">View cart and order</a>' +
          (p.ext ? '<a class="btn ghost full" target="_blank" rel="noopener" href="' + esc(p.ext) + '">Buy on the vendor\'s own site</a>' : '') +
          '<p class="muted">You send an order request. The vendor confirms availability and any delivery charge, then you pay the vendor directly. ' + esc(D.platform.name) + ' does not take payment.</p>';
      } else buy = '<div class="box muted">This is a sample product and cannot be ordered. Real vendor items can be ordered from the cart.</div>';
      return '<p><a href="#/shop"><b>‹ Back to the shop</b></a></p><div class="pcard"><div><div class="card">' + art(p, i0) + '</div>' + thumbs + '</div><div><h1>' + esc(p.name) + '</h1><div>' + sampleTag(p) + '</div><span class="price" style="font-size:22px;padding:3px 14px">' + money(p.price) + '</span><p>' + esc(p.desc) + '</p>' +
        (v ? '<div class="box">Sold by <a href="#/v/' + esc(v.id) + '"><b>' + esc(v.name) + '</b></a> ' + verTag(v) + '<div class="muted">' + esc(v.city) + '</div>' + (v.delivery ? '<div class="muted">Delivery: ' + esc(v.delivery) + '</div>' : '') + '</div>' : '') + buy +
        (wa && p.live ? '<a class="btn ghost full" target="_blank" rel="noopener" href="https://wa.me/' + esc(wa) + '?text=' + encodeURIComponent('Hi, I have a question about "' + p.name + '" on ' + D.platform.name + '.') + '">Ask the vendor on WhatsApp</a>' : '') +
        (window.HubEngage ? HubEngage.saveBtn(p.id) : '') + '<button class="btn ghost full" type="button" id="shr" data-t="' + esc(p.name) + '" data-x="' + esc(p.name + ' on ' + D.platform.name + ':') + '">Share this item</button>' +
        '<p class="muted">The vendor sells and delivers. Check the product and return terms with them before you pay. <a href="#/report/p/' + esc(p.raw || p.id) + '">Report this item</a></p></div></div>';
    },
    vendor: function (id) {
      var v = vendor(id); if (!v) return nf();
      return '<div class="hero"><h1>' + esc(v.name) + '</h1><p>' + esc(v.city) + '</p><div>' + sampleTag(v) + verTag(v) + '</div></div><div class="box">' + esc(v.about) + (v.delivery ? '<div class="muted">Delivery: ' + esc(v.delivery) + '</div>' : '') + '</div>' + vendorActs(v) + (v.address ? '<div class="box"><b>Visit the shop</b><div class="muted">' + esc(v.address) + '</div>' + (window.HubOffers ? HubOffers.visitRow(v) : '') + '</div>' : '') + (window.HubOffers ? HubOffers.vendorBlock(v.id) : '') + (window.HubEngage ? '<div class="two">' + HubEngage.followBtn('v', v.id, 'btn ghost') + '<button class="btn ghost" type="button" id="shr" data-t="' + esc(v.name) + '" data-x="' + esc(v.name + ' on ' + D.platform.name + ':') + '">Share</button></div>' : '') + '<h2>Products</h2><div class="grid">' + D.products.filter(function (p) { return p.vendor === id; }).map(card).join('') + '</div>' + (v.live ? '<p class="muted"><a href="#/report/v/' + esc(v.id) + '">Report this vendor</a>' + (String(v.id).indexOf('imp-') === 0 ? ' · Listed by Dargah Hub. <a href="#/claim/v/' + esc(v.id) + '"><b>Is this your shop? Claim it</b></a>' : '') + '</p>' : '');
    },
    join: function () {
      var mail = 'mailto:' + encodeURIComponent(D.platform.contact || '') + '?subject=';
      return '<div class="hero"><h1>Join ' + esc(D.platform.name) + '</h1><p>Two ways in. Both start with a short email, and we approve every listing by hand.</p></div>' +
        '<h2>Keep a dargah</h2><div class="box"><ul><li>A page with your name, photos, events, videos and map pin.</li><li>The basic listing is free. Notifications and extra media are optional.</li></ul><div class="muted">Send your dargah name, city, a short About text, photos you own, and the keeper\'s contact.</div><a class="btn full" href="' + mail + encodeURIComponent('List our dargah') + '">Email to list your dargah</a></div>' +
        '<h2>Sell as a vendor</h2><div class="box"><ul><li>Sell anything halal: products, food, clothing, books, gifts or services. Send buyers to your own checkout or WhatsApp.</li><li>A yearly listing fee. Featured placement is optional and always marked Sponsored.</li><li>You are the seller and handle delivery and returns.</li></ul><a class="btn full" href="#/sell">Sell on the hub</a></div>' +
        '<h2>How it works</h2><div class="steps"><div>You email us your details.</div><div>We check who you are and approve your listing.</div><div>Your page goes live on the hub.</div></div><p class="muted">Read the <a href="terms.html"><b>terms</b></a> first.</p>';
    },
    advertise: function () {
      return '<div class="hero"><h1>Be seen by the community</h1><p>Every ad is labelled Sponsored and never shown on Qur\'an or prayer content.</p></div>' +
        '<h2>Where your ad can appear</h2><table><tr><th>Slot</th><th>Where</th></tr><tr><td>Home banner</td><td>Top of the home page</td></tr><tr><td>Shop banner</td><td>Top of the shop</td></tr><tr><td>Featured product</td><td>First in its category</td></tr><tr><td>Dargah sponsor line</td><td>An event or page, with the dargah\'s consent</td></tr></table>' +
        '<p class="muted">Prices are set per slot. Ask for the current rate card.</p><a class="btn full" href="mailto:' + encodeURIComponent(D.platform.contact || '') + '?subject=Advertise">Ask about advertising</a>';
    }
  };
  function shopGrid(list) { return list.length ? '<div class="grid">' + list.map(function (p) { return card(p, D.products.indexOf(p)); }).join('') + '</div>' : '<div class="box">Nothing found. Vendors can <a href="#/join"><b>apply to list here</b></a>.</div>'; }
  function slug(t) { return String(t || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'other'; }
  var STATIC = null, liveAt = 0;
  function merge(live) {
    if (!STATIC) STATIC = { d: D.dargahs.slice(), v: D.vendors.slice(), p: D.products.slice(), c: D.categories.map(function (c) { return { id: c.id, name: c.name }; }) };
    D.offers = (live.offers || []).slice(); D.dargahs = STATIC.d.slice(); D.vendors = STATIC.v.slice(); D.products = STATIC.p.slice(); D.categories = STATIC.c.map(function (c) { return { id: c.id, name: c.name }; }); liveAt = Date.now();
    function paras(t) { return String(t || '').split(/\n{2,}|\s\|\|\s/).map(function (x) { return x.trim(); }).filter(Boolean); }
    (live.dargahs || []).forEach(function (g) {
      if (D.dargahs.some(function (x) { return x.id === g.id; })) return;
      D.dargahs.push({ id: g.id, name: g.name, short: g.name, city: g.city || '', tagline: g.tagline || '', about: Array.isArray(g.about) ? g.about : paras(g.about), address: g.address || '', phone: g.phone || '', whatsapp: g.whatsapp || '', email: g.email || '', website: g.website || '', map: g.map || '', lat: typeof g.lat === 'number' ? g.lat : undefined, lon: typeof g.lon === 'number' ? g.lon : undefined, timings: g.timings || [], events: g.events || [], gallery: g.gallery || [], videos: g.videos || [], updated: g.lastVerified || '', verified: !!g.verified, confirmed: !!g.confirmed, source: g.source || '', live: true });
    });
    live.vendors.forEach(function (v) { if (D.vendors.some(function (x) { return x.id === v.id; })) return; D.vendors.push({ id: v.id, name: v.name, city: v.city, address: v.address || '', map: v.map || '', about: v.about, type: v.type, shopUrl: v.shopUrl, whatsapp: v.whatsapp, phone: v.phone, verified: !!v.verified, delivery: v.delivery || '', contactEmail: v.contactEmail || '', live: true }); });
    live.products.forEach(function (p) {
      var v = vendor(p.vendorId), c = slug(p.cat); if (!v) return;
      if (!D.categories.some(function (x) { return x.id === c; })) D.categories.push({ id: c, name: String(p.cat).trim() });
      var buy = safeUrl(p.buy) || (v.whatsapp ? 'https://wa.me/' + String(v.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent('Hi, I saw "' + p.name + '" on ' + D.platform.name + ' and I am interested.') : '') || safeUrl(v.shopUrl);
      D.products.push({ id: 'f-' + p.id, raw: p.id, vendor: v.id, name: p.name, cat: c, price: p.price, desc: p.desc || '', img: p.img || (p.imgs && p.imgs[0]) || '', imgs: Array.isArray(p.imgs) ? p.imgs : [], soldOut: !!p.soldOut, ext: safeUrl(p.buy), buy: buy, live: true });
    });
  }
  function vendorActs(v) {
    var a = '', su = safeUrl(v.shopUrl), wa = String(v.whatsapp || '').replace(/\D/g, ''), ph = String(v.phone || '').replace(/[^\d+]/g, '');
    if (su) a += '<a class="btn full" target="_blank" rel="noopener" href="' + esc(su) + '">Visit their shop</a>';
    if (wa) a += '<a class="btn ghost full" target="_blank" rel="noopener" href="https://wa.me/' + esc(wa) + '">Message on WhatsApp</a>';
    if (ph) a += '<a class="btn ghost full" href="tel:' + esc(ph) + '">Call</a>';
    return a;
  }
  function nf() { return '<h2>Not found</h2><p><a href="#/">Go home</a></p>'; }

  var TITLES = { home: 'Dargah Hub', dargahs: 'Dargahs', d: 'Dargah', shop: 'Shop', p: 'Product', v: 'Vendor', tools: 'Tools', more: 'More', join: 'Join', advertise: 'Advertise', cart: 'Cart' };
  var TAB = { sell: 'more', admin: 'more', home: 'home', dargahs: 'dargahs', d: 'dargahs', shop: 'shop', p: 'shop', v: 'shop', tools: 'tools', prayer: 'tools', qibla: 'tools', tasbeeh: 'tools', duas: 'tools', calendar: 'tools', iman: 'tools', more: 'more', join: 'more', advertise: 'more', cart: 'shop', offers: 'shop', mycodes: 'shop', myoffers: 'more', adminoffers: 'more', upcoming: 'dargahs', following: 'more', saved: 'shop', order: 'more', orders: 'more', report: 'more', contact: 'more', claim: 'more', mydargah: 'more' };
  var timer = null;
  document.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'q') return; var q = e.target.value.trim().toLowerCase(), box = document.getElementById('plist'); if (!box) return;
    var list = D.products.filter(function (p) { var v = vendor(p.vendor); return !q || (p.name + ' ' + p.desc + ' ' + catName(p.cat) + ' ' + (v ? v.name : '')).toLowerCase().indexOf(q) >= 0; });
    box.innerHTML = shopGrid(list);
  });
  document.addEventListener('click', function (e) {
    var t = e.target, b;
    if ((b = t.closest && t.closest('#shr'))) { var u = location.href, tt = b.getAttribute('data-t'), tx = b.getAttribute('data-x') || tt; if (window.HubEngage) HubEngage.share(tt, tx, u); else if (navigator.share) navigator.share({ title: tt, url: u }).catch(function () {}); return; }
    if ((b = t.closest && t.closest('#showmap'))) { var la = parseFloat(b.getAttribute('data-lat')), lo = parseFloat(b.getAttribute('data-lon')); if (isFinite(la) && isFinite(lo)) b.parentNode.innerHTML = '<iframe title="Map" loading="lazy" referrerpolicy="no-referrer" src="https://www.google.com/maps?q=' + la + ',' + lo + '&z=16&output=embed" style="border:0;width:100%;height:280px;border-radius:12px"></iframe>'; return; }
    if ((b = t.closest && t.closest('[data-lb]'))) { e.preventDefault(); var o = document.createElement('div'); o.className = 'lbx'; var im = document.createElement('img'); im.src = b.getAttribute('data-lb'); im.alt = b.getAttribute('data-cap') || ''; var c = document.createElement('div'); c.textContent = b.getAttribute('data-cap') || ''; o.appendChild(im); o.appendChild(c); o.addEventListener('click', function () { o.remove(); }); document.body.appendChild(o); }
  });
  function route() {
    var rr = (location.hash || '#/').replace(/^#\/?/, '').split('/')[0];
    if (window.HubDB && HubDB.mode !== 'off' && STATIC && Date.now() - liveAt > 15000 && ['', 'shop', 'p', 'v', 'sell', 'cart', 'order', 'orders', 'offers', 'myoffers'].indexOf(rr) >= 0 && !route.busy) { route.busy = true; HubDB.live().then(merge).catch(function () {}).then(function () { route.busy = false; liveAt = Date.now(); route(); }); return; }
    var h = (location.hash || '#/').replace(/^#\/?/, '').split('/'), r = h[0] || 'home', html, title, bind = null, view = document.createElement('div');
    clearInterval(timer);
    var HS = window.HubScreens || {};
    if (T && T.screens[r]) { var sc = T.screens[r](); html = sc.html; title = sc.title; bind = sc.bind; }
    else if (HS[r]) { var sc2 = HS[r](h[1], h[2]); html = sc2.html; title = sc2.title; bind = sc2.bind; }
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
    D.platform = r[0]; D.offers = []; D.vendors = r[2]; D.products = r[3]; D.ads = r[4]; D.categories = r[5];
    return Promise.all(r[1].map(function (id) { return get('data/dargahs/' + id + '.json'); }));
  }).then(function (ds) {
    D.dargahs = ds; document.title = D.platform.name;
    window.HubApp = { stale: function () { liveAt = 0; }, cats: function () { return D.categories.map(function (c) { return c.name; }); }, D: function () { return D; }, esc: esc, money: money, vendor: vendor, safeUrl: safeUrl, route: route, card: card, dcard: dcard };
    route(); window.addEventListener('hashchange', route);
    if (window.HubDB && HubDB.mode !== 'off') return HubDB.live().then(merge).then(function () { route(); }).catch(function () {});
  }).catch(function () { app.innerHTML = '<h2>Could not load</h2><p class="muted">Check your connection and reload.</p>'; });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('OneSignalSDKWorker.js').catch(function () {});
})();
