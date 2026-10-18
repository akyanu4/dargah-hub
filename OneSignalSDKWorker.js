/* One service worker for the whole site: the app's own offline cache (sw.js) plus OneSignal push.
   OneSignal looks for this exact file name at the site root. */
importScripts('sw.js');
try { importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js'); } catch (e) { /* offline: the app still works, push resumes when online */ }
