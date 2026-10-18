/* Dargah Hub buyer side: cart, order requests, order tracking, and the in-app forms
   (list a dargah, advertise, contact, report). Payment is never taken here: the buyer pays the vendor directly. */
(function (root) {
  'use strict';
  var S = root.HubScreens = root.HubScreens || {}, DB = root.HubDB, mem = {};
  function H() { return root.HubApp; }
  function D() { return H().D(); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function money(n) { return H().money(n); }
  function lsGet(k, d) { if (mem[k] !== undefined) return mem[k]; try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function note(t, ok) { return '<div class="note ' + (ok ? 'ok' : 'err') + '" role="status">' + esc(t) + '</div>'; }
  function when(ms) { try { return new Date(ms).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }

  /* ---------- cart ---------- */
  var Cart = {
    items: function () { var a = lsGet('hub_cart', []); return Array.isArray(a) ? a : []; },
    save: function (a) { lsSet('hub_cart', a); badge(); },
    add: function (id) { var a = this.items(), f = a.filter(function (x) { return x.id === id; })[0]; if (f) f.q = Math.min(20, f.q + 1); else a.push({ id: id, q: 1 }); this.save(a); },
    setQ: function (id, d) { var a = this.items(); a.forEach(function (x) { if (x.id === id) x.q = Math.max(1, Math.min(20, x.q + d)); }); this.save(a); },
    remove: function (id) { this.save(this.items().filter(function (x) { return x.id !== id; })); },
    clear: function () { this.save([]); },
    count: function () { return this.items().reduce(function (n, x) { return n + x.q; }, 0); }
  };
  function badge() { var n = document.getElementById('cartn'); if (!n) return; var c = Cart.count(); n.textContent = c > 99 ? '99+' : c; n.hidden = !c; }
  badge();

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-add]'); if (!b) return;
    Cart.add(b.getAttribute('data-add')); b.textContent = 'Added to cart ✓'; setTimeout(function () { b.textContent = 'Add to cart'; }, 1600);
  });

  function lines() {
    var d = D();
    return Cart.items().map(function (c) {
      var p = d.products.filter(function (x) { return x.id === c.id; })[0];
      return p && p.live && !p.soldOut ? { p: p, q: c.q } : null;
    }).filter(Boolean);
  }

  S.cart = function () {
    return { title: 'Cart', html: '<div id="cv"></div>', bind: function (view) { drawCart(view.querySelector('#cv')); } };
  };

  function drawCart(el, errNote) {
    var d = D(), ls = lines(), saved = lsGet('hub_buyer', {});
    if (!ls.length) {
      el.innerHTML = '<h1>Your cart</h1><div class="box">Your cart is empty.<br><a href="#/shop"><b>Browse the shop</b></a></div><p class="muted"><a href="#/orders">See my orders</a></p>';
      return;
    }
    var groups = {}, order = [];
    ls.forEach(function (l) { if (!groups[l.p.vendor]) { groups[l.p.vendor] = []; order.push(l.p.vendor); } groups[l.p.vendor].push(l); });
    var grand = 0;
    var html = '<h1>Your cart</h1><p class="muted">Each vendor receives its own order request.</p>' + order.map(function (vid) {
      var v = H().vendor(vid) || {}, sub = 0;
      var rows = groups[vid].map(function (l) {
        var t = l.p.price * l.q; sub += t;
        return '<div class="cl"><div class="cb"><b>' + esc(l.p.name) + '</b><div class="muted">' + money(l.p.price) + ' each</div><div class="qty"><button type="button" data-q="-1" data-id="' + esc(l.p.id) + '" aria-label="One less">−</button><span>' + l.q + '</span><button type="button" data-q="1" data-id="' + esc(l.p.id) + '" aria-label="One more">+</button><button type="button" class="lnk" data-rm="' + esc(l.p.id) + '">Remove</button></div></div><div class="ct">' + money(t) + '</div></div>';
      }).join('');
      grand += sub;
      return '<div class="box"><b>' + esc(v.name || 'Vendor') + '</b> ' + (v.verified ? '<span class="tag v">Verified</span>' : '') + '<div class="muted">' + esc(v.city || '') + (v.delivery ? ' · Delivery: ' + esc(v.delivery) : '') + '</div>' + rows + '<div class="cl tot"><div class="cb"><b>Items from this vendor</b></div><div class="ct">' + money(sub) + '</div></div></div>';
    }).join('') +
      '<div class="box"><b>Total of items: ' + money(grand) + '</b><div class="muted">Delivery charges, if any, are agreed with each vendor. You pay the vendor directly (UPI, cash on delivery or as they tell you) after they confirm.</div></div>' +
      '<form class="box" id="cof" novalidate><b>Your details</b>' +
      '<label class="fld">Your name<input id="bn" maxlength="80" autocomplete="name" value="' + esc(saved.name || '') + '" required></label>' +
      '<label class="fld">Phone or WhatsApp<input id="bp" inputmode="tel" maxlength="20" autocomplete="tel" placeholder="With country code, e.g. 919876543210" value="' + esc(saved.phone || '') + '" required></label>' +
      '<label class="fld">Delivery address, or write Pickup<textarea id="ba" rows="3" maxlength="300" autocomplete="street-address" required>' + esc(saved.address || '') + '</textarea></label>' +
      '<label class="fld">Note for the vendor (optional)<textarea id="bt" rows="2" maxlength="300"></textarea></label>' +
      '<input type="text" name="website" id="hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;height:0;width:0;opacity:0">' +
      '<label class="rd"><input type="checkbox" id="bc"><span>I understand that the vendor is the seller. The vendor confirms availability, delivery and price, and I pay the vendor directly. I have read the <a href="terms.html" target="_blank">terms</a> and <a href="privacy.html" target="_blank">privacy notice</a>.</span></label>' +
      '<button class="btn full" type="submit" id="bgo">Send order request</button><p class="muted">Your name, phone and address are sent only to the vendors you order from and to the Dargah Hub team.</p>' + (errNote || '') + '</form>';
    el.innerHTML = html;
    if (el._bound) return; el._bound = true;
    el.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-q],[data-rm]'); if (!b) return;
      if (b.hasAttribute('data-rm')) Cart.remove(b.getAttribute('data-rm')); else Cart.setQ(b.getAttribute('data-id'), parseInt(b.getAttribute('data-q'), 10));
      keep(el, function () { drawCart(el); });
    });
    el.addEventListener('submit', function (e) { e.preventDefault(); placeOrder(el); });
  }
  function keep(el, f) { var v = {}; ['bn', 'bp', 'ba', 'bt'].forEach(function (id) { var x = document.getElementById(id); if (x) v[id] = x.value; }); f(); Object.keys(v).forEach(function (id) { var x = document.getElementById(id); if (x) x.value = v[id]; }); }

  function placeOrder(el) {
    var g = function (id) { return ((document.getElementById(id) || {}).value || '').trim(); };
    var fail = function (t) { var n = el.querySelector('.note'); if (n) n.remove(); el.querySelector('#cof').insertAdjacentHTML('beforeend', note(t)); };
    if (DB.mode === 'off') return fail('Ordering is not switched on yet. Please contact the vendor on WhatsApp.');
    if (g('hp')) { Cart.clear(); location.hash = '#/orders'; return; }
    var name = g('bn'), phone = digits(g('bp')), addr = g('ba');
    if (name.length < 2) return fail('Please add your name.');
    if (phone.length < 8 || phone.length > 15) return fail('Please add a phone or WhatsApp number with country code (8 to 15 digits).');
    if (addr.length < 5) return fail('Please add your delivery address, or write Pickup.');
    if (!document.getElementById('bc').checked) return fail('Please tick the box to confirm you understand how ordering works.');
    if (Date.now() - lsGet('hub_last_order', 0) < 15000) return fail('Please wait a few seconds before sending another order.');
    var ls = lines(); if (!ls.length) return fail('Your cart is empty.');
    var by = {}, order = [];
    ls.forEach(function (l) { var id = l.p.vendor; if (!by[id]) { by[id] = []; order.push(id); } by[id].push(l); });
    var docs = order.map(function (vid) {
      var v = H().vendor(vid) || {}, items = by[vid].map(function (l) { return { pid: String(l.p.raw || l.p.id), name: l.p.name.slice(0, 80), price: l.p.price, qty: l.q }; });
      return { vendorId: vid, vendorName: String(v.name || '').slice(0, 80), buyerName: name, buyerPhone: phone, buyerAddress: addr, note: g('bt'), items: items, total: items.reduce(function (n, i) { return n + i.price * i.qty; }, 0) };
    });
    var btn = document.getElementById('bgo'); btn.disabled = true; btn.textContent = 'Sending…';
    DB.createOrders(docs).then(function (ids) {
      lsSet('hub_last_order', Date.now()); lsSet('hub_buyer', { name: name, phone: phone, address: addr });
      var old = lsGet('hub_orders', []); ids.forEach(function (id, i) { old.unshift({ id: id, v: docs[i].vendorName, t: docs[i].total, at: Date.now() }); });
      lsSet('hub_orders', old.slice(0, 50)); Cart.clear(); location.hash = '#/order/' + ids.join(',');
    }).catch(function (er) {
      btn.disabled = false; btn.textContent = 'Send order request';
      fail('We could not send your order. ' + (/permission/i.test(er.message || '') ? 'The shop is not fully set up yet. Please contact the vendor on WhatsApp.' : 'Check your connection and try again.'));
    });
  }

  /* ---------- order tracking ---------- */
  var STATUS = { new: ['Sent to the vendor', 'Waiting for the vendor to confirm.'], confirmed: ['Confirmed', 'The vendor has confirmed. Agree payment and delivery with them.'], shipped: ['On the way or ready', 'The vendor has shipped it or it is ready for pickup.'], delivered: ['Delivered', 'The vendor marked this order as delivered.'], cancelled: ['Cancelled', 'This order was cancelled.'] };
  function orderCard(o) {
    var v = H().vendor(o.vendorId) || {}, wa = digits(v.whatsapp), st = STATUS[o.status] || STATUS.new;
    var msg = 'Hi, I placed order ' + o.id + ' on ' + D().platform.name + ':\n' + (o.items || []).map(function (i) { return '- ' + i.qty + ' x ' + i.name; }).join('\n') + '\nTotal of items: ' + money(o.total) + '\nName: ' + o.buyerName + '\nAddress: ' + o.buyerAddress;
    return '<div class="box"><div><span class="tag' + (o.status === 'delivered' || o.status === 'confirmed' ? ' v' : '') + '">' + esc(st[0]) + '</span></div><b>' + esc(o.vendorName || v.name || 'Vendor') + '</b>' +
      '<div class="muted">' + esc(st[1]) + '</div>' +
      (o.items || []).map(function (i) { return '<div class="cl"><div class="cb">' + esc(i.qty) + ' × ' + esc(i.name) + '</div><div class="ct">' + money(i.price * i.qty) + '</div></div>'; }).join('') +
      '<div class="cl tot"><div class="cb"><b>Total of items</b></div><div class="ct">' + money(o.total) + '</div></div>' +
      (o.vendorNote ? '<div class="box"><b>Message from the vendor</b><div>' + esc(o.vendorNote) + '</div></div>' : '') +
      '<div class="muted">Order ID <b>' + esc(o.id) + '</b>' + (o.createdAt ? ' · ' + esc(when(o.createdAt)) : '') + '</div>' +
      (wa && o.status !== 'cancelled' ? '<a class="btn full" target="_blank" rel="noopener" href="https://wa.me/' + esc(wa) + '?text=' + encodeURIComponent(msg) + '">Send this order on WhatsApp</a>' : '') +
      (v.phone ? '<a class="btn ghost full" href="tel:' + esc(String(v.phone).replace(/[^\d+]/g, '')) + '">Call the vendor</a>' : '') +
      ((o.items || []).length ? '<button class="btn ghost full" type="button" data-again="' + esc((o.items || []).map(function (i) { return String(i.pid || '') + '~' + (i.qty || 1); }).join(',')) + '">Order these again</button>' : '') + '</div>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-again]'); if (!b) return;
    var d = D(), n = 0, miss = 0;
    String(b.getAttribute('data-again')).split(',').forEach(function (x) {
      var a = x.split('~'), pid = a[0], q = Math.max(1, Math.min(20, +a[1] || 1));
      var p = d.products.filter(function (y) { return y.live && (String(y.raw || y.id) === pid || y.id === pid); })[0];
      if (!p || p.soldOut) { miss++; return; } for (var i = 0; i < q; i++) Cart.add(p.id); n++;
    });
    if (n) location.hash = '#/cart'; else { b.textContent = 'These items are no longer available'; b.disabled = true; }
  });
  S.order = function (idstr) {
    var ids = String(idstr || '').split(',').filter(function (x) { return /^[A-Za-z0-9_-]{6,40}$/.test(x); }).slice(0, 10);
    return { title: 'Your order', html: '<div id="ov"><div class="box muted">Loading…</div></div>', bind: function (view) {
      var box = view.querySelector('#ov'); if (!ids.length) { box.innerHTML = '<div class="box">Order not found.</div>'; return; }
      function load() {
        Promise.all(ids.map(function (id) { return DB.getOrder(id).catch(function () { return undefined; }); })).then(function (os) {
          box.innerHTML = '<h1>Order request sent</h1><p class="muted">Keep this page. You can find it again in My orders. ' + esc(D().platform.name) + ' does not take payment: the vendor will confirm and you pay them directly.</p>' +
            os.map(function (o) { return o === undefined ? '<div class="box">Could not load this order. Check your connection.</div>' : o ? orderCard(o) : '<div class="box">This order was not found.</div>'; }).join('') +
            '<button class="btn ghost full" type="button" id="orf">Refresh status</button><a class="btn ghost full" href="#/shop">Keep shopping</a><p class="muted"><a href="#/report/o/' + esc(ids[0]) + '">Problem with this order?</a></p>';
          box.querySelector('#orf').addEventListener('click', load);
        });
      }
      load();
    } };
  };
  S.orders = function () {
    return { title: 'My orders', html: '<div id="ol"></div>', bind: function (view) {
      var box = view.querySelector('#ol'), list = lsGet('hub_orders', []);
      if (!list.length) { box.innerHTML = '<h1>My orders</h1><div class="box">No orders yet on this device.<br><a href="#/shop"><b>Browse the shop</b></a></div>'; return; }
      box.innerHTML = '<h1>My orders</h1><p class="muted">Orders are remembered on this device only.</p><div class="list">' + list.map(function (o) { return '<a href="#/order/' + esc(o.id) + '"><span>' + esc(o.v || 'Vendor') + '<br><small class="muted">' + esc(when(o.at)) + ' · ' + money(o.t) + '</small></span><i data-st="' + esc(o.id) + '">›</i></a>'; }).join('') + '</div>';
      if (DB.mode === 'off') return;
      list.slice(0, 15).forEach(function (o) { DB.getOrder(o.id).then(function (x) { var i = box.querySelector('[data-st="' + o.id + '"]'); if (x && i) { i.textContent = (STATUS[x.status] || STATUS.new)[0]; i.style.fontSize = '12px'; i.style.fontStyle = 'normal'; } }).catch(function () {}); });
    } };
  };

  /* ---------- forms ---------- */
  function f(id, label, attrs, hint) { return '<label class="fld">' + esc(label) + '<input id="' + id + '" ' + (attrs || '') + '>' + (hint ? '<small class="muted">' + esc(hint) + '</small>' : '') + '</label>'; }
  function ta(id, label, max, req) { return '<label class="fld">' + esc(label) + '<textarea id="' + id + '" rows="4" maxlength="' + max + '"' + (req ? ' required' : '') + '></textarea></label>'; }
  var HP = '<input type="text" name="website" id="hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;height:0;width:0;opacity:0">';
  function wa() { var n = digits((D().platform || {}).whatsapp); return n ? '<a class="btn ghost full" target="_blank" rel="noopener" href="https://wa.me/' + n + '">Chat with us on WhatsApp</a>' : ''; }

  function bindForm(view, formId, build, doneText, kind) {
    var form = view.querySelector('#' + formId); if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var g = function (id) { return ((document.getElementById(id) || {}).value || '').trim(); };
      var fail = function (t) { var n = form.querySelector('.note'); if (n) n.remove(); form.insertAdjacentHTML('beforeend', note(t)); };
      if (g('hp')) { form.outerHTML = note(doneText, true); return; }
      var r = build(g); if (typeof r === 'string') return fail(r);
      if (Date.now() - lsGet('hub_last_lead', 0) < 20000) return fail('Please wait a few seconds before sending again.');
      if (DB.mode === 'off') { var to = D().platform.contact || ''; return fail('Online forms are not switched on yet. Please email ' + to + '.'); }
      var btn = form.querySelector('button[type=submit]'); btn.disabled = true; var t = btn.textContent; btn.textContent = 'Sending…';
      (kind === 'report' ? DB.createReport(r) : DB.createLead(r)).then(function () { lsSet('hub_last_lead', Date.now()); form.outerHTML = note(doneText, true) + '<a class="btn ghost full" href="#/">Back to home</a>'; })
        .catch(function () { btn.disabled = false; btn.textContent = t; fail('We could not send this. Check your connection and try again, or email ' + (D().platform.contact || 'us') + '.'); });
    });
  }
  function contactOk(phone, email) { if (!phone && !email) return 'Add a phone number or an email so we can reach you.'; if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'That email does not look right.'; if (phone && digits(phone).length < 8) return 'That phone number looks too short.'; return ''; }

  S.join = function () {
    return { title: 'Join', html: '<div class="hero"><h1>Join ' + esc(D().platform.name) + '</h1><p>Two ways in. We approve every listing by hand.</p></div>' +
      '<h2>Sell as a vendor</h2><div class="box"><ul><li>Sell anything halal: products, food, clothing, books, gifts or services.</li><li>Buyers send you order requests. You confirm, deliver and collect payment yourself.</li><li>A yearly listing fee. Featured placement is optional and always marked Sponsored.</li></ul><a class="btn full" href="#/sell">Create your vendor account</a></div>' +
      '<h2>List a dargah</h2><form class="box" id="jf" novalidate><b>Ask for a dargah page</b><p class="muted">A page with photos, events, videos, contact details and a map pin. The basic listing is free. We confirm with the dargah before publishing.</p>' +
      f('dn', 'Name of the dargah', 'maxlength="80" required') + f('dc', 'City', 'maxlength="60" required') + f('dy', 'Your name and role', 'maxlength="80" required', 'For example: Sajjada nasheen, caretaker, volunteer') + f('dp', 'Phone or WhatsApp', 'inputmode="tel" maxlength="30"') + f('de', 'Email', 'type="email" maxlength="120"') + ta('dm', 'A few lines about the dargah, its events and how to reach it', 1000) + HP +
      '<label class="rd"><input type="checkbox" id="dk"><span>I am authorised by the dargah to ask for this page.</span></label><button class="btn full" type="submit">Send request</button></form>' + wa() +
      '<p class="muted">Read the <a href="terms.html"><b>terms</b></a> first.</p>',
      bind: function (view) { bindForm(view, 'jf', function (g) {
        if (g('dn').length < 2 || g('dc').length < 2 || g('dy').length < 2) return 'Please fill in the dargah name, city and your name and role.';
        var c = contactOk(g('dp'), g('de')); if (c) return c; if (!document.getElementById('dk').checked) return 'Please confirm you are authorised by the dargah.';
        return { kind: 'dargah', name: g('dy'), city: g('dc'), phone: g('dp'), email: g('de'), slot: g('dn').slice(0, 40), message: ('Dargah: ' + g('dn') + '\n' + g('dm')).slice(0, 1000) };
      }, 'Thank you. We have your request and will contact you to confirm before anything is published.'); } };
  };
  S.advertise = function () {
    return { title: 'Advertise', html: '<div class="hero"><h1>Be seen by the community</h1><p>Every ad is labelled Sponsored and never shown on Qur\'an or prayer content.</p></div>' +
      '<h2>Where your ad can appear</h2><table><tr><th>Slot</th><th>Where</th></tr><tr><td>Home banner</td><td>Top of the home page</td></tr><tr><td>Shop banner</td><td>Top of the shop</td></tr><tr><td>Featured product</td><td>First in its category</td></tr><tr><td>Dargah sponsor line</td><td>An event or page, with the dargah\'s consent</td></tr></table>' +
      '<form class="box" id="af" novalidate><b>Ask for the rate card</b>' + f('an', 'Business name', 'maxlength="80" required') + f('ac', 'City', 'maxlength="60"') + f('ay', 'Your name', 'maxlength="80" required') + f('ap', 'Phone or WhatsApp', 'inputmode="tel" maxlength="30"') + f('ae', 'Email', 'type="email" maxlength="120"') +
      '<label class="fld">Slot you are interested in<select id="as"><option>Home banner</option><option>Shop banner</option><option>Featured product</option><option>Dargah sponsor line</option><option>Not sure yet</option></select></label>' + ta('am', 'What would you like to promote?', 1000) + HP + '<button class="btn full" type="submit">Send</button></form>' + wa(),
      bind: function (view) { bindForm(view, 'af', function (g) {
        if (g('an').length < 2 || g('ay').length < 2) return 'Please add your business name and your name.'; var c = contactOk(g('ap'), g('ae')); if (c) return c;
        return { kind: 'advertise', name: (g('ay') + ' / ' + g('an')).slice(0, 80), city: g('ac'), phone: g('ap'), email: g('ae'), slot: g('as'), message: g('am') };
      }, 'Thank you. We will send you the current rate card.'); } };
  };
  S.contact = function () {
    return { title: 'Contact', html: '<div class="hero"><h1>Contact and complaints</h1><p>Questions, feedback or a complaint about a vendor, an order or a listing.</p></div>' +
      '<form class="box" id="cf" novalidate><b>Write to us</b>' + f('cn', 'Your name', 'maxlength="80" required') + f('cp', 'Phone or WhatsApp', 'inputmode="tel" maxlength="30"') + f('ce', 'Email', 'type="email" maxlength="120"') + ta('cm', 'Your message. Include the order ID if it is about an order.', 1000, true) + HP + '<button class="btn full" type="submit">Send</button></form>' + wa() +
      '<div class="box muted"><b>Grievance contact</b><div>' + esc((D().platform.grievance && D().platform.grievance.name) || 'Dargah Hub team') + (D().platform.contact ? ' · <a href="mailto:' + esc(D().platform.contact) + '">' + esc(D().platform.contact) + '</a>' : '') + '</div><div>We acknowledge complaints within 48 hours and aim to resolve them within 30 days.</div></div>',
      bind: function (view) { bindForm(view, 'cf', function (g) {
        if (g('cn').length < 2 || g('cm').length < 5) return 'Please add your name and a message.'; var c = contactOk(g('cp'), g('ce')); if (c) return c;
        return { kind: 'contact', name: g('cn'), city: '', phone: g('cp'), email: g('ce'), slot: '', message: g('cm') };
      }, 'Thank you. We have your message and will reply soon.'); } };
  };
  S.report = function (type, id) {
    var d = D(), t = { p: 'item', v: 'vendor', d: 'dargah page', o: 'order' }[type];
    if (!t) return { title: 'Report', html: '<h2>Not found</h2><p><a href="#/">Go home</a></p>' };
    var name = '';
    if (type === 'p') { var p = d.products.filter(function (x) { return (x.raw || x.id) === id; })[0]; name = p ? p.name : ''; }
    if (type === 'v') { var v = H().vendor(id); name = v ? v.name : ''; }
    if (type === 'd') { var dd = d.dargahs.filter(function (x) { return x.id === id; })[0]; name = dd ? dd.name : ''; }
    var reasons = type === 'd' ? ['Wrong or out of date information', 'Photo or content I own', 'Page should not be public', 'Other'] : ['Misleading or fake', 'Not halal or not as described', 'Scam or no delivery', 'Offensive or unlawful', 'Wrong information', 'Other'];
    return { title: 'Report', html: '<h1>Report this ' + t + '</h1>' + (name ? '<p class="muted">' + esc(name) + '</p>' : '') +
      '<form class="box" id="rf" novalidate><label class="fld">What is the problem?<select id="rr">' + reasons.map(function (r) { return '<option>' + esc(r) + '</option>'; }).join('') + '</select></label>' + ta('rd', 'Tell us what happened', 1000, true) + f('rc', 'Your phone or email (optional, so we can follow up)', 'maxlength="120"') + HP + '<button class="btn full" type="submit">Send report</button></form>',
      bind: function (view) { bindForm(view, 'rf', function (g) {
        if (g('rd').length < 5) return 'Please tell us a little more.';
        return { targetType: type, targetId: String(id).slice(0, 60), targetName: name.slice(0, 120), reason: g('rr'), details: g('rd'), contact: g('rc') };
      }, 'Thank you. We will look into this.', 'report'); } };
  };
})(typeof self !== 'undefined' ? self : this);
