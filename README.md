# Plainweft

A demo Shopify store for **Plainweft**, a fictional brand of minimal everyday basics.

This repository holds two parts:

- **`seed/`** fills a Shopify development store with a realistic clothing catalog through the
  Admin GraphQL API.
- **`storefront/`** is a headless Next.js 16 store on the Storefront API: catalog, collection,
  product and search pages, a cart, and Shopify's own checkout.

## What the seed creates

- 4 collections: Tees, Hoodies, Knitwear, Accessories
- An automatic **All basics** collection (handle `all`): Shopify adds every active product to it,
  so the storefront can filter the whole range in one place
- 36 products, each in 2–3 of 23 colors. Clothes come in sizes XS–XL and accessories in one
  size, which makes 398 variants
- Prices in PLN, some with compare-at prices for a sale
- SKUs such as `PLW-ECT-BLK-M`, and stock at the store's main location
- 4 sold-out products, plus some sold-out sizes in other products
- 3 images per product, with the right image linked to each color
- Product metafields for fabric composition, care instructions and the reason a product is
  featured (New, Bestseller or Staff pick), readable from the Storefront API
- Publishing of every product and collection to all of the store's sales channels. A channel
  added later, such as Headless, gets everything on the next run.
- Polish as a second store language: turned on, published, and added to the markets that sell in
  English, with a translation of every product, collection, colour, fabric, care step and image
  alt text
- Webhook subscriptions that tell the deployed storefront when a product, a collection or stock
  changes, once `STOREFRONT_URL` is set

## Setup

You need Node.js 22.18 or newer (`nvm use` reads `.nvmrc`) and a Shopify development store.

