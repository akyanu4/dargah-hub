/* Noor: cities used to send prayer-time nudges. A phone is tagged with its nearest city (within 100 km) and the server schedules that city's prayer times.
   Used by the app and by api/prayer-nudges.js. [name, latitude, longitude, time zone] */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NoorCities = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var LIST = [
    ['Hyderabad', 17.385, 78.4867, 'Asia/Kolkata'], ['Mumbai', 19.076, 72.8777, 'Asia/Kolkata'], ['Delhi', 28.6139, 77.209, 'Asia/Kolkata'], ['Bengaluru', 12.9716, 77.5946, 'Asia/Kolkata'],
    ['Chennai', 13.0827, 80.2707, 'Asia/Kolkata'], ['Kolkata', 22.5726, 88.3639, 'Asia/Kolkata'], ['Lucknow', 26.8467, 80.9462, 'Asia/Kolkata'], ['Karachi', 24.8607, 67.0011, 'Asia/Karachi'],
    ['Lahore', 31.5204, 74.3587, 'Asia/Karachi'], ['Islamabad', 33.6844, 73.0479, 'Asia/Karachi'], ['Dhaka', 23.8103, 90.4125, 'Asia/Dhaka'],
    ['Makkah', 21.3891, 39.8579, 'Asia/Riyadh'], ['Madinah', 24.5247, 39.5692, 'Asia/Riyadh'], ['Jeddah', 21.5433, 39.1728, 'Asia/Riyadh'], ['Riyadh', 24.7136, 46.6753, 'Asia/Riyadh'],
    ['Kuwait City', 29.3759, 47.9774, 'Asia/Kuwait'], ['Doha', 25.2854, 51.531, 'Asia/Qatar'], ['Dubai', 25.2048, 55.2708, 'Asia/Dubai'], ['Abu Dhabi', 24.4539, 54.3773, 'Asia/Dubai'], ['Muscat', 23.588, 58.3829, 'Asia/Muscat'],
    ['Istanbul', 41.0082, 28.9784, 'Europe/Istanbul'], ['Cairo', 30.0444, 31.2357, 'Africa/Cairo'], ['Kuala Lumpur', 3.139, 101.6869, 'Asia/Kuala_Lumpur'], ['Singapore', 1.3521, 103.8198, 'Asia/Singapore'],
    ['London', 51.5074, -0.1278, 'Europe/London'], ['Birmingham UK', 52.4862, -1.8904, 'Europe/London'], ['Manchester', 53.4808, -2.2426, 'Europe/London'],
    ['New York', 40.7128, -74.006, 'America/New_York'], ['Washington DC', 38.9072, -77.0369, 'America/New_York'], ['Atlanta', 33.749, -84.388, 'America/New_York'], ['Chicago', 41.8781, -87.6298, 'America/Chicago'],
    ['Houston', 29.7604, -95.3698, 'America/Chicago'], ['Dallas', 32.7767, -96.797, 'America/Chicago'], ['Los Angeles', 34.0522, -118.2437, 'America/Los_Angeles'], ['San Francisco Bay Area', 37.3382, -121.8863, 'America/Los_Angeles'],
    ['Toronto', 43.6532, -79.3832, 'America/Toronto'], ['Sydney', -33.8688, 151.2093, 'Australia/Sydney']
  ];
  function km(a, b, c, d) {
    var p = Math.PI / 180, h = Math.sin((c - a) * p / 2) * Math.sin((c - a) * p / 2) + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) * Math.sin((d - b) * p / 2);
    return 12742 * Math.asin(Math.sqrt(h));
  }
  // The nearest listed city within maxKm, or null.
  function nearest(lat, lon, maxKm) {
    var best = null, bd = 1e9;
    LIST.forEach(function (c) { var d = km(lat, lon, c[1], c[2]); if (d < bd) { bd = d; best = c; } });
    return best && bd <= (maxKm || 100) ? { name: best[0], km: Math.round(bd) } : null;
  }
  return { LIST: LIST, nearest: nearest };
});
