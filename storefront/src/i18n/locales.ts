/** The store's languages. English is the catalogue's own; Polish comes from Shopify's translations. */
export const LOCALES = ["en", "pl"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Each language in itself, for the switcher. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", pl: "Polski" };

/** Remembers a language the shopper picked, so the bare domain opens in it next time. */
export const LOCALE_COOKIE = "plainweft_locale";

export function hasLocale(value: string | null | undefined): value is Locale {
  return (LOCALES as readonly (string | null | undefined)[]).includes(value);
}

/** The Storefront API's code for a language, for @inContext(language:). */
export function languageCode(locale: Locale) {
  return locale.toUpperCase() as Uppercase<Locale>;
}

/** A path inside the store in this language: localePath("pl", "/products/x") is /pl/products/x. */
export function localePath(locale: Locale, path = ""): string {
  return `/${locale}${path === "/" ? "" : path}`;
}

/**
 * A product's page, before localePath adds the language. A query opens it on a variant:
 * productPath("tee", new URLSearchParams({ color: "black" })) is /products/tee?color=black.
 */
export function productPath(handle: string, query?: URLSearchParams): string {
  const search = query?.toString();
  return `/products/${handle}${search ? `?${search}` : ""}`;
}

/** A collection's page, before localePath adds the language. */
export function collectionPath(handle: string): string {
  return `/collections/${handle}`;
}

/** The first language in an Accept-Language header that the store has, by the shopper's weights. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale | undefined {
  return (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const weight = params.map((param) => param.trim()).find((param) => param.startsWith("q="));
      return {
        language: tag.split("-")[0]?.toLowerCase(),
        q: weight ? Number(weight.slice(2)) : 1,
      };
    })
    .filter(({ q }) => q > 0)
    .sort((a, b) => b.q - a.q)
    .map(({ language }) => language)
    .find(hasLocale);
}
