import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BrowseListing, BrowseListingPlaceholder } from "@/components/collection/browse-listing";
import { PageIntro } from "@/components/page-intro";
import { formatPlural } from "@/i18n/format";
import { collectionPath, localePath } from "@/i18n/locales";
import { alternates, openGraph } from "@/i18n/metadata";
import { getDictionary, getLocale } from "@/i18n/server";
import { readBrowse, toSearchParams } from "@/lib/product/browse";
import {
  ALL_COLLECTION,
  getCollection,
  getCollectionProducts,
  getCollections,
} from "@/lib/shopify/catalog";

export async function generateStaticParams() {
  const collections = await getCollections();
  return [...collections, { handle: ALL_COLLECTION }].map(({ handle }) => ({ handle }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/collections/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const [collection, locale] = await Promise.all([getCollection(handle), getLocale()]);
  // Thrown here, before the page streams, so the 404 has its own title and status.
  if (!collection) notFound();
  const title = collection.seo.title ?? collection.title;
  const description = collection.seo.description ?? collection.description;
  return {
    title,
    description,
    // Filtered addresses point search engines at the collection itself.
    alternates: alternates(locale, collectionPath(handle)),
    openGraph: { ...openGraph(locale), title, description },
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: PageProps<"/[locale]/collections/[handle]">) {
  const { loading } = await getDictionary();
  const handle = params.then((p) => p.handle);
  return (
    <section aria-labelledby="collection-title" className="px-gutter pt-10 lg:pt-16">
      <Suspense fallback={<p>{loading}</p>}>
        <CollectionHeading handle={handle} />
      </Suspense>
      {/* The heading is prerendered; the products depend on the query, so they render per request. */}
      <Suspense fallback={<BrowseListingPlaceholder />}>
        <CollectionProducts handle={handle} query={searchParams.then(toSearchParams)} />
      </Suspense>
    </section>
  );
}

async function CollectionHeading({ handle }: { handle: Promise<string> }) {
  const collection = await getCollection(await handle);
  if (!collection) notFound();

  return (
    <PageIntro
      id="collection-title"
      title={collection.title}
      lead={collection.description}
      className="mb-12"
    />
  );
}

async function CollectionProducts({
  handle,
  query,
}: {
  handle: Promise<string>;
  query: Promise<URLSearchParams>;
}) {
  const browse = readBrowse(await query, "collection");
  const [listing, locale, { browse: words }] = await Promise.all([
    getCollectionProducts(await handle, browse),
    getLocale(),
    getDictionary(),
  ]);
  // The heading beside this shows the 404 for a collection that doesn't exist.
  if (!listing) return null;

  return (
    <BrowseListing
      path={localePath(locale, collectionPath(await handle))}
      browse={browse}
      listing={listing}
      status={formatPlural(locale, words.results, listing.nodes.length)}
    />
  );
}
