import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getLocale } from "@/i18n/server";
import { languageCode, type Locale } from "@/i18n/locales";
import { defaultBrowse, queryFor, type Browse } from "@/lib/product/browse";
import { storefront } from "./client";
import {
  FILTER_FRAGMENT,
  IMAGE_FRAGMENT,
  MONEY_FRAGMENT,
  PRODUCT_CARD_FRAGMENT,
} from "./fragments";

/**
 * Catalog reads run in the page's language: Shopify answers with its translations, and falls back
 * to English where there are none. The locale comes from the URL, so it is part of every cache key.
 */
async function language() {
  return languageCode(await getLocale());
}

/**
 * One tag for the whole catalog: it is small, and Shopify's webhooks (`app/api/revalidate`) expire
 * all of it at once. `cacheLife("hours")` stays as the fallback for a webhook that never arrives.
 */
export const CATALOG_TAG = "catalog";

/** The seed's collection of every product: the place to filter the whole range. */
export const ALL_COLLECTION = "all";

/** Shopify creates "frontpage" for the Online Store theme's home page; it isn't one of our pages. */
const HIDDEN_COLLECTIONS = new Set(["frontpage"]);

/** A range is a kind of garment, like tees: what the menus list and a product belongs to. */
function isRange(collection: { handle: string }): boolean {
  return !HIDDEN_COLLECTIONS.has(collection.handle) && collection.handle !== ALL_COLLECTION;
}

const COLLECTIONS_QUERY = `#graphql
  query Collections($language: LanguageCode) @inContext(language: $language) {
    collections(first: 20, sortKey: ID) {
      nodes {
        handle
        title
        description
        products(first: 50) {
          nodes {
            featuredImage {
              ...Image
            }
            priceRange {
              minVariantPrice {
                ...Money
              }
            }
          }
        }
      }
    }
  }
  ${IMAGE_FRAGMENT}
  ${MONEY_FRAGMENT}
`;

const PRODUCTS_QUERY = `#graphql
  query Products($first: Int!, $sortKey: ProductSortKeys, $language: LanguageCode)
  @inContext(language: $language) {
    products(first: $first, sortKey: $sortKey) {
      nodes {
        ...ProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
  ${IMAGE_FRAGMENT}
  ${MONEY_FRAGMENT}
`;

const COLLECTION_QUERY = `#graphql
  query Collection($handle: String!, $language: LanguageCode)
  @inContext(language: $language) {
    collection(handle: $handle) {
      handle
      title
      description
      descriptionHtml
      seo {
        title
        description
      }
    }
  }
`;

const COLLECTION_PRODUCTS_QUERY = `#graphql
  query CollectionProducts(
    $handle: String!
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $language: LanguageCode
  ) @inContext(language: $language) {
    localization {
      country {
        currency {
          symbol
        }
      }
    }
    collection(handle: $handle) {
      products(first: 100, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
        filters {
          ...Filter
        }
        nodes {
          ...ProductCard
        }
      }
    }
  }
  ${FILTER_FRAGMENT}
  ${PRODUCT_CARD_FRAGMENT}
  ${IMAGE_FRAGMENT}
  ${MONEY_FRAGMENT}
`;

const SEARCH_QUERY = `#graphql
  query Search(
    $terms: String!
    $filters: [ProductFilter!]
    $sortKey: SearchSortKeys
    $reverse: Boolean
    $language: LanguageCode
  ) @inContext(language: $language) {
    localization {
      country {
        currency {
          symbol
        }
      }
    }
    search(
      query: $terms
      types: [PRODUCT]
      first: 100
      productFilters: $filters
      sortKey: $sortKey
      reverse: $reverse
      unavailableProducts: LAST
    ) {
      productFilters {
        ...Filter
      }
      nodes {
        __typename
        ...ProductCard
      }
    }
  }
  ${FILTER_FRAGMENT}
  ${PRODUCT_CARD_FRAGMENT}
  ${IMAGE_FRAGMENT}
  ${MONEY_FRAGMENT}
`;

const PRODUCT_QUERY = `#graphql
  query Product($handle: String!, $language: LanguageCode) @inContext(language: $language) {
    product(handle: $handle) {
      id
      handle
      title
      description
      descriptionHtml
      availableForSale
      seo {
        title
        description
      }
      images(first: 20) {
        nodes {
          ...Image
        }
      }
      priceRange {
        minVariantPrice {
          ...Money
        }
      }
      compareAtPriceRange {
        maxVariantPrice {
          ...Money
        }
      }
      options {
        name
        optionValues {
          name
          swatch {
            color
          }
        }
      }
      variants(first: 100) {
        nodes {
          id
          sku
          availableForSale
          selectedOptions {
            name
            value
          }
          image {
            ...Image
          }
          price {
            ...Money
          }
          compareAtPrice {
            ...Money
          }
        }
      }
      fabric: metafield(namespace: "plainweft", key: "fabric") {
        value
      }
      care: metafield(namespace: "plainweft", key: "care") {
        value
      }
      collections(first: 5) {
        nodes {
          handle
          title
        }
      }
    }
  }
  ${IMAGE_FRAGMENT}
  ${MONEY_FRAGMENT}
`;

