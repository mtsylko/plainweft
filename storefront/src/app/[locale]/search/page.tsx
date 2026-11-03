import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BrowseListing } from "@/components/collection/browse-listing";
import { SearchField } from "@/components/search/search-field";
import { format, formatPlural } from "@/i18n/format";
import { localePath } from "@/i18n/locales";
import { getDictionary, getLocale } from "@/i18n/server";
import {
  defaultBrowse,
  isNarrowed,
  readBrowse,
  searchFor,
  toSearchParams,
} from "@/lib/product/browse";
import { searchProducts } from "@/lib/shopify/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const { search } = await getDictionary();
  return {
    title: search.title,
    // Results only repeat what the collections show, so search engines are asked to leave them out.
    // That is also why there are no hreflang links: they would point at pages kept out of the index.
    robots: { index: false },
  };
}

export default async function SearchPage({ searchParams }: PageProps<"/[locale]/search">) {
  const [locale, { search: words }] = await Promise.all([getLocale(), getDictionary()]);
  const path = localePath(locale, "/search");

  return (
    // A group, so the results dim while the box's next search is on its way.
    <section aria-labelledby="search-title" className="group px-gutter pt-10 lg:pt-16">
      <div className="mb-8 grid gap-4 lg:grid-cols-12 lg:items-start lg:gap-2">
        <h1 id="search-title" className="enter text-head font-medium lg:col-span-6 lg:trim-cap">
          {words.title}
        </h1>
        <p className="enter max-w-[40ch] text-lead text-pretty [--enter-step:1] lg:col-span-6 lg:col-start-7 lg:trim-cap">
          {words.lead}
        </p>
      </div>
      <div className="enter [--enter-step:2]">
        <SearchField path={path} />
      </div>
      {/*
        The box is prerendered; the results depend on the query, so they render per request. Until
        then the page shows what it shows with no query, so a visit from the header's link is whole
        in its first paint, and nothing below moves when the query turns out to be empty.
      */}
      <div className="mt-8">
        <Suspense fallback={<Suggestions path={path} />}>
          <SearchResults path={path} query={searchParams.then(toSearchParams)} />
        </Suspense>
      </div>
    </section>
  );
}

async function SearchResults({ path, query }: { path: string; query: Promise<URLSearchParams> }) {
  const browse = readBrowse(await query, "search");
  if (!browse.terms) return <Suggestions path={path} />;

  const [listing, locale, { search: words }] = await Promise.all([
    searchProducts(browse),
    getLocale(),
    getDictionary(),
  ]);
  // With no filters to take off, nothing found is down to the terms, so it offers others.
  if (listing.nodes.length === 0 && !isNarrowed(browse)) {
    return (
      <>
        <p role="status" className="mb-6 max-w-[40ch] text-lead">
          {format(words.empty, { terms: browse.terms })}
        </p>
        <Suggestions path={path} />
      </>
    );
  }

  return (
    <BrowseListing
      path={path}
      browse={browse}
      listing={listing}
      status={formatPlural(locale, words.results, listing.nodes.length, { terms: browse.terms })}
    />
  );
}

/** Searches to start from, picked to find something in the page's language. */
async function Suggestions({ path }: { path: string }) {
  const { search: words } = await getDictionary();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p id="suggestions-label" className="text-muted">
        {words.tryLabel}
      </p>
      <ul aria-labelledby="suggestions-label" className="flex flex-wrap gap-2">
        {words.suggestions.map((terms) => (
          <li key={terms}>
            <Link
              href={`${path}${searchFor(defaultBrowse("search", terms))}`}
              className="flex h-12 items-center bg-surface px-4 transition-colors hover:bg-stone"
            >
              {terms}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
