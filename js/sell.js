/* Dargah Hub vendor portal (#/sell) and admin approvals (#/admin). */
(function (root) {
  'use strict';
  var DB = root.HubDB, S = root.HubScreens = root.HubScreens || {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function https(u) { u = String(u || '').trim(); return /^https:\/\/[^\s]+\.[^\s]+$/i.test(u) ? u : ''; }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function cur(n) { return root.HubApp ? root.HubApp.money(n) : String(n); }
  function field(id, label, val, attrs, hint) { return '<label class="fld">' + esc(label) + '<input id="' + id + '" value="' + esc(val) + '" ' + (attrs || '') + '>' + (hint ? '<small class="muted">' + esc(hint) + '</small>' : '') + '</label>'; }
  function area(id, label, val, max) { return '<label class="fld">' + esc(label) + '<textarea id="' + id + '" rows="4" maxlength="' + max + '">' + esc(val) + '</textarea></label>'; }
  function msg(t, ok) { return '<div class="note ' + (ok ? 'ok' : 'err') + '" role="status">' + esc(t) + '</div>'; }

  function compress(file) {
    return new Promise(function (res, rej) {
      if (!/^image\//.test(file.type)) return rej(new Error('Please choose a photo (JPG or PNG).'));
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 640, r = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        var q = 0.72, out = c.toDataURL('image/jpeg', q); while (out.length > 130000 && q > 0.3) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
        out.length > 130000 ? rej(new Error('That photo is too detailed. Try a smaller one.')) : res(out);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('That photo could not be read.')); };
      img.src = url;
    });
  }

  S.sell = function () {
    return { title: 'Sell here', html: '<div id="sv"><div class="box muted">Loading…</div></div>', bind: function (view) { var sv = view.querySelector('#sv'); new Portal(sv).start(); } };
  };

  function Portal(el) { this.el = el; this.mode = 'signin'; this.note = ''; this.edit = null; this.vendor = undefined; this.user = null; this.tab = 'orders'; this.orders = null; this.imgs = []; }
  Portal.prototype.start = function () {
    var self = this;
    if (DB.mode === 'off') { el(self).innerHTML = intro() + '<div class="box">Vendor accounts are not switched on yet. To list your shop now, <a href="mailto:?subject=Vendor listing"><b>email us</b></a> and we will add you by hand.</div>'; return; }
    self.el.addEventListener('click', function (e) { self.click(e); }); self.el.addEventListener('submit', function (e) { e.preventDefault(); self.submit(e.target); }); self.el.addEventListener('change', function (e) { self.changed(e); });
    DB.onAuth(function (u) { self.user = u; self.vendor = undefined; self.orders = null; self.products = null; self.draw(); });
  };
  function el(p) { return p.el; }
  function intro() {
    return '<div class="hero"><h1>Sell on Dargah Hub</h1><p>Reach a community that already trusts this place. There are two ways to start.</p></div>' +
      '<div class="who"><div class="tile"><b>I already have a shop</b><span>List it here. Buyers see your shop and go straight to your own website, Instagram or WhatsApp.</span></div><div class="tile"><b>I do not have a shop</b><span>Create one here. Add your items with photos and prices, and buyers contact you on WhatsApp.</span></div></div>';
  }
  Portal.prototype.draw = function () {
    var self = this;
    if (!self.user) { self.el.innerHTML = intro() + authForm(self.mode) + (self.note || ''); return; }
    if (self.vendor === undefined) {
      self.el.innerHTML = '<div class="box muted">Loading your shop…</div>';
      DB.myVendor().then(function (v) { self.vendor = v; self.draw(); }).catch(function (e) { self.el.innerHTML = msg('Could not load your shop. ' + e.message); });
      return;
    }
    var v = self.vendor, top = '<div class="who2"><span class="muted">Signed in as ' + esc(self.user.email || '') + '</span><button class="btn ghost sm" data-a="out" type="button">Sign out</button></div>';
    if (!v || self.edit === 'profile') { self.el.innerHTML = top + profileForm(v) + (self.note || ''); return; }
    var st = v.status === 'approved' ? '<span class="tag v">Approved</span>' : v.status === 'rejected' ? '<span class="tag">Not approved</span>' : '<span class="tag">Waiting for approval</span>';
    var head = top + '<h1>' + esc(v.name) + '</h1><div>' + st + '<span class="tag">' + (v.type === 'shop' ? 'Has a shop' : 'Sells here') + '</span></div>' +
      (v.status === 'pending' ? '<div class="box">Thank you. We check every new vendor by hand. You can edit your details while you wait, and add items once you are approved.</div>' : '') +
      (v.status === 'rejected' ? '<div class="box">This listing was not approved. Please email us if you think this is a mistake.</div>' : '') +
      '<div class="acts"><button class="act" data-a="editp" type="button"><i>✎</i>Edit details</button><a class="act" href="#/v/' + esc(v.id) + '"><i>👁</i>View my page</a></div>';
    if (v.status !== 'approved') { self.el.innerHTML = head + (self.note || ''); return; }
    if (!self.orders) { self.el.innerHTML = head + '<div class="box muted">Loading…</div>'; DB.vendorOrders().then(function (o) { o.sort(function (x, y) { return (y.createdAt || 0) - (x.createdAt || 0); }); self.orders = o; self.draw(); }).catch(function (e) { self.orders = []; self.note = msg('Could not load orders. ' + e.message); self.draw(); }); return; }
    if (!self.products) { self.el.innerHTML = head + '<div class="box muted">Loading your items…</div>'; DB.myProducts().then(function (p) { self.products = p; self.draw(); }).catch(function (e) { self.el.innerHTML = head + msg('Could not load items. ' + e.message); }); return; }
    var open = self.orders.filter(function (o) { return o.status === 'new'; }).length;
    var tabs = '<div class="tabs" role="tablist"><button type="button" role="tab" class="' + (self.tab === 'orders' ? 'on' : '') + '" data-a="tab" data-t="orders">Orders' + (open ? ' <span class="cnt">' + open + '</span>' : '') + '</button><button type="button" role="tab" class="' + (self.tab === 'items' ? 'on' : '') + '" data-a="tab" data-t="items">Items (' + self.products.length + ')</button></div>';
    var body = '';
    if (self.tab === 'orders') {
      body = '<div class="who2"><h2 style="margin:6px 0">Order requests</h2><button class="btn ghost sm" type="button" data-a="refresh">Refresh</button></div>' +
        (self.orders.length ? self.orders.map(orderRow).join('') : '<div class="box muted">No orders yet. Share your page so buyers can find you. New orders appear here, and buyers can also message you on WhatsApp.</div>');
    } else {
      var items = self.products.map(function (p) {
        return '<div class="mi"><div class="mt">' + (p.img ? '<img alt="" src="' + esc(p.img) + '">' : '<span>No photo</span>') + '</div><div class="mb"><b>' + esc(p.name) + '</b><div class="muted">' + esc(p.cat) + ' · ' + esc(p.price) + (p.hidden ? ' · hidden' : '') + (p.soldOut ? ' · sold out' : '') + '</div><div class="mr"><button class="btn ghost sm" data-a="edit" data-id="' + esc(p.id) + '" type="button">Edit</button><button class="btn ghost sm" data-a="sold" data-id="' + esc(p.id) + '" type="button">' + (p.soldOut ? 'Back in stock' : 'Sold out') + '</button><button class="btn ghost sm" data-a="del" data-id="' + esc(p.id) + '" type="button">Delete</button></div></div></div>';
      }).join('');
      body = '<h2>' + (v.type === 'shop' ? 'Featured items (optional)' : 'Your items') + '</h2>' + (v.type === 'shop' ? '<p class="muted">Your shop link is on your page already. Add a few items here if you want them to appear in the Hub shop.</p>' : '') +
        (self.edit && self.edit !== 'profile' ? productForm(self.edit === 'new' ? null : self.products.filter(function (p) { return p.id === self.edit; })[0]) : '<button class="btn full" data-a="new" type="button">Add an item</button>') + (items || '<div class="box muted">No items yet.</div>');
    }
    self.el.innerHTML = head + tabs + body + (self.note || ''); self.note = '';
  };
  var NEXT = { new: [['confirmed', 'Confirm order'], ['cancelled', 'Cancel']], confirmed: [['shipped', 'Mark shipped or ready'], ['cancelled', 'Cancel']], shipped: [['delivered', 'Mark delivered']], delivered: [], cancelled: [] };
  var ST = { new: 'New', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
  function orderRow(o) {
    var wa = digits(o.buyerPhone), t = o.createdAt ? new Date(o.createdAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    return '<div class="box oc' + (o.status === 'new' ? ' newo' : '') + '"><div><span class="tag' + (o.status === 'new' ? '' : o.status === 'cancelled' ? '' : ' v') + '">' + esc(ST[o.status] || o.status) + '</span> <span class="muted">' + esc(t) + '</span></div>' +
      '<b>' + esc(o.buyerName) + '</b>' +
      (o.items || []).map(function (i) { return '<div class="cl"><div class="cb">' + esc(i.qty) + ' × ' + esc(i.name) + '</div><div class="ct">' + esc(cur(i.price * i.qty)) + '</div></div>'; }).join('') +
      '<div class="cl tot"><div class="cb"><b>Total of items</b></div><div class="ct"><b>' + esc(cur(o.total)) + '</b></div></div>' +
      '<div class="muted">Deliver to: ' + esc(o.buyerAddress) + '</div>' + (o.note ? '<div class="muted">Note: ' + esc(o.note) + '</div>' : '') +
      '<div class="mr"><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(wa) + '?text=' + encodeURIComponent('Hello ' + o.buyerName + ', this is about your order ' + o.id + ' on Dargah Hub.') + '">WhatsApp buyer</a><a class="btn ghost sm" href="tel:' + esc(String(o.buyerPhone).replace(/[^\d+]/g, '')) + '">Call</a></div>' +
      '<div class="mr">' + (NEXT[o.status] || []).map(function (n) { return '<button class="btn ' + (n[0] === 'cancelled' ? 'ghost ' : '') + 'sm" type="button" data-a="ost" data-id="' + esc(o.id) + '" data-s="' + n[0] + '">' + n[1] + '</button>'; }).join('') + '</div>' +
      '<div class="muted">Order ID ' + esc(o.id) + '</div></div>';
  }
  function authForm(mode) {
    return '<form class="box" id="authf"><b>' + (mode === 'signup' ? 'Create your vendor account' : 'Sign in to your vendor account') + '</b>' +
      '<button class="btn ghost full" type="button" data-a="google">Continue with Google</button><div class="muted center">or use email</div>' +
      field('em', 'Email', '', 'type="email" autocomplete="email" required') + field('pw', 'Password', '', 'type="password" minlength="6" autocomplete="' + (mode === 'signup' ? 'new-password' : 'current-password') + '" required') +
      '<button class="btn full" type="submit">' + (mode === 'signup' ? 'Create account' : 'Sign in') + '</button>' +
      '<div class="muted center">' + (mode === 'signup' ? 'Have an account? <a href="#" data-a="tosignin"><b>Sign in</b></a>' : 'New here? <a href="#" data-a="tosignup"><b>Create an account</b></a> · <a href="#" data-a="forgot">Forgot password</a>') + '</div></form>';
  }
  function profileForm(v) {
    v = v || {}; var t = v.type || 'direct';
    return '<form class="box" id="pf"><b>' + (v.name ? 'Edit your details' : 'Tell us about your business') + '</b>' +
      '<div class="fld">What describes you?<label class="rd"><input type="radio" name="type" value="shop"' + (t === 'shop' ? ' checked' : '') + '> I already have a shop (website, Instagram, Facebook or WhatsApp)</label><label class="rd"><input type="radio" name="type" value="direct"' + (t !== 'shop' ? ' checked' : '') + '> I do not have a shop. I will add my items here.</label></div>' +
      field('vn', 'Business or shop name', v.name, 'maxlength="80" required') + field('vc', 'City', v.city, 'maxlength="60" required') + area('va', 'About you and what you sell', v.about, 500) +
      field('vs', 'Shop link (starts with https://)', v.shopUrl, 'inputmode="url" placeholder="https://"', 'Required if you already have a shop.') +
      field('vw', 'WhatsApp number with country code', v.whatsapp, 'inputmode="tel" placeholder="919876543210"', 'Buyers and order messages reach you here. Required if you sell items on Dargah Hub.') +
      field('vd', 'Delivery and pickup', v.delivery, 'maxlength="200"', 'For example: Delivery in Hyderabad Rs 50, free above Rs 1000. Pickup at the shop. Ships India-wide in 3 to 5 days.') +
      field('vp', 'Phone (optional)', v.phone, 'inputmode="tel"') + field('ve', 'Contact email (optional)', v.contactEmail, 'type="email"') +
      '<p class="muted">By saving you agree to the <a href="terms.html" target="_blank"><b>vendor terms</b></a>. You are the seller: you confirm orders, deliver, collect payment and handle returns.</p><button class="btn full" type="submit">Save</button></form>';
  }
  function productForm(p) {
    p = p || {}; var cats = (root.HubApp && root.HubApp.cats()) || [];
    return '<form class="box" id="prf"' + (p.id ? ' data-id="' + esc(p.id) + '"' : '') + '><b>' + (p.id ? 'Edit item' : 'New item') + '</b>' + field('pn', 'Name', p.name, 'maxlength="80" required') +
      '<label class="fld">Category<input id="pc" list="cl" value="' + esc(p.cat) + '" maxlength="40" required placeholder="For example Attar, Food, Clothing, Services"><datalist id="cl">' + cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist><small class="muted">Pick one or type your own.</small></label>' +
      field('pr', 'Price', p.price, 'type="number" min="0" step="1" required inputmode="numeric"') + area('pd', 'Description', p.desc, 500) +
      '<div class="fld">Photos (up to 3, the first is the cover)<div id="ph" class="phs"></div><input id="pi" type="file" accept="image/*"><small class="muted">A clear photo on a plain background sells best. It is resized on your phone.</small></div>' +
      field('pb', 'Buy link (optional, https://)', p.buy, 'inputmode="url"', 'Leave empty to let buyers contact you on WhatsApp.') +
      '<label class="rd"><input type="checkbox" id="psd"' + (p.soldOut ? ' checked' : '') + '> Sold out right now</label><label class="rd"><input type="checkbox" id="phd"' + (p.hidden ? ' checked' : '') + '> Hide this item for now</label>' +
      '<button class="btn full" type="submit">Save item</button><button class="btn ghost full" type="button" data-a="cancel">Cancel</button></form>';
  }
  Portal.prototype.imgView = function () {
    var box = document.getElementById('ph'); if (!box) return; var self = this;
    box.innerHTML = self.imgs.map(function (d, i) { return '<span class="pvw"><img class="pv" alt="" src="' + d + '"><button type="button" data-a="rmimg" data-i="' + i + '" aria-label="Remove photo">×</button></span>'; }).join('');
  };
  Portal.prototype.changed = function (e) {
    var self = this; if (e.target.id !== 'pi' || !e.target.files[0]) return;
    if (self.imgs.length >= 3) { e.target.value = ''; return self.flash('You can add up to 3 photos. Remove one first.'); }
    compress(e.target.files[0]).then(function (d) { self.imgs.push(d); e.target.value = ''; self.imgView(); }).catch(function (er) { e.target.value = ''; self.flash(er.message); });
  };
  Portal.prototype.flash = function (t, ok) { var n = this.el.querySelector('.note'); if (n) n.remove(); this.el.insertAdjacentHTML('beforeend', msg(t, ok)); };
  Portal.prototype.click = function (e) {
    var self = this, b = e.target.closest && e.target.closest('[data-a]'); if (!b) return; var a = b.getAttribute('data-a'); if (b.tagName === 'A') e.preventDefault();
    var guard = function (p) { return p.then(null, function (er) { self.note = msg(er.message || 'Something went wrong.'); self.draw(); }); };
    if (a === 'google') guard(DB.signInGoogle());
    else if (a === 'tosignup') { self.mode = 'signup'; self.note = ''; self.draw(); } else if (a === 'tosignin') { self.mode = 'signin'; self.note = ''; self.draw(); }
    else if (a === 'forgot') { var em = (document.getElementById('em') || {}).value; if (!em) { self.flash('Type your email above first.'); return; } guard(DB.reset(em).then(function () { self.flash('If that email has an account, a reset link is on its way.', true); })); }
    else if (a === 'out') { self.products = null; self.vendor = undefined; self.edit = null; DB.signOut(); }
    else if (a === 'tab') { self.tab = b.getAttribute('data-t'); self.edit = null; self.note = ''; self.draw(); }
    else if (a === 'refresh') { self.orders = null; self.draw(); }
    else if (a === 'rmimg') { self.imgs.splice(parseInt(b.getAttribute('data-i'), 10), 1); self.imgView(); }
    else if (a === 'ost') { var id = b.getAttribute('data-id'), st = b.getAttribute('data-s'); if (st === 'cancelled' && !confirm('Cancel this order?')) return; b.disabled = true; guard(DB.setOrderStatus(id, st).then(function () { self.orders = null; self.draw(); })); }
    else if (a === 'sold') { var pid = b.getAttribute('data-id'), pr = self.products.filter(function (x) { return x.id === pid; })[0]; if (!pr) return; var np = Object.assign({}, pr, { soldOut: !pr.soldOut }); guard(DB.saveProduct(np).then(function () { if (root.HubApp) root.HubApp.stale(); self.products = null; self.draw(); })); }
    else if (a === 'editp') { self.edit = 'profile'; self.note = ''; self.draw(); } else if (a === 'new') { self.edit = 'new'; self.imgs = []; self.draw(); self.imgView(); } else if (a === 'cancel') { self.edit = null; self.draw(); }
    else if (a === 'edit') { self.edit = b.getAttribute('data-id'); var ep = self.products.filter(function (x) { return x.id === self.edit; })[0] || {}; self.imgs = (ep.imgs && ep.imgs.length ? ep.imgs : (ep.img ? [ep.img] : [])).slice(0, 3); self.draw(); self.imgView(); }
    else if (a === 'del') { if (confirm('Delete this item?')) guard(DB.deleteProduct(b.getAttribute('data-id')).then(function () { if (root.HubApp) root.HubApp.stale(); self.products = null; self.note = msg('Item deleted.', true); self.draw(); })); }
  };
  Portal.prototype.submit = function (f) {
    var self = this, g = function (id) { return (document.getElementById(id) || {}).value || ''; };
    var fail = function (er) { self.flash(er.message || 'Something went wrong.'); };
    if (f.id === 'authf') { var fn = self.mode === 'signup' ? DB.signUp : DB.signIn; fn(g('em').trim(), g('pw')).catch(function (er) { self.note = msg(er.message.replace('Firebase: ', '')); self.draw(); }); return; }
    if (f.id === 'pf') {
      var type = (f.querySelector('input[name=type]:checked') || {}).value || 'direct', shop = g('vs').trim(), wa = digits(g('vw'));
      if (type === 'shop' && !https(shop)) return self.flash('Add your shop link. It must start with https://');
      if (shop && !https(shop)) return self.flash('The shop link must start with https://');
      if (type === 'direct' && wa.length < 8) return self.flash('Add your WhatsApp number with country code so buyers can reach you.');
      var d = { name: g('vn').trim(), city: g('vc').trim(), about: g('va').trim(), type: type, shopUrl: shop, whatsapp: wa, phone: g('vp').trim(), contactEmail: g('ve').trim(), delivery: g('vd').trim() };
      if (d.name.length < 2) return self.flash('Add your business name.');
      DB.saveVendor(d).then(function () { if (root.HubApp) root.HubApp.stale(); self.vendor = undefined; self.edit = null; self.note = msg('Saved.', true); self.draw(); }).catch(fail); return;
    }
    if (f.id === 'prf') {
      var price = parseFloat(g('pr')), buy = g('pb').trim();
      if (!(price >= 0)) return self.flash('Add a price.'); if (buy && !https(buy)) return self.flash('The buy link must start with https://');
      var p = { name: g('pn').trim(), cat: g('pc').trim(), price: price, desc: g('pd').trim(), img: self.imgs[0] || '', imgs: self.imgs.slice(0, 3), buy: buy, hidden: !!document.getElementById('phd').checked, soldOut: !!document.getElementById('psd').checked };
      if (f.getAttribute('data-id')) p.id = f.getAttribute('data-id');
      DB.saveProduct(p).then(function () { if (root.HubApp) root.HubApp.stale(); self.products = null; self.edit = null; self.note = msg('Item saved.', true); self.draw(); }).catch(fail);
    }
  };

  S.admin = function () {
    return { title: 'Admin', html: '<div id="ad"><div class="box muted">Loading…</div></div>', bind: function (view) {
      var box = view.querySelector('#ad'), tab = 'vendors', cache = {};
      if (DB.mode === 'off') { box.innerHTML = '<div class="box">Accounts are not switched on.</div>'; return; }
      function when(ms) { try { return ms ? new Date(ms).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; } catch (e) { return ''; } }
      function tabs(c) { return '<div class="tabs"><button type="button" data-t="vendors" class="' + (tab === 'vendors' ? 'on' : '') + '">Vendors' + (c.pend ? ' <span class="cnt">' + c.pend + '</span>' : '') + '</button><button type="button" data-t="orders" class="' + (tab === 'orders' ? 'on' : '') + '">Orders' + (c.ords ? ' <span class="cnt">' + c.ords + '</span>' : '') + '</button><button type="button" data-t="dargahs" class="' + (tab === 'dargahs' ? 'on' : '') + '">Dargahs</button><button type="button" data-t="claims" class="' + (tab === 'claims' ? 'on' : '') + '">Claims' + (c.cls ? ' <span class="cnt">' + c.cls + '</span>' : '') + '</button><button type="button" data-t="leads" class="' + (tab === 'leads' ? 'on' : '') + '">Requests' + (c.leads ? ' <span class="cnt">' + c.leads + '</span>' : '') + '</button><button type="button" data-t="reports" class="' + (tab === 'reports' ? 'on' : '') + '">Reports' + (c.reps ? ' <span class="cnt">' + c.reps + '</span>' : '') + '</button><button type="button" data-t="import" class="' + (tab === 'import' ? 'on' : '') + '">Import</button></div>'; }
      function vendorsHtml(vs) {
        var order = { pending: 0, approved: 1, rejected: 2 }; vs.sort(function (a, b) { return (order[a.status] || 0) - (order[b.status] || 0); });
        return vs.map(function (v) { return '<div class="box"><b>' + esc(v.name) + '</b> <span class="tag">' + esc(v.status) + '</span>' + (v.verified ? '<span class="tag v">Verified</span>' : '') + '<div class="muted">' + esc(v.city) + ' · ' + (v.type === 'shop' ? 'has a shop' : 'sells here') + '</div><div class="muted">' + esc(v.about) + '</div>' + (v.shopUrl ? '<div><a href="' + esc(v.shopUrl) + '" target="_blank" rel="noopener">' + esc(v.shopUrl) + '</a></div>' : '') + '<div class="muted">WhatsApp ' + esc(v.whatsapp) + ' ' + esc(v.phone || '') + ' ' + esc(v.contactEmail || '') + '</div><div class="mr"><button class="btn sm" data-s="approved" data-id="' + esc(v.id) + '" type="button">Approve</button><button class="btn ghost sm" data-s="rejected" data-id="' + esc(v.id) + '" type="button">Reject</button><button class="btn ghost sm" data-s="pending" data-id="' + esc(v.id) + '" type="button">Pause</button>' + (String(v.id).indexOf('imp-') === 0 ? '<button class="btn ghost sm" data-dv="' + esc(v.id) + '" type="button">Delete vendor and items</button>' : '') + '<button class="btn ghost sm" data-vf="' + (v.verified ? '0' : '1') + '" data-id="' + esc(v.id) + '" type="button">' + (v.verified ? 'Remove badge' : 'Give Verified badge') + '</button></div></div>'; }).join('') || '<div class="box muted">No vendors yet.</div>';
      }
      function leadsHtml(ls) {
        ls.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        return ls.map(function (l) { return '<div class="box"><span class="tag">' + esc(l.kind) + '</span><span class="tag' + (l.status === 'new' ? '' : ' v') + '">' + esc(l.status) + '</span> <span class="muted">' + esc(when(l.createdAt)) + '</span><div><b>' + esc(l.name) + '</b> ' + esc(l.city || '') + '</div><div class="muted">' + esc(l.phone || '') + ' ' + esc(l.email || '') + (l.slot ? ' · ' + esc(l.slot) : '') + '</div><div style="white-space:pre-wrap">' + esc(l.message) + '</div><div class="mr">' + (digits(l.phone) ? '<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(digits(l.phone)) + '">WhatsApp</a>' : '') + (l.email ? '<a class="btn ghost sm" href="mailto:' + esc(l.email) + '">Email</a>' : '') + '<button class="btn ghost sm" type="button" data-l="' + (l.status === 'new' ? 'done' : 'new') + '" data-id="' + esc(l.id) + '">' + (l.status === 'new' ? 'Mark done' : 'Reopen') + '</button></div></div>'; }).join('') || '<div class="box muted">No requests yet.</div>';
      }
      function reportsHtml(rs) {
        rs.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        return rs.map(function (r) { var link = r.targetType === 'p' ? '' : r.targetType === 'v' ? '#/v/' + r.targetId : r.targetType === 'd' ? '#/d/' + r.targetId : '#/order/' + r.targetId;
          return '<div class="box"><span class="tag">' + esc({ p: 'item', v: 'vendor', d: 'dargah', o: 'order' }[r.targetType] || r.targetType) + '</span><span class="tag' + (r.status === 'new' ? '' : ' v') + '">' + esc(r.status) + '</span> <span class="muted">' + esc(when(r.createdAt)) + '</span><div><b>' + esc(r.targetName || r.targetId) + '</b> · ' + esc(r.reason) + '</div><div style="white-space:pre-wrap">' + esc(r.details) + '</div><div class="muted">' + esc(r.contact || '') + '</div><div class="mr">' + (link ? '<a class="btn ghost sm" href="' + esc(link) + '">Open</a>' : '') + (r.targetType === 'p' ? '<button class="btn sm" type="button" data-hp="' + esc(r.targetId) + '" data-id="' + esc(r.id) + '">Hide this item</button>' : '') + '<button class="btn ghost sm" type="button" data-r="' + (r.status === 'new' ? 'done' : 'new') + '" data-id="' + esc(r.id) + '">' + (r.status === 'new' ? 'Mark handled' : 'Reopen') + '</button></div></div>'; }).join('') || '<div class="box muted">No reports.</div>';
      }
      function ordersHtml(os) {
        os.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        return '<p class="muted">All order requests. Vendors who sign in also see their own. Imported vendors have no sign-in, so you handle their orders here.</p>' + (os.map(function (o) { return '<div class="muted" style="margin-top:12px"><b>' + esc(o.vendorName || o.vendorId) + '</b></div>' + orderRow(o); }).join('') || '<div class="box muted">No orders yet.</div>');
      }
      var pack = null, imsg = '';
      function importHtml() {
        return '<h2 style="margin-top:6px">Bulk import</h2><div class="box"><p>Add many vendors and items at once. Use one row per item: the vendor columns repeat on each row. In Excel or Google Sheets, save the file as <b>CSV (UTF-8)</b>.</p><button class="btn ghost sm" type="button" data-dl="v">Vendors template</button> <button class="btn ghost sm" type="button" data-dl="d">Dargahs template</button>' +
          '<p class="muted"><b>Dargah file</b> columns: <b>dargah_name</b>, city, tagline, about (use || between paragraphs), address, phone, whatsapp, email, website, map_url, latitude, longitude, timings (Label: time; Label: time), events (Title | When; Title | When), videos (YouTube link | title), photo1_url, photo1_caption (up to photo6), source, confirmed, verified, last_verified. The file type is detected from the first column names.</p><p class="muted"><b>Vendor file</b> columns: <b>vendor_name</b>, city, <b>whatsapp</b> (with country code), phone, email, about, delivery, <b>item_name</b>, category, <b>price</b>, description, image_url (https link, optional), sold_out (yes or no). Uploading the same names again updates them instead of adding copies.</p>' +
          '<label class="fld">CSV file<input id="imf" type="file" accept=".csv,text/csv"></label>' +
          '<label class="rd"><input type="checkbox" id="imap" checked><span>Approve these vendors now (they go live in the shop)</span></label><label class="rd"><input type="checkbox" id="imv"><span>Give them the Verified badge</span></label></div><div id="imr">' + (imsg || '') + '</div>';
      }
      function dargahsHtml(gs) {
        gs.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
        return '<p class="muted">Dargah pages in the database. Hidden pages are not shown to visitors. Add or update many at once from the Import tab.</p>' + (gs.map(function (g) {
          return '<div class="box"><b>' + esc(g.name) + '</b> ' + (g.hidden ? '<span class="tag">Hidden</span>' : '') + (g.verified ? '<span class="tag v">Verified</span>' : '') + (g.confirmed ? '<span class="tag v">Confirmed</span>' : '<span class="tag">Not confirmed</span>') + (g.ownerUid ? '<span class="tag v">Claimed</span>' : '') +
            '<div class="muted">' + esc(g.city || '') + (g.source ? ' · Source: ' + esc(g.source) : '') + (g.lastVerified ? ' · Verified ' + esc(g.lastVerified) : '') + '</div>' +
            '<div class="mr"><a class="btn ghost sm" href="#/d/' + esc(g.id) + '">Open</a><button class="btn ghost sm" type="button" data-gx="hidden" data-v="' + (g.hidden ? '0' : '1') + '" data-id="' + esc(g.id) + '">' + (g.hidden ? 'Show' : 'Hide') + '</button><button class="btn ghost sm" type="button" data-gx="verified" data-v="' + (g.verified ? '0' : '1') + '" data-id="' + esc(g.id) + '">' + (g.verified ? 'Remove badge' : 'Verified badge') + '</button><button class="btn ghost sm" type="button" data-gx="confirmed" data-v="' + (g.confirmed ? '0' : '1') + '" data-id="' + esc(g.id) + '">' + (g.confirmed ? 'Mark unconfirmed' : 'Mark confirmed') + '</button><button class="btn ghost sm" type="button" data-gdel="' + esc(g.id) + '">Delete</button></div></div>';
        }).join('') || '<div class="box muted">No dargah pages yet. Use the Import tab.</div>');
      }
      function claimsHtml(cs) {
        cs.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        return '<p class="muted">People asking to take over a page you listed. Check with the dargah or shop (call the number they gave, or a number you already know) before approving.</p>' + (cs.map(function (c) {
          return '<div class="box"><span class="tag">' + (c.targetType === 'd' ? 'dargah' : 'shop') + '</span><span class="tag' + (c.status === 'new' ? '' : ' v') + '">' + esc(c.status) + '</span> <span class="muted">' + esc(when(c.createdAt)) + '</span><div><b>' + esc(c.targetName) + '</b></div><div>' + esc(c.name) + ' · ' + esc(c.phone) + ' · ' + esc(c.email || '') + '</div><div style="white-space:pre-wrap">' + esc(c.message) + '</div>' +
            '<div class="mr">' + (digits(c.phone) ? '<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(digits(c.phone)) + '">WhatsApp</a><a class="btn ghost sm" href="tel:' + esc(String(c.phone).replace(/[^\d+]/g, '')) + '">Call</a>' : '') +
            (c.status === 'new' ? '<button class="btn sm" type="button" data-ca="approved" data-id="' + esc(c.id) + '">Approve</button><button class="btn ghost sm" type="button" data-ca="rejected" data-id="' + esc(c.id) + '">Reject</button>' : '') + '</div></div>';
        }).join('') || '<div class="box muted">No claims yet.</div>');
      }
      function ytId(v) { v = String(v || '').trim(); if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v; var m = /(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/.exec(v); return m ? m[1] : ''; }
      function buildDargahPack(rows, head) {
        var errs = [], list = [], seen = {};
        rows.slice(1).forEach(function (r, k) {
          var n = k + 2, g = function (key) { var i = head.indexOf(key); return i < 0 ? '' : String(r[i] == null ? '' : r[i]).trim(); }, bad = [];
          var name = g('dargah_name'), city = g('city'), tag = g('tagline'), about = g('about').replace(/\s*\|\|\s*/g, '\n\n'), addr = g('address'), wa = digits(g('whatsapp')), web = g('website'), map = g('map_url'), la = g('latitude'), lo = g('longitude');
          if (name.length < 2 || name.length > 80) bad.push('dargah_name must be 2 to 80 characters');
          if (city.length > 60) bad.push('city is too long (max 60)'); if (tag.length > 120) bad.push('tagline is too long (max 120)'); if (about.length > 3000) bad.push('about is too long (max 3000)'); if (addr.length > 200) bad.push('address is too long (max 200)');
          if (g('phone').length > 30) bad.push('phone is too long'); if (wa && (wa.length < 8 || wa.length > 15)) bad.push('whatsapp must be 8 to 15 digits with country code'); if (g('email').length > 120) bad.push('email is too long');
          if (web && !/^https:\/\/[^\s]+$/i.test(web)) bad.push('website must start with https://'); if (map && !/^https:\/\/[^\s]+$/i.test(map)) bad.push('map_url must start with https://'); if (web.length > 300 || map.length > 500) bad.push('a link is too long');
          var lat, lon; if (la || lo) { lat = parseFloat(la); lon = parseFloat(lo); if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) bad.push('latitude and longitude must both be valid numbers'); }
          var timings = g('timings').split(/\n|;/).map(function (l) { l = l.trim(); var i = l.indexOf(':'); return i > 0 ? { label: l.slice(0, i).trim().slice(0, 40), time: l.slice(i + 1).trim().slice(0, 80) } : null; }).filter(function (x) { return x && x.time; });
          var events = g('events').split(/\n|;/).map(function (l) { l = l.trim(); var i = l.indexOf('|'); return i > 0 ? { title: l.slice(0, i).trim().slice(0, 80), when: l.slice(i + 1).trim().slice(0, 80) } : (l ? { title: l.slice(0, 80), when: '' } : null); }).filter(Boolean);
          var videos = []; g('videos').split(/\n|;/).forEach(function (l) { l = l.trim(); if (!l) return; var i = l.indexOf('|'), idv = ytId(i > 0 ? l.slice(0, i) : l), title = i > 0 ? l.slice(i + 1).trim() : 'Video'; if (idv) videos.push({ id: idv, title: title.slice(0, 80) }); else bad.push('video "' + l.slice(0, 30) + '" is not a YouTube link or id'); });
          if (timings.length > 10) bad.push('at most 10 timings'); if (events.length > 12) bad.push('at most 12 events'); if (videos.length > 5) bad.push('at most 5 videos');
          var gallery = []; for (var p = 1; p <= 6; p++) { var u = g('photo' + p + '_url'); if (!u) continue; if (!/^https:\/\/[^\s]+$/i.test(u)) bad.push('photo' + p + '_url must start with https://'); else gallery.push({ src: u, caption: g('photo' + p + '_caption').slice(0, 120) }); }
          var id = 'imp-' + slug(name + ' ' + city, 50);
          if (seen[id]) bad.push('this dargah appears twice in the file');
          if (bad.length) { errs.push('Row ' + n + ': ' + bad.join('; ')); return; }
          seen[id] = 1;
          var yes = function (x) { return /^(y|yes|true|1)$/i.test(x); };
          var data = { name: name, city: city, tagline: tag, about: about, address: addr, phone: g('phone'), whatsapp: wa, email: g('email'), website: web, map: map, timings: timings, events: events, gallery: gallery, videos: videos, source: g('source').slice(0, 200), confirmed: yes(g('confirmed')), verified: yes(g('verified')), lastVerified: g('last_verified').slice(0, 20), hidden: false };
          if (lat !== undefined) { data.lat = lat; data.lon = lon; }
          list.push({ id: id, data: data });
        });
        return { kind: 'd', errs: errs, dargahs: list, vendors: [], products: [] };
      }
      function dpreviewHtml(pk) {
        var h = '<div class="box"><div class="okl">' + pk.dargahs.length + ' dargah' + (pk.dargahs.length === 1 ? '' : 's') + ' ready to import.</div>' +
          (pk.errs.length ? '<div><b>' + pk.errs.length + ' row' + (pk.errs.length === 1 ? '' : 's') + ' skipped. Fix them in the file and upload again:</b></div><ul class="errl">' + pk.errs.slice(0, 30).map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>' : '');
        if (pk.dargahs.length) h += '<table class="pv2"><tr><th>Dargah</th><th>City</th><th>Photos</th></tr>' + pk.dargahs.slice(0, 8).map(function (g) { return '<tr><td>' + esc(g.data.name) + '</td><td>' + esc(g.data.city) + '</td><td>' + g.data.gallery.length + '</td></tr>'; }).join('') + '</table>' + (pk.dargahs.length > 8 ? '<div class="muted">and ' + (pk.dargahs.length - 8) + ' more</div>' : '') + '<p class="muted">Pages a keeper has already claimed are skipped, so their edits are never overwritten. The tick boxes above apply to vendor files only.</p><button class="btn full" type="button" data-imp="1">Import ' + pk.dargahs.length + ' dargah' + (pk.dargahs.length === 1 ? '' : 's') + '</button>';
        return h + '</div>';
      }
      function csvParse(t) {
        t = String(t).replace(/^﻿/, ''); var rows = [], row = [], cur = '', q = false, i, c;
        var delim = (t.split('\n')[0].split(';').length > t.split('\n')[0].split(',').length) ? ';' : ',';
        for (i = 0; i < t.length; i++) {
          c = t[i];
          if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
          else if (c === '"') q = true;
          else if (c === delim || c === '\t') { row.push(cur); cur = ''; }
          else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(function (x) { return x.trim() !== ''; })) rows.push(row); row = []; }
          else cur += c;
        }
        row.push(cur); if (row.some(function (x) { return x.trim() !== ''; })) rows.push(row); return rows;
      }
      function slug(t, n) { return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, n || 40) || 'x'; }
      var DARGAH_TPL = 'dargah_name,city,tagline,about,address,phone,whatsapp,email,website,map_url,latitude,longitude,timings,events,videos,photo1_url,photo1_caption,source,confirmed,verified,last_verified\r\nSample Dargah Sharif,Hyderabad,A place of peace in the old city,"First paragraph about the dargah. || Second paragraph about its history.",Near the main road Hyderabad,919876543210,919876543210,,,https://maps.app.goo.gl/example,17.3850,78.4867,"Daily: 5 am to 9 pm; Friday: 5 am to 10 pm","Urs Mubarak | 5 to 7 Rajab; Monthly Gyarvi | 11th of each Islamic month",,,,Told by the dargah committee,no,no,2026-10-18\r\n';
      var ALIAS = { dargah: 'dargah_name', map: 'map_url', map_link: 'map_url', lat: 'latitude', lng: 'longitude', lon: 'longitude', vendor: 'vendor_name', shop: 'vendor_name', shop_name: 'vendor_name', business: 'vendor_name', whatsapp_number: 'whatsapp', mobile: 'phone', email_address: 'email', item: 'item_name', product: 'item_name', product_name: 'item_name', name: 'item_name', cat: 'category', desc: 'description', image: 'image_url', photo: 'image_url', photo_url: 'image_url', soldout: 'sold_out' };
      function buildPack(text) {
        var rows = csvParse(text), errs = [], vendors = {}, vorder = [], prods = {}, porder = [];
        if (rows.length < 2) return { errs: ['The file has no data rows.'], vendors: [], products: [] };
        var head = rows[0].map(function (h) { h = h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); return ALIAS[h] || h; });
        if (head.indexOf('dargah_name') >= 0) return buildDargahPack(rows, head);
        if (head.indexOf('vendor_name') < 0) return { errs: ['The first row must have a vendor_name column (for vendors) or a dargah_name column (for dargahs). Download a template to see the layout.'], vendors: [], products: [] };
        rows.slice(1).forEach(function (r, k) {
          var n = k + 2, g = function (key) { var i = head.indexOf(key); return i < 0 ? '' : String(r[i] == null ? '' : r[i]).trim(); }, bad = [];
          var vn = g('vendor_name'), wa = digits(g('whatsapp')), city = g('city'), about = g('about'), del = g('delivery'), iname = g('item_name');
          if (vn.length < 2 || vn.length > 80) bad.push('vendor_name must be 2 to 80 characters');
          if (wa.length < 8 || wa.length > 15) bad.push('whatsapp must be 8 to 15 digits with country code');
          if (city.length > 60) bad.push('city is too long (max 60)'); if (about.length > 500) bad.push('about is too long (max 500)'); if (del.length > 200) bad.push('delivery is too long (max 200)');
          var item = null;
          if (iname) {
            var price = parseFloat(g('price').replace(/[^0-9.]/g, '')), cat = g('category') || 'Other', desc = g('description'), img = g('image_url'), sold = /^(y|yes|true|1)$/i.test(g('sold_out'));
            if (iname.length < 2 || iname.length > 80) bad.push('item_name must be 2 to 80 characters');
            if (!(price >= 0) || price >= 10000000) bad.push('price must be a number');
            if (cat.length > 40) bad.push('category is too long (max 40)'); if (desc.length > 500) bad.push('description is too long (max 500)');
            if (img && !/^https:\/\/[^\s]+$/i.test(img)) bad.push('image_url must start with https://'); if (img.length > 1000) bad.push('image_url is too long');
            item = { name: iname, cat: cat, price: price, desc: desc, img: img, sold: sold };
          }
          if (bad.length) { errs.push('Row ' + n + ': ' + bad.join('; ')); return; }
          var vid = 'imp-' + slug(vn, 40) + '-' + wa.slice(-4);
          if (!vendors[vid]) { vendors[vid] = { name: vn, city: city, about: about, whatsapp: wa, phone: g('phone').slice(0, 30), contactEmail: g('email').slice(0, 120), delivery: del }; vorder.push(vid); }
          if (item) {
            var pid = vid + '-' + slug(item.name, 50);
            if (prods[pid]) { errs.push('Row ' + n + ': ' + item.name + ' appears twice for ' + vn + ', skipped'); return; }
            prods[pid] = Object.assign({ vendorId: vid }, item); porder.push(pid);
          }
        });
        return { errs: errs, vendors: vorder.map(function (id) { return { id: id, d: vendors[id] }; }), products: porder.map(function (id) { return { id: id, d: prods[id] }; }) };
      }
      function previewHtml(pk) {
        if (pk.kind === 'd') return dpreviewHtml(pk);
        var h = '<div class="box"><div class="okl">' + pk.vendors.length + ' vendor' + (pk.vendors.length === 1 ? '' : 's') + ' and ' + pk.products.length + ' item' + (pk.products.length === 1 ? '' : 's') + ' ready to import.</div>' +
          (pk.errs.length ? '<div><b>' + pk.errs.length + ' row' + (pk.errs.length === 1 ? '' : 's') + ' skipped. Fix them in the file and upload again:</b></div><ul class="errl">' + pk.errs.slice(0, 30).map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + (pk.errs.length > 30 ? '<li>and ' + (pk.errs.length - 30) + ' more</li>' : '') + '</ul>' : '');
        if (pk.products.length) h += '<table class="pv2"><tr><th>Vendor</th><th>Item</th><th>Price</th></tr>' + pk.products.slice(0, 8).map(function (p) { var v = pk.vendors.filter(function (x) { return x.id === p.d.vendorId; })[0]; return '<tr><td>' + esc(v ? v.d.name : '') + '</td><td>' + esc(p.d.name) + '</td><td>' + esc(cur(p.d.price)) + '</td></tr>'; }).join('') + '</table>' + (pk.products.length > 8 ? '<div class="muted">and ' + (pk.products.length - 8) + ' more items</div>' : '');
        h += (pk.vendors.length ? '<button class="btn full" type="button" data-imp="1">Import ' + pk.vendors.length + ' vendors and ' + pk.products.length + ' items</button>' : '') + '</div>'; return h;
      }
      function paint() {
        var c = { pend: cache.vs.filter(function (v) { return v.status === 'pending'; }).length, leads: cache.ls.filter(function (l) { return l.status === 'new'; }).length, reps: cache.rs.filter(function (r) { return r.status === 'new'; }).length, ords: cache.os.filter(function (o) { return o.status === 'new'; }).length, cls: cache.cl.filter(function (x) { return x.status === 'new'; }).length };
        box.innerHTML = '<h1>Admin</h1>' + tabs(c) + (tab === 'vendors' ? vendorsHtml(cache.vs) : tab === 'leads' ? leadsHtml(cache.ls) : tab === 'reports' ? reportsHtml(cache.rs) : tab === 'orders' ? ordersHtml(cache.os) : tab === 'dargahs' ? dargahsHtml(cache.gs) : tab === 'claims' ? claimsHtml(cache.cl) : importHtml());
      }
      function load() {
        DB.isAdmin().then(function (ok) {
          if (!ok) { box.innerHTML = '<div class="box">This page is for the Dargah Hub team. <a href="#/sell"><b>Sign in</b></a> with the admin account.</div>'; return; }
          return Promise.all([DB.adminVendors(), DB.adminLeads(), DB.adminReports(), DB.adminOrders(), DB.adminDargahs().catch(function () { return []; }), DB.adminClaims().catch(function () { return []; })]).then(function (r) { cache.vs = r[0]; cache.ls = r[1]; cache.rs = r[2]; cache.os = r[3]; cache.gs = r[4]; cache.cl = r[5]; paint(); });
        }).catch(function (e) { box.innerHTML = '<div class="box">Could not load. ' + esc(e.message) + '</div>'; });
      }
      function done(p) { return p.then(function () { if (root.HubApp) root.HubApp.stale(); }).then(load).catch(function (er) { alert(er.message); }); }
      box.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('button'); if (!b) return;
        if (b.hasAttribute('data-t')) { tab = b.getAttribute('data-t'); if (tab !== 'import') { imsg = ''; pack = null; } paint(); return; }
        var id = b.getAttribute('data-id');
        if (b.hasAttribute('data-dl')) { var kindD = b.getAttribute('data-dl') === 'd'; var tpl = kindD ? DARGAH_TPL : 'vendor_name,city,whatsapp,phone,email,about,delivery,item_name,category,price,description,image_url,sold_out\r\nAl Noor Attars,Hyderabad,919876543210,,,Alcohol-free attars and oud oils,Delivery in Hyderabad Rs 50. India-wide in 3 to 5 days,Rose Attar 12 ml,Attar,450,Soft rose oil in a sandalwood base,,no\r\nAl Noor Attars,Hyderabad,919876543210,,,Alcohol-free attars and oud oils,Delivery in Hyderabad Rs 50. India-wide in 3 to 5 days,Oud Attar 6 ml,Attar,1200,Deep long-lasting oud oil,,no\r\nZam Zam Caps,Hyderabad,919812345678,,,Handmade topis and prayer caps,Pickup or courier,White Cotton Topi,Topi,250,Hand-stitched cotton topi,,no\r\n'; var a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('﻿' + tpl); a.download = kindD ? 'dargah-hub-dargahs-template.csv' : 'dargah-hub-import-template.csv'; document.body.appendChild(a); a.click(); a.remove(); return; }
        if (b.hasAttribute('data-imp')) {
          if (pack && pack.kind === 'd') {
            if (!pack.dargahs.length) return; b.disabled = true; b.textContent = 'Importing…'; var nd = pack.dargahs.length;
            DB.adminImport({ vendors: [], products: [], dargahs: pack.dargahs }).then(function (res) { var sk = (res && res.skipped) || []; imsg = '<div class="note ok">Imported ' + (nd - sk.length) + ' dargah' + (nd - sk.length === 1 ? '' : 's') + '.' + (sk.length ? ' Skipped ' + sk.length + ' that a keeper has claimed.' : '') + ' They are live now.</div>'; pack = null; if (root.HubApp) root.HubApp.stale(); load(); }).catch(function (er) { b.disabled = false; b.textContent = 'Try again'; var r = document.getElementById('imr'); if (r) r.insertAdjacentHTML('beforeend', '<div class="note err">Import failed. ' + esc(er.message || '') + ' Check that the new rules are published.</div>'); });
            return;
          }
          if (!pack || !pack.vendors.length) return;
          var ap = document.getElementById('imap').checked, vf = document.getElementById('imv').checked; b.disabled = true; b.textContent = 'Importing…';
          var payload = { vendors: pack.vendors.map(function (v) { return { id: v.id, data: { name: v.d.name, city: v.d.city, about: v.d.about, type: 'direct', shopUrl: '', whatsapp: v.d.whatsapp, phone: v.d.phone, contactEmail: v.d.contactEmail, delivery: v.d.delivery, verified: vf, status: ap ? 'approved' : 'pending' } }; }),
            products: pack.products.map(function (p) { return { id: p.id, data: { vendorId: p.d.vendorId, name: p.d.name, cat: p.d.cat, price: p.d.price, desc: p.d.desc, img: p.d.img, imgs: [], buy: '', hidden: false, soldOut: p.d.sold } }; }) };
          var nv = payload.vendors.length, np = payload.products.length;
          DB.adminImport(payload).then(function () { imsg = '<div class="note ok">Imported ' + nv + ' vendors and ' + np + ' items.' + (ap ? ' They are live in the shop now.' : ' They are waiting in the Vendors tab for approval.') + '</div>'; pack = null; if (root.HubApp) root.HubApp.stale(); load(); }).catch(function (er) { b.disabled = false; b.textContent = 'Try again'; var r = document.getElementById('imr'); if (r) r.insertAdjacentHTML('beforeend', '<div class="note err">Import failed. ' + esc(er.message || '') + ' Check that the new rules are published.</div>'); });
          return;
        }
        if (b.getAttribute('data-a') === 'ost') { var st = b.getAttribute('data-s'); if (st === 'cancelled' && !confirm('Cancel this order?')) return; b.disabled = true; done(DB.setOrderStatus(id, st)); return; }
        if (b.hasAttribute('data-gx')) { var fld = b.getAttribute('data-gx'), obj = {}; obj[fld] = b.getAttribute('data-v') === '1'; if (fld === 'confirmed' && obj.confirmed) obj.lastVerified = new Date().toISOString().slice(0, 10); done(DB.adminUpdateDargah(id, obj)); return; }
        if (b.hasAttribute('data-gdel')) { if (confirm('Delete this dargah page? This cannot be undone.')) done(DB.adminDeleteDargah(b.getAttribute('data-gdel'))); return; }
        if (b.hasAttribute('data-ca')) {
          var cl = cache.cl.filter(function (x) { return x.id === id; })[0]; if (!cl) return; var st2 = b.getAttribute('data-ca');
          if (st2 === 'rejected') { done(DB.adminSetClaim(id, 'rejected')); return; }
          if (!confirm('Approve this claim? ' + cl.name + ' will manage ' + cl.targetName + '. Only approve after you have confirmed with the dargah or shop.')) return;
          b.disabled = true;
          done((cl.targetType === 'd' ? DB.adminSetDargahOwner(cl.targetId, cl.uid) : DB.adminTransferVendor(cl.targetId, cl.uid)).then(function () { return DB.adminSetClaim(id, 'approved'); }));
          return;
        }
        if (b.hasAttribute('data-dv')) { if (confirm('Delete this vendor and all of its items? This cannot be undone.')) done(DB.adminDeleteVendor(b.getAttribute('data-dv'))); return; }
        if (b.hasAttribute('data-s')) done(DB.adminSetStatus(id, b.getAttribute('data-s')));
        else if (b.hasAttribute('data-vf')) done(DB.adminSetVerified(id, b.getAttribute('data-vf') === '1'));
        else if (b.hasAttribute('data-l')) done(DB.adminSetLead(id, b.getAttribute('data-l')));
        else if (b.hasAttribute('data-r')) done(DB.adminSetReport(id, b.getAttribute('data-r')));
        else if (b.hasAttribute('data-hp')) { if (confirm('Hide this item from the shop?')) done(DB.adminHideProduct(b.getAttribute('data-hp')).then(function () { return DB.adminSetReport(id, 'done'); })); }
      });
      box.addEventListener('change', function (e) {
        if (e.target.id !== 'imf' || !e.target.files[0]) return;
        var f = e.target.files[0], r = document.getElementById('imr'); imsg = '';
        if (f.size > 2000000) { r.innerHTML = '<div class="note err">That file is too large. Split it into files under 2 MB.</div>'; return; }
        var fr = new FileReader(); fr.onload = function () { pack = buildPack(fr.result); r.innerHTML = previewHtml(pack); }; fr.onerror = function () { r.innerHTML = '<div class="note err">That file could not be read.</div>'; }; fr.readAsText(f);
      });
      load();
    } };
  };
})(typeof self !== 'undefined' ? self : this);
