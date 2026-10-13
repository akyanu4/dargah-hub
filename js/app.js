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
  var PAL = ['#e8336d', '#00a896', '#5b3df5', '#ffb703'], PBG = ['#ffd6e3', '#c4f1ea', '#d8d0ff', '#ffe9ad'];
  function art(p, i) { return '<div class="art" style="background:' + PBG[(i || 0) % 4] + '">' + esc(p.emoji || '🛍️') + '</div>'; }
  function vendor(id) { return (D.vendors || []).filter(function (v) { return v.id === id; })[0]; }
  function card(p, i) { var v = vendor(p.vendor); return '<a class="card p" href="#/p/' + esc(p.id) + '">' + art(p, i) + '<div class="pad"><b>' + esc(p.name) + '</b><span class="price">' + money(p.price) + '</span><div class="muted">' + esc(v ? v.name : '') + '</div></div></a>'; }
  function dcard(d, i) { return '<a class="card dg" href="#/d/' + esc(d.id) + '"><div class="dot" style="background:' + PAL[i % 4] + '">' + esc((d.short || d.name).charAt(0)) + '</div><div><b>' + esc(d.name) + '</b><div>' + sampleTag(d) + verTag(d) + '</div><div class="muted">' + esc(d.city) + '</div><div class="muted">' + esc(d.tagline) + '</div></div></a>'; }

  var R = {
    home: function () {
      return '<div class="hero"><h1>Every dargah. Every trusted shop.</h1><p>Find a dargah, follow its events, and buy attar, topis and prayer essentials from vendors the community knows.</p>' +
        '<div class="row"><a class="btn" href="#/shop">Browse the shop</a><a class="btn white" href="#/join">List your dargah</a></div>' +
        '<div class="arches" aria-hidden="true"><i>🕌</i><i>🌹</i><i>📿</i><i>🧢</i></div></div>' + ads('home') +
        '<h2>Dargahs on the hub</h2><div class="dgl">' + D.dargahs.map(dcard).join('') + '</div><div class="strip"></div>' +
        '<h2>Fresh in the shop</h2><div class="grid">' + D.products.slice(0, 4).map(card).join('') + '</div><a class="btn pink full" href="#/shop">See everything in the shop</a>' +
        '<h2>Join in</h2><div class="who">' +
        '<a class="tile t1" href="#/join"><em>🕌</em><b>Keep a dargah?</b><span>Get a page for your events, photos and videos. Free to start.</span></a>' +
        '<a class="tile t2" href="#/join"><em>🛍️</em><b>Sell something?</b><span>Open a vendor shop and send buyers straight to you.</span></a>' +
        '<a class="tile t3" href="#/advertise"><em>📣</em><b>Want to be seen?</b><span>Sponsor a slot and reach a respectful community.</span></a></div>';
    },
    dargah: function (id) {
      var d = D.dargahs.filter(function (x) { return x.id === id; })[0]; if (!d) return nf();
      var i = D.dargahs.indexOf(d), m = safeUrl(d.map), a = safeUrl(d.app);
      return '<div class="hero" style="background:linear-gradient(135deg,' + PAL[i % 4] + ',#17124a)"><h1>' + esc(d.name) + '</h1><p>' + esc(d.city) + '. ' + esc(d.tagline) + '</p><div>' + sampleTag(d) + verTag(d) + '</div></div>' +
        '<div class="box">' + esc(d.about) + '</div>' + (a ? '<a class="btn pink full" target="_blank" rel="noopener" href="' + esc(a) + '">Open the full app</a>' : '') + (m ? '<a class="btn white full" target="_blank" rel="noopener" href="' + esc(m) + '">Open on Google Maps</a>' : '') +
        (d.events && d.events.length ? '<h2>Events</h2>' + d.events.map(function (e) { return '<div class="box"><b>' + esc(e.title) + '</b><div class="muted">' + esc(e.when) + (e.note ? '. ' + esc(e.note) : '') + '</div></div>'; }).join('') : '') +
        (d.videos && d.videos.length ? '<h2>Videos</h2>' + d.videos.filter(function (v) { return /^[A-Za-z0-9_-]{11}$/.test(v.id || ''); }).map(function (v) { return '<div class="box"><a target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=' + esc(v.id) + '">▶ ' + esc(v.title) + '</a></div>'; }).join('') : '') +
        (d.gallery && d.gallery.length ? '<h2>Gallery</h2><div class="grid">' + d.gallery.filter(function (g) { return /^(photos\/|https:\/\/)/.test(g.src || ''); }).map(function (g) { return '<div class="card"><img alt="' + esc(g.caption) + '" loading="lazy" style="width:100%;display:block" src="' + esc(g.src) + '"><div class="pad muted">' + esc(g.caption) + '</div></div>'; }).join('') + '</div>' : '') +
        '<p class="muted">Do you keep this dargah? <a href="#/join"><b>Ask to update your page</b></a>.</p>';
    },
    shop: function (cat) {
      var list = D.products.filter(function (p) { return !cat || p.cat === cat; });
      return '<h1>The shop</h1><p class="muted">Independent vendors sell here. ' + esc(D.platform.name) + ' does not take payment or deliver: you buy straight from the vendor.</p>' + ads('shop') +
        '<div class="chips"><a class="chip' + (!cat ? ' on' : '') + '" href="#/shop">All</a>' + D.categories.map(function (c) { return '<a class="chip' + (cat === c.id ? ' on' : '') + '" href="#/shop/' + esc(c.id) + '">' + esc(c.name) + '</a>'; }).join('') + '</div>' +
        (list.length ? '<div class="grid">' + list.map(card).join('') + '</div>' : '<div class="box">Nothing in this category yet. Vendors can <a href="#/join"><b>apply to list here</b></a>.</div>');
    },
    product: function (id) {
      var p = D.products.filter(function (x) { return x.id === id; })[0]; if (!p) return nf(); var v = vendor(p.vendor), b = safeUrl(p.buy), i0 = D.products.indexOf(p);
      return '<p><a href="#/shop"><b>‹ Back to the shop</b></a></p><div class="pcard"><div class="card pa">' + '<div class="art" style="border:0;height:100%;aspect-ratio:auto;background:' + PBG[i0 % 4] + '">' + esc(p.emoji || '🛍️') + '</div>' + '</div><div><h1>' + esc(p.name) + '</h1><div>' + sampleTag(p) + '</div><span class="price" style="font-size:22px;padding:3px 14px">' + money(p.price) + '</span><p>' + esc(p.desc) + '</p>' +
        (v ? '<div class="box">Sold by <a href="#/v/' + esc(v.id) + '"><b>' + esc(v.name) + '</b></a> ' + verTag(v) + '<div class="muted">' + esc(v.city) + '</div></div>' : '') +
        (b ? '<a class="btn pink full" target="_blank" rel="noopener" href="' + esc(b) + '">Buy from the vendor</a>' : '<div class="box muted">This is a sample product with no buy link. A real listing sends buyers to the vendor\'s own page or WhatsApp.</div>') +
        '<p class="muted">The vendor sells and delivers. Check the product and return terms with them before you pay.</p></div></div>';
    },
    vendor: function (id) {
      var v = vendor(id); if (!v) return nf();
      return '<div class="hero" style="background:linear-gradient(135deg,#00a896,#17124a)"><h1>' + esc(v.name) + '</h1><p>' + esc(v.city) + '</p><div>' + sampleTag(v) + verTag(v) + '</div></div><div class="box">' + esc(v.about) + '</div><h2>Products</h2><div class="grid">' + D.products.filter(function (p) { return p.vendor === id; }).map(card).join('') + '</div>';
    },
    join: function () {
      var mail = 'mailto:' + encodeURIComponent(D.platform.contact || '') + '?subject=';
      return '<div class="hero"><h1>Join ' + esc(D.platform.name) + '</h1><p>Two ways in. Both start with a short email, and we approve every listing by hand.</p></div>' +
        '<h2>Keep a dargah</h2><div class="box"><ul><li>A page with your name, photos, events, videos and map pin.</li><li>The basic listing is free. Notifications and extra media are optional.</li></ul><div class="muted">Send your dargah name, city, a short About text, photos you own, and the keeper\'s contact.</div><a class="btn full" href="' + mail + encodeURIComponent('List our dargah') + '">Email to list your dargah</a></div>' +
        '<h2>Sell as a vendor</h2><div class="box"><ul><li>Show your products and send buyers to your own checkout or WhatsApp.</li><li>A yearly listing fee. Featured placement is optional and always marked Sponsored.</li><li>You are the seller and handle delivery and returns.</li></ul><a class="btn pink full" href="' + mail + encodeURIComponent('Vendor listing') + '">Email to become a vendor</a></div>' +
        '<h2>How it works</h2><div class="steps"><div>You email us your details.</div><div>We check who you are and approve your listing.</div><div>Your page goes live on the hub.</div></div><p class="muted">Read the <a href="terms.html"><b>terms</b></a> first.</p>';
    },
    advertise: function () {
      return '<div class="hero"><h1>Be seen by the community</h1><p>Every ad is labelled Sponsored and never shown on Qur\'an or prayer content.</p></div>' +
        '<h2>Where your ad can appear</h2><table><tr><th>Slot</th><th>Where</th></tr><tr><td>Home banner</td><td>Top of the home page</td></tr><tr><td>Shop banner</td><td>Top of the shop</td></tr><tr><td>Featured product</td><td>First in its category</td></tr><tr><td>Dargah sponsor line</td><td>An event or page, with the dargah\'s consent</td></tr></table>' +
        '<p class="muted">Prices are set per slot. Ask for the current rate card.</p><a class="btn pink full" href="mailto:' + encodeURIComponent(D.platform.contact || '') + '?subject=Advertise">Ask about advertising</a>';
    }
  };
  function nf() { return '<h1>Not found</h1><p><a href="#/">Go home</a></p>'; }

  function route() {
    var h = (location.hash || '#/').replace(/^#\/?/, '').split('/'), r = h[0], html;
    if (r === 'd') html = R.dargah(h[1]); else if (r === 'shop') html = R.shop(h[1]); else if (r === 'p') html = R.product(h[1]);
    else if (r === 'v') html = R.vendor(h[1]); else if (r === 'join') html = R.join(); else if (r === 'advertise') html = R.advertise(); else html = R.home();
    app.innerHTML = html; window.scrollTo(0, 0);
    var on = r === 'shop' || r === 'p' || r === 'v' ? 'shop' : r === 'join' || r === 'advertise' ? 'join' : 'home';
    [].forEach.call(document.querySelectorAll('.top nav a'), function (a) { a.classList.toggle('on', a.getAttribute('data-n') === on); });
  }
  Promise.all([get('data/platform.json'), get('data/dargahs/index.json'), get('data/vendors.json'), get('data/products.json'), get('data/ads.json'), get('data/categories.json')]).then(function (r) {
    D.platform = r[0]; D.vendors = r[2]; D.products = r[3]; D.ads = r[4]; D.categories = r[5];
    return Promise.all(r[1].map(function (id) { return get('data/dargahs/' + id + '.json'); }));
  }).then(function (ds) {
    D.dargahs = ds; document.title = D.platform.name; document.getElementById('brand').textContent = D.platform.name;
    document.getElementById('fine').textContent = D.platform.note || ''; route(); window.addEventListener('hashchange', route);
  }).catch(function () { app.innerHTML = '<h1>Could not load</h1><p class="muted">Check your connection and reload.</p>'; });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
