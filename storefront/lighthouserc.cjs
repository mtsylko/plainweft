// Lighthouse CI: `lhci autorun` audits each page three times on Lighthouse's default phone (a
// mid-range Android on slow 4G) and checks each median against Google's "good" Core Web Vitals
// threshold. It serves the production build itself (run `npm run build` first), unless
// LIGHTHOUSE_SITE names a deployed site to audit instead, such as https://plainweft.vercel.app.

// The build served here leaves out the CDN and Vercel's functions, so it reads faster than the
// deployed site; it is for comparing one commit with another.
const SITE = process.env.LIGHTHOUSE_SITE;

// Not 3000: a dev server there would answer in place of the build.
const PORT = 3900;

// One page of each kind the store renders.
const PAGES = ["/en", "/en/collections/tees", "/en/products/heavyweight-boxy-tee"];

// Warnings, not failures, while LCP still misses on some pages: a budget the store doesn't
// meet yet would turn every run red. Once they pass, "error" makes a slower change fail its PR.
const LEVEL = "warn";

/** A median above `max` misses the budget. */
const budget = (max) => [LEVEL, { maxNumericValue: max, aggregationMethod: "median" }];

module.exports = {
  ci: {
    collect: {
      ...(!SITE && {
        startServerCommand: `npm run start -- --port ${PORT}`,
        startServerReadyPattern: "Ready in",
      }),
      url: PAGES.map((path) => `${SITE ?? `http://localhost:${PORT}`}${path}`),
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "largest-contentful-paint": budget(2500),
        "cumulative-layout-shift": budget(0.1),
        // INP needs a real tap, which a lab run doesn't make. Main-thread blocking during load
        // is what usually delays the first one, so Lighthouse's own stand-in is the budget here.
        "total-blocking-time": budget(200),
      },
    },
  },
};
