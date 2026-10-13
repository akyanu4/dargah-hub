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
    var s = mockStore(); s.vendors = s.vendors || {}; s.products = s.products || {}; s.user = s.user || null;
    function save() { mockSave(s); }
    api.user = s.user; var im = {};
    im.signIn = function (email) { s.user = { uid: 'u_' + email.replace(/\W/g, ''), email: email }; api.user = s.user; save(); emit(); return Promise.resolve(); };
    im.signInGoogle = function () { return im.signIn('demo@vendor.test'); };
    im.signUp = function (email) { return im.signIn(email); };
    im.reset = function () { return Promise.resolve(); };
    im.signOut = function () { s.user = null; api.user = null; save(); emit(); return Promise.resolve(); };
    im.isAdmin = function () { return Promise.resolve(!!(s.user && s.user.email === 'admin@demo.test')); };
    im.myVendor = function () { return Promise.resolve(s.user && s.vendors[s.user.uid] || null); };
    im.saveVendor = function (d) { var u = s.user, old = s.vendors[u.uid]; s.vendors[u.uid] = Object.assign({}, old || {}, d, { id: u.uid, status: old ? old.status : 'pending' }); save(); return Promise.resolve(); };
    im.myProducts = function () { return Promise.resolve(Object.keys(s.products).map(function (k) { return s.products[k]; }).filter(function (p) { return p.vendorId === s.user.uid; })); };
    im.saveProduct = function (d) { var id = d.id || 'm' + Date.now(); s.products[id] = Object.assign({}, s.products[id] || {}, d, { id: id, vendorId: s.user.uid }); save(); return Promise.resolve(id); };
    im.deleteProduct = function (id) { delete s.products[id]; save(); return Promise.resolve(); };
    im.live = function () { var vs = Object.keys(s.vendors).map(function (k) { return s.vendors[k]; }).filter(function (v) { return v.status === 'approved'; }); var ok = {}; vs.forEach(function (v) { ok[v.id] = 1; }); return Promise.resolve({ vendors: vs, products: Object.keys(s.products).map(function (k) { return s.products[k]; }).filter(function (p) { return ok[p.vendorId] && !p.hidden; }) }); };
    im.adminVendors = function () { return Promise.resolve(Object.keys(s.vendors).map(function (k) { return s.vendors[k]; })); };
    im.adminSetStatus = function (uid, st) { s.vendors[uid].status = st; save(); return Promise.resolve(); };
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
    im.isAdmin = function () { return boot().then(function (x) { if (!auth.currentUser) return false; return x.fs.getDoc(x.fs.doc(db, 'admins', auth.currentUser.uid)).then(function (d) { return d.exists(); }).catch(function () { return false; }); }); };
    im.myVendor = function () { return boot().then(function (x) { return x.fs.getDoc(x.fs.doc(db, 'vendors', auth.currentUser.uid)).then(function (d) { return d.exists() ? Object.assign({ id: d.id }, d.data()) : null; }); }); };
    im.saveVendor = function (d) { return boot().then(function (x) { var ref = x.fs.doc(db, 'vendors', auth.currentUser.uid); return x.fs.getDoc(ref).then(function (old) { var data = strip(Object.assign({}, d, { updatedAt: x.fs.serverTimestamp() })); data.status = old.exists() ? old.data().status : 'pending'; return x.fs.setDoc(ref, data); }); }); };
    im.myProducts = function () { return boot().then(function (x) { return x.fs.getDocs(x.fs.query(x.fs.collection(db, 'products'), x.fs.where('vendorId', '==', auth.currentUser.uid))).then(function (q) { return q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); }); }); };
    im.saveProduct = function (d) { return boot().then(function (x) { var data = strip(Object.assign({}, d, { vendorId: auth.currentUser.uid, updatedAt: x.fs.serverTimestamp() })); delete data.id; if (d.id) return x.fs.setDoc(x.fs.doc(db, 'products', d.id), data).then(function () { return d.id; }); return x.fs.addDoc(x.fs.collection(db, 'products'), data).then(function (r) { return r.id; }); }); };
    im.deleteProduct = function (id) { return boot().then(function (x) { return x.fs.deleteDoc(x.fs.doc(db, 'products', id)); }); };
    im.live = function () {
      return boot().then(function (x) {
        return Promise.all([x.fs.getDocs(x.fs.query(x.fs.collection(db, 'vendors'), x.fs.where('status', '==', 'approved'))), x.fs.getDocs(x.fs.collection(db, 'products'))]).then(function (r) {
          var vs = r[0].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }), ok = {}; vs.forEach(function (v) { ok[v.id] = 1; });
          return { vendors: vs, products: r[1].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).filter(function (p) { return ok[p.vendorId] && !p.hidden; }) };
        });
      });
    };
    im.adminVendors = function () { return boot().then(function (x) { return x.fs.getDocs(x.fs.collection(db, 'vendors')).then(function (q) { return q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); }); }); };
    im.adminSetStatus = function (uid, st) { return boot().then(function (x) { return x.fs.updateDoc(x.fs.doc(db, 'vendors', uid), { status: st }); }); };
    return im;
  }

  var impl = api.mode === 'firebase' ? fbImpl() : api.mode === 'mock' ? mockImpl() : null;
  ['signIn', 'signInGoogle', 'signUp', 'reset', 'signOut', 'isAdmin', 'myVendor', 'saveVendor', 'myProducts', 'saveProduct', 'deleteProduct', 'live', 'adminVendors', 'adminSetStatus'].forEach(function (k) {
    api[k] = function () { return impl && impl[k] ? impl[k].apply(null, arguments) : Promise.reject(new Error('Vendor accounts are not switched on yet.')); };
  });
  if (impl && impl.init) impl.init().catch(function () {});
  root.HubDB = api;
})(typeof self !== 'undefined' ? self : this);
