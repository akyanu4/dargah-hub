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
      function tabs(c) { return '<div class="tabs"><button type="button" data-t="vendors" class="' + (tab === 'vendors' ? 'on' : '') + '">Vendors' + (c.pend ? ' <span class="cnt">' + c.pend + '</span>' : '') + '</button><button type="button" data-t="leads" class="' + (tab === 'leads' ? 'on' : '') + '">Requests' + (c.leads ? ' <span class="cnt">' + c.leads + '</span>' : '') + '</button><button type="button" data-t="reports" class="' + (tab === 'reports' ? 'on' : '') + '">Reports' + (c.reps ? ' <span class="cnt">' + c.reps + '</span>' : '') + '</button></div>'; }
      function vendorsHtml(vs) {
        var order = { pending: 0, approved: 1, rejected: 2 }; vs.sort(function (a, b) { return (order[a.status] || 0) - (order[b.status] || 0); });
        return vs.map(function (v) { return '<div class="box"><b>' + esc(v.name) + '</b> <span class="tag">' + esc(v.status) + '</span>' + (v.verified ? '<span class="tag v">Verified</span>' : '') + '<div class="muted">' + esc(v.city) + ' · ' + (v.type === 'shop' ? 'has a shop' : 'sells here') + '</div><div class="muted">' + esc(v.about) + '</div>' + (v.shopUrl ? '<div><a href="' + esc(v.shopUrl) + '" target="_blank" rel="noopener">' + esc(v.shopUrl) + '</a></div>' : '') + '<div class="muted">WhatsApp ' + esc(v.whatsapp) + ' ' + esc(v.phone || '') + ' ' + esc(v.contactEmail || '') + '</div><div class="mr"><button class="btn sm" data-s="approved" data-id="' + esc(v.id) + '" type="button">Approve</button><button class="btn ghost sm" data-s="rejected" data-id="' + esc(v.id) + '" type="button">Reject</button><button class="btn ghost sm" data-s="pending" data-id="' + esc(v.id) + '" type="button">Pause</button><button class="btn ghost sm" data-vf="' + (v.verified ? '0' : '1') + '" data-id="' + esc(v.id) + '" type="button">' + (v.verified ? 'Remove badge' : 'Give Verified badge') + '</button></div></div>'; }).join('') || '<div class="box muted">No vendors yet.</div>';
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
      function paint() {
        var c = { pend: cache.vs.filter(function (v) { return v.status === 'pending'; }).length, leads: cache.ls.filter(function (l) { return l.status === 'new'; }).length, reps: cache.rs.filter(function (r) { return r.status === 'new'; }).length };
        box.innerHTML = '<h1>Admin</h1>' + tabs(c) + (tab === 'vendors' ? vendorsHtml(cache.vs) : tab === 'leads' ? leadsHtml(cache.ls) : reportsHtml(cache.rs));
      }
      function load() {
        DB.isAdmin().then(function (ok) {
          if (!ok) { box.innerHTML = '<div class="box">This page is for the Dargah Hub team. <a href="#/sell"><b>Sign in</b></a> with the admin account.</div>'; return; }
          return Promise.all([DB.adminVendors(), DB.adminLeads(), DB.adminReports()]).then(function (r) { cache.vs = r[0]; cache.ls = r[1]; cache.rs = r[2]; paint(); });
        }).catch(function (e) { box.innerHTML = '<div class="box">Could not load. ' + esc(e.message) + '</div>'; });
      }
      function done(p) { return p.then(function () { if (root.HubApp) root.HubApp.stale(); }).then(load).catch(function (er) { alert(er.message); }); }
      box.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('button'); if (!b) return;
        if (b.hasAttribute('data-t')) { tab = b.getAttribute('data-t'); paint(); return; }
        var id = b.getAttribute('data-id');
        if (b.hasAttribute('data-s')) done(DB.adminSetStatus(id, b.getAttribute('data-s')));
        else if (b.hasAttribute('data-vf')) done(DB.adminSetVerified(id, b.getAttribute('data-vf') === '1'));
        else if (b.hasAttribute('data-l')) done(DB.adminSetLead(id, b.getAttribute('data-l')));
        else if (b.hasAttribute('data-r')) done(DB.adminSetReport(id, b.getAttribute('data-r')));
        else if (b.hasAttribute('data-hp')) { if (confirm('Hide this item from the shop?')) done(DB.adminHideProduct(b.getAttribute('data-hp')).then(function () { return DB.adminSetReport(id, 'done'); })); }
      });
      load();
    } };
  };
})(typeof self !== 'undefined' ? self : this);