1. **Create an app in the [Dev Dashboard](https://dev.shopify.com).** It needs no code. Give it
   these Admin API scopes: `write_products`, `write_inventory`, `read_locations`,
   `write_publications`, `write_files`, `write_locales`, `write_translations` and `read_markets`.
   Release a version and install the app on your store.
2. **Copy the credentials.** Copy `seed/.env.example` to `seed/.env`, then fill in the store
   domain and the app's client ID and secret.
3. **Set the store currency to PLN.** The seed checks this before it changes anything.
4. **Install dependencies** with `npm install`.

The seed exchanges the client ID and secret for a 24-hour token on every run (the
[client credentials grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/client-credentials-grant)).
This only works when the app and the store belong to the same Shopify organization. If they
don't, set `SHOPIFY_ADMIN_TOKEN` to an Admin API access token instead.

## Commands

```bash
npm run seed                    # create or update the catalog
npm run seed -- --dry-run       # show what would change, change nothing
npm run teardown                # list what teardown would delete
npm run teardown -- --yes       # delete everything the seed created
```

A run logs one event per resource and ends with a summary. For example:

```
01:38:47 INFO  preflight.ok shop=plainweft-demo.myshopify.com currency=PLN location="Shop location" publications=["Online Store","Shop","Point of Sale"]
01:38:48 INFO  collection.created handle=tees id=gid://shopify/Collection/720261906777
01:38:48 INFO  collection.published handle=tees publications=["Online Store","Shop","Point of Sale"]
01:38:52 INFO  product.created handle=essential-crew-tee id=gid://shopify/Product/16752147333465 images=3
01:38:52 INFO  product.published handle=essential-crew-tee publications=["Online Store","Shop","Point of Sale"]
...
01:38:59 INFO  run.summary durationMs=12367 metafield-definition={"created":3} collection={"created":3} product={"created":12}
```

A second run changes nothing and takes about a second:

```
01:39:48 INFO  run.summary durationMs=1286 metafield-definition={"skipped":3} collection={"skipped":3} product={"skipped":12}
```

Logs are readable lines in a terminal and JSON lines elsewhere. Set `LOG_FORMAT=json` or
`LOG_LEVEL=debug` to change that.

## How it works

### Running it twice creates no duplicates

- **Products are upserted by handle** with `productSet`.
- **Each product and collection stores a hash of its seed data** in an `plainweft_seed.checksum`
  metafield. On the next run an unchanged resource is skipped, a changed one is updated in place,
  and a missing one is created. Image file contents are part of the hash, so replacing an image
  file updates its product.
- **Existing variants keep their IDs.** The seed matches them by color and size.
- **Old images don't pile up.** A changed product gets its images uploaded again, and
  `productSet` deletes the old files it no longer lists.
- **Teardown only deletes what the seed created.** A resource needs both the `plainweft-seed` tag
  and the checksum metafield to count. If the store already has a product or collection with a
  catalog handle, the seed stops instead of overwriting it. Translations go with their products;
  the Polish language stays on, since it is a store setting. Webhook subscriptions count as the
  seed's when they call the storefront's `/api/revalidate`.
- **A new storefront address moves the webhooks.** The seed points each subscription at the
  current `STOREFRONT_URL` instead of adding a second one.

### Translations

The Polish text lives next to the English in `seed/catalog/`, under each product's, collection's
and colour's `translations`. It goes into the store through Shopify's own translations
(`translationsRegister`), so the Storefront API returns it to any client that asks for Polish, and
checkout and order emails can use it too.

- **Translations run after the products.** Each one is tied to the English text it translates by
  a digest of that text, so the English has to be in the store first.
- **Unchanged translations are skipped.** The seed reads the store's translations and registers
  only the ones that differ, or that Shopify marks outdated because the English changed.
- **Option names stay English.** Colour values are translated, but the option is still called
  `Color`, which the storefront matches on.

### Rate limits

The Admin GraphQL API uses a cost-based leaky bucket. Every response reports the bucket state in
`extensions.cost.throttleStatus`. `CostLimiter` ([seed/src/shopify/throttle.ts](seed/src/shopify/throttle.ts))
keeps a local model of that bucket:

- **It refills the bucket locally** at the reported restore rate between responses.
- **It holds back requests already in flight**, so parallel requests don't overspend the bucket.
- **It makes each request wait until its cost fits.** The cost estimate is the last
  `requestedQueryCost` seen for that operation.
- **It retries `THROTTLED` responses** after a wait that comes from the fresh bucket state. There
  are no fixed sleeps.

Products sync three at a time (`--concurrency`), and the limiter keeps them within the budget.

### productSet instead of bulk operations

One `productSet` call creates a product with its options, variants, prices, inventory, images,
metafields and collection membership. For 36 products that means 36 synchronous calls, and
each result can be checked and logged right away. A bulk operation needs a JSONL upload and
polling until it finishes. That only pays off for catalogs of hundreds or thousands of products.

### Images

Product images come from local files in `seed/catalog/images/<handle>/`. They go through
`stagedUploadsCreate` and are then passed to `productSet`. A product can also list remote image
URLs in its `images` field, which Shopify downloads itself.

The current files are placeholders drawn from code (`npm run placeholders -w seed`), in the exact
color of each variant. Each product's `fit` and `texture` shape its drawing: a boxy tee is wider and
shorter than a regular one, and linen, fleece and rib knit each have their own surface. Folds, form
and the shadow are worked out once per view and then painted in every color, and the result is the
same bytes on every run, so the seed only uploads images that changed. To use real photos, replace
the files with the same names and run the seed again.

### Typed GraphQL

Operations are written inline with a `#graphql` tag. `npm run codegen -w seed` checks them against
the Admin API schema and generates types into `seed/generated/`. The client looks up response and
variable types by the operation string, so a typo in a field name fails the typecheck.

## Storefront

### Setup

The storefront reads the catalog with a Storefront API token from Shopify's **Headless** channel.

1. **Install the [Headless](https://apps.shopify.com/headless) channel** on the store and click
   **Create storefront**.
2. **Copy the private token.** In the storefront's **Storefront API** settings, copy the
   **private access token**. Its permissions need to cover reading products, collections and
   metafields, and writing carts.
3. **Fill in the environment.** Copy `storefront/.env.example` to `storefront/.env.local`, then
   set the store domain and the private token. `SHOPIFY_WEBHOOK_SECRET` is the seed's
   `SHOPIFY_CLIENT_SECRET`.
4. **Run the seed once more.** It publishes the catalog to the new Headless channel.
5. **Once the storefront is deployed, subscribe it to changes.** Set `STOREFRONT_URL` in
   `seed/.env` to its `https://` address and run the seed again. Shopify can't call `localhost`,
   so a local storefront relies on the cache running out instead.

### Commands

```bash
npm run dev                     # dev server on http://localhost:3000
npm run build -w storefront     # production build
npm run start -w storefront     # serve the production build
npm run lighthouse -w storefront  # audit the production build (build it first)
node storefront/scripts/lighthouse-summary.ts  # the last audit as a table
```

### How it works

- **Pages are static, the cart and filtered lists are not.** With Cache Components, catalog reads
  are cached functions (`"use cache"`, one `catalog` tag) and every page prerenders at build time.
  The cart, a collection's product list and search results are read per request: they stream
  into the static shell inside Suspense.
- **An edit in the admin reaches the site within seconds.** Shopify sends a webhook to
  `/api/revalidate` when a product, a collection or stock changes. The route checks Shopify's
  HMAC signature, made with the app's client secret over the raw body, and expires the `catalog`
  tag (`revalidateTag` with `expire: 0`), so the next visit renders with fresh data instead of
  serving the old page once more. The Storefront API can go on answering with the old data for a
  few seconds after the webhook, and a visit in that window would cache it again, so the route
  expires the tag a second time a minute later (`after`). `cacheLife("hours")` stays as the
  fallback for a webhook that never arrives. Translations have no webhook, so an edited Polish
  text shows once the cache runs out.
- **Shopify filters and sorts the collections.** A collection page sends the shopper's choice to
  the Storefront API (`filters`, `sortKey`) and builds its filter form from the filters Shopify
  returns, with a count for each value. The choice lives in the URL under Liquid's parameter
  names (`?filter.v.availability=1&filter.v.price.gte=100&sort_by=price-ascending`), so a link
  can be shared and the back button undoes a filter. The form is a plain GET form, so it works
  before JavaScript loads. Each choice is a cache entry of its own.
- **Search runs on Shopify's search** (`search`), with the same filters, sort and URL as a
  collection, plus the terms in `?q=`. Results follow as the shopper types: a pause in typing
  replaces the URL, so the back button leaves the page instead of stepping through every word.
  Shopify's search also matches loosely: after the close matches come related products, and even
  a made-up word finds a few. Results pages are marked `noindex`, as they only repeat the
  collections.
- **Which filters exist is set in the admin.** Without the free
  [Search & Discovery](https://apps.shopify.com/search-and-discovery) app, Shopify offers
  availability and price. Install it and add filters (Color and Size, for example) under
  **Search & Discovery → Filters**, and they appear in the form with no code change.
- **The cart lives in Shopify.** Its ID sits in an httpOnly cookie. Adding, changing and removing
  lines are Server Actions that validate their input, call the Cart API and refresh the page. The
  bag updates optimistically with `useOptimistic`, and checkout goes to the cart's `checkoutUrl`.
- **The token stays on the server.** Every Storefront API request is made by Next.js with the
  private token, never by the browser. Request-time calls send the shopper's IP in
  `Shopify-Storefront-Buyer-IP`, so Shopify's bot protection sees shoppers, not one server.
- **Link prefetches skip the cart.** Prefetches can read cookies, but they stop before Shopify
  answers. `getCart` waits for `connection()`, so only a real visit reads the cart.
- **The chosen variant is in the URL** (`?color=black&size=m`), so a link opens on that color and
  size. Picking one updates the URL with `history.replaceState`, with no server round trip.
- **Merchandising comes from the admin.** A product with an `plainweft.featured` value takes one of
  the grid's double tiles, labelled with that reason. Featured products fill every seventh place,
  and a sold-out one stays single.
- **"You may also like" is Shopify's.** A product page shows Shopify's related products
  (`productRecommendations`), which Shopify works out from sales, descriptions and collections,
  and which Search & Discovery can change. Sold-out ones are left out. A product Shopify has none
  for yet shows the rest of its collection.
- **Types come from codegen**, as in the seed: `npm run codegen -w storefront` checks every
  query against the Storefront API schema.

### Languages

The storefront is in English and Polish: `/en/...` and `/pl/...`.

- **Every page prerenders once per language.** The language is the first URL segment, and the
  root layout sits under it (`app/[locale]`). Any Server Component reads it with
  `next/root-params`, and inside `"use cache"` it becomes part of the cache key.
- **A URL without a language is redirected.** The proxy picks the language the shopper chose
  before (a cookie set by the switcher), or else the first one their browser asks for.
- **Catalogue text comes from Shopify.** Every query runs `@inContext(language:)`, so Shopify
  answers with the seed's translations and falls back to English where there are none. A cart is
  created in the page's language, so its checkout is too.
- **The storefront's own words are in dictionaries** (`src/i18n/dictionaries`), typed against the
  English one, with Polish plural forms picked by `Intl.PluralRules`. Client Components get the
  page's dictionary through context; Server Actions are given the locale as an argument.
- **Search engines see each language.** Pages link their other language with `hreflang`, and
  `/sitemap.xml` lists every home, collection and product page in both languages with the same
  links, and the date Shopify last changed it. `/robots.txt` lets crawlers in and points at the
  sitemap. Search results stay out of both: they are `noindex`. Set `SITE_URL` in `.env.local` so
  these links are absolute and point at the real site.
- **Shared links show a picture of their own.** The home page and each collection draw their
  Open Graph image with `next/og`: the title in Roundo on the putty ground, beside four products,
  in-stock and featured ones first. Product pages share their first photo. Every other page shares
  the home page's image. Colours are read from `@theme` in `globals.css`, so the images can't drift
  from the site.

A development store keeps its password page, and Shopify's checkout shows it before the
checkout. The password is in the admin under **Online Store → Preferences**.

### Performance

[Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) audits the home page, a collection
and a product page, three times each on Lighthouse's phone profile (a mid-range Android on slow
4G). Each median is checked against Google's "good" Core Web Vitals: LCP up to 2.5 s and CLS up to
0.1. INP needs a real tap, so Total Blocking Time up to 200 ms stands in for it. The audit runs in
two places, as each answers its own question:

- **Does a change make the store slower?** Each pull request that touches the storefront, and each
  push to `main`, is audited on its own production build, served on the runner
  (`.github/workflows/lighthouse.yml`), so a change is compared with `main` in the same
  conditions. Vercel's previews sit behind Vercel Authentication, and Lighthouse writes every
  request header into its report, so a bypass secret would be published with it. The build reads
  the catalog with two repository secrets, `SHOPIFY_STORE_DOMAIN` and
  `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`.
- **How fast is the live site?** After each production deploy, Vercel's `vercel.deployment.success`
  event starts an audit of https://plainweft.vercel.app (`.github/workflows/lighthouse-production.yml`),
  which can also be run by hand from the Actions tab. These are the numbers to quote. The build on
  the runner has no CDN in front of it and no trip to Vercel's functions, which run in Washington
  (`iad1`) and stream the cart and the filtered lists into each page, so its numbers differ.
- **A miss is a warning for now.** LCP still misses on some pages. Once they pass, the
  budgets in `storefront/lighthouserc.cjs` become errors, and a change that slows a page fails its
  pull request.
- **The first screen asks for nothing it doesn't need.** Roundo is served from the site itself
  with `next/font/local` (it is under the SIL Open Font License, `src/app/fonts/OFL.txt`): from
  Fontshare it was a render-blocking stylesheet on one more origin and its files on another. The
  home page's photo and a list's first tile are fetched with high priority, and the home page's
  grid, below the photo, doesn't hurry its tiles. The icon is a 108-byte PNG. Text that rises in
  on load starts at 1% opacity, not 0, because Chrome never counts an element first painted
  invisible as the LCP.
- **On a phone, product and collection pages still miss 2.5 s in the lab.** Lighthouse's phone
  model counts every byte fetched before the LCP, and by the time their picture arrives from
  Shopify's CDN, about 320 KB have started, 160 KB of them JavaScript. The home page, whose
  photo is served from the site itself, passes.
- **The job summary shows the medians**, with a link to each page's full report. The links last a
  few days; the run's artifact keeps the reports.
- **Lighthouse is not in `package.json`.** `npm run lighthouse` fetches a pinned `@lhci/cli` with
  `npx`, so its dependencies stay out of every `npm ci` and out of the lockfile's audit. With
  `LIGHTHOUSE_SITE=https://plainweft.vercel.app` it audits the live site instead of the build.

## Project layout

```
seed/
├── catalog/            # the Plainweft catalog, in English and Polish: colors, collections, products, images
├── scripts/            # placeholder image renderer (garments, fabric textures, PNG encoder, rasterizer)
├── src/
│   ├── catalog/        # pure functions: variants, stock, images, checksums, productSet input, translations
│   ├── shopify/        # auth, typed client, cost limiter, error helpers
│   ├── steps/          # preflight, locales, metafield definitions, collections, uploads, products,
│   │                   # publishing, translations, webhooks
│   ├── seed.ts
│   ├── teardown.ts
│   └── cli.ts
├── generated/          # GraphQL types from codegen
└── test/
storefront/
├── src/
│   ├── app/[locale]/   # routes per language: home, collections/[handle], products/[handle], search
│   ├── app/api/        # revalidate: takes Shopify's webhooks and expires the cached catalog
│   ├── app/fonts/      # Roundo, served from the site, with its licence
│   ├── components/     # tiles, catalogue grid, filter form, search box, product picker, cart drawer, home sections
│   ├── i18n/           # locales, dictionaries, message formatting
│   ├── lib/            # Storefront API client and queries, cart actions, variant and filter logic, money
│   └── proxy.ts        # sends a URL without a language to the shopper's own
├── generated/          # GraphQL types from codegen
├── scripts/            # Lighthouse CI's results as a table
├── lighthouserc.cjs    # Lighthouse CI: pages, runs and budgets
└── test/
```

## Development

```bash
npm test                          # unit tests, no network
npm run typecheck
npm run lint
npm run format
npm run codegen -w seed           # after changing an Admin API operation
npm run codegen -w storefront     # after changing a Storefront API operation
```

Node runs the TypeScript files directly through type stripping, so there is no build step.
The Admin API version lives in [seed/src/shopify/api-version.ts](seed/src/shopify/api-version.ts).
