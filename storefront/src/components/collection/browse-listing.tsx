import Link from "next/link";
import type { ProductCardFragment } from "../../../generated/storefront.generated";
import { Catalogue, CataloguePlaceholder } from "@/components/catalogue";
import { getDictionary } from "@/i18n/server";
import {
  DEFAULT_SORT,
  facetsFrom,
  isNarrowed,
  searchFor,
  type Browse,
  type ShopifyFilter,
} from "@/lib/product/browse";
import { BrowseForm } from "./browse-form";

interface BrowseListingProps {
  /** The page being browsed, without its query. */
  path: string;
  browse: Browse;
  /** The products Shopify found, with the filters it offers for them. */
  listing: {
    filters: readonly ShopifyFilter[];
    nodes: readonly ProductCardFragment[];
    currency: string;
  };
  /** The count line above the grid. */
  status: string;
}

/** A list of products the shopper can narrow and sort: a collection, or search results. */
export async function BrowseListing({ path, browse, listing, status }: BrowseListingProps) {
  const { browse: words } = await getDictionary();
  const { lists, price } = facetsFrom(listing.filters);
  const cleared = `${path}${searchFor({ ...browse, values: [], price: {} })}`;
  const isCollection = browse.scope === "collection";

  return (
    <div className="group">
      <BrowseForm
        path={path}
        browse={browse}
        lists={lists}
        price={price}
        currency={listing.currency}
      />
      <div className="mt-8 mb-6 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <p role="status" className="text-muted">
          {status}
        </p>
        {isNarrowed(browse) && (
          <Link href={cleared} scroll={false} className="underline underline-offset-4">
            {words.clear}
          </Link>
        )}
      </div>
      <div className="transition-opacity group-has-data-pending:opacity-40">
        {listing.nodes.length > 0 ? (
          // Search results keep Shopify's ranking, so no double tiles, and no entrance, as they
          // change while the shopper types.
          <Catalogue
            products={listing.nodes}
            enterFrom={isCollection ? 2 : undefined}
            doubles={isCollection && browse.sortBy === DEFAULT_SORT.collection}
            tileHeading="h2"
          />
        ) : (
          <p className="max-w-[40ch] pb-section text-lead">{words.empty}</p>
        )}
      </div>
    </div>
  );
}

/**
 * A collection's listing while its products load: room for the filters and the count, then the
 * grid's first tiles as bare fields. The footer starts below it, so it stays put when they arrive.
 */
export async function BrowseListingPlaceholder() {
  const { loading } = await getDictionary();
  return (
    <div>
      <p className="sr-only">{loading}</p>
      {/* The form's legend and fields, and the count line under them. */}
      <div aria-hidden="true">
        <div className="mb-3 h-lh" />
        <div className="h-12" />
        <div className="mt-8 mb-6 h-lh" />
      </div>
      <CataloguePlaceholder />
    </div>
  );
}
