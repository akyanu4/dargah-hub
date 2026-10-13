/* Dargah Hub settings. Firebase web keys are public by design; the security is in firestore.rules.
   This uses the same Firebase project as the Noor-ul-Hasrat app (project siddiqgulshan-25903). Hub data lives in Firestore;
   Noor's shared counters live in the Realtime Database, so the two do not mix. */
window.HUB_CONFIG = {
  firebase: { apiKey: "AIzaSyC2DoJUQfk2NAOvBuD8ION65l7JyHfMU1g", authDomain: "siddiqgulshan-25903.firebaseapp.com", projectId: "siddiqgulshan-25903" },
  mock: false       // true = demo mode: vendor sign-in and items are kept in this browser only (for trying the screens)
};
