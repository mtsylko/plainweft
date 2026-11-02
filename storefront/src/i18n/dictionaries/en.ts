import type { SortBy } from "@/lib/product/browse";
import { plural } from "../format";

/** The storefront's own words. Catalogue text (products, collections, colours) comes from Shopify. */
export const en = {
  meta: {
    title: "Plainweft: everyday basics in natural fibres",
    description:
      "Tees, hoodies, knitwear and accessories in organic cotton, linen, merino and cashmere. A demo store built on the Shopify Storefront API.",
  },
  layout: {
    skipToContent: "Skip to content",
    collections: "Collections",
    language: "Language",
    allBasics: "All basics",
    search: "Search",
  },
  shopTheBasics: "Shop the basics",
  loading: "Loading…",
  home: {
    heroTitle: "Everyday basics in natural fibres",
    heroLead: "Organic cotton, linen, merino and cashmere, made to last.",
    collectionFrom: "{collection} from {price}",
    catalogueTitle: plural({ one: "One basic", other: "All {count} basics" }),
    catalogueLead:
      "Tees, hoodies and knits in sizes XS to XL, and accessories in one size. Each one is shown in its first colour; the others are on its page.",
    coloursTitle: "Shop by colour",
    stylesInColour: plural({
      one: "One style in {colourLower}",
      other: "{count} styles in {colourLower}",
    }),
    mosaicTitle: "Made for years, not a season",
    heaviestFabric: "The fleece of our Heavyweight Oversized Hoodie, the heaviest fabric we use.",
    preWashed: "Pre-washed jersey that keeps its shape and size.",
    hoodies: "Hoodies in soft fleece and French terry, with no logos.",
    woolCareTitle: "Caring for wool",
    woolCare: [
      "Hand wash cold or use a wool cycle",
      "Dry flat, away from direct heat",
      "Do not tumble dry",
      "Steam to refresh between wears",
    ],
  },
  product: {
    soldOut: "Sold out",
    /** Labels for the plainweft.featured metafield's choices. */
    featured: { New: "New", Bestseller: "Bestseller", "Staff pick": "Staff pick" } as Record<
      string,
      string
    >,
    colours: plural({ one: "{count} colour", other: "{count} colours" }),
    salePrice: "Sale price",
    was: "was",
    pictures: "Pictures of the {title}",
    /** Option names stay English in Shopify; these are how the page labels them. */
    options: { Color: "Colour", Size: "Size" } as Record<string, string>,
    soldOutOption: "(sold out)",
    addToBag: "Add to bag",
    adding: "Adding…",
    chooseSize: "Choose a size first.",
    fabric: "Fabric",
    care: "Care",
    related: "You may also like",
  },
  browse: {
    label: "Filter and sort",
    sortBy: "Sort by",
    /** Labels for the sort_by values in src/lib/product/browse.ts. */
    sorts: {
      manual: "Recommended",
      relevance: "Relevance",
      "created-descending": "Newest",
      "price-ascending": "Price, low to high",
      "price-descending": "Price, high to low",
    } satisfies Record<SortBy, string>,
    from: "From",
    to: "To",
    apply: "Apply",
    clear: "Clear filters",
    results: plural({ one: "One basic", other: "{count} basics" }),
    empty: "Nothing in the range matches these filters.",
  },
  search: {
    title: "Search",
    lead: "Look for a garment, a colour or a fabric.",
    label: "Search the range",
    submit: "Search",
    clear: "Clear the search",
    /** Searches to start from, which find something in this language. */
    tryLabel: "Try",
    suggestions: ["hoodie", "black", "merino"],
    results: plural({
      one: "One basic matches “{terms}”",
      other: "{count} basics match “{terms}”",
    }),
    empty: "Nothing in the range matches “{terms}”.",
  },
  cart: {
    bag: "Bag",
    items: plural({ one: "item", other: "items" }),
    title: "Your bag",
    close: "Close",
    loading: "Loading your bag…",
    empty: "Your bag is empty.",
    subtotal: "Subtotal",
    taxesAtCheckout: "Shipping and taxes are added at checkout.",
    checkOut: "Check out",
    oneFewer: "One fewer {title}",
    oneMore: "One more {title}",
    quantity: "Quantity",
    remove: "Remove",
    quantityChanged: "{title}: quantity {quantity}.",
    removed: "{title} removed from your bag.",
    failed: "Something went wrong. Please try again.",
  },
  footer: {
    label: "Footer",
    about: "Plainweft is a demo store: a headless Next.js storefront on Shopify.",
    fictional: "A fictional brand. Orders go to a Shopify development store and are never shipped.",
    photoCredit: "Home page photo by {author} on Unsplash.",
    builtWith: "Built with Next.js 16, React 19 and the Shopify Storefront API.",
    source: "Source on GitHub",
  },
  error: {
    title: "The store didn’t answer",
    body: "We couldn’t load the catalogue from Shopify just now. Trying again usually helps.",
    retry: "Try again",
  },
  notFound: {
    title: "This page isn’t in the catalogue",
    body: "The link may be old, or the product may have been taken out of the range.",
    back: "See all basics",
  },
};

export type Dictionary = typeof en;
