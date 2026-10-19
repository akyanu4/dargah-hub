/* Optional visitor accounts. Everything in the app works without one. Signing in keeps what you follow, what you saved and your saved
   deal codes on your account, so they come with you to a new phone. Sign-in is shared with the vendor and admin sign-in (same accounts). */
(function (root) {
  var DB = root.HubDB, S = root.HubScreens = root.HubScreens || {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function note(t, ok) { return '<div class="note ' + (ok ? 'ok' : 'err') + '" role="status">' + esc(t) + '</div>'; }
  function on() { return !!(DB && DB.mode !== 'off'); }
  function user() { return DB && DB.user; }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function uniq(a) { var o = {}; return a.filter(function (x) { if (o[x]) return false; o[x] = 1; return true; }); }
  function friendly(er) {
    var m = String((er && (er.code || er.message)) || '');
    if (/invalid-credential|wrong-password|user-not-found/.test(m)) return 'That email and password do not match.';
    if (/email-already-in-use/.test(m)) return 'There is already an account with this email. Try signing in.';
    if (/weak-password/.test(m)) return 'Choose a password with at least 6 characters.';
    if (/invalid-email/.test(m)) return 'That email does not look right.';
    if (/popup-closed|cancelled-popup/.test(m)) return 'Sign-in was closed before it finished.';
    if (/too-many-requests/.test(m)) return 'Too many tries. Wait a few minutes and try again.';
    if (/network/.test(m)) return 'Could not reach the server. Check your internet.';
    return String((er && er.message) || 'Something went wrong.').replace('Firebase: ', '');
  }

  /* ---- what is kept ---- */
  function local() {
    var s = root.HubEngage ? HubEngage.snapshot() : { follow: { d: [], v: [] }, saved: [] };
    var c = lsGet('hub_codes', []); return { follow: s.follow, saved: s.saved, codes: Array.isArray(c) ? c : [] };
  }
  function merge(a, b) { // a = this phone, b = account. Nothing is lost: both are combined.
    var f = { d: uniq(((a.follow || {}).d || []).concat((b.follow || {}).d || [])), v: uniq(((a.follow || {}).v || []).concat((b.follow || {}).v || [])) };
    var seen = {}, codes = (a.codes || []).concat(b.codes || []).filter(function (c) { if (!c || !c.code || seen[c.code]) return false; seen[c.code] = 1; return true; }).slice(0, 60);
    return { follow: f, saved: uniq((a.saved || []).concat(b.saved || [])).slice(0, 100), codes: codes };
  }
  function pack(m) { return { follow: m.follow, saved: m.saved, codes: JSON.stringify(m.codes) }; }
  function unpack(p) { var c = []; try { c = JSON.parse((p && p.codes) || '[]'); } catch (e) {} return { follow: (p && p.follow && Array.isArray(p.follow.d) ? p.follow : { d: [], v: [] }), saved: (p && p.saved) || [], codes: Array.isArray(c) ? c : [] }; }
  function put(m) { if (root.HubEngage) HubEngage.apply(m); lsSet('hub_codes', m.codes); }
  var last = '', busy = false, state = { at: 0, err: '' };
  function sync() { // pull, combine, write both ways
    if (!on() || !user() || busy) return Promise.resolve();
    busy = true;
    return DB.myProfile().then(function (p) {
      var m = merge(local(), unpack(p)); put(m); last = JSON.stringify(m);
      return DB.saveProfile(pack(m));
    }).then(function () { state.at = Date.now(); state.err = ''; }, function (e) { state.err = friendly(e); }).then(function () { busy = false; });
  }
  function push() { // send local changes
    if (!on() || !user() || busy) return;
    var m = local(), j = JSON.stringify(m); if (j === last) return;
    last = j; DB.saveProfile(pack(m)).then(function () { state.at = Date.now(); state.err = ''; }, function (e) { state.err = friendly(e); last = ''; });
  }
  var t = null; function later() { clearTimeout(t); t = setTimeout(push, 1500); }
  if (DB) DB.onAuth(function (u) { if (u) sync(); else last = ''; label(); });
  window.addEventListener('hashchange', function () { later(); label(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) push(); });
  function label() { var el = document.getElementById('acct'); if (el) el.textContent = user() ? 'My account (' + (user().email || 'signed in') + ')' : 'Sign in or create account'; }

  function hint() {
    if (!on()) return 'Kept on this phone only.';
    return user() ? 'Kept on your account, so it comes with you to a new phone.' : 'Kept on this phone. <a href="#/account"><b>Sign in</b></a> to keep it on every device.';
  }

  /* ---- screen ---- */
  S.account = function () {
    return { title: 'Account', html: '<div id="acv"></div>', bind: function (view) {
      var el = view.querySelector('#acv'), mode = 'signin', msg = '';
      function authForm() {
        return '<h1>' + (mode === 'signup' ? 'Create your account' : 'Sign in') + '</h1><p class="muted">You do not need an account to use Dargah Hub. An account keeps what you follow, what you saved and your deal codes with you when you change phone.</p>' + msg +
          '<form class="box" id="af"><button class="btn ghost full" type="button" data-a="google">Continue with Google</button><div class="muted center">or use email</div>' +
          '<label class="fld">Email<input id="aem" type="email" autocomplete="email" required></label>' +
          '<label class="fld">Password<input id="apw" type="password" minlength="6" autocomplete="' + (mode === 'signup' ? 'new-password' : 'current-password') + '" required></label>' +
          '<button class="btn full" type="submit">' + (mode === 'signup' ? 'Create account' : 'Sign in') + '</button>' +
          '<div class="muted center">' + (mode === 'signup' ? 'Already have an account? <a href="#" data-a="to-in"><b>Sign in</b></a>' : 'New here? <a href="#" data-a="to-up"><b>Create an account</b></a> · <a href="#" data-a="forgot">Forgot password?</a>') + '</div></form>' +
          '<p class="muted">By continuing you agree to the <a href="terms.html">Terms</a> and <a href="privacy.html">Privacy</a>. Vendors and dargah keepers use the same sign-in.</p>';
      }
      function inView() {
        var u = user(), c = local();
        return '<h1>My account</h1>' + msg + '<div class="box"><b>' + esc(u.email || 'Signed in') + '</b><div class="muted">' + (state.err ? esc(state.err) : state.at ? 'Synced just now.' : 'Syncing…') + '</div></div>' +
          '<h2>On your account</h2><div class="list"><a href="#/following"><span>Following</span><i>' + (c.follow.d.length + c.follow.v.length) + ' ›</i></a><a href="#/saved"><span>Saved items</span><i>' + c.saved.length + ' ›</i></a><a href="#/mycodes"><span>My saved deals</span><i>' + c.codes.length + ' ›</i></a></div>' +
          '<div class="mr"><button class="btn ghost" type="button" data-a="sync">Sync now</button><button class="btn ghost" type="button" data-a="out">Sign out</button></div>' +
          '<h2>Your data</h2><div class="box"><div class="muted">Only you can see what is kept on your account. Delete it any time. This clears the copy on your account and keeps what is on this phone.</div><button class="btn ghost sm" type="button" data-a="del">Delete my account data</button></div>' +
          '<div class="muted">Sell something or keep a dargah? <a href="#/sell"><b>Vendor sign-in</b></a> · <a href="#/mydargah"><b>Keeper page</b></a></div>';
      }
      function draw() { el.innerHTML = !on() ? '<h1>Account</h1><div class="box">Accounts are not switched on yet. Everything still works and is kept on this phone.</div>' : (user() ? inView() : authForm()); label(); }
      function fail(er) { msg = note(friendly(er)); draw(); }
      el.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-a]'); if (!b) return; var a = b.getAttribute('data-a'); if (b.tagName === 'A') e.preventDefault();
        if (a === 'google') DB.signInGoogle().catch(fail);
        else if (a === 'to-up') { mode = 'signup'; msg = ''; draw(); } else if (a === 'to-in') { mode = 'signin'; msg = ''; draw(); }
        else if (a === 'forgot') { var em = (document.getElementById('aem') || {}).value; if (!em) { msg = note('Type your email above first.'); draw(); return; } DB.reset(em).then(function () { msg = note('If that email has an account, a reset link is on its way.', true); draw(); }, fail); }
        else if (a === 'sync') { b.disabled = true; sync().then(function () { msg = state.err ? note(state.err) : note('Synced.', true); draw(); }); }
        else if (a === 'out') { DB.signOut(); }
        else if (a === 'del') { if (confirm('Delete what is kept on your account? What is on this phone stays.')) DB.deleteProfile().then(function () { last = ''; msg = note('Deleted from your account.', true); draw(); }, fail); }
      });
      el.addEventListener('submit', function (e) {
        e.preventDefault(); var fn = mode === 'signup' ? DB.signUp : DB.signIn;
        fn(document.getElementById('aem').value.trim(), document.getElementById('apw').value).catch(fail);
      });
      var off = null; DB && DB.onAuth(function () { if (document.body.contains(el)) { msg = ''; draw(); } });
      draw();
    } };
  };
  root.HubAccount = { hint: hint, sync: sync, push: push, merge: merge, label: label };
  var obs = new MutationObserver(label); document.addEventListener('DOMContentLoaded', function () { obs.observe(document.getElementById('app') || document.body, { childList: true }); label(); });
})(window);
