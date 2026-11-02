# Storefront

You are editing `@plainweft/storefront`: a headless Next.js 16.4 store on the Shopify Storefront API,
with React 19.3 (React Compiler on), TypeScript strict, Tailwind v4 and Vitest. The README's
"Storefront" section explains how the store works; this file is how to change it.

Paths below are relative to `storefront/`.

## This Next.js is newer than your training data

Read the guide in `../node_modules/next/dist/docs/` (the package is hoisted to the repo root)
before using an API you are not sure of. This code relies on:

- `cacheComponents`, `partialPrefetching` and `reactCompiler` in `next.config.ts`.
- `src/proxy.ts`, which replaced `middleware.ts`.
- `next/root-params` to read `[locale]` in any Server Component. Route Handlers, which
  `opengraph-image`, `sitemap` and `robots` are, can't read it: they take the locale from `params`
  and pass it to the catalog read (`getCollectionPreview`).
- `"use cache"` with `cacheLife` and `cacheTag`, `refresh()` from `next/cache` after a Server
  Action, and `connection()` from `next/server`.
- The global `PageProps<"/[locale]/…">` and `LayoutProps` types, which `next typegen` writes.
- An error boundary that gets `retry`, not `reset`.

`AGENTS.md` beside `package.json` is written by `next dev`. Leave it as it is.

## Current structure

- `src/app/[locale]/` holds every route, the root layout included: home, `collections/[handle]`,
  `products/[handle]`, `search`, `error.tsx`, `not-found.tsx`, and `[...missing]`, which sends
  unknown paths to the 404 inside our own layout. The home page and collections have an
  `opengraph-image.tsx`, drawn by `components/share/share-image.tsx`.
- `src/app/sitemap.ts` and `src/app/robots.ts` sit outside `[locale]`, as they cover every
  language. So does `src/app/api/revalidate/route.ts`, which takes Shopify's webhooks (the seed
  subscribes them), checks their signature and expires `CATALOG_TAG`.
- `src/proxy.ts` redirects a URL without a language to the shopper's (cookie, then
  Accept-Language). Its matcher skips `/api/`: Shopify doesn't follow redirects.