const RECOMMENDATIONS_QUERY = `#graphql
  query Recommendations($handle: String!, $language: LanguageCode)
  @inContext(language: $language) {
    productRecommendations(productHandle: $handle, intent: RELATED) {
      ...ProductCard
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
  ${IMAGE_FRAGMENT}
  ${MONEY_FRAGMENT}
`;

const COLOUR_INDEX_QUERY = `#graphql
  query ColourIndex($language: LanguageCode) @inContext(language: $language) {
    products(first: 50, sortKey: BEST_SELLING) {
      nodes {
        handle
        title
        variants(first: 100) {
          nodes {
            availableForSale
            selectedOptions {
              name
              value
            }
            image {
              ...Image
            }
          }
        }
      }
    }
  }
  ${IMAGE_FRAGMENT}
`;

const PRODUCT_HANDLES_QUERY = `#graphql
  query ProductHandles {
    products(first: 250) {
      nodes {
        handle
        updatedAt
      }
    }
  }
`;

const COLLECTION_HANDLES_QUERY = `#graphql
  query CollectionHandles {
    collections(first: 20, sortKey: ID) {
      nodes {
        handle
        updatedAt
      }
    }
  }
`;

const COLLECTION_PREVIEW_QUERY = `#graphql
  query CollectionPreview($handle: String!, $language: LanguageCode)
  @inContext(language: $language) {
    collection(handle: $handle) {
      title
      products(first: 100) {
        nodes {
          availableForSale
          featured: metafield(namespace: "plainweft", key: "featured") {
            value
          }
          featuredImage {
            url
          }
        }
      }
    }
  }
`;

export async function getCollections() {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  const { collections } = await storefront(COLLECTIONS_QUERY, { language: await language() });
  return collections.nodes.filter(isRange);
}

export async function getProducts(sortKey: "BEST_SELLING" | "CREATED_AT" = "BEST_SELLING") {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  const { products } = await storefront(PRODUCTS_QUERY, {
    first: 50,
    sortKey,
    language: await language(),
  });
  return products.nodes;
}

export async function getCollection(handle: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  const { collection } = await storefront(COLLECTION_QUERY, { handle, language: await language() });
  return collection && !HIDDEN_COLLECTIONS.has(collection.handle) ? collection : null;
}

/**
 * A collection's products, narrowed and sorted as the shopper chose, with the filters the store
 * offers for them. Each choice is a cache entry of its own, shared by everyone who makes it.
 */
export async function getCollectionProducts(
  handle: string,
  browse: Browse<"collection"> = defaultBrowse("collection"),
) {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  const { collection, localization } = await storefront(COLLECTION_PRODUCTS_QUERY, {
    handle,
    ...queryFor(browse),
    language: await language(),
  });
  if (!collection) return null;
  return { ...collection.products, currency: localization.country.currency.symbol };
}

/**
 * The products that match a search, narrowed and sorted as the shopper chose, with the filters the
 * store offers for them. As with a collection, each choice is a cache entry of its own.
 */
export async function searchProducts(browse: Browse<"search">) {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  const { search, localization } = await storefront(SEARCH_QUERY, {
    terms: browse.terms,
    ...queryFor(browse),
    language: await language(),
  });
  return {
    filters: search.productFilters,
    nodes: search.nodes.filter((node) => node.__typename === "Product"),
    currency: localization.country.currency.symbol,
  };
}

export async function getProduct(handle: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  const { product } = await storefront(PRODUCT_QUERY, { handle, language: await language() });
  if (!product) return null;
  return { ...product, collections: { nodes: product.collections.nodes.filter(isRange) } };
}

/** A product as its page shows it. */
export type Product = NonNullable<Awaited<ReturnType<typeof getProduct>>>;

/**
 * Shopify's related products: worked out from sales, descriptions and collections, and adjustable
 * in the Search & Discovery app. Up to ten, most related first.
 */
export async function getRecommendations(handle: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  const { productRecommendations } = await storefront(RECOMMENDATIONS_QUERY, {
    handle,
    language: await language(),
  });
  return productRecommendations ?? [];
}

export async function getColourIndex() {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  const { products } = await storefront(COLOUR_INDEX_QUERY, { language: await language() });
  return products.nodes;
}

export async function getProductHandles() {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  const { products } = await storefront(PRODUCT_HANDLES_QUERY);
  return products.nodes;
}

/** Collection pages, including the one of every product. Handles are the same in every language. */
export async function getCollectionHandles() {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  const { collections } = await storefront(COLLECTION_HANDLES_QUERY);
  return collections.nodes.filter((collection) => !HIDDEN_COLLECTIONS.has(collection.handle));
}

/**
 * What a collection's shared image shows: its title and its first pictures. The locale is passed
 * in, as images are Route Handlers, which can't read the URL's language the way pages do.
 */
export async function getCollectionPreview(handle: string, locale: Locale) {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  const { collection } = await storefront(COLLECTION_PREVIEW_QUERY, {
    handle,
    language: languageCode(locale),
  });
  return collection && !HIDDEN_COLLECTIONS.has(handle) ? collection : null;
}
