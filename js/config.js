/* Dargah Hub settings. Firebase web keys are public by design; the security is in firestore.rules.
   Leave `firebase` as null until the vendor portal is set up (see SETUP-VENDORS.md). */
window.HUB_CONFIG = {
  firebase: null,   // { apiKey: "...", authDomain: "...", projectId: "...", appId: "..." }
  mock: false       // true = demo mode: vendor sign-in and items are kept in this browser only (for trying the screens)
};
