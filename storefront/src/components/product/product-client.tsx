"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import type { ProductQuery } from "../../../generated/storefront.generated";
import { format } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-context";
import { addToCart } from "@/lib/cart/actions";
import {
  isValueAvailable,
  orderGallery,
  resolveSelection,
  selectedVariant,
  selectionToParams,
  type Selection,
} from "@/lib/product/variants";
import { cropSquare } from "@/lib/shopify/image-loader";
import { useCart } from "../cart/cart-context";
import { fieldFor } from "../fields";

export type Product = NonNullable<ProductQuery["product"]>;
type Picture = Product["images"]["nodes"][number];

const COLOR = "Color";

// Where a colour swatch looks on its variant's photo, as fractions of the photo. It sits right of
// the centre line, where zips, buttons and drawstrings run, and fits inside the leg of a sock, as a
// pair of socks leaves the backdrop showing at the centre. The seed's placeholder test keeps every
// garment's fabric here.
const SWATCH = { x: 0.615, y: 0.47, side: 0.125 };

/** The selection lives in the URL, so a link to a colour and size opens on that variant. */
function useSelection(product: Product): [Selection, (name: string, value: string) => void] {
  const params = useSearchParams();
  const selection = resolveSelection(product.options, product.variants.nodes, params);

  function select(name: string, value: string) {
    const next = selectionToParams({ ...selection, [name]: value });
    // Next.js keeps useSearchParams in sync with the History API, with no server round trip.
    window.history.replaceState(null, "", `?${next}`);
  }

  return [selection, select];
}

export function Gallery({ product }: { product: Product }) {
  const [selection] = useSelection(product);
  return <GalleryView product={product} color={selection[COLOR]} />;
}

/** The chosen colour's picture leads, the rest follow in the store's order. */
export function GalleryView({ product, color }: { product: Product; color: string | undefined }) {
  const words = useI18n().dictionary.product;
  const variants = product.variants.nodes;
  const images = orderGallery(product.images.nodes, variants, COLOR, color);
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

export function Purchase({ product }: { product: Product }) {
  const [selection, select] = useSelection(product);
  return <PurchaseView product={product} selection={selection} onSelect={select} />;
}

/** Without onSelect it renders read-only, as the static stand-in until the URL is known. */
export function PurchaseView({
  product,
  selection,
  onSelect,
}: {
  product: Product;
  selection: Selection;
  onSelect?: (name: string, value: string) => void;
}) {
  const { open } = useCart();
  const { locale, dictionary } = useI18n();
  const words = dictionary.product;
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const sizes = useRef<HTMLFieldSetElement>(null);

  const variants = product.variants.nodes;
  const variant = selectedVariant(variants, product.options, selection);
  const soldOut = !product.availableForSale || (variant && !variant.availableForSale);

  // A new choice makes the last notice ("Choose a size first.") out of date.
  const select =
    onSelect &&
    ((name: string, value: string) => {
      setNotice(null);
      onSelect(name, value);
    });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    if (!variant) {
      setNotice(words.chooseSize);
      sizes.current?.querySelector("input")?.focus();
      return;
    }
    setNotice(null);
    startTransition(async () => {
      const result = await addToCart(variant.id, locale);
      setNotice(result.notice);
      if (result.ok) open();
    });
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-8">
      {product.options.map((option) => (
        <fieldset
          key={option.name}
          ref={option.name === COLOR ? undefined : sizes}
          disabled={!onSelect}
        >
          <legend className="mb-3">
            {words.options[option.name] ?? option.name}
            {selection[option.name] && (
              <span className="text-muted">: {selection[option.name]}</span>
            )}
          </legend>
          <div className="flex flex-wrap gap-2">
            {option.optionValues.map((value) => {
              const available = isValueAvailable(
                variants,
                product.options,
                selection,
                option.name,
                value.name,
              );
              return (
                <OptionValue
                  key={value.name}
                  name={option.name}
                  value={value.name}
                  checked={selection[option.name] === value.name}
                  available={available}
                  soldOutLabel={words.soldOutOption}
                  picture={
                    option.name === COLOR
                      ? variants.find((v) =>
                          v.selectedOptions.some((o) => o.name === COLOR && o.value === value.name),
                        )?.image
                      : undefined
                  }
                  onSelect={select}
                />
              );
            })}
          </div>
        </fieldset>
      ))}

      <div>
        <button
          type="submit"
          // Only marked busy while adding: a disabled button drops focus, and the bag would have
          // nowhere to hand it back to when it closes.
          disabled={!onSelect || soldOut}
          aria-disabled={isPending || undefined}
          className="w-full bg-accent px-6 py-4 font-medium text-accent-ink transition hover:bg-accent-strong active:scale-[0.98] disabled:bg-surface disabled:text-muted"
        >
          {soldOut ? words.soldOut : isPending ? words.adding : words.addToBag}
        </button>
        <p role="status" className="mt-3 min-h-[1.5em]">
          {notice}
        </p>
      </div>
    </form>
  );
}

function OptionValue({
  name,
  value,
  checked,
  available,
  soldOutLabel,
  picture,
  onSelect,
}: {
  name: string;
  value: string;
  checked: boolean;
  available: boolean;
  soldOutLabel: string;
  picture?: Picture | null;
  onSelect?: (name: string, value: string) => void;
}) {
  const input = (
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={() => onSelect?.(name, value)}
      className="peer sr-only"
    />
  );
  const status = available ? null : <span className="sr-only"> {soldOutLabel}</span>;

  if (picture) {
    // A colour swatch is a close-up of its own garment, so it shows the fabric as well as the colour.
    return (
      <label className="cursor-pointer">
        {input}
        <span className="relative block size-12 overflow-hidden bg-oatmeal outline-offset-2 peer-checked:outline-2 peer-checked:outline-ink peer-focus-visible:outline-3 peer-focus-visible:outline-accent">
          <Image
            src={cropSquare(picture, SWATCH.x, SWATCH.y, SWATCH.side)}
            alt=""
            fill
            sizes="48px"
            className={`object-cover mix-blend-multiply ${available ? "" : "opacity-40"}`}
          />
        </span>
        <span className="sr-only">
          {value}
          {status}
        </span>
      </label>
    );
  }

  return (
    <label className="cursor-pointer">
      {input}
      {/* A sold-out size keeps its field on hover: grey on stone would fall below 4.5:1. */}
      <span
        className={`grid h-12 min-w-14 place-items-center bg-surface px-3 transition-colors peer-checked:bg-ink peer-checked:text-ground peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-checked:hover:bg-ink ${available ? "hover:bg-stone" : "text-muted line-through"}`}
      >
        {value}
        {status}
      </span>
    </label>
  );
}
