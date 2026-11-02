// Prints the last `npm run lighthouse` as a Markdown table: each page's median for the metrics
// lighthouserc.cjs budgets, marked where it misses, with a link to the uploaded report. CI adds it
// to the job summary; locally, `node storefront/scripts/lighthouse-summary.ts` prints it.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Where `lhci autorun` writes, beside lighthouserc.cjs, wherever this script is run from.
const DIR = join(import.meta.dirname, "..", ".lighthouseci");

const METRICS = [
  {
    id: "largest-contentful-paint",
    label: "LCP",
    format: (ms: number) => `${(ms / 1000).toFixed(2)} s`,
  },
  { id: "cumulative-layout-shift", label: "CLS", format: (shift: number) => shift.toFixed(2) },
  { id: "total-blocking-time", label: "TBT", format: (ms: number) => `${Math.round(ms)} ms` },
];

/** The parts of a Lighthouse report the table reads. */
interface Report {
  requestedUrl: string;
  audits: Record<string, { numericValue?: number }>;
  categories: { performance: { score: number | null } };
}

/** An entry of assertion-results.json, which lists the budgets a page missed. */
interface Assertion {
  url: string;
  auditId: string;
  level: "warn" | "error";
}

function read<T>(file: string, fallback: T): T {
  const path = join(DIR, file);
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : fallback;
}

/** The middle value, as Lighthouse CI's "median" picks it. */
function median(values: number[]): number {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)] ?? NaN;
}

const reports = (existsSync(DIR) ? readdirSync(DIR) : [])
  .filter((file) => /^lhr-\d+\.json$/.test(file))
  .map((file) => read<Report | null>(file, null))
  .filter((report) => report !== null);
const missed = read<Assertion[]>("assertion-results.json", []);
// Written by the upload to temporary-public-storage: page URL → report URL.
const links = read<Record<string, string>>("links.json", {});

if (reports.length === 0) {
  // CI still runs this after a failed build, so the summary says why the table is missing.
  console.log("### Lighthouse\n\nNo reports: the audit didn't run.");
  process.exit(0);
}

const pages = Map.groupBy(reports, (report) => report.requestedUrl);
const runs = Math.max(...[...pages.values()].map((page) => page.length));
const site = new URL(reports[0]!.requestedUrl);
const audited =
  site.hostname === "localhost" ? "the production build, served on the same machine" : site.origin;

const rows = [...pages].map(([url, page]) => {
  const cells = METRICS.map(({ id, format }) => {
    const value = format(median(page.map((report) => report.audits[id]?.numericValue ?? NaN)));
    const miss = missed.find((assertion) => assertion.url === url && assertion.auditId === id);
    return miss ? `${miss.level === "error" ? "❌" : "⚠️"} ${value}` : value;
  });
  const score = median(page.map((report) => (report.categories.performance.score ?? NaN) * 100));
  const report = links[url] ? `[report](${links[url]})` : "–";
  return [new URL(url).pathname, ...cells, String(Math.round(score)), report];
});

console.log(
  [
    "### Lighthouse",
    "",
    `Medians of ${runs} runs per page of ${audited}, on Lighthouse's phone profile. ⚠️ marks a ` +
      "miss of the budget in `storefront/lighthouserc.cjs`.",
    "",
    `| Page | ${METRICS.map(({ label }) => label).join(" | ")} | Score | Report |`,
    `| --- | ${METRICS.map(() => "---:").join(" | ")} | ---: | --- |`,
    ...rows.map((cells) => `| ${cells.join(" | ")} |`),
  ].join("\n"),
);
