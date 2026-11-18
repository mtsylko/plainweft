import { describe, expect, it } from "vitest";
import { en } from "../src/i18n/dictionaries/en";
import { pl } from "../src/i18n/dictionaries/pl";
import { format, formatPlural } from "../src/i18n/format";
import {
  collectionPath,
  hasLocale,
  localePath,
  negotiateLocale,
  productPath,
} from "../src/i18n/locales";

describe("negotiateLocale", () => {
  it("picks the shopper's most wanted language that the store has", () => {
    expect(negotiateLocale("pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7")).toBe("pl");
    expect(negotiateLocale("de-DE,de;q=0.9,en;q=0.8,pl;q=0.5")).toBe("en");
  });

  it("goes by weight, not by order", () => {
    expect(negotiateLocale("en;q=0.5, pl;q=0.8")).toBe("pl");
  });

  it("skips languages the shopper refuses, and returns nothing without a match", () => {
    expect(negotiateLocale("pl;q=0, en;q=0.1")).toBe("en");
    expect(negotiateLocale("de, fr")).toBeUndefined();
    expect(negotiateLocale("*")).toBeUndefined();
    expect(negotiateLocale(null)).toBeUndefined();
  });
});

describe("locales", () => {
  it("knows the store's languages only", () => {
    expect(hasLocale("pl")).toBe(true);
    expect(hasLocale("PL")).toBe(false);
    expect(hasLocale("de")).toBe(false);
    expect(hasLocale(undefined)).toBe(false);
  });

  it("prefixes paths with the language", () => {
    expect(localePath("pl")).toBe("/pl");
    expect(localePath("pl", "/")).toBe("/pl");
    expect(localePath("en", "/products/x")).toBe("/en/products/x");
    expect(localePath("en", "/#catalogue")).toBe("/en/#catalogue");
  });

  it("builds product and collection paths, a product's with its variant", () => {
    expect(productPath("tee")).toBe("/products/tee");
    expect(productPath("tee", new URLSearchParams({ color: "black", size: "m" }))).toBe(
      "/products/tee?color=black&size=m",
    );
    expect(productPath("tee", new URLSearchParams())).toBe("/products/tee");
    expect(collectionPath("all")).toBe("/collections/all");
  });
});

describe("format", () => {
  it("fills placeholders and leaves unknown ones", () => {
    expect(format("{collection} from {price}", { collection: "Tees", price: "79 zł" })).toBe(
      "Tees from 79 zł",
    );
    expect(format("Hello {name}", {})).toBe("Hello {name}");
  });
});

describe("formatPlural", () => {
  it("uses Polish few and many forms", () => {
    const colours = pl.product.colours;
    expect(formatPlural("pl", colours, 1)).toBe("1 kolor");
    expect(formatPlural("pl", colours, 3)).toBe("3 kolory");
    expect(formatPlural("pl", colours, 5)).toBe("5 kolorów");
    expect(formatPlural("pl", colours, 22)).toBe("22 kolory");
    expect(formatPlural("pl", pl.home.catalogueTitle, 12)).toBe("Wszystkie 12 modeli");
  });

  it("falls back to other when a language has no such form", () => {
    expect(formatPlural("en", en.product.colours, 3)).toBe("3 colours");
    expect(formatPlural("en", en.home.catalogueTitle, 1)).toBe("One basic");
  });
});

describe("dictionaries", () => {
  it("have the same entries in every language", () => {
    const keys = (value: unknown, prefix = ""): string[] =>
      typeof value === "object" && value !== null && !Array.isArray(value)
        ? Object.entries(value).flatMap(([key, inner]) => keys(inner, `${prefix}${key}.`))
        : [prefix];
    // Plural forms differ by language, so compare down to the plural objects only.
    const shape = (dictionary: object) =>
      keys(dictionary).map((key) => key.replace(/\.(one|few|many|other)\.$/, "."));
    expect(new Set(shape(pl))).toEqual(new Set(shape(en)));
  });
});
