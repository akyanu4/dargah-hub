/* Dargah Hub: a small data-driven site. All content lives in /data (JSON). No tracking, no accounts. */
(function () {
  'use strict';
  var app = document.getElementById('app'), D = {}, cache = {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) { u = String(u || ''); return /^(https:\/\/|http:\/\/|#\/|mailto:)/i.test(u) ? u : ''; }
  function money(n) { return (D.platform.currency || '') + Number(n).toLocaleString(); }
  function get(p) { return cache[p] || (cache[p] = fetch(p, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(p); return r.json(); })); }
  function sampleTag(x) { return x && x.sample ? '<span class="tag">Sample</span>' : ''; }
  function verTag(x) { return x && x.verified ? '<span class="tag">Verified</span>' : ''; }
  function ads(slot) {
    return (D.ads || []).filter(function (a) { return a.slot === slot; }).map(function (a) {
      var l = safeUrl(a.link);
      return '<div class="ad"><span class="tag">Sponsored</span>' + sampleTag(a) + '<b> ' + esc(a.title) + '</b><div class="muted">' + esc(a.text) + (a.sponsor ? ' · ' + esc(a.sponsor) : '') + '</div>' + (l ? '<a class="btn line" href="' + esc(l) + '"' + (/^http/.test(l) ? ' target="_blank" rel="noopener sponsored"' : '') + '>' + esc(a.cta || 'Learn more') + '</a>' : '') + '</div>';
    }).join('');
  }
  function art(p) { return '<div class="art" style="background:' + esc(p.color || '#ccc') + '22">' + esc(p.emoji || '🛍️') + '</div>'; }
  function vendor(id) { return (D.vendors || []).filter(function (v) { return v.id === id; })[0]; }
  function card(p) { var v = vendor(p.vendor); return '<a class="card" href="#/p/' + esc(p.id) + '">' + art(p) + '<div class="pad"><b>' + esc(p.name) + '</b><div class="price">' + money(p.price) + '</div><div class="muted">' + esc(v ? v.name : '') + '</div></div></a>'; }

  var R = {
    home: function () {
      return '<div class="hero" style="background:#0f3d3e"><h1>' + esc(D.platform.name) + '</h1><p>' + esc(D.platform.tagline) + '</p></div>' + ads('home') +
        '<h2>Dargahs</h2>' + D.dargahs.map(function (d) {
          return '<a class="card dg" href="#/d/' + esc(d.id) + '"><div class="dot" style="background:' + esc(d.color) + '">' + esc((d.short || d.name).charAt(0)) + '</div><div><b>' + esc(d.name) + '</b> ' + sampleTag(d) + verTag(d) + '<div class="muted">' + esc(d.city) + ' · ' + esc(d.tagline) + '</div></div></a>';
        }).join('') + '<h2>From the shop</h2><div class="grid">' + D.products.slice(0, 4).map(card).join('') + '</div><a class="btn line" href="#/shop">Open the shop ›</a>';
    },
    dargah: function (id) {
      var d = D.dargahs.filter(function (x) { return x.id === id; })[0]; if (!d) return nf();
      var m = safeUrl(d.map), a = safeUrl(d.app);
      return '<div class="hero" style="background:' + esc(d.color) + '"><h1>' + esc(d.name) + '</h1><p>' + esc(d.city) + ' · ' + esc(d.tagline) + '</p></div>' + sampleTag(d) + verTag(d) +
        '<div class="box">' + esc(d.about) + '</div>' + (a ? '<a class="btn gold" target="_blank" rel="noopener" href="' + esc(a) + '">Open the full app ›</a>' : '') + (m ? '<a class="btn line" target="_blank" rel="noopener" href="' + esc(m) + '">Open on Google Maps ›</a>' : '') +
        (d.events && d.events.length ? '<h2>Events</h2>' + d.events.map(function (e) { return '<div class="box"><b>' + esc(e.title) + '</b><div class="muted">' + esc(e.when) + (e.note ? ' · ' + esc(e.note) : '') + '</div></div>'; }).join('') : '') +
        (d.videos && d.videos.length ? '<h2>Videos</h2>' + d.videos.filter(function (v) { return /^[A-Za-z0-9_-]{11}$/.test(v.id || ''); }).map(function (v) { return '<div class="box"><a target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=' + esc(v.id) + '">▶ ' + esc(v.title) + '</a></div>'; }).join('') : '') +
        (d.gallery && d.gallery.length ? '<h2>Gallery</h2><div class="grid">' + d.gallery.filter(function (g) { return /^(photos\/|https:\/\/)/.test(g.src || ''); }).map(function (g) { return '<div class="card"><img alt="' + esc(g.caption) + '" loading="lazy" style="width:100%;display:block" src="' + esc(g.src) + '"><div class="pad muted">' + esc(g.caption) + '</div></div>'; }).join('') + '</div>' : '') +
        '<p class="muted">Are you the keeper of this dargah? <a href="#/join">Update your page</a>.</p>';
    },
    shop: function (cat) {
      var list = D.products.filter(function (p) { return !cat || p.cat === cat; });
      return '<h1>Shop</h1><p class="muted">Sold by independent vendors. ' + esc(D.platform.name) + ' does not handle payment or delivery: you buy directly from the vendor.</p>' + ads('shop') +
        '<div class="chips"><a class="chip' + (!cat ? ' on' : '') + '" href="#/shop">All</a>' + D.categories.map(function (c) { return '<a class="chip' + (cat === c.id ? ' on' : '') + '" href="#/shop/' + esc(c.id) + '">' + esc(c.name) + '</a>'; }).join('') + '</div>' +
        (list.length ? '<div class="grid">' + list.map(card).join('') + '</div>' : '<p class="muted">Nothing here yet.</p>');
    },
    product: function (id) {
      var p = D.products.filter(function (x) { return x.id === id; })[0]; if (!p) return nf(); var v = vendor(p.vendor), b = safeUrl(p.buy);
      return '<p><a href="#/shop">← Shop</a></p>' + art(p) + '<h1>' + esc(p.name) + ' ' + sampleTag(p) + '</h1><div class="price" style="font-size:20px">' + money(p.price) + '</div><p>' + esc(p.desc) + '</p>' +
        (v ? '<div class="box">Sold by <a href="#/v/' + esc(v.id) + '"><b>' + esc(v.name) + '</b></a> ' + verTag(v) + '<div class="muted">' + esc(v.city) + '</div></div>' : '') +
        (b ? '<a class="btn gold" target="_blank" rel="noopener" href="' + esc(b) + '">Buy from the vendor ›</a>' : '<div class="box muted">Sample product: no buy link yet. A real listing links to the vendor\'s own page or WhatsApp.</div>') +
        '<p class="muted">Sold and delivered by the vendor. Check the product and return terms with them before you pay.</p>';
    },
    vendor: function (id) {
      var v = vendor(id); if (!v) return nf();
      return '<h1>' + esc(v.name) + ' ' + sampleTag(v) + verTag(v) + '</h1><p class="muted">' + esc(v.city) + '</p><div class="box">' + esc(v.about) + '</div><h2>Products</h2><div class="grid">' + D.products.filter(function (p) { return p.vendor === id; }).map(card).join('') + '</div>';
    },
    join: function () {
      var mail = 'mailto:' + encodeURIComponent(D.platform.contact || '') + '?subject=';
      return '<h1>Join ' + esc(D.platform.name) + '</h1><div class="box"><b>List your dargah</b><ul><li>A page with your name, photos, events, videos and map pin.</li><li>Free basic listing. Extras (notifications, more media) are optional.</li><li>Send: name, city, About text, photos you own, and a contact for the keeper.</li></ul><a class="btn gold" href="' + mail + encodeURIComponent('List our dargah') + '">Email us to list your dargah</a></div>' +
        '<div class="box"><b>Become a vendor</b><ul><li>Show your products and link to your own checkout or WhatsApp.</li><li>A yearly listing fee. Optional paid featured placement, always marked Sponsored.</li><li>Every vendor is approved by hand. You are the seller and handle delivery and returns.</li></ul><a class="btn gold" href="' + mail + encodeURIComponent('Vendor listing') + '">Email us to become a vendor</a></div><p class="muted">Read the <a href="terms.html">Terms</a> first.</p>';
    },
    advertise: function () {
      return '<h1>Advertise</h1><p class="muted">Reach a respectful, community audience. Ads are always labelled "Sponsored" and never shown on Qur\'an or prayer content.</p>' +
        '<table><tr><th>Slot</th><th>Where</th></tr><tr><td>Home banner</td><td>Top of the home page</td></tr><tr><td>Shop banner</td><td>Top of the Shop</td></tr><tr><td>Featured product</td><td>First in its category</td></tr><tr><td>Dargah sponsor line</td><td>Event or page, with the dargah\'s consent</td></tr></table>' +
        '<p class="muted">Prices are set per slot. Contact us for the current rate card.</p><a class="btn gold" href="mailto:' + encodeURIComponent(D.platform.contact || '') + '?subject=Advertise">Ask about advertising</a>';
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
