/* Predicts the Hijri date as it is usually kept in India, from the moon's position (no internet needed).
   For each new moon it works out whether the crescent can be seen from Hyderabad on the evening it is born (Odeh criterion,
   naked eye). If yes the month starts the next day, if not a day later. It is a prediction: the moon committees decide the real day. */
(function (root) {
  var RAD = Math.PI / 180, LAT = 17.385, LON = 78.487, V_MIN = 5.65;
  function nm(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function jd0(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / 86400000) + 2440587.5; }
  var LT = [[0,0,1,0,6288774],[2,0,-1,0,1274027],[2,0,0,0,658314],[0,0,2,0,213618],[0,1,0,0,-185116],[0,0,0,2,-114332],[2,0,-2,0,58793],[2,-1,-1,0,57066],[2,0,1,0,53322],[2,-1,0,0,45758],[0,1,-1,0,-40923],[1,0,0,0,-34720],[0,1,1,0,-30383],[2,0,0,-2,15327],[0,0,1,2,-12528],[0,0,1,-2,10980],[4,0,-1,0,10675],[0,0,3,0,10034],[4,0,-2,0,8548],[2,1,-1,0,-7888],[2,1,0,0,-6766],[1,0,-1,0,-5163],[1,1,0,0,4987],[2,-1,1,0,4036],[2,0,2,0,3994],[4,0,0,0,3861],[2,0,-3,0,3665],[0,1,-2,0,-2689],[2,0,-1,2,-2602],[2,-1,-2,0,2390],[1,0,1,0,-2348],[2,-2,0,0,2236],[0,1,2,0,-2120],[0,2,0,0,-2069],[2,-2,-1,0,2048],[2,0,1,-2,-1773],[2,0,0,2,-1595],[4,-1,-1,0,1215],[0,0,2,2,-1110],[3,0,-1,0,-892],[2,1,1,0,-810],[4,-1,-2,0,759],[0,2,-1,0,-713],[2,2,-1,0,-700],[2,1,-2,0,691],[2,-1,0,-2,596],[4,0,1,0,549],[0,0,4,0,537],[4,-1,0,0,520],[1,0,-2,0,-487],[2,1,0,-2,-399],[0,0,2,-2,-381],[1,1,1,0,351],[3,0,-2,0,-340],[4,0,-3,0,330],[2,-1,2,0,327],[0,2,1,0,-323],[1,1,-1,0,299],[2,0,3,0,294]];
  var BT = [[0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],[2,0,-1,1,55413],[2,0,-1,-1,46271],[2,0,0,1,32573],[0,0,2,1,17198],[2,0,1,-1,9266],[0,0,2,-1,8822],[2,-1,0,-1,8216],[2,0,-2,-1,4324],[2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],[2,-1,0,1,2211],[2,-1,-1,-1,2065],[0,1,-1,-1,-1870],[4,0,-1,-1,1828],[0,1,0,1,-1794],[0,0,0,3,-1749],[0,1,-1,1,-1565],[1,0,0,1,-1491],[0,1,1,1,-1475],[0,1,1,-1,-1410],[0,1,0,-1,-1344],[1,0,0,-1,-1335],[0,0,3,1,1107]];
  var RT = [[0,0,1,0,-20905355],[2,0,-1,0,-3699111],[2,0,0,0,-2955968],[0,0,2,0,-569925],[0,1,0,0,48888],[0,0,0,2,-3149],[2,0,-2,0,246158],[2,-1,-1,0,-152138],[2,0,1,0,-170733],[2,-1,0,0,-204586],[0,1,-1,0,-129620],[1,0,0,0,108743],[0,1,1,0,104755],[2,0,0,-2,10321],[0,0,1,2,79661],[0,0,1,-2,34782],[4,0,-1,0,-23210],[4,0,-2,0,-21636],[2,1,-1,0,24208],[2,1,0,0,30824],[1,0,-1,0,-8379],[1,1,0,0,-16675],[2,-1,1,0,-12831],[2,0,2,0,-10445],[4,0,0,0,-11650],[2,0,-3,0,14403]];
  /* Moon: ecliptic longitude, latitude (degrees) and distance (km). T = Julian centuries from 2000. */
  function moon(T) {
    var Lp = nm(218.3164477 + 481267.88123421 * T), D = nm(297.8501921 + 445267.1114034 * T), M = nm(357.5291092 + 35999.0502909 * T),
      Mp = nm(134.9633964 + 477198.8675055 * T), F = nm(93.272095 + 483202.0175233 * T), E = 1 - 0.002516 * T - 0.0000074 * T * T;
    var A1 = nm(119.75 + 131.849 * T), A2 = nm(53.09 + 479264.29 * T), A3 = nm(313.45 + 481266.484 * T);
    var sl = 0, sb = 0, sr = 0, i, t, a, e;
    for (i = 0; i < LT.length; i++) { t = LT[i]; a = (t[0] * D + t[1] * M + t[2] * Mp + t[3] * F) * RAD; e = Math.pow(E, Math.abs(t[1])); sl += t[4] * e * Math.sin(a); }
    for (i = 0; i < BT.length; i++) { t = BT[i]; a = (t[0] * D + t[1] * M + t[2] * Mp + t[3] * F) * RAD; e = Math.pow(E, Math.abs(t[1])); sb += t[4] * e * Math.sin(a); }
    for (i = 0; i < RT.length; i++) { t = RT[i]; a = (t[0] * D + t[1] * M + t[2] * Mp + t[3] * F) * RAD; e = Math.pow(E, Math.abs(t[1])); sr += t[4] * e * Math.cos(a); }
    sl += 3958 * Math.sin(A1 * RAD) + 1962 * Math.sin((Lp - F) * RAD) + 318 * Math.sin(A2 * RAD);
    sb += -2235 * Math.sin(Lp * RAD) + 382 * Math.sin(A3 * RAD) + 175 * Math.sin((A1 - F) * RAD) + 175 * Math.sin((A1 + F) * RAD) + 127 * Math.sin((Lp - Mp) * RAD) - 115 * Math.sin((Lp + Mp) * RAD);
    return { lon: nm(Lp + sl / 1e6), lat: sb / 1e6, dist: 385000.56 + sr / 1000 };
  }
  /* Sun: apparent ecliptic longitude (degrees). */
  function sun(T) {
    var L0 = nm(280.46646 + 36000.76983 * T), M = nm(357.52911 + 35999.05029 * T) * RAD;
    var C = (1.914602 - 0.004817 * T) * Math.sin(M) + 0.019993 * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
    return nm(L0 + C - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * T) * RAD));
  }
  function eqCoords(lon, lat, T) {
    var eps = (23.439291 - 0.0130042 * T) * RAD, l = lon * RAD, b = lat * RAD;
    var ra = Math.atan2(Math.sin(l) * Math.cos(eps) - Math.tan(b) * Math.sin(eps), Math.cos(l)), dec = Math.asin(Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(l));
    return { ra: ra, dec: dec };
  }
  var Tof = function (jd) { return (jd - 2451545.0) / 36525; };
  function gst(jd) { var T = Tof(jd); return nm(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T); }
  /* Height of a body above the horizon (degrees) from Hyderabad. */
  function altOf(eq, jd) {
    var H = (gst(jd) + LON) * RAD - eq.ra, p = LAT * RAD;
    return Math.asin(Math.sin(p) * Math.sin(eq.dec) + Math.cos(p) * Math.cos(eq.dec) * Math.cos(H)) / RAD;
  }
  function sunAlt(jd) { var T = Tof(jd); return altOf(eqCoords(sun(T), 0, T), jd); }
  /* Sunset (UT, Julian day) on India civil day starting at jdMidnightIST. Searches the evening for the altitude -0.833. */
  function sunset(jdIstMidnight) {
    var lo = jdIstMidnight + 0.5, hi = jdIstMidnight + 0.95, i, mid; // 12:00 to 22:48 IST... in UT days: IST midnight is jd; sunset about 18:00 IST
    for (i = 0; i < 40; i++) { mid = (lo + hi) / 2; if (sunAlt(mid) > -0.833) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  function elong(jd) { var T = Tof(jd), d = nm(moon(T).lon - sun(T) + 180) - 180; return d; }
  /* Time (Julian day, UT) of the new moon nearest to guess jd. */
  function conj(jd) {
    var lo = jd - 3, hi = jd + 3, i, mid;
    for (i = 0; i < 50; i++) { mid = (lo + hi) / 2; if (elong(mid) < 0) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  /* Odeh visibility number at sunset (jd = sunset, UT). Higher = easier. >= 5.65 naked eye, 2 to 5.65 with a telescope. */
  function odeh(jd) {
    var T = Tof(jd), mo = moon(T), s = sun(T), eqm = eqCoords(mo.lon, mo.lat, T), eqs = eqCoords(s, 0, T);
    var hp = Math.asin(6378.14 / mo.dist), alt = altOf(eqm, jd) - hp / RAD * Math.cos(altOf(eqm, jd) * RAD);
    var cosL = Math.sin(eqm.dec) * Math.sin(eqs.dec) + Math.cos(eqm.dec) * Math.cos(eqs.dec) * Math.cos(eqm.ra - eqs.ra), L = Math.acos(Math.max(-1, Math.min(1, cosL)));
    var sd = Math.asin(1737.4 / mo.dist) / RAD * 60, W = sd * (1 - Math.cos(L)), arcv = alt - (-0.833);
    return arcv - (-0.1018 * W * W * W + 0.7319 * W * W - 6.3226 * W + 7.1651);
  }
  /* The India civil day (as a whole number: days since 1970-01-01) on which the month begun by the new moon at jdConj starts. */
  function monthStart(jdConj) {
    var istDay = Math.floor(jdConj + 5.5 / 24 - 2440587.5 + 0.5 + 1e-9); // civil day (IST) of the conjunction, days since epoch
    var jm = istDay + 2440587.5 - 5.5 / 24; // IST midnight as JD(UT)
    var ss = sunset(jm), d = istDay;
    if (jdConj > ss) { d += 1; ss = sunset(jm + 1); }
    var vis = odeh(ss) >= V_MIN;
    return d + (vis ? 1 : 2);
  }
  var cache = {};
  function startsNear(dayNum) {
    var key = Math.floor(dayNum / 20); if (cache[key]) return cache[key];
    var jd = dayNum + 2440587.5, k0 = Math.round((jd - 2451550.09766) / 29.530588861), out = [], k;
    for (k = k0 - 3; k <= k0 + 3; k++) out.push(monthStart(conj(2451550.09766 + 29.530588861 * k)));
    out.sort(function (a, b) { return a - b; }); return (cache[key] = out);
  }
  var uq = null;
  function uqOf(dayNum) {
    uq = uq || new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' });
    var o = {}; uq.formatToParts(new Date(dayNum * 86400000 + 43200000)).forEach(function (x) { if (x.type !== 'literal') o[x.type] = parseInt(x.value, 10); });
    return o;
  }
  /* dayNum: whole days since 1970-01-01 of the civil date. Returns { d, m, y } as kept in India (predicted). */
  function hijriOfDay(dayNum) {
    var st = startsNear(dayNum), s = null, i;
    for (i = 0; i < st.length; i++) if (st[i] <= dayNum) s = st[i];
    if (s == null) return null;
    var mid = uqOf(s + 14);
    return { d: dayNum - s + 1, m: mid.month, y: mid.year };
  }
  root.HubMoonSight = { hijriOfDay: hijriOfDay, dayNum: function (y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / 86400000); }, _: { monthStart: monthStart, conj: conj, odeh: odeh, sunset: sunset, startsNear: startsNear } };
  if (typeof module !== 'undefined') module.exports = root.HubMoonSight;
})(typeof window !== 'undefined' ? window : globalThis);
