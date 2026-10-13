/* Dargah Hub vendor portal (#/sell) and admin approvals (#/admin). */
(function (root) {
  'use strict';
  var DB = root.HubDB, S = root.HubScreens = root.HubScreens || {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function https(u) { u = String(u || '').trim(); return /^https:\/\/[^\s]+\.[^\s]+$/i.test(u) ? u : ''; }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
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

  function Portal(el) { this.el = el; this.mode = 'signin'; this.note = ''; this.edit = null; this.vendor = undefined; this.user = null; }
  Portal.prototype.start = function () {
    var self = this;
    if (DB.mode === 'off') { el(self).innerHTML = intro() + '<div class="box">Vendor accounts are not switched on yet. To list your shop now, <a href="mailto:?subject=Vendor listing"><b>email us</b></a> and we will add you by hand.</div>'; return; }
    self.el.addEventListener('click', function (e) { self.click(e); }); self.el.addEventListener('submit', function (e) { e.preventDefault(); self.submit(e.target); }); self.el.addEventListener('change', function (e) { self.changed(e); });
    DB.onAuth(function (u) { self.user = u; self.vendor = undefined; self.draw(); });
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
    if (!self.products) { self.el.innerHTML = head + '<div class="box muted">Loading your items…</div>'; DB.myProducts().then(function (p) { self.products = p; self.draw(); }).catch(function (e) { self.el.innerHTML = head + msg('Could not load items. ' + e.message); }); return; }
    var items = self.products.map(function (p) {
      return '<div class="mi"><div class="mt">' + (p.img ? '<img alt="" src="' + esc(p.img) + '">' : '<span>No photo</span>') + '</div><div class="mb"><b>' + esc(p.name) + '</b><div class="muted">' + esc(p.cat) + ' · ' + esc(p.price) + (p.hidden ? ' · hidden' : '') + '</div><div class="mr"><button class="btn ghost sm" data-a="edit" data-id="' + esc(p.id) + '" type="button">Edit</button><button class="btn ghost sm" data-a="del" data-id="' + esc(p.id) + '" type="button">Delete</button></div></div></div>';
    }).join('');
    self.el.innerHTML = head + '<h2>' + (v.type === 'shop' ? 'Featured items (optional)' : 'Your items') + '</h2>' + (v.type === 'shop' ? '<p class="muted">Your shop link is on your page already. Add a few items here if you want them to appear in the Hub shop.</p>' : '') +
      (self.edit && self.edit !== 'profile' ? productForm(self.edit === 'new' ? null : self.products.filter(function (p) { return p.id === self.edit; })[0]) : '<button class="btn full" data-a="new" type="button">Add an item</button>') + (items || '<div class="box muted">No items yet.</div>') + (self.note || '');
  };
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
      field('vw', 'WhatsApp number with country code', v.whatsapp, 'inputmode="tel" placeholder="919876543210"', 'Buyers contact you here. Required if you sell items on Dargah Hub.') +
      field('vp', 'Phone (optional)', v.phone, 'inputmode="tel"') + field('ve', 'Contact email (optional)', v.contactEmail, 'type="email"') +
      '<p class="muted">By saving you agree to the <a href="terms.html" target="_blank"><b>vendor terms</b></a>. You are the seller and handle delivery and returns.</p><button class="btn full" type="submit">Save</button></form>';
  }
  function productForm(p) {
    p = p || {}; var cats = (root.HubApp && root.HubApp.cats()) || [];
    return '<form class="box" id="prf"' + (p.id ? ' data-id="' + esc(p.id) + '"' : '') + '><b>' + (p.id ? 'Edit item' : 'New item') + '</b>' + field('pn', 'Name', p.name, 'maxlength="80" required') +
      '<label class="fld">Category<input id="pc" list="cl" value="' + esc(p.cat) + '" maxlength="40" required placeholder="For example Attar, Food, Clothing, Services"><datalist id="cl">' + cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist><small class="muted">Pick one or type your own.</small></label>' +
      field('pr', 'Price', p.price, 'type="number" min="0" step="1" required inputmode="numeric"') + area('pd', 'Description', p.desc, 500) +
      '<div class="fld">Photo<div id="ph">' + (p.img ? '<img class="pv" alt="" src="' + esc(p.img) + '">' : '') + '</div><input id="pi" type="file" accept="image/*"><small class="muted">A clear photo on a plain background sells best. It is resized on your phone.</small></div>' +
      field('pb', 'Buy link (optional, https://)', p.buy, 'inputmode="url"', 'Leave empty to let buyers contact you on WhatsApp.') +
      '<label class="rd"><input type="checkbox" id="phd"' + (p.hidden ? ' checked' : '') + '> Hide this item for now</label><input type="hidden" id="pimg" value="' + esc(p.img || '') + '">' +
      '<button class="btn full" type="submit">Save item</button><button class="btn ghost full" type="button" data-a="cancel">Cancel</button></form>';
  }
  Portal.prototype.changed = function (e) {
    var self = this; if (e.target.id !== 'pi' || !e.target.files[0]) return;
    compress(e.target.files[0]).then(function (d) { document.getElementById('pimg').value = d; document.getElementById('ph').innerHTML = '<img class="pv" alt="" src="' + d + '">'; }).catch(function (er) { e.target.value = ''; self.flash(er.message); });
  };
  Portal.prototype.flash = function (t, ok) { var n = this.el.querySelector('.note'); if (n) n.remove(); this.el.insertAdjacentHTML('beforeend', msg(t, ok)); };
  Portal.prototype.click = function (e) {
    var self = this, b = e.target.closest && e.target.closest('[data-a]'); if (!b) return; var a = b.getAttribute('data-a'); if (b.tagName === 'A') e.preventDefault();
    var guard = function (p) { return p.then(null, function (er) { self.note = msg(er.message || 'Something went wrong.'); self.draw(); }); };
    if (a === 'google') guard(DB.signInGoogle());
    else if (a === 'tosignup') { self.mode = 'signup'; self.note = ''; self.draw(); } else if (a === 'tosignin') { self.mode = 'signin'; self.note = ''; self.draw(); }
    else if (a === 'forgot') { var em = (document.getElementById('em') || {}).value; if (!em) { self.flash('Type your email above first.'); return; } guard(DB.reset(em).then(function () { self.flash('If that email has an account, a reset link is on its way.', true); })); }
    else if (a === 'out') { self.products = null; self.vendor = undefined; self.edit = null; DB.signOut(); }
    else if (a === 'editp') { self.edit = 'profile'; self.note = ''; self.draw(); } else if (a === 'new') { self.edit = 'new'; self.draw(); } else if (a === 'cancel') { self.edit = null; self.draw(); }
    else if (a === 'edit') { self.edit = b.getAttribute('data-id'); self.draw(); }
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
      var d = { name: g('vn').trim(), city: g('vc').trim(), about: g('va').trim(), type: type, shopUrl: shop, whatsapp: wa, phone: g('vp').trim(), contactEmail: g('ve').trim() };
      if (d.name.length < 2) return self.flash('Add your business name.');
      DB.saveVendor(d).then(function () { if (root.HubApp) root.HubApp.stale(); self.vendor = undefined; self.edit = null; self.note = msg('Saved.', true); self.draw(); }).catch(fail); return;
    }
    if (f.id === 'prf') {
      var price = parseFloat(g('pr')), buy = g('pb').trim();
      if (!(price >= 0)) return self.flash('Add a price.'); if (buy && !https(buy)) return self.flash('The buy link must start with https://');
      var p = { name: g('pn').trim(), cat: g('pc').trim(), price: price, desc: g('pd').trim(), img: g('pimg'), buy: buy, hidden: !!document.getElementById('phd').checked };
      if (f.getAttribute('data-id')) p.id = f.getAttribute('data-id');
      DB.saveProduct(p).then(function () { if (root.HubApp) root.HubApp.stale(); self.products = null; self.edit = null; self.note = msg('Item saved.', true); self.draw(); }).catch(fail);
    }
  };

  S.admin = function () {
    return { title: 'Approvals', html: '<div id="ad"><div class="box muted">Loading…</div></div>', bind: function (view) {
      var box = view.querySelector('#ad'); if (DB.mode === 'off') { box.innerHTML = '<div class="box">Vendor accounts are not switched on.</div>'; return; }
      function load() {
        DB.isAdmin().then(function (ok) {
          if (!ok) { box.innerHTML = '<div class="box">This page is for the Dargah Hub team. <a href="#/sell"><b>Sign in</b></a> with the admin account.</div>'; return; }
          return DB.adminVendors().then(function (vs) {
            var order = { pending: 0, approved: 1, rejected: 2 };
            vs.sort(function (a, b) { return (order[a.status] || 0) - (order[b.status] || 0); });
            box.innerHTML = '<h2>Vendors</h2>' + (vs.map(function (v) { return '<div class="box"><b>' + esc(v.name) + '</b> <span class="tag">' + esc(v.status) + '</span><div class="muted">' + esc(v.city) + ' · ' + (v.type === 'shop' ? 'has a shop' : 'sells here') + '</div><div class="muted">' + esc(v.about) + '</div>' + (v.shopUrl ? '<div><a href="' + esc(v.shopUrl) + '" target="_blank" rel="noopener">' + esc(v.shopUrl) + '</a></div>' : '') + '<div class="muted">WhatsApp ' + esc(v.whatsapp) + ' ' + esc(v.contactEmail || '') + '</div><div class="mr"><button class="btn sm" data-s="approved" data-id="' + esc(v.id) + '" type="button">Approve</button><button class="btn ghost sm" data-s="rejected" data-id="' + esc(v.id) + '" type="button">Reject</button><button class="btn ghost sm" data-s="pending" data-id="' + esc(v.id) + '" type="button">Pause</button></div></div>'; }).join('') || '<div class="box muted">No vendors yet.</div>');
          });
        }).catch(function (e) { box.innerHTML = '<div class="box">Could not load. ' + esc(e.message) + '</div>'; });
      }
      box.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-s]'); if (!b) return; DB.adminSetStatus(b.getAttribute('data-id'), b.getAttribute('data-s')).then(function () { if (root.HubApp) root.HubApp.stale(); }).then(load).catch(function (er) { alert(er.message); }); });
      load();
    } };
  };
})(typeof self !== 'undefined' ? self : this);
