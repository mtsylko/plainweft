import type { Metadata } from "next";
import { STORE_NAME } from "@/lib/site";
import { LOCALES, localePath, type Locale } from "./locales";

/**
 * Where the store is deployed. Links that leave the page need it: hreflang, the sitemap and shared
 * images. Set SITE_URL in production.
 */
export const SITE_URL = new URL(process.env.SITE_URL || "http://localhost:3000");

/** How Open Graph names each language. It wants a country too, and the copy is British English. */
const OPEN_GRAPH_LOCALES: Record<Locale, string> = { en: "en_GB", pl: "pl_PL" };

/**
 * A page's address in each language. x-default is the address without a language, which the proxy
 * sends to the shopper's own.
 */
export function languageVersions(path = ""): Record<string, string> {
  return {
    ...Object.fromEntries(LOCALES.map((locale) => [locale, localePath(locale, path)])),
    "x-default": path || "/",
  };
}

/** Canonical and hreflang links for a page that exists in every language. */
export function alternates(locale: Locale, path = ""): Metadata["alternates"] {
  return { canonical: localePath(locale, path), languages: languageVersions(path) };
}

/**
 * The Open Graph fields every page shares. A page that sets its own openGraph replaces the whole of
 * its parent's, so it spreads these in.
 */
export function openGraph(locale: Locale) {
  return {
    siteName: STORE_NAME,
    type: "website",
    locale: OPEN_GRAPH_LOCALES[locale],
    alternateLocale: LOCALES.filter((other) => other !== locale).map(
      (other) => OPEN_GRAPH_LOCALES[other],
    ),
  } satisfies Metadata["openGraph"];
}
