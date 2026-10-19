/* Dargah Hub data layer. One interface, two back ends:
   - Firebase (Auth + Firestore) when HUB_CONFIG.firebase is set.
   - A browser-only demo (mock) when HUB_CONFIG.mock is true.
   Without either, vendor accounts are "off" and the site shows only the static sample data. */
(function (root) {
  'use strict';
  var cfg = root.HUB_CONFIG || {}, listeners = [];
  var api = { mode: cfg.firebase ? 'firebase' : cfg.mock ? 'mock' : 'off', user: null };
  function emit() { listeners.forEach(function (f) { f(api.user); }); }
  api.onAuth = function (f) { listeners.push(f); f(api.user); };

  /* ---------- demo (mock) ---------- */
  function mockStore() { try { return JSON.parse(localStorage.getItem('hub_mock') || '{}'); } catch (e) { return {}; } }
  function mockSave(s) { try { localStorage.setItem('hub_mock', JSON.stringify(s)); } catch (e) {} }
  function mockImpl() {
    var s = mockStore(); s.vendors = s.vendors || {}; s.products = s.products || {}; s.orders = s.orders || {}; s.leads = s.leads || {}; s.reports = s.reports || {}; s.dargahs = s.dargahs || {}; s.claims = s.claims || {}; s.offers = s.offers || {}; s.redemptions = s.redemptions || {}; s.user = s.user || null;
    function save() { mockSave(s); }
    api.user = s.user; var im = {};
    im.signIn = function (email) { s.user = { uid: 'u_' + email.replace(/\W/g, ''), email: email }; api.user = s.user; save(); emit(); return Promise.resolve(); };
    im.signInGoogle = function () { return im.signIn('demo@vendor.test'); };
    im.signUp = function (email) { return im.signIn(email); };
    im.reset = function () { return Promise.resolve(); };
    im.myProfile = function () { return Promise.resolve(s.user && s.users && s.users[s.user.uid] || null); };
    im.saveProfile = function (d) { s.users = s.users || {}; s.users[s.user.uid] = d; save(); return Promise.resolve(); };
    im.deleteProfile = function () { if (s.users && s.user) delete s.users[s.user.uid]; save(); return Promise.resolve(); };
    im.signOut = function () { s.user = null; api.user = null; save(); emit(); return Promise.resolve(); };
    im.isAdmin = function () { return Promise.resolve(!!(s.user && s.user.email === 'admin@demo.test')); };
    im.myVendor = function () { return Promise.resolve(s.user && s.vendors[s.user.uid] || null); };
    im.saveVendor = function (d) { var u = s.user, old = s.vendors[u.uid]; s.vendors[u.uid] = Object.assign({}, old || {}, d, { id: u.uid, status: old ? old.status : 'pending' }); save(); return Promise.resolve(); };
    im.myProducts = function () { return Promise.resolve(Object.keys(s.products).map(function (k) { return s.products[k]; }).filter(function (p) { return p.vendorId === s.user.uid; })); };
    im.saveProduct = function (d) { var id = d.id || 'm' + Date.now(); s.products[id] = Object.assign({}, s.products[id] || {}, d, { id: id, vendorId: s.user.uid }); save(); return Promise.resolve(id); };
    im.deleteProduct = function (id) { delete s.products[id]; save(); return Promise.resolve(); };
    im.live = function () { var vs = Object.keys(s.vendors).map(function (k) { return s.vendors[k]; }).filter(function (v) { return v.status === 'approved'; }); var ok = {}; vs.forEach(function (v) { ok[v.id] = 1; }); return Promise.resolve({ vendors: vs, products: Object.keys(s.products).map(function (k) { return s.products[k]; }).filter(function (p) { return ok[p.vendorId] && !p.hidden; }), dargahs: Object.keys(s.dargahs).map(function (k) { return s.dargahs[k]; }).filter(function (g) { return !g.hidden; }), offers: Object.keys(s.offers).map(function (k) { return s.offers[k]; }).filter(function (o) { return o.status === 'approved' && ok[o.vendorId]; }) }); };
    im.adminVendors = function () { return Promise.resolve(Object.keys(s.vendors).map(function (k) { return s.vendors[k]; })); };
    im.adminSetStatus = function (uid, st) { s.vendors[uid].status = st; save(); return Promise.resolve(); };
    function list(o) { return Object.keys(o).map(function (k) { return o[k]; }); }
    function nid(p) { return p + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
    im.createOrders = function (arr) { var ids = arr.map(function (o) { var id = nid('o'); s.orders[id] = Object.assign({}, o, { id: id, status: 'new', createdAt: Date.now() }); return id; }); save(); return Promise.resolve(ids); };
    im.getOrder = function (id) { return Promise.resolve(s.orders[id] || null); };
    im.vendorOrders = function () { return Promise.resolve(list(s.orders).filter(function (o) { return o.vendorId === s.user.uid; })); };
    im.setOrderStatus = function (id, st, note) { s.orders[id].status = st; if (note != null) s.orders[id].vendorNote = note; save(); return Promise.resolve(); };
    function weekOf() { var t = new Date(); t = new Date(t.getFullYear(), t.getMonth(), t.getDate() - ((t.getDay() + 3) % 7), 12); function k(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); } return [k(t), k(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 7, 12))]; }
    im.claimOffer = function (o, code) { if (s.redemptions[code]) return Promise.reject(new Error('code-taken')); s.redemptions[code] = { id: code, offerId: o.id, vendorId: o.vendorId, week: o.week, status: 'issued', createdAt: Date.now() }; save(); return Promise.resolve({ code: code }); };
    im.getRedemption = function (code) { return Promise.resolve(s.redemptions[code] || null); };
    im.vendorRedemptions = function () { return Promise.resolve(list(s.redemptions).filter(function (r) { return r.vendorId === s.user.uid; })); };
    im.redeemCode = function (code) { var r = s.redemptions[code]; if (!r) return Promise.reject(new Error('Code not found.')); if (r.status !== 'issued') return Promise.reject(new Error('Already used.')); r.status = 'redeemed'; r.redeemedAt = Date.now(); save(); return Promise.resolve(); };
    im.adminRedemptions = function () { return Promise.resolve(list(s.redemptions)); };
    im.idToken = function () { return Promise.resolve('mock'); };
    im.myOffers = function () { return Promise.resolve(list(s.offers).filter(function (o) { return o.vendorId === s.user.uid; })); };
    im.saveOffer = function (d) { var id = d.id || nid('o'), old = s.offers[id]; if (old && old.status !== 'pending') return Promise.reject(new Error('Only offers waiting for approval can be edited.')); s.offers[id] = Object.assign({}, old || {}, { title: d.title, details: d.details, discount: d.discount, week: d.week, kind: d.kind || 'other', value: d.value || 0, channel: d.channel || 'both' }, { id: id, vendorId: s.user.uid, status: 'pending', createdAt: old ? old.createdAt : Date.now() }); save(); return Promise.resolve(id); };
    im.deleteOffer = function (id) { delete s.offers[id]; save(); return Promise.resolve(); };
    im.adminOffers = function () { return Promise.resolve(list(s.offers)); };
    im.adminSetOffer = function (id, st) { s.offers[id].status = st; save(); return Promise.resolve(); };
    im.adminSaveOffer = function (vid, d) { var id = nid('o'); s.offers[id] = Object.assign({}, d, { id: id, vendorId: vid, status: 'approved', createdAt: Date.now() }); save(); return Promise.resolve(id); };
    im.createLead = function (o) { var id = nid('l'); s.leads[id] = Object.assign({}, o, { id: id, status: 'new', createdAt: Date.now() }); save(); return Promise.resolve(id); };
    im.createReport = function (o) { var id = nid('r'); s.reports[id] = Object.assign({}, o, { id: id, status: 'new', createdAt: Date.now() }); save(); return Promise.resolve(id); };
    im.adminLeads = function () { return Promise.resolve(list(s.leads)); };
    im.adminReports = function () { return Promise.resolve(list(s.reports)); };
    im.adminSetLead = function (id, st) { s.leads[id].status = st; save(); return Promise.resolve(); };
    im.adminSetReport = function (id, st) { s.reports[id].status = st; save(); return Promise.resolve(); };
    im.adminSetVerified = function (uid, v) { s.vendors[uid].verified = !!v; save(); return Promise.resolve(); };
    im.adminHideProduct = function (id) { if (s.products[id]) s.products[id].hidden = true; save(); return Promise.resolve(); };
    im.adminOrders = function () { return Promise.resolve(list(s.orders)); };
    im.adminImport = function (pack) { var skipped = []; (pack.dargahs || []).forEach(function (g) { if (s.dargahs[g.id] && s.dargahs[g.id].ownerUid) { skipped.push(g.id); return; } s.dargahs[g.id] = Object.assign({}, g.data, { id: g.id }); }); pack.vendors.forEach(function (v) { s.vendors[v.id] = Object.assign({}, v.data, { id: v.id }); }); pack.products.forEach(function (p) { s.products[p.id] = Object.assign({}, p.data, { id: p.id }); }); save(); return Promise.resolve({ skipped: skipped }); };
    im.adminDeleteVendor = function (id) { Object.keys(s.products).forEach(function (k) { if (s.products[k].vendorId === id) delete s.products[k]; }); delete s.vendors[id]; save(); return Promise.resolve(); };
    im.adminDargahs = function () { return Promise.resolve(list(s.dargahs)); };
    im.adminUpdateDargah = function (id, f) { Object.assign(s.dargahs[id], f); save(); return Promise.resolve(); };
    im.adminDeleteDargah = function (id) { delete s.dargahs[id]; save(); return Promise.resolve(); };
    im.createClaim = function (o) { var id = nid('c'); s.claims[id] = Object.assign({}, o, { id: id, uid: s.user.uid, email: s.user.email, status: 'new', createdAt: Date.now() }); save(); return Promise.resolve(id); };
    im.myClaims = function () { return Promise.resolve(list(s.claims).filter(function (c) { return c.uid === s.user.uid; })); };
    im.adminClaims = function () { return Promise.resolve(list(s.claims)); };
    im.adminSetClaim = function (id, st) { s.claims[id].status = st; save(); return Promise.resolve(); };
    im.adminSetDargahOwner = function (id, uid) { s.dargahs[id].ownerUid = uid; save(); return Promise.resolve(); };
    im.adminTransferVendor = function (oldId, uid) { var v = s.vendors[oldId]; if (!v) return Promise.reject(new Error('Vendor not found')); if (s.vendors[uid]) return Promise.reject(new Error('That user already has a vendor account. Merge by hand.')); s.vendors[uid] = Object.assign({}, v, { id: uid, status: 'approved' }); Object.keys(s.products).forEach(function (k) { if (s.products[k].vendorId === oldId) s.products[k].vendorId = uid; }); delete s.vendors[oldId]; save(); return Promise.resolve(); };
    im.myDargahs = function () { return Promise.resolve(list(s.dargahs).filter(function (g) { return g.ownerUid === s.user.uid; })); };
    im.saveMyDargah = function (id, f) { if (s.dargahs[id].ownerUid !== s.user.uid) return Promise.reject(new Error('Not your dargah')); Object.assign(s.dargahs[id], f); save(); return Promise.resolve(); };
    return im;
  }

  /* ---------- Firebase ---------- */
  var FV = '10.12.2', FB = 'https://www.gstatic.com/firebasejs/' + FV + '/';
  function fbImpl() {
    var M = null, auth, db;
    function boot() {
      if (M) return M;
      M = Promise.all([import(FB + 'firebase-app.js'), import(FB + 'firebase-auth.js'), import(FB + 'firebase-firestore.js')]).then(function (m) {
        var app = m[0].initializeApp(cfg.firebase); auth = m[1].getAuth(app); db = m[2].getFirestore(app);
        m[1].onAuthStateChanged(auth, function (u) { api.user = u ? { uid: u.uid, email: u.email } : null; emit(); });
        return { app: m[0], au: m[1], fs: m[2] };
      });
      return M;
    }
    var im = {};
    function strip(d) { var o = {}; Object.keys(d).forEach(function (k) { if (d[k] !== undefined) o[k] = d[k]; }); return o; }
    im.init = boot;
    im.signInGoogle = function () { return boot().then(function (x) { return x.au.signInWithPopup(auth, new x.au.GoogleAuthProvider()); }); };
    im.signIn = function (e, p) { return boot().then(function (x) { return x.au.signInWithEmailAndPassword(auth, e, p); }); };
    im.signUp = function (e, p) { return boot().then(function (x) { return x.au.createUserWithEmailAndPassword(auth, e, p); }); };
    im.reset = function (e) { return boot().then(function (x) { return x.au.sendPasswordResetEmail(auth, e); }); };
    im.signOut = function () { return boot().then(function (x) { return x.au.signOut(auth); }); };
    im.myProfile = function () { return boot().then(function (x) { if (!auth.currentUser) return null; return x.fs.getDoc(x.fs.doc(db, 'users', auth.currentUser.uid)).then(function (d) { return d.exists() ? d.data() : null; }); }); };
    im.saveProfile = function (d) { return boot().then(function (x) { return x.fs.setDoc(x.fs.doc(db, 'users', auth.currentUser.uid), Object.assign({}, d, { updatedAt: x.fs.serverTimestamp() })); }); };
    im.deleteProfile = function () { return boot().then(function (x) { return x.fs.deleteDoc(x.fs.doc(db, 'users', auth.currentUser.uid)); }); };
    im.isAdmin = function () { return boot().then(function (x) { if (!auth.currentUser) return false; return x.fs.getDoc(x.fs.doc(db, 'admins', auth.currentUser.uid)).then(function (d) { return d.exists(); }).catch(function () { return false; }); }); };
    im.myVendor = function () { return boot().then(function (x) { return x.fs.getDoc(x.fs.doc(db, 'vendors', auth.currentUser.uid)).then(function (d) { return d.exists() ? Object.assign({ id: d.id }, d.data()) : null; }); }); };
    im.saveVendor = function (d) { return boot().then(function (x) { var ref = x.fs.doc(db, 'vendors', auth.currentUser.uid); return x.fs.getDoc(ref).then(function (old) { var data = strip(Object.assign({}, d, { updatedAt: x.fs.serverTimestamp() })); data.status = old.exists() ? old.data().status : 'pending'; if (old.exists() && old.data().verified !== undefined) data.verified = old.data().verified; return x.fs.setDoc(ref, data); }); }); };
    im.myProducts = function () { return boot().then(function (x) { return x.fs.getDocs(x.fs.query(x.fs.collection(db, 'products'), x.fs.where('vendorId', '==', auth.currentUser.uid))).then(function (q) { return q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); }); }); };
    im.saveProduct = function (d) { return boot().then(function (x) { var data = strip(Object.assign({}, d, { vendorId: auth.currentUser.uid, updatedAt: x.fs.serverTimestamp() })); delete data.id; if (d.id) return x.fs.setDoc(x.fs.doc(db, 'products', d.id), data).then(function () { return d.id; }); return x.fs.addDoc(x.fs.collection(db, 'products'), data).then(function (r) { return r.id; }); }); };
    im.deleteProduct = function (id) { return boot().then(function (x) { return x.fs.deleteDoc(x.fs.doc(db, 'products', id)); }); };
    im.live = function () {
      return boot().then(function (x) {
        return Promise.all([x.fs.getDocs(x.fs.query(x.fs.collection(db, 'vendors'), x.fs.where('status', '==', 'approved'))), x.fs.getDocs(x.fs.collection(db, 'products')), x.fs.getDocs(x.fs.query(x.fs.collection(db, 'dargahs'), x.fs.where('hidden', '==', false))).catch(function () { return { docs: [] }; }), x.fs.getDocs(x.fs.query(x.fs.collection(db, 'offers'), x.fs.where('status', '==', 'approved'), x.fs.where('week', 'in', weekOf()))).catch(function () { return { docs: [] }; })]).then(function (r) {
          var vs = r[0].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }), ok = {}; vs.forEach(function (v) { ok[v.id] = 1; });
          return { vendors: vs, products: r[1].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).filter(function (p) { return ok[p.vendorId] && !p.hidden; }), dargahs: r[2].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }), offers: r[3].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).filter(function (o) { return ok[o.vendorId]; }) };
        });
      });
    };
    im.adminVendors = function () { return boot().then(function (x) { return x.fs.getDocs(x.fs.collection(db, 'vendors')).then(function (q) { return q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); }); }); };
    im.adminSetStatus = function (uid, st) { return boot().then(function (x) { return x.fs.updateDoc(x.fs.doc(db, 'vendors', uid), { status: st }); }); };
    function ms(v) { return v && v.toMillis ? v.toMillis() : v; }
    function ord(d) { var o = Object.assign({ id: d.id }, d.data()); o.createdAt = ms(o.createdAt); o.redeemedAt = ms(o.redeemedAt); return o; }
    im.createOrders = function (arr) { return boot().then(function (x) { return Promise.all(arr.map(function (o) { return x.fs.addDoc(x.fs.collection(db, 'orders'), Object.assign({}, o, { status: 'new', createdAt: x.fs.serverTimestamp() })).then(function (r) { return r.id; }); })); }); };
    im.getOrder = function (id) { return boot().then(function (x) { return x.fs.getDoc(x.fs.doc(db, 'orders', id)).then(function (d) { return d.exists() ? ord(d) : null; }); }); };
    im.vendorOrders = function () { return boot().then(function (x) { return x.fs.getDocs(x.fs.query(x.fs.collection(db, 'orders'), x.fs.where('vendorId', '==', auth.currentUser.uid))).then(function (q) { return q.docs.map(ord); }); }); };
    im.setOrderStatus = function (id, st, note) { return boot().then(function (x) { var u = { status: st, updatedAt: x.fs.serverTimestamp() }; if (note != null) u.vendorNote = note; return x.fs.updateDoc(x.fs.doc(db, 'orders', id), u); }); };
    function weekOf() { var t = new Date(); t = new Date(t.getFullYear(), t.getMonth(), t.getDate() - ((t.getDay() + 3) % 7), 12); function k(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); } return [k(t), k(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 7, 12))]; }
    im.claimOffer = function (o, code) { return boot().then(function (x) { return x.fs.setDoc(x.fs.doc(db, 'redemptions', code), { offerId: o.id, vendorId: o.vendorId, week: o.week, status: 'issued', createdAt: x.fs.serverTimestamp() }).then(function () { return { code: code }; }); }); };
    im.getRedemption = function (code) { return boot().then(function (x) { return x.fs.getDoc(x.fs.doc(db, 'redemptions', code)).then(function (d) { return d.exists() ? ord(d) : null; }); }); };
    im.vendorRedemptions = function () { return boot().then(function (x) { return x.fs.getDocs(x.fs.query(x.fs.collection(db, 'redemptions'), x.fs.where('vendorId', '==', auth.currentUser.uid))).then(function (q) { return q.docs.map(ord); }); }); };
    im.redeemCode = function (code) { return boot().then(function (x) { return x.fs.updateDoc(x.fs.doc(db, 'redemptions', code), { status: 'redeemed', redeemedAt: x.fs.serverTimestamp() }); }); };
    im.adminRedemptions = function () { return boot().then(function (x) { return x.fs.getDocs(x.fs.collection(db, 'redemptions')).then(function (q) { return q.docs.map(ord); }); }); };
    im.idToken = function () { return boot().then(function () { return auth.currentUser ? auth.currentUser.getIdToken() : Promise.reject(new Error('Please sign in again.')); }); };
    im.myOffers = function () { return boot().then(function (x) { return x.fs.getDocs(x.fs.query(x.fs.collection(db, 'offers'), x.fs.where('vendorId', '==', auth.currentUser.uid))).then(function (q) { return q.docs.map(ord); }); }); };
    im.saveOffer = function (d) { return boot().then(function (x) { var f = { title: d.title, details: d.details, discount: d.discount, week: d.week, kind: d.kind || 'other', value: d.value || 0, channel: d.channel || 'both' }; if (d.id) return x.fs.updateDoc(x.fs.doc(db, 'offers', d.id), f).then(function () { return d.id; }); return x.fs.addDoc(x.fs.collection(db, 'offers'), Object.assign(f, { vendorId: auth.currentUser.uid, status: 'pending', createdAt: x.fs.serverTimestamp() })).then(function (r) { return r.id; }); }); };
    im.deleteOffer = function (id) { return boot().then(function (x) { return x.fs.deleteDoc(x.fs.doc(db, 'offers', id)); }); };
    im.adminOffers = function () { return boot().then(function (x) { return x.fs.getDocs(x.fs.collection(db, 'offers')).then(function (q) { return q.docs.map(ord); }); }); };
    im.adminSetOffer = function (id, st) { return boot().then(function (x) { return x.fs.updateDoc(x.fs.doc(db, 'offers', id), { status: st }); }); };
    im.adminSaveOffer = function (vid, d) { return boot().then(function (x) { return x.fs.addDoc(x.fs.collection(db, 'offers'), Object.assign({}, d, { vendorId: vid, status: 'approved', createdAt: x.fs.serverTimestamp() })).then(function (r) { return r.id; }); }); };
    im.createLead = function (o) { return boot().then(function (x) { return x.fs.addDoc(x.fs.collection(db, 'leads'), Object.assign({}, o, { status: 'new', createdAt: x.fs.serverTimestamp() })).then(function (r) { return r.id; }); }); };
    im.createReport = function (o) { return boot().then(function (x) { return x.fs.addDoc(x.fs.collection(db, 'reports'), Object.assign({}, o, { status: 'new', createdAt: x.fs.serverTimestamp() })).then(function (r) { return r.id; }); }); };
    im.adminLeads = function () { return boot().then(function (x) { return x.fs.getDocs(x.fs.collection(db, 'leads')).then(function (q) { return q.docs.map(ord); }); }); };
    im.adminReports = function () { return boot().then(function (x) { return x.fs.getDocs(x.fs.collection(db, 'reports')).then(function (q) { return q.docs.map(ord); }); }); };
    im.adminSetLead = function (id, st) { return boot().then(function (x) { return x.fs.updateDoc(x.fs.doc(db, 'leads', id), { status: st }); }); };
    im.adminSetReport = function (id, st) { return boot().then(function (x) { return x.fs.updateDoc(x.fs.doc(db, 'reports', id), { status: st }); }); };
    im.adminSetVerified = function (uid, v) { return boot().then(function (x) { return x.fs.updateDoc(x.fs.doc(db, 'vendors', uid), { verified: !!v }); }); };
    im.adminHideProduct = function (id) { return boot().then(function (x) { return x.fs.updateDoc(x.fs.doc(db, 'products', id), { hidden: true }); }); };
    im.adminOrders = function () { return boot().then(function (x) { return x.fs.getDocs(x.fs.collection(db, 'orders')).then(function (q) { return q.docs.map(ord); }); }); };
    im.adminImport = function (pack) {
      return boot().then(function (x) {
        var claimedP = (pack.dargahs && pack.dargahs.length) ? x.fs.getDocs(x.fs.collection(db, 'dargahs')).then(function (q) { var m = {}; q.docs.forEach(function (d) { if (d.data().ownerUid) m[d.id] = 1; }); return m; }) : Promise.resolve({});
        return claimedP.then(function (claimed) {
        var skipped = []; pack = Object.assign({}, pack, { dargahs: (pack.dargahs || []).filter(function (g) { if (claimed[g.id]) { skipped.push(g.id); return false; } return true; }) });
        var ops = pack.vendors.map(function (v) { return ['vendors', v.id, v.data]; }).concat(pack.products.map(function (p) { return ['products', p.id, p.data]; })).concat((pack.dargahs || []).map(function (g) { return ['dargahs', g.id, g.data]; })), chain = Promise.resolve();
        for (var i = 0; i < ops.length; i += 400) (function (part) {
          chain = chain.then(function () { var b = x.fs.writeBatch(db); part.forEach(function (o) { b.set(x.fs.doc(db, o[0], o[1]), Object.assign({}, o[2], { updatedAt: x.fs.serverTimestamp() })); }); return b.commit(); });
        })(ops.slice(i, i + 400));
        return chain.then(function () { return { skipped: skipped }; });
        });
      });
    };
    im.adminDeleteVendor = function (id) {
      return boot().then(function (x) {
        return x.fs.getDocs(x.fs.query(x.fs.collection(db, 'products'), x.fs.where('vendorId', '==', id))).then(function (q) {
          return Promise.all(q.docs.map(function (d) { return x.fs.deleteDoc(d.ref); }));
        }).then(function () { return x.fs.deleteDoc(x.fs.doc(db, 'vendors', id)); });
      });
    };
    function docs(q) { return q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); }
    im.adminDargahs = function () { return boot().then(function (x) { return x.fs.getDocs(x.fs.collection(db, 'dargahs')).then(docs); }); };
    im.adminUpdateDargah = function (id, f) { return boot().then(function (x) { return x.fs.updateDoc(x.fs.doc(db, 'dargahs', id), f); }); };
    im.adminDeleteDargah = function (id) { return boot().then(function (x) { return x.fs.deleteDoc(x.fs.doc(db, 'dargahs', id)); }); };
    im.createClaim = function (o) { return boot().then(function (x) { return x.fs.addDoc(x.fs.collection(db, 'claims'), Object.assign({}, o, { uid: auth.currentUser.uid, email: auth.currentUser.email || '', status: 'new', createdAt: x.fs.serverTimestamp() })).then(function (r) { return r.id; }); }); };
    im.myClaims = function () { return boot().then(function (x) { return x.fs.getDocs(x.fs.query(x.fs.collection(db, 'claims'), x.fs.where('uid', '==', auth.currentUser.uid))).then(function (q) { return docs(q).map(function (c) { c.createdAt = ms(c.createdAt); return c; }); }); }); };
    im.adminClaims = function () { return boot().then(function (x) { return x.fs.getDocs(x.fs.collection(db, 'claims')).then(function (q) { return docs(q).map(function (c) { c.createdAt = ms(c.createdAt); return c; }); }); }); };
    im.adminSetClaim = function (id, st) { return boot().then(function (x) { return x.fs.updateDoc(x.fs.doc(db, 'claims', id), { status: st }); }); };
    im.adminSetDargahOwner = function (id, uid) { return boot().then(function (x) { return x.fs.updateDoc(x.fs.doc(db, 'dargahs', id), { ownerUid: uid }); }); };
    im.adminTransferVendor = function (oldId, uid) {
      return boot().then(function (x) {
        var fs = x.fs;
        return fs.getDoc(fs.doc(db, 'vendors', oldId)).then(function (d) {
          if (!d.exists()) throw new Error('Vendor not found');
          var data = d.data(); data.status = 'approved';
          return fs.getDoc(fs.doc(db, 'vendors', uid)).then(function (ex) { if (ex.exists()) throw new Error('That user already has a vendor account. Merge by hand.'); return fs.setDoc(fs.doc(db, 'vendors', uid), data); });
        }).then(function () { return fs.getDocs(fs.query(fs.collection(db, 'products'), fs.where('vendorId', '==', oldId))); })
          .then(function (q) { return Promise.all(q.docs.map(function (p) { var pd = p.data(); pd.vendorId = uid; return fs.addDoc(fs.collection(db, 'products'), pd).then(function () { return fs.deleteDoc(p.ref); }); })); })
          .then(function () { return fs.deleteDoc(fs.doc(db, 'vendors', oldId)); });
      });
    };
    im.myDargahs = function () { return boot().then(function (x) { return x.fs.getDocs(x.fs.query(x.fs.collection(db, 'dargahs'), x.fs.where('ownerUid', '==', auth.currentUser.uid))).then(docs); }); };
    im.saveMyDargah = function (id, f) { return boot().then(function (x) { return x.fs.updateDoc(x.fs.doc(db, 'dargahs', id), Object.assign({}, f, { updatedAt: x.fs.serverTimestamp() })); }); };
    return im;
  }

  var impl = api.mode === 'firebase' ? fbImpl() : api.mode === 'mock' ? mockImpl() : null;
  ['myProfile', 'saveProfile', 'deleteProfile', 'signIn', 'signInGoogle', 'signUp', 'reset', 'signOut', 'isAdmin', 'myVendor', 'saveVendor', 'myProducts', 'saveProduct', 'deleteProduct', 'live', 'adminVendors', 'adminSetStatus', 'createOrders', 'getOrder', 'vendorOrders', 'setOrderStatus', 'createLead', 'createReport', 'adminLeads', 'adminReports', 'adminSetLead', 'adminSetReport', 'adminSetVerified', 'adminHideProduct', 'adminOrders', 'adminImport', 'adminDeleteVendor', 'adminDargahs', 'adminUpdateDargah', 'adminDeleteDargah', 'createClaim', 'myClaims', 'adminClaims', 'adminSetClaim', 'adminSetDargahOwner', 'adminTransferVendor', 'myDargahs', 'saveMyDargah', 'claimOffer', 'getRedemption', 'vendorRedemptions', 'redeemCode', 'adminRedemptions', 'idToken', 'myOffers', 'saveOffer', 'deleteOffer', 'adminOffers', 'adminSetOffer', 'adminSaveOffer'].forEach(function (k) {
    api[k] = function () { return impl && impl[k] ? impl[k].apply(null, arguments) : Promise.reject(new Error('Vendor accounts are not switched on yet.')); };
  });
  if (impl && impl.init) impl.init().catch(function () {});
  root.HubDB = api;
})(typeof self !== 'undefined' ? self : this);
