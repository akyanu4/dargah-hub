# Dargah Hub

A separate, data-driven platform: dargah spaces, a vendor shop, sponsored slots and onboarding pages. Static site, no build step, no database. Independent of Noor-ul-Hasrat.

## Run locally
`python3 -m http.server 8000` then open http://localhost:8000

## Onboard a dargah
1. Add `data/dargahs/<id>.json` (copy `sample-a.json`).
2. Add `<id>` to `data/dargahs/index.json`.
3. Put photos in `photos/<id>/` and list them under `gallery` (`{ "src": "photos/<id>/1.jpg", "caption": "..." }`). Keep each under ~300 KB.
4. Set `"sample": false` and, once the keeper is confirmed, `"verified": true`.

## Onboard a vendor and products
1. Add the vendor to `data/vendors.json`, then products to `data/products.json` (`vendor` = vendor id, `buy` = the vendor's own https link or WhatsApp `https://wa.me/<number>`).
2. Replace `emoji`/`color` with a real photo later by adding an `img` field (not yet shown by the site; ask to add).

## Ads
Edit `data/ads.json`. Slots: `home`, `shop`. Every ad is shown with a "Sponsored" label. Never place ads on Qur'an or prayer content.

## Deploy (new, separate project)
1. Create a new GitHub repo (for example `dargah-hub`) and push this folder to `main`.
2. In Vercel: Add New Project, import that repo, Framework "Other", no build command, output directory `.`.
3. Point your own domain at it in Vercel > Domains.

## Before launch
Replace demo data, review `privacy.html` and `terms.html` with a lawyer, set `contact` in `data/platform.json`, and add a vendor payment process for listing fees.
