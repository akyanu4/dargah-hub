# Turn on the vendor portal (Firebase, free Spark plan)

**This repo is already pointed at the same Firebase project as Noor-ul-Hasrat (`siddiqgulshan-25903`).** Finish these console steps in that project (Firebase console > project siddiqgulshan-25903):

1. **Authentication > Sign-in method:** enable **Google** and **Email/Password** (keep Anonymous on: the Noor app uses it).
2. **Authentication > Settings > Authorized domains:** add `dargah-hub.vercel.app` (and your own domain later).
3. **Firestore Database > Create database** (production mode, a region near your users). It is separate from the Realtime Database Noor uses.
4. **Firestore > Rules:** paste all of `firestore.rules` and Publish. This does not touch Noor's Realtime Database rules.
5. If the API key has restrictions in Google Cloud Console (APIs & Services > Credentials), add `dargah-hub.vercel.app/*` to its allowed referrers.
6. Make yourself an admin (step 8 below).

The generic steps follow, in case you ever want a separate project instead.

The site works without this (it shows only the sample data). These steps switch on vendor sign-in, "Sell on the hub", item photos and admin approvals.

1. Go to https://console.firebase.google.com and create a project (any name, for example `dargah-hub`). Analytics can stay off.
2. **Build > Authentication > Get started.** Under Sign-in method, enable **Google** and **Email/Password**.
3. **Authentication > Settings > Authorized domains.** Add your Vercel address (for example `dargah-hub.vercel.app`) and later your own domain.
4. **Build > Firestore Database > Create database.** Choose a region near your users (for example `asia-south1`) and start in **production mode**.
5. In Firestore open the **Rules** tab, paste the whole of `firestore.rules` from this repo, and **Publish**.
6. **Project settings (gear) > Your apps > Web app (</>).** Register an app and copy the `firebaseConfig` values.
7. Open `js/config.js` and fill them in:

       window.HUB_CONFIG = {
         firebase: { apiKey: "...", authDomain: "...", projectId: "...", appId: "..." },
         mock: false
       };

   Commit and push. These keys are meant to be public. The rules protect the data.
8. **Make yourself an admin.** Open the site, go to `#/sell`, sign in with your own account, then in Firebase **Authentication > Users** copy your User UID. In Firestore create collection `admins`, with a document whose **ID is that UID** (add any field, for example `ok: true`).
9. Visit `#/admin` to approve vendors. A new vendor appears there as "pending".

## Orders, forms and reports (added 17 Oct 2026)
These use three more collections, created automatically on first use: `orders`, `leads` (list-a-dargah, advertise and contact forms) and `reports`. They are covered by the same `firestore.rules`, so **re-publish the rules** after pulling this version.
- Buyers do not sign in. An order is saved in `orders` and opens at `#/order/<id>`. The vendor sees it in the **Orders** tab of `#/sell`. The buyer can also send it to the vendor on WhatsApp from the order page.
- Admins read form requests and reports at `#/admin` (tabs **Requests** and **Reports**) and can give a vendor the **Verified** badge or hide a reported item.
- There is no push or email alert for new orders yet. Vendors check the Orders tab, and the WhatsApp button on the order page tells them straight away. Add the Firebase "Trigger Email" extension later if you want email alerts.
- To cut form and order spam, enable **App Check** (reCAPTCHA v3) in Firebase later. The forms already have a hidden spam field and a short wait between sends.
- Set your WhatsApp business number in `data/platform.json` (`whatsapp`, with country code and no plus sign) to show a "Chat with us" button on the forms.

## Bulk import (Admin > Import)
Add many vendors and items from a spreadsheet. In `#/admin` open **Import**, download the template, fill one row per item (vendor columns repeat), save as **CSV (UTF-8)**, upload, check the preview, and import. Uploading the same vendor and item names again updates them. Imported vendors have no sign-in: you manage their orders in the **Orders** tab, and can delete a vendor with its items from **Vendors**. This needs the latest `firestore.rules` published (admins may now create vendors and items).

## Onboarding dargahs and claims (added 18 Oct 2026)
- **Import dargahs:** in `#/admin` > **Import**, download the **Dargahs template**, fill one row per dargah (about, address, phone, timings, events, YouTube links, up to 6 photo links, source, confirmed), save as CSV (UTF-8) and upload. The file type is detected from the column names. Pages appear in **Dargahs** and in the app at once, labelled "Listed by Dargah Hub, not yet confirmed" until confirmed.
- **Photos** are https links only (files you host, or links the dargah gives you). Get permission first.
- **Claim:** every imported dargah page and imported shop page has a "Claim it" link. The keeper signs in and sends a short form. You see it in **Claims**, check with the dargah (call a number you trust), then **Approve**. For a dargah this lets the keeper edit its page at `#/mydargah` (saving marks it Confirmed with today's date). For a shop it moves the shop, its items and future orders to the owner's own account. Old orders stay in your Orders tab.
- Re-importing a dargah file never overwrites a page a keeper has claimed.
- Publish the latest `firestore.rules` (new `dargahs` and `claims` collections) before using any of this.

## How it works
- A vendor signs up, creates a profile (either "I already have a shop" with a link, or "I do not have a shop"), and waits for approval.
- Once approved they can add items (name, category, price, description, up to three photos, sold-out switch). Photos are resized on the phone and kept inside the item record, so no paid storage is needed.
- Anyone can read approved vendors and items. A vendor can only change their own. Only admins can approve.
- Pausing a vendor from `#/admin` hides them and their items from the site.

## Try the screens without Firebase
In `js/config.js` set `mock: true`. Data then stays in the browser only. Sign in with any email; use `admin@demo.test` to see the approvals page.

## Limits to know
- Each item photo is capped at about 100 KB. That is fine for hundreds of items. For thousands, move photos to Firebase Storage (needs the pay-as-you-go plan).
- Firebase free plan limits apply (about 50,000 reads a day). Add caching or paging if the site gets busy.

## Weekly offers and alerts

Offers run Thursday to the next Thursday. Vendors post them at `#/myoffers` (Sell on the hub, then Weekly offers). You approve them at `#/adminoffers`, which also has the "Send alert" button. Publish the latest `firestore.rules` first (it adds the `offers` collection and the vendor `address` and `map` fields).

### Turn on the phone alerts (OneSignal, free)
1. Create a new OneSignal app for Dargah Hub (do not reuse the Noor app). Choose Web Push, site URL `https://dargah-hub.vercel.app`. Leave the service worker settings at their defaults. The site serves `OneSignalSDKWorker.js` at its root, and that one file also runs the app's offline cache.
2. Put the public App ID in `js/config.js` as `onesignalAppId`. This makes the "Turn on offer alerts" button appear on the Offers page.
3. In Vercel, Project Settings, Environment Variables, add `ONESIGNAL_APP_ID` and `ONESIGNAL_API_KEY` (the REST API key). Never put the REST key in the code or in a chat. Redeploy.
4. Sign in as admin, open `#/adminoffers`, approve this week's offers, and press Send alert. Only your admin sign-in can send.
