import type { MetadataRoute } from "next";
import { collectionPath, LOCALES, localePath, productPath } from "@/i18n/locales";
import { languageVersions, SITE_URL } from "@/i18n/metadata";
import { getCollectionHandles, getProductHandles } from "@/lib/shopify/catalog";

/**
 * Every page in each language, with its translations, so search engines find the Polish pages
 * too. Search results are left out, as they ask not to be indexed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [collections, products] = await Promise.all([getCollectionHandles(), getProductHandles()]);
  const pages: Array<{ path: string; lastModified?: string }> = [
    // The home page shows the whole catalogue, so it has no one date of its own.
    { path: "" },
    ...collections.map(({ handle, updatedAt }) => ({
      path: collectionPath(handle),
      lastModified: updatedAt,
    })),
    ...products.map(({ handle, updatedAt }) => ({
      path: productPath(handle),
      lastModified: updatedAt,
    })),
  ];

  return pages.flatMap(({ path, lastModified }) => {
    const languages = Object.fromEntries(
      Object.entries(languageVersions(path)).map(([language, href]) => [language, absolute(href)]),
    );
    return LOCALES.map((locale) => ({
      url: absolute(localePath(locale, path)),
      lastModified,
      alternates: { languages },
    }));
  });
}

function absolute(path: string): string {
  return new URL(path, SITE_URL).href;
}