- `src/lib/shopify/`: `client.ts` (`storefront()`, the only way to call the API), `catalog.ts`
  (cached catalog reads), `cart.ts` (cart query and mutations), `fragments.ts`, `api-version.ts`
  (kept in step with the seed), `image-loader.ts` (Shopify's CDN resizes images) and `webhook.ts`
  (the HMAC check, tested in `test/`).
- `src/lib/cart/`: `actions.ts` (Server Actions) and `get-cart.ts` (the request-time cart read).
- `src/lib/product/`, `src/lib/money.ts` and `src/lib/theme.ts`: pure logic for variants,
  featured tiles, colours, filter and search URLs (`browse.ts`), prices, and the `@theme` colours
  drawn images use. No React and no Next.js in there, so `test/` can cover it.
- `src/i18n/`: locales, dictionaries, message formatting, `server.ts` for Server Components,
  `i18n-context.tsx` for Client Components, `metadata.ts` for `SITE_URL`, hreflang and the shared
  Open Graph fields.
- `src/components/`: grouped by area (`cart/`, `collection/`, `home/`, `product/`, `search/`),
  with shared pieces at the top (`catalogue`, `product-tile`, `price`, `fields`, `select`).
  `collection/browse-listing.tsx` is the filtered grid that collections and search share.
- `generated/`: GraphQL types from codegen. Never edit by hand.
- `@/*` resolves to `src/*`. Generated types sit outside `src`, so they are imported relatively.

## Data and Shopify

Use the Shopify AI Toolkit (`shopify-dev-mcp`) to look up and validate Storefront API fields.

- **Every API call goes through `storefront()`.** It is `server-only` and uses the private token,
  which never reaches the browser. Client Components get data as props or through Server Actions,
  never by fetching Shopify themselves.
- **Operations are inline `#graphql` strings, typed by codegen.** The operation string is the type
  lookup key. After adding or changing one, run `npm run codegen -w storefront`. Derive types from
  the generated ones (`NonNullable<ProductQuery["product"]>`, `ReturnType`), never hand-write a
  response shape.
- **Every query and cart mutation takes `$language` with `@inContext(language: $language)`.**
  Without it, Polish pages show English text. Only `ProductHandles` and `CollectionHandles` go
  without, as handles are not translated.
- **A query appends each fragment it spreads exactly once.** `ProductCard` and `Cart` spread
  `Image` and `Money`, so a query using them appends those too.
- **Catalog reads are cached functions** in `catalog.ts`: `"use cache"`, `cacheLife("hours")`,
  `cacheTag(CATALOG_TAG)`, with `getLocale()` read inside so the language is part of the cache key.
  A new read follows the same pattern, so pages keep prerendering.
- **Request-time data renders inside Suspense.** Cookies, headers, the cart and a collection's
  filtered products (`searchParams`) are read per request; `getCart` awaits `connection()` first,
  so link prefetches skip it. Request-time calls pass `buyerIp`.
- **Cart mutations report errors with HTTP 200.** Pass each payload through `unwrap` to turn
  `userErrors` and `warnings` into a notice.
- **Server Actions are public endpoints.** Take every argument as `unknown` and check it (GID
  regexes, quantity bounds). The locale arrives as an argument (`localeOf`), since an action can't
  read the URL. Return a `CartActionState` with a translated notice instead of throwing, and call
  `refresh()` after a change.
- **The data comes from `seed/`.** Metafields `plainweft.fabric`, `plainweft.care` (a JSON list in a
  string) and `plainweft.featured` are defined there with Storefront access. A new field or
  translation starts in the seed, not here.
- **Option names stay English in Shopify** (`Color`, `Size`), and the code matches on them. Their
  labels come from `dictionary.product.options`.

## Implementation rules

- Keep strict TypeScript, `noUncheckedIndexedAccess` included: handle the `undefined` an index can
  return, and use `!` only where it can't happen (as in `fieldFor`).
- Server Components by default. Add `"use client"` only for state, effects or browser APIs, and keep
  the client part small (`product-client.tsx` holds the product page's interactive bits).
- React Compiler is on: no `useMemo`, `useCallback` or `memo` for performance. Use React 19's own
  tools: `use()` for context and promises, `<Context value>` without `.Provider`, `useOptimistic`,
  `useTransition`.
- A component that reads `useSearchParams` sits in Suspense with a fallback that renders the same
  view from defaults (`GalleryView`, `PurchaseView`, `LocaleLinks`), so the static shell is
  complete.
- The chosen variant lives in the URL (`?color=…&size=…`) and changes through
  `history.replaceState`, with no server round trip. Size is never preselected.
- Pure logic goes in `src/lib/` with a test in `test/`. Prefer extending an existing module to
  adding a layer.
- Files are kebab-case. Components are named exports; only files Next.js loads by convention (route
  files, the image loader) export a default.
  Module constants are `UPPER_SNAKE_CASE` at the top (`DOUBLE_EVERY`, `FIRST_TILES`).
- Comments say why, in plain sentences: a JSDoc line on exports and props, an inline note on any
  decision that isn't obvious. Match the density of the surrounding code.
- Log failures as an event name plus the error (`console.error("cart.fetch.failed", error)`). A
  failed cart read shows an empty bag; a failed catalog read reaches `error.tsx`.

## Languages

- **The store is in `en` and `pl`** (`src/i18n/locales.ts`). Build every internal link with
  `localePath(locale, path)`, never a bare `/products/…`.
- **The store's own words live in `src/i18n/dictionaries/`.** `en.ts` defines the `Dictionary` type
  and `pl.ts` must match it; a test checks both have the same keys. No copy hardcoded in
  components, `aria-label`, `sr-only` and alt fallbacks included.
- **Catalogue text comes from Shopify**: titles, descriptions, colours, fabric, care and alt text.
  Don't copy it into dictionaries.
- **Server Components** use `getLocale()` and `getDictionary()`; **Client Components** use
  `useI18n()`.
- Placeholders go through `format(message, { name })`. Counts go through `plural({...})` and
  `formatPlural()`: Polish needs `one`, `few`, `many` and `other`.
- In Polish copy, one-letter words (a, i, o, u, w, z) stay with the next word through ` `.
- Prices use `formatMoney` in both languages: the store sells in PLN.
- A new page's `generateMetadata` returns `alternates(locale, path)` for hreflang. If it sets
  `openGraph`, it spreads `openGraph(locale)` in: Next.js replaces a parent's `openGraph` whole.

## Styling rules

The design direction is "the specimen catalogue": each product alone on a flat colour field, named
plainly. The tokens live in `@theme` in `src/app/globals.css`; there is no `tailwind.config`.

- **Colours come from the palette only**: `ground`, `surface`, `ink`, `muted`, `accent`,
  `accent-strong`, `accent-ink`, the specimen fields `ecru`, `oatmeal`, `stone`, `sage`, and
  `backdrop`. No raw hex and no Tailwind palette colours (`bg-gray-100`, `text-white`). A new
  colour goes into `@theme` with a comment on what it is for.
- **Type uses the project's fluid scale**: `text-small`, `text-body` (the body default),
  `text-lead` and `text-head`, plus `text-title` for the home page's one headline and
  `text-display` for the footer's wordmark. Tailwind's `text-sm`, `text-lg` and the rest are
  unused; keep it that way. Headings are `font-medium` in the one font, Roundo.
- **Spacing**: Tailwind's scale for small steps, `px-gutter` for the page's side padding, and
  `pt-section` or `mt-section` between sections.
- **Flat and square**: no shadows and no rounded corners. The colour finder's round lens is the
  one exception.
- **Product pictures** use `next/image` with `fill` and honest `sizes`, `mix-blend-multiply` over
  a field from `fieldFor(index)`, so the photo's ground melts into the field.
- **Motion**: `.rise` for scroll entrances, `.enter` with `--enter-step` for the first screen, and
  `ease-out-expo`. Add `.rise-even` where neighbours differ in height, as tiles in a row do, so
  they rise together. All of it sits behind `prefers-reduced-motion`. Nothing moves on its own without
  a way to pause it (WCAG 2.2.2).
- **Boxes that hold text grow with it**: `min-h-*` and `minmax(…,auto)` grid rows, never a fixed
  `h-*` or `overflow-hidden` around text. Polish copy, laptops from 1024px and a reader's own text
  spacing (WCAG 1.4.12) all need the room.
- **Every state keeps its contrast**: text stays at 4.5:1 on hover too. An ink button turns
  `bg-accent text-accent-ink` on hover; ground text on the teal is only 4.1:1.
- **What Tailwind can't name goes in a CSS module beside its component**, as a select's opened
  list (`::picker(select)`) does in `select.module.css`. `globals.css` keeps the tokens and what
  every page shares.
- **Arbitrary values are fine when nothing fits**: `aspect-[4/5]`, `max-w-[40ch]`,
  `[--enter-step:1]`. `style={{}}` is only for runtime values and custom properties a child reads.
- **Icons are inline SVG** with `aria-hidden`, like the footer's arrow, and controls carry text
  labels.
- When a new `@theme` token doesn't show up, Turbopack has cached the old CSS: delete `.next` and
  rebuild. `next dev` also needs a restart after `globals.css` changes.

## UX rules

- Semantic HTML first: a modal `<dialog>` for the bag, radios in a `<fieldset>` for options, `<dl>`
  for facts, `<del>` with an `sr-only` label for the old price, and `role="status"` for notices.
- Headings don't skip a level: a product tile's heading sits one below its list's (`tileHeading`).
- Focus shows through the global `:focus-visible` outline. A visually hidden input styles its
  visible part with `peer-focus-visible`. `scroll-padding-top` keeps it clear of the sticky header.
- Focus never falls to the page. Before an action removes the focused element (a bag line), move
  focus somewhere that stays (the bag's title). Don't disable a button while its action runs, as
  that drops focus too: mark it `aria-disabled` and ignore repeat presses.
- A message that answers an action goes to a `role="status"` region that is mounted before the
  message arrives; one inserted together with its text is often not read out.
- Keep both layouts working: the grid is 2, 3 and 4 columns, and the gallery scrolls sideways on
  phones.
- Sold-out products go last and never take a double tile; a sold-out size stays visible but
  crossed out.
- Don't break URLs: `/[locale]/products/[handle]`, `/[locale]/collections/[handle]` (`all` holds
  every product), `/[locale]/search?q=`, the `?color=&size=` query, and the Liquid-style
  `?filter.…=&sort_by=` query that collections and search share. Each list has its own sorts
  (`SORTS` in `browse.ts`).
- Filters come from Shopify (`products.filters`), not from code: the form renders whatever the
  store's Search & Discovery settings offer.

## Quality checks

Run from the repo root with Node 22.18 or newer (`nvm use` reads `.nvmrc`). CI runs all four.

- `npm run typecheck -w storefront`
- `npm run lint -w storefront`
- `npm test -w storefront`
- `npm run format:check`

Also run `npm run codegen -w storefront` after changing an operation, and
`npm run build -w storefront` after changes to caching, Suspense boundaries or `@theme`: the build
is what fails when request-time data is read outside Suspense, and it prerenders every page in both
languages. After a change to what the first screen loads (fonts, images, Suspense fallbacks), run
`npm run lighthouse -w storefront` on that build and compare the table it leaves
(`node storefront/scripts/lighthouse-summary.ts`) with the one from `main`.
