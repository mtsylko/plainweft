"use client";

import Image from "next/image";
import { format } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-context";
import { COLOR_OPTION, orderGallery } from "@/lib/product/variants";
import type { Product } from "@/lib/shopify/catalog";
import { fieldFor } from "../fields";
import { useSelection } from "./use-selection";

/** The product's pictures, led by the colour in the URL. */
export function Gallery({ product }: { product: Product }) {
  const [selection] = useSelection(product);
  return <GalleryView product={product} color={selection[COLOR_OPTION]} />;
}

/** The chosen colour's picture leads, the rest follow in the store's order. */
export function GalleryView({ product, color }: { product: Product; color: string | undefined }) {
  const words = useI18n().dictionary.product;
  const variants = product.variants.nodes;
  const images = orderGallery(product.images.nodes, variants, COLOR_OPTION, color);
  // Choosing a colour moves its picture into the lead slot. Fetched at the lead's size from the
  // start, it swaps in as it is, while a bigger file fetched on the swap would leave the slot blank
  // until it arrived.
  const leads = new Set(variants.map((variant) => variant.image?.url));
  return (
    <ul
      aria-label={format(words.pictures, { title: product.title })}
      className="-mx-gutter flex snap-x snap-mandatory gap-2 overflow-x-auto px-gutter lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0"
    >
      {images.map((image, index) => (
        <li
          key={image.url}
          className={`relative aspect-[4/5] w-[85vw] shrink-0 snap-start overflow-hidden lg:w-auto ${index === 0 ? "lg:col-span-2" : ""} ${fieldFor(index)}`}
        >
          <Image
            src={image.url}
            alt={image.altText ?? product.title}
            fill
            sizes={
              index === 0 || leads.has(image.url)
                ? "(min-width: 1024px) 58vw, 85vw"
                : "(min-width: 1024px) 29vw, 85vw"
            }
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "auto"}
            className="object-cover mix-blend-multiply"
          />
        </li>
      ))}
    </ul>
  );
}
