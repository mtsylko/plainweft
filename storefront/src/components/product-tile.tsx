import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { ProductCardFragment } from "../../generated/storefront.generated";
import { formatPlural } from "@/i18n/format";
import { localePath } from "@/i18n/locales";
import { getDictionary, getLocale } from "@/i18n/server";
import { fieldFor } from "./fields";
import { Price } from "./price";

interface ProductTileProps {
  product: ProductCardFragment;
  index: number;
  /** A double tile spans two columns and two rows. */
  double?: boolean;
  /** Tiles above the fold load first. */
  eager?: boolean;
  /** For a tile on the first screen: it enters with the page at this step, instead of on scroll. */
  enterStep?: number;
  /** One level below the heading of the list the tile sits in. */
  heading?: "h2" | "h3";
}

/**
 * A product as a specimen: alone on a flat field, named plainly, one fact beneath.
 *
 * Each tile is a subgrid over two of its list's rows, picture and caption, so a row's pictures end
 * on one line and its captions start on one. A double tile's picture runs down to the foot of the
 * second row's pictures. The tile brings its own space beneath, so its list has no row gap.
 */
export async function ProductTile({
  product,
  index,
  double = false,
  eager = false,
  enterStep,
  heading: Heading = "h3",
}: ProductTileProps) {
  const [locale, { product: words }] = await Promise.all([getLocale(), getDictionary()]);
  // Only the first picture: the next ones are mostly other colours, which would read as a recolour.
  const [front] = product.images.nodes;
  const colours = product.options.find((option) => option.name === "Color")?.optionValues.length;
  // A sold-out piece says so; one that can be bought says why it's featured, if it is.
  const reason = product.featured?.value;
  const label = product.availableForSale
    ? reason && (words.featured[reason] ?? reason)
    : words.soldOut;
  const sizes = double
    ? "(min-width: 1024px) 50vw, (min-width: 768px) 66vw, 100vw"
    : "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw";

  return (
    <li
      className={`${enterStep === undefined ? "rise rise-even" : "enter"} grid grid-rows-subgrid pb-8 ${double ? "col-span-2 row-span-4" : "row-span-2"}`}
      style={enterStep === undefined ? undefined : ({ "--enter-step": enterStep } as CSSProperties)}
    >
      <Link
        href={localePath(locale, `/products/${product.handle}`)}
        className="group row-span-full grid grid-rows-subgrid"
      >
        {/*
          A double picture keeps its 4:5 when nothing sits beside it, and stretches when tiles do.
          Stretched, it is taller than the photo, so the photo is fitted whole, not cropped at the sleeves,
          and the margins take the photo's own ground, so they blend into the field the same way.
        */}
        <div
          className={`relative aspect-[4/5] overflow-hidden ${double ? "row-span-3 place-self-stretch" : ""} ${fieldFor(index)}`}
        >
          {front && (
            <Image
              src={front.url}
              // The title is just below, inside the same link: an alt would say it a second time.
              alt=""
              fill
              sizes={sizes}
              loading={eager ? "eager" : "lazy"}
              className={`${double ? "object-contain bg-backdrop" : "object-cover"} mix-blend-multiply transition-transform duration-500 ease-out-expo group-hover:scale-[1.04]`}
            />
          )}
          {label && (
            <p
              className={`absolute top-3 left-3 px-2 py-1 text-small ${product.availableForSale ? "bg-ground" : "bg-ink text-ground"}`}
            >
              {label}
            </p>
          )}
        </div>
        <div className="pt-3">
          <Heading className="font-medium underline-offset-4 group-hover:underline">
            {product.title}
          </Heading>
          <Price
            price={product.priceRange.minVariantPrice}
            compareAt={product.compareAtPriceRange.maxVariantPrice}
            className="tabular-nums"
          />
          {/* The colour count holds on to the fabric's last word, so it never wraps alone. */}
          <p className="mt-1 text-small text-pretty text-muted">
            {product.fabric?.value}
            {colours && colours > 1
              ? `\u00a0·\u00a0${formatPlural(locale, words.colours, colours).replace(" ", "\u00a0")}`
              : null}
          </p>
        </div>
      </Link>
    </li>
  );
}

/**
 * A tile's field and the room for its caption, with no product on it yet. It takes the tile's place
 * in the grid, so a list that is still loading holds the space its tiles will fill.
 */
export function TilePlaceholder({ index, double = false }: { index: number; double?: boolean }) {
  return (
    <li
      className={`grid grid-rows-subgrid pb-8 ${double ? "col-span-2 row-span-4" : "row-span-2"}`}
    >
      <div
        className={`aspect-[4/5] ${double ? "row-span-3 place-self-stretch" : ""} ${fieldFor(index)}`}
      />
      {/* The caption's lines: name, price and fabric. */}
      <div className="pt-3">
        <div className="h-lh" />
        <div className="h-lh" />
        <div className="mt-1 h-lh text-small" />
      </div>
    </li>
  );
}
