/* Dargah Hub: claim a page (keepers and shop owners) and the keeper's page editor (#/mydargah). */
(function (root) {
  'use strict';
  var S = root.HubScreens = root.HubScreens || {}, DB = root.HubDB;
  function H() { return root.HubApp; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function https(u) { u = String(u || '').trim(); return !u || /^https:\/\/[^\s]+\.[^\s]+$/i.test(u); }
  function note(t, ok) { return '<div class="note ' + (ok ? 'ok' : 'err') + '" role="status">' + esc(t) + '</div>'; }
  function f(id, label, val, attrs, hint) { return '<label class="fld">' + esc(label) + '<input id="' + id + '" value="' + esc(val) + '" ' + (attrs || '') + '>' + (hint ? '<small class="muted">' + esc(hint) + '</small>' : '') + '</label>'; }
  function ta(id, label, val, max, rows, hint) { return '<label class="fld">' + esc(label) + '<textarea id="' + id + '" rows="' + (rows || 4) + '" maxlength="' + max + '">' + esc(val) + '</textarea>' + (hint ? '<small class="muted">' + esc(hint) + '</small>' : '') + '</label>'; }
  var STAT = { new: 'Waiting for the Dargah Hub team to check', approved: 'Approved', rejected: 'Not approved' };

  /* a small sign-in block shared by both screens */
  function authBlock(mode) {
    return '<form class="box" id="authf"><b>' + (mode === 'signup' ? 'Create an account' : 'Sign in') + '</b><p class="muted">We use your account only to know who is asking to manage the page.</p>' +
      '<button class="btn ghost full" type="button" data-a="google">Continue with Google</button><div class="muted center">or use email</div>' +
      f('em', 'Email', '', 'type="email" autocomplete="email" required') + f('pw', 'Password', '', 'type="password" minlength="6" autocomplete="' + (mode === 'signup' ? 'new-password' : 'current-password') + '" required') +
      '<button class="btn full" type="submit">' + (mode === 'signup' ? 'Create account' : 'Sign in') + '</button>' +
      '<div class="muted center">' + (mode === 'signup' ? 'Have an account? <a href="#" data-a="tosignin"><b>Sign in</b></a>' : 'New here? <a href="#" data-a="tosignup"><b>Create an account</b></a>') + '</div></form>';
  }
  function gate(el, draw) {
    var st = { mode: 'signin', note: '', user: null };
    if (DB.mode === 'off') { el.innerHTML = '<div class="box">Accounts are not switched on yet. Please contact the Dargah Hub team.</div>'; return; }
    el.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-a]'); if (!b || !document.getElementById('authf')) return; var a = b.getAttribute('data-a'); e.preventDefault();
      if (a === 'google') DB.signInGoogle().catch(function (er) { st.note = note(er.message || 'Sign-in failed'); show(); });
      else if (a === 'tosignup') { st.mode = 'signup'; st.note = ''; show(); } else if (a === 'tosignin') { st.mode = 'signin'; st.note = ''; show(); }
    });
    el.addEventListener('submit', function (e) {
      if (e.target.id !== 'authf') return; e.preventDefault();
      var fn = st.mode === 'signup' ? DB.signUp : DB.signIn;
      fn(document.getElementById('em').value.trim(), document.getElementById('pw').value).catch(function (er) { st.note = note(String(er.message || 'Sign-in failed').replace('Firebase: ', '')); show(); });
    });
    function show() { if (!st.user) el.innerHTML = authBlock(st.mode) + st.note; else draw(st.user); }
    DB.onAuth(function (u) { if (!document.body.contains(el) && el.isConnected === false) return; st.user = u; show(); });
  }

  /* ---------- claim ---------- */
  S.claim = function (type, id) {
    var D = H().D(), name = '';
    if (type === 'd') { var d = D.dargahs.filter(function (x) { return x.id === id; })[0]; name = d ? d.name : ''; }
    else if (type === 'v') { var v = H().vendor(id); name = v ? v.name : ''; }
    if (!name || (type !== 'd' && type !== 'v')) return { title: 'Claim', html: '<h2>Not found</h2><p><a href="#/">Go home</a></p>' };
    return { title: 'Claim', html: '<div id="cl"></div>', bind: function (view) {
      var el = view.querySelector('#cl');
      var head = '<h1>Claim ' + esc(name) + '</h1><p class="muted">' + (type === 'd' ? 'If you are the keeper of this dargah (sajjada nasheen, mutawalli or authorised caretaker), you can take over this page and keep it up to date.' : 'If this is your shop, you can take it over. Your items and any orders then come to your own account.') + ' We check every claim with the dargah or shop before approving.</p>';
      gate(el, function (user) {
        el.innerHTML = head + '<div class="box muted">Loading…</div>';
        DB.myClaims().then(function (cs) {
          var mine = cs.filter(function (c) { return c.targetId === id && c.targetType === type; })[0];
          if (mine) {
            el.innerHTML = head + '<div class="box"><b>Your claim: ' + esc(STAT[mine.status] || mine.status) + '</b><div class="muted">Signed in as ' + esc(user.email || '') + '</div>' + (mine.status === 'approved' ? (type === 'd' ? '<a class="btn full" href="#/mydargah">Edit your dargah page</a>' : '<a class="btn full" href="#/sell">Open your vendor account</a>') : '') + '</div>';
            return;
          }
          el.innerHTML = head + '<form class="box" id="clf"><div class="muted">Signed in as ' + esc(user.email || '') + '</div>' + f('cn', 'Your name', '', 'maxlength="80" required') + f('cp', 'Phone or WhatsApp', '', 'inputmode="tel" maxlength="30" required', 'We may call to confirm.') +
            ta('cm', type === 'd' ? 'Your role and how we can confirm it' : 'How we can confirm this is your shop', '', 1000, 4, type === 'd' ? 'For example: Sajjada nasheen. The dargah committee office can confirm on 98xxxxxxxx.' : 'For example: the shop address, or your number on the shop board.') +
            '<button class="btn full" type="submit">Send claim</button></form>';
          el.querySelector('#clf').addEventListener('submit', function (e) {
            e.preventDefault(); var g = function (k) { return (document.getElementById(k).value || '').trim(); }, btn = e.target.querySelector('button[type=submit]');
            var fail = function (t) { var n = e.target.querySelector('.note'); if (n) n.remove(); e.target.insertAdjacentHTML('beforeend', note(t)); };
            if (g('cn').length < 2) return fail('Please add your name.'); if (digits(g('cp')).length < 8) return fail('Please add a phone number we can reach.'); if (g('cm').length < 5) return fail('Please tell us how we can confirm this.');
            btn.disabled = true; btn.textContent = 'Sending…';
            DB.createClaim({ targetType: type, targetId: id, targetName: name.slice(0, 120), name: g('cn'), phone: g('cp'), message: g('cm') })
              .then(function () { el.innerHTML = head + note('Thank you. We have your claim and will check it with the ' + (type === 'd' ? 'dargah' : 'shop') + ' before approving.', true) + '<a class="btn ghost full" href="#/">Back to home</a>'; })
              .catch(function () { btn.disabled = false; btn.textContent = 'Send claim'; fail('We could not send your claim. Check your connection and try again.'); });
          });
        }).catch(function () { el.innerHTML = head + note('Could not load. Check your connection and try again.'); });
      });
    } };
  };

  /* ---------- keeper's editor ---------- */
  function timingsText(a) { return (a || []).map(function (t) { return t.label + ': ' + t.time; }).join('\n'); }
  function eventsText(a) { return (a || []).map(function (e) { return e.title + ' | ' + e.when; }).join('\n'); }
  function parseTimings(t) { return String(t || '').split(/\n|;/).map(function (l) { l = l.trim(); var i = l.indexOf(':'); return i > 0 ? { label: l.slice(0, i).trim().slice(0, 40), time: l.slice(i + 1).trim().slice(0, 80) } : null; }).filter(function (x) { return x && x.time; }).slice(0, 10); }
  function parseEvents(t) { return String(t || '').split(/\n/).map(function (l) { l = l.trim(); var i = l.indexOf('|'); return i > 0 ? { title: l.slice(0, i).trim().slice(0, 80), when: l.slice(i + 1).trim().slice(0, 80) } : (l ? { title: l.slice(0, 80), when: '' } : null); }).filter(Boolean).slice(0, 12); }
  function aboutText(a) { return Array.isArray(a) ? a.join('\n\n') : String(a || ''); }

  S.mydargah = function () {
    return { title: 'My dargah', html: '<div id="md"></div>', bind: function (view) {
      var el = view.querySelector('#md');
      gate(el, function (user) {
        el.innerHTML = '<div class="box muted">Loading…</div>';
        Promise.all([DB.myDargahs(), DB.myClaims()]).then(function (r) {
          var ds = r[0], cs = r[1].filter(function (c) { return c.targetType === 'd'; });
          var out = '<h1>My dargah</h1><div class="muted">Signed in as ' + esc(user.email || '') + '</div>';
          if (!ds.length) {
            out += '<div class="box">You do not manage a dargah page yet.' + (cs.length ? '' : ' Open your dargah in the Dargahs list and tap <b>Is this your dargah? Claim it</b>.') + '</div>' +
              cs.map(function (c) { return '<div class="box"><b>' + esc(c.targetName) + '</b><div class="muted">' + esc(STAT[c.status] || c.status) + '</div></div>'; }).join('') + '<a class="btn ghost full" href="#/dargahs">See dargahs</a>';
            el.innerHTML = out; return;
          }
          out += ds.map(function (g) {
            var about = aboutText(g.about);
            return '<form class="box dgf" data-id="' + esc(g.id) + '"><b>' + esc(g.name) + '</b> ' + (g.confirmed ? '<span class="tag v">Confirmed</span>' : '<span class="tag">Not confirmed yet</span>') +
              '<p class="muted">Saving marks the page as confirmed by the dargah, with today as the last verified date. To change the name, photos or videos, message the Dargah Hub team.</p>' +
              f('tg-' + g.id, 'One line about the dargah', g.tagline, 'maxlength="120"') + ta('ab-' + g.id, 'About (leave a blank line between paragraphs)', about, 3000, 7) +
              f('ad-' + g.id, 'Address', g.address, 'maxlength="200"') + f('ph-' + g.id, 'Phone', g.phone, 'inputmode="tel" maxlength="30"') + f('wa-' + g.id, 'WhatsApp (with country code)', g.whatsapp, 'inputmode="tel" maxlength="20"') +
              f('em-' + g.id, 'Email', g.email, 'type="email" maxlength="120"') + f('wb-' + g.id, 'Website (https://)', g.website, 'inputmode="url" maxlength="300"') + f('mp-' + g.id, 'Google Maps link (https://)', g.map, 'inputmode="url" maxlength="500"') +
              f('la-' + g.id, 'Latitude (optional)', typeof g.lat === 'number' ? g.lat : '', 'inputmode="decimal"') + f('lo-' + g.id, 'Longitude (optional)', typeof g.lon === 'number' ? g.lon : '', 'inputmode="decimal"') +
              ta('tm-' + g.id, 'Timings, one per line', timingsText(g.timings), 800, 4, 'Example: Daily: 5 am to 9 pm') + ta('ev-' + g.id, 'Events, one per line', eventsText(g.events), 1200, 4, 'Example: Urs Mubarak | 5 to 7 Rajab') +
              '<button class="btn full" type="submit">Save and confirm</button></form>';
          }).join('');
          el.innerHTML = out;
          [].forEach.call(el.querySelectorAll('.dgf'), function (form) {
            form.addEventListener('submit', function (e) {
              e.preventDefault(); var id = form.getAttribute('data-id'), g = function (p) { return (document.getElementById(p + '-' + id).value || '').trim(); };
              var fail = function (t) { var n = form.querySelector('.note'); if (n) n.remove(); form.insertAdjacentHTML('beforeend', note(t)); };
              if (!https(g('wb')) || !https(g('mp'))) return fail('Website and map links must start with https://');
              var wa = digits(g('wa')); if (wa && (wa.length < 8 || wa.length > 15)) return fail('WhatsApp must be 8 to 15 digits with country code.');
              var la = g('la'), lo = g('lo'), upd = { tagline: g('tg'), about: g('ab'), address: g('ad'), phone: g('ph'), whatsapp: wa, email: g('em'), website: g('wb'), map: g('mp'), timings: parseTimings(g('tm')), events: parseEvents(g('ev')), confirmed: true, lastVerified: new Date().toISOString().slice(0, 10) };
              if (la || lo) { var a = parseFloat(la), o = parseFloat(lo); if (!(a >= -90 && a <= 90 && o >= -180 && o <= 180)) return fail('Latitude and longitude must both be valid numbers.'); upd.lat = a; upd.lon = o; }
              var btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Saving…';
              DB.saveMyDargah(id, upd).then(function () { if (H()) H().stale(); btn.disabled = false; btn.textContent = 'Save and confirm'; var n = form.querySelector('.note'); if (n) n.remove(); form.insertAdjacentHTML('beforeend', note('Saved. Your page is now marked as confirmed.', true)); })
                .catch(function () { btn.disabled = false; btn.textContent = 'Save and confirm'; fail('We could not save. Check your connection and try again.'); });
            });
          });
        }).catch(function () { el.innerHTML = note('Could not load. Check your connection and try again.'); });
      });
    } };
  };
})(typeof self !== 'undefined' ? self : this);
