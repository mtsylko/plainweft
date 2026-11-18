import type { Money } from "../money";
import { STORE_NAME } from "../site";

interface ProductSource {
  title: string;
  description: string;
  images: { nodes: readonly { url: string }[] };
  variants: {
    nodes: readonly { sku?: string | null; availableForSale: boolean; price: Money }[];
  };
}

/**
 * A list metafield, such as plainweft.care, which arrives as a JSON array in a string. Anything that
 * isn't a list of strings reads as an empty list, so a bad value hides the section, not the page.
 */
export function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/** The product as schema.org data, for a `<script type="application/ld+json">`. */
export function productJsonLd(product: ProductSource): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images.nodes.map((image) => image.url),
    brand: { "@type": "Brand", name: STORE_NAME },
    offers: product.variants.nodes.map((variant) => ({
      "@type": "Offer",
      sku: variant.sku,
      price: variant.price.amount,
      priceCurrency: variant.price.currencyCode,
      availability: variant.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    })),
  };
  // Escaped so a "</script>" inside product text can't end the tag.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
