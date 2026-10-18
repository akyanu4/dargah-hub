/* Dargah Hub weekly offers. Every Thursday a new week starts: vendors post offers that run from that Thursday to the next Thursday,
   the Hub team approves them, and people visit the shops. Also: the vendor screen (#/myoffers), the admin screen (#/adminoffers)
   and the optional "Get offer alerts" button (OneSignal web push). Payment is never taken here. */
(function (root) {
  'use strict';
  var S = root.HubScreens = root.HubScreens || {}, DB = root.HubDB;
  function H() { return root.HubApp; }
  function D() { return H().D(); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function note(t, ok) { return '<div class="note ' + (ok ? 'ok' : 'err') + '" role="status">' + esc(t) + '</div>'; }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- the Thursday to Thursday week ---------- */
  function thu(off) { var t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate() - ((t.getDay() + 3) % 7) + 7 * (off || 0), 12); }
  function key(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function fmt(d) { try { return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return key(d); } }
  function weeks() { return [0, 1].map(function (o) { var a = thu(o), b = thu(o + 1); return { key: key(a), name: o ? 'Next week' : 'This week', range: fmt(a) + ' to ' + fmt(b) }; }); }
  function offersFor(wk) { return (D().offers || []).filter(function (o) { return o.week === wk; }); }
  function vendorOf(id) { return H().vendor(id); }

  /* ---------- visiting a shop ---------- */
  function mapsUrl(v) {
    var m = H().safeUrl(v.map); if (m) return m;
    return v.address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v.address + (v.city ? ', ' + v.city : '')) : '';
  }
  function visitRow(v) {
    var wa = digits(v.whatsapp), ph = String(v.phone || '').replace(/[^\d+]/g, ''), mp = mapsUrl(v), out = '';
    if (mp) out += '<a class="btn sm" target="_blank" rel="noopener" href="' + esc(mp) + '">Directions</a>';
    if (wa) out += '<a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(wa) + '?text=' + encodeURIComponent('Hi, I saw your offer on ' + D().platform.name + '.') + '">WhatsApp</a>';
    if (ph) out += '<a class="btn ghost sm" href="tel:' + esc(ph) + '">Call</a>';
    return out ? '<div class="mr">' + out + '</div>' : '';
  }
  function offerCard(o) {
    var v = vendorOf(o.vendorId) || {};
    return '<div class="box offer"><div class="otop"><b>' + esc(o.title) + '</b>' + (o.discount ? '<span class="tag v">' + esc(o.discount) + '</span>' : '') + '</div>' +
      (o.details ? '<div>' + esc(o.details) + '</div>' : '') +
      '<div class="muted">At <a href="#/v/' + esc(o.vendorId) + '"><b>' + esc(v.name || 'Shop') + '</b></a>' + (v.city ? ', ' + esc(v.city) : '') + '</div>' +
      (v.address ? '<div class="muted">Visit: ' + esc(v.address) + '</div>' : '<div class="muted">Online or by WhatsApp. No shop address listed.</div>') + visitRow(v) + '</div>';
  }
  function homeBlock() {
    var w = weeks()[0], list = offersFor(w.key);
    if (!list.length) return '';
    return '<div class="sech"><h2>Offers this week</h2><a href="#/offers">See all</a></div><div class="muted" style="margin:-6px 0 8px">' + esc(w.range) + '</div>' + list.slice(0, 2).map(offerCard).join('');
  }
  function vendorBlock(vid) {
    var out = weeks().map(function (w) { var l = offersFor(w.key).filter(function (o) { return o.vendorId === vid; }); return l.length ? '<h2>' + esc(w.name) + ' <small class="muted">' + esc(w.range) + '</small></h2>' + l.map(function (o) { return '<div class="box offer"><div class="otop"><b>' + esc(o.title) + '</b>' + (o.discount ? '<span class="tag v">' + esc(o.discount) + '</span>' : '') + '</div>' + (o.details ? '<div>' + esc(o.details) + '</div>' : '') + '</div>'; }).join('') : ''; }).join('');
    return out;
  }

  /* ---------- alerts (OneSignal web push) ---------- */
  function appId() { return (root.HUB_CONFIG || {}).onesignalAppId || ''; }
  var osState = 0;
  function os(cb) {
    root.OneSignalDeferred = root.OneSignalDeferred || [];
    if (!osState) {
      osState = 1; var sc = document.createElement('script'); sc.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'; sc.defer = true;
      sc.onerror = function () { osState = 0; cb(null); }; document.head.appendChild(sc);
      root.OneSignalDeferred.push(function (O) { return O.init({ appId: appId(), serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js', serviceWorkerParam: { scope: '/push/onesignal/' }, notifyButton: { enable: false } }); });
    }
    root.OneSignalDeferred.push(function (O) { cb(O); });
  }
  function alertCard() {
    if (!appId()) return '';
    var on = lsGet('hub_push', 0);
    return '<div class="box"><b>Get an alert when new offers start</b><div class="muted">One notification each Thursday. You can turn it off any time.</div><button class="btn' + (on ? ' ghost' : '') + ' full" type="button" id="pushb">' + (on ? 'Alerts are on. Tap to turn off' : 'Turn on offer alerts') + '</button><div id="pushm"></div></div>';
  }
  function bindAlert(view) {
    var b = view.querySelector('#pushb'); if (!b) return;
    b.addEventListener('click', function () {
      var m = view.querySelector('#pushm'), on = lsGet('hub_push', 0); b.disabled = true; m.innerHTML = '';
      os(function (O) {
        if (!O) { b.disabled = false; m.innerHTML = note('Alerts could not load. Check your connection and try again.'); return; }
        var p = on ? O.User.PushSubscription.optOut() : O.Notifications.requestPermission().then(function () { return O.User.PushSubscription.optIn(); });
        Promise.resolve(p).then(function () {
          var now = !on && O.User.PushSubscription.optedIn; lsSet('hub_push', now ? 1 : 0); b.disabled = false;
          b.textContent = now ? 'Alerts are on. Tap to turn off' : 'Turn on offer alerts'; b.className = 'btn' + (now ? ' ghost' : '') + ' full';
          m.innerHTML = !on && !now ? note('Notifications are blocked in your browser settings for this site.') : note(now ? 'Done. You will get an alert when new offers start.' : 'Alerts are off.', true);
        }).catch(function () { b.disabled = false; m.innerHTML = note('Could not change the alert setting. Try again.'); });
      });
    });
  }

  /* ---------- public page ---------- */
  S.offers = function () {
    return { title: 'Weekly offers', html: '<div id="ov2"></div>', bind: function (view) {
      var ws = weeks(), cur = 0, box = view.querySelector('#ov2');
      function draw() {
        var w = ws[cur], list = offersFor(w.key);
        box.innerHTML = '<div class="hero"><h1>Offers this week</h1><p>New offers start every Thursday and run until the next Thursday. Visit the shop or message the vendor.</p></div>' + alertCard() +
          '<div class="chips" id="och">' + ws.map(function (x, i) { return '<a class="chip' + (i === cur ? ' on' : '') + '" role="button" data-w="' + i + '">' + esc(x.name) + '</a>'; }).join('') + '</div>' +
          '<div class="muted" style="margin-bottom:8px"><b>' + esc(w.range) + '</b></div>' +
          (list.length ? list.map(offerCard).join('') : '<div class="box">No offers ' + (cur ? 'posted for next week yet' : 'this week yet') + '. Vendors can post theirs from <a href="#/myoffers"><b>Weekly offers</b></a> in their shop page.</div>') +
          '<p class="muted">Offers are set by each vendor. Check the price and conditions with the shop. ' + esc(D().platform.name) + ' does not take payment.</p>';
        bindAlert(box);
      }
      box.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-w]'); if (a) { cur = +a.getAttribute('data-w'); draw(); } });
      draw();
    } };
  };

  /* ---------- vendor screen ---------- */
  S.myoffers = function () {
    return { title: 'My offers', html: '<div id="mo"><div class="box muted">Loading…</div></div>', bind: function (view) {
      var box = view.querySelector('#mo'), vendor, list = null, msg = '';
      function draw() {
        var ws = weeks();
        box.innerHTML = '<p><a href="#/sell"><b>‹ Back to my shop</b></a></p><h1>Weekly offers</h1><p class="muted">Offers run Thursday to Thursday. We approve each one before people see it.</p>' +
          '<form class="box" id="of"><b>New offer</b><label class="fld">Offer title<input id="ot" maxlength="80" required placeholder="For example: 20% off all attars"></label>' +
          '<label class="fld">Discount tag (optional)<input id="od" maxlength="40" placeholder="20% off, Buy 1 get 1, Free delivery"></label>' +
          '<label class="fld">Details<textarea id="ox" rows="3" maxlength="300" placeholder="What is included, any conditions"></textarea></label>' +
          '<label class="fld">When<select id="ow">' + ws.map(function (w) { return '<option value="' + w.key + '">' + esc(w.name) + ': ' + esc(w.range) + '</option>'; }).join('') + '</select></label>' +
          (vendor.address ? '' : '<div class="muted">Tip: add your shop address in Edit details so people can visit you.</div>') +
          '<button class="btn full" type="submit">Send for approval</button></form>' + msg +
          '<h2>My offers</h2>' + (list.length ? list.map(function (o) { var w = ws.filter(function (x) { return x.key === o.week; })[0]; return '<div class="box"><div class="otop"><b>' + esc(o.title) + '</b><span class="tag' + (o.status === 'approved' ? ' v' : '') + '">' + esc(o.status === 'pending' ? 'Waiting for approval' : o.status === 'approved' ? 'Live' : 'Not approved') + '</span></div><div class="muted">' + esc(w ? w.name + ': ' + w.range : 'Week of ' + o.week) + (o.discount ? ' · ' + esc(o.discount) : '') + '</div><div class="mr"><button class="btn ghost sm" type="button" data-del="' + esc(o.id) + '">Delete</button></div></div>'; }).join('') : '<div class="box muted">No offers yet.</div>');
        msg = '';
      }
      function load() { DB.myOffers().then(function (l) { list = l.sort(function (a, b) { return String(b.week).localeCompare(String(a.week)); }); draw(); }).catch(function (e) { box.innerHTML = note('Could not load your offers. ' + e.message); }); }
      box.addEventListener('submit', function (e) {
        e.preventDefault(); var g = function (id) { return (document.getElementById(id) || {}).value || ''; };
        var d = { title: g('ot').trim(), discount: g('od').trim(), details: g('ox').trim(), week: g('ow') };
        if (d.title.length < 3) { box.insertAdjacentHTML('beforeend', note('Add a short title for the offer.')); return; }
        DB.saveOffer(d).then(function () { msg = note('Sent. It will go live once approved.', true); load(); }).catch(function (er) { box.insertAdjacentHTML('beforeend', note(er.message)); });
      });
      box.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-del]'); if (b && confirm('Delete this offer?')) DB.deleteOffer(b.getAttribute('data-del')).then(function () { if (root.HubApp) root.HubApp.stale(); load(); }).catch(function (er) { alert(er.message); }); });
      DB.onAuth(function (u) {
        if (!box.isConnected) return;
        if (DB.mode === 'off') { box.innerHTML = note('Accounts are not switched on yet.'); return; }
        if (!u) { box.innerHTML = '<div class="box">Sign in to post offers. <a href="#/sell"><b>Go to vendor sign-in</b></a></div>'; return; }
        DB.myVendor().then(function (v) { if (!v || v.status !== 'approved') { box.innerHTML = '<div class="box">Offers are for approved vendors. <a href="#/sell"><b>Go to my shop</b></a></div>'; return; } vendor = v; load(); });
      });
    } };
  };

  /* ---------- admin screen ---------- */
  S.adminoffers = function () {
    return { title: 'Offers (admin)', html: '<div id="ao"><div class="box muted">Loading…</div></div>', bind: function (view) {
      var box = view.querySelector('#ao'), vs = [], os2 = [], msg = '';
      function vname(id) { var v = vs.filter(function (x) { return x.id === id; })[0]; return v ? v.name : id; }
      function row(o, ws) {
        var w = ws.filter(function (x) { return x.key === o.week; })[0];
        return '<div class="box"><div class="otop"><b>' + esc(o.title) + '</b><span class="tag' + (o.status === 'approved' ? ' v' : '') + '">' + esc(o.status) + '</span></div><div class="muted">' + esc(vname(o.vendorId)) + ' · ' + esc(w ? w.name + ': ' + w.range : 'Week of ' + o.week) + (o.discount ? ' · ' + esc(o.discount) : '') + '</div>' + (o.details ? '<div>' + esc(o.details) + '</div>' : '') +
          '<div class="mr">' + (o.status !== 'approved' ? '<button class="btn sm" type="button" data-st="approved" data-id="' + esc(o.id) + '">Approve</button>' : '') + (o.status === 'pending' ? '<button class="btn ghost sm" type="button" data-st="rejected" data-id="' + esc(o.id) + '">Reject</button>' : '') + '<button class="btn ghost sm" type="button" data-od="' + esc(o.id) + '">Delete</button></div></div>';
      }
      function draw() {
        var ws = weeks(), pend = os2.filter(function (o) { return o.status === 'pending'; }), live = os2.filter(function (o) { return o.status === 'approved' && o.week === ws[0].key; }), nxt = os2.filter(function (o) { return o.status === 'approved' && o.week === ws[1].key; }), old = os2.filter(function (o) { return o.status !== 'pending' && !(o.status === 'approved' && (o.week === ws[0].key || o.week === ws[1].key)); });
        box.innerHTML = '<p><a href="#/admin"><b>‹ Admin</b></a></p><h1>Weekly offers</h1>' + msg +
          '<h2>Send an alert to everyone</h2><form class="box" id="af"><div class="muted">Goes to everyone who turned on offer alerts. Send it once a week, on Thursday.</div>' +
          '<label class="fld">Title<input id="at" maxlength="60" value="New offers this week"></label><label class="fld">Message<textarea id="am" rows="2" maxlength="150">' + esc(live.length + ' shop' + (live.length === 1 ? ' has' : 's have') + ' offers from ' + ws[0].range + '. Tap to see them.') + '</textarea></label>' +
          '<button class="btn full" type="submit"' + (live.length ? '' : ' disabled') + '>Send alert</button>' + (live.length ? '' : '<div class="muted">Approve at least one offer for this week first.</div>') + '</form>' +
          '<h2>Waiting for approval' + (pend.length ? ' <span class="cnt">' + pend.length + '</span>' : '') + '</h2>' + (pend.length ? pend.map(function (o) { return row(o, ws); }).join('') : '<div class="box muted">Nothing waiting.</div>') +
          '<h2>Add an offer for a vendor</h2><form class="box" id="nf"><label class="fld">Vendor<select id="nv">' + vs.filter(function (v) { return v.status === 'approved'; }).map(function (v) { return '<option value="' + esc(v.id) + '">' + esc(v.name) + '</option>'; }).join('') + '</select></label>' +
          '<label class="fld">Title<input id="nt" maxlength="80" required></label><label class="fld">Discount tag (optional)<input id="nd" maxlength="40"></label><label class="fld">Details<textarea id="nx" rows="2" maxlength="300"></textarea></label>' +
          '<label class="fld">When<select id="nw">' + ws.map(function (w) { return '<option value="' + w.key + '">' + esc(w.name) + ': ' + esc(w.range) + '</option>'; }).join('') + '</select></label><button class="btn full" type="submit">Add and publish</button></form>' +
          '<h2>Live this week (' + live.length + ')</h2>' + (live.map(function (o) { return row(o, ws); }).join('') || '<div class="box muted">None.</div>') +
          '<h2>Live next week (' + nxt.length + ')</h2>' + (nxt.map(function (o) { return row(o, ws); }).join('') || '<div class="box muted">None.</div>') +
          (old.length ? '<h2>Older or not approved</h2>' + old.map(function (o) { return row(o, ws); }).join('') : '');
        msg = '';
      }
      function load() {
        DB.isAdmin().then(function (ok) {
          if (!ok) { box.innerHTML = '<div class="box">This page is for the Dargah Hub team. <a href="#/sell"><b>Sign in</b></a> with the admin account.</div>'; return; }
          return Promise.all([DB.adminVendors(), DB.adminOffers()]).then(function (r) { vs = r[0]; os2 = r[1]; draw(); });
        }).catch(function (e) { box.innerHTML = '<div class="box">Could not load. ' + esc(e.message) + '</div>'; });
      }
      function done(p) { return p.then(function () { if (root.HubApp) root.HubApp.stale(); }).then(load).catch(function (er) { alert(er.message); }); }
      box.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('button'); if (!b) return;
        if (b.hasAttribute('data-st')) done(DB.adminSetOffer(b.getAttribute('data-id'), b.getAttribute('data-st')));
        else if (b.hasAttribute('data-od') && confirm('Delete this offer?')) done(DB.deleteOffer(b.getAttribute('data-od')));
      });
      box.addEventListener('submit', function (e) {
        e.preventDefault(); var g = function (id) { return (document.getElementById(id) || {}).value || ''; };
        if (e.target.id === 'nf') {
          var d = { title: g('nt').trim(), discount: g('nd').trim(), details: g('nx').trim(), week: g('nw') };
          if (d.title.length < 3 || !g('nv')) { alert('Choose a vendor and add a title.'); return; }
          done(DB.adminSaveOffer(g('nv'), d)); return;
        }
        if (e.target.id === 'af') {
          var t = g('at').trim(), m = g('am').trim(); if (!t || !m) { alert('Add a title and a message.'); return; }
          if (!confirm('Send this alert to everyone who turned on offer alerts?')) return;
          var btn = e.target.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…';
          DB.idToken().then(function (tok) {
            return fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ title: t, message: m }) });
          }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'The alert could not be sent.'); msg = note('Alert sent.', true); draw(); });
          }).catch(function (er) { btn.disabled = false; btn.textContent = 'Send alert'; box.insertAdjacentHTML('beforeend', note(er.message)); });
        }
      });
      load();
    } };
  };

  root.HubOffers = { homeBlock: homeBlock, vendorBlock: vendorBlock, weeks: weeks, thursday: thu, mapsUrl: mapsUrl, visitRow: visitRow };
})(typeof self !== 'undefined' ? self : this);
