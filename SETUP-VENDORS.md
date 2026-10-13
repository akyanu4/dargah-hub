# Turn on the vendor portal (Firebase, free Spark plan)

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

## How it works
- A vendor signs up, creates a profile (either "I already have a shop" with a link, or "I do not have a shop"), and waits for approval.
- Once approved they can add items (name, category, price, description, one photo). Photos are resized on the phone and kept inside the item record, so no paid storage is needed.
- Anyone can read approved vendors and items. A vendor can only change their own. Only admins can approve.
- Pausing a vendor from `#/admin` hides them and their items from the site.

## Try the screens without Firebase
In `js/config.js` set `mock: true`. Data then stays in the browser only. Sign in with any email; use `admin@demo.test` to see the approvals page.

## Limits to know
- Each item photo is capped at about 100 KB. That is fine for hundreds of items. For thousands, move photos to Firebase Storage (needs the pay-as-you-go plan).
- Firebase free plan limits apply (about 50,000 reads a day). Add caching or paging if the site gets busy.
