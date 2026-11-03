import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Price } from "@/components/price";
import {
  Gallery,
  GalleryView,
  Purchase,
  PurchaseView,
  type Product,
} from "@/components/product/product-client";
import { ProductTile } from "@/components/product-tile";
import { localePath } from "@/i18n/locales";
import { alternates, openGraph } from "@/i18n/metadata";
import { getDictionary, getLocale } from "@/i18n/server";
import { resolveSelection } from "@/lib/product/variants";
import {
  getCollectionProducts,
  getProduct,
  getProductHandles,
  getRecommendations,
} from "@/lib/shopify/catalog";

const RELATED_COUNT = 4;

// The product renders without a Suspense fallback (see ProductPage), so a link to it waits for the
// page's static payload instead of showing a fallback first. Without this, Next.js flags the wait.
export const instant = false;

export async function generateStaticParams() {
  const products = await getProductHandles();
  return products.map(({ handle }) => ({ handle }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/products/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const [product, locale] = await Promise.all([getProduct(handle), getLocale()]);
  // Thrown here, before the page streams, so the 404 has its own title and status.
  if (!product) notFound();
  const image = product.images.nodes[0];
  const title = product.seo.title ?? product.title;
  const description = product.seo.description ?? product.description;
  return {
    title,
    description,
    openGraph: {
      ...openGraph(locale),
      title,
      description,
      ...(image && {
        images: [{ url: image.url, width: image.width ?? undefined, alt: image.altText ?? "" }],
      }),
    },
    alternates: alternates(locale, `/products/${handle}`),
  };
}

export default async function ProductPage({ params }: PageProps<"/[locale]/products/[handle]">) {
  // No Suspense around the product: every handle is prerendered, so there is nothing to wait for.
  // React holds a finished boundary this big (past its 12.8 kB chunk) out of the first paint and
  // swaps it in about 300 ms later, so the page showed a fallback first and the footer jumped.
  const { handle } = await params;
  return <ProductDetails handle={handle} />;
}

async function ProductDetails({ handle }: { handle: string }) {
  const [product, locale, dictionary] = await Promise.all([
    getProduct(handle),
    getLocale(),
    getDictionary(),
  ]);
  if (!product) notFound();

  // What the page shows before the URL is read: the first colour in stock, no size.
  const defaults = resolveSelection(product.options, product.variants.nodes, new URLSearchParams());
  const collection = product.collections.nodes[0];
  const care = parseList(product.care?.value);

  return (
    <>
      <article className="grid grid-cols-1 gap-x-2 gap-y-8 px-gutter pt-4 lg:grid-cols-12 lg:pt-6">
        {/* Entrances sit outside the Suspense boundaries, so they play once, not again on swap. */}
        <div className="enter lg:col-span-7">
          <Suspense fallback={<GalleryView product={product} color={defaults.Color} />}>
            <Gallery product={product} />
          </Suspense>
        </div>

        <div className="lg:sticky lg:top-24 lg:col-span-4 lg:col-start-9 lg:self-start">
          {collection && (
            <Link
              href={localePath(locale, `/collections/${collection.handle}`)}
              className="enter inline-block text-muted underline-offset-4 [--enter-step:1] hover:text-ink hover:underline"
            >
              {collection.title}
            </Link>
          )}
          <h1 className="enter mt-1 text-head font-medium [--enter-step:2]">{product.title}</h1>
          <Price
            price={product.priceRange.minVariantPrice}
            compareAt={product.compareAtPriceRange.maxVariantPrice}
            className="enter mt-4 text-lead tabular-nums [--enter-step:3]"
          />

          <div className="enter [--enter-step:4]">
            <Suspense fallback={<PurchaseView product={product} selection={defaults} />}>
              <Purchase product={product} />
            </Suspense>
          </div>

          <div
            className="rise mt-6 max-w-[60ch] space-y-4"
            // Written by the seed in the store's admin, not by shoppers.
            dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
          />

          <dl className="rise mt-8 space-y-6 bg-surface p-6">
            {product.fabric?.value && (
              <div>
                <dt className="font-medium">{dictionary.product.fabric}</dt>
                <dd>{product.fabric.value}</dd>
              </div>
            )}
            {care.length > 0 && (
              <div>
                <dt className="font-medium">{dictionary.product.care}</dt>
                <dd>
                  <ul>
                    {care.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </article>

      <Related handle={product.handle} collectionHandle={collection?.handle} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(product) }} />
    </>
  );
}

/**
 * Shopify's related products. Shopify may have none yet for a new product, and then the rest of its
 * collection stands in.
 */
async function Related({
  handle,
  collectionHandle,
}: {
  handle: string;
  collectionHandle: string | undefined;
}) {
  const [recommended, dictionary] = await Promise.all([
    getRecommendations(handle),
    getDictionary(),
  ]);
  const candidates =
    recommended.length > 0 || !collectionHandle
      ? recommended
      : ((await getCollectionProducts(collectionHandle))?.nodes ?? []);
  // A suggestion that can't be bought is a dead end.
  const products = candidates
    .filter((product) => product.handle !== handle && product.availableForSale)
    .slice(0, RELATED_COUNT);
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="related-title" className="mt-section px-gutter">
      <h2 id="related-title" className="rise mb-8 text-head font-medium">
        {dictionary.product.related}
      </h2>
      <ul className="grid grid-cols-2 gap-x-2 lg:grid-cols-4">
        {products.map((product, index) => (
          <ProductTile key={product.id} product={product} index={index + 1} />
        ))}
      </ul>
    </section>
  );
}

/** List metafields arrive as a JSON array in a string. */
function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function jsonLd(product: Product): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images.nodes.map((image) => image.url),
    brand: { "@type": "Brand", name: "Plainweft" },
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
