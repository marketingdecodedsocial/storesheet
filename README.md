# StoreSheet (working name) — ecommerce tools site

Free line sheet and catalog tools for Shopify, WooCommerce and any store via CSV.
Static site (Astro) on Cloudflare Pages, plus one Cloudflare Worker that reads public store data.

## Structure

- `src/site.config.ts` — brand name, domain, support email, API address, tool list. Change the brand here.
- `src/pages/` — pages. Tools in `tools/`, guides in `guides/`.
- `src/scripts/products.ts` — CSV parsing and product helpers (tested).
- `worker/` — store-fetch API (`GET /products?url=store.com`).
- `tests/` — unit tests.

## Commands

```sh
npm install
npm run dev      # local site at http://localhost:4321
npm test         # unit tests
npm run build    # static site in dist/
```

## Deploy

- **Site:** Cloudflare Pages → connect this repo → build command `npm run build`, output `dist`.
- **API:** `cd worker && npx wrangler deploy`. Then set `apiBase` in `src/site.config.ts`
  and `ALLOWED_ORIGINS` in `worker/wrangler.toml` to the live domain.

## Before launch

- [ ] Final name and domain in `site.config.ts` and `astro.config.mjs`
- [ ] Real support email
- [ ] Review Privacy page
- [ ] Deploy the API and turn on store-link import
- [ ] Submit sitemap in Google Search Console
