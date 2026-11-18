"use client";

import Image from "next/image";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { useI18n } from "@/i18n/i18n-context";
import { addToCart } from "@/lib/cart/actions";
import {
  COLOR_OPTION,
  isValueAvailable,
  selectedVariant,
  variantWith,
  type Selection,
} from "@/lib/product/variants";
import type { Product } from "@/lib/shopify/catalog";
import { cropSquare } from "@/lib/shopify/image-loader";
import { buttonClass } from "../button";
import { useCart } from "../cart/cart-context";
import { ChoiceChip } from "../choice-chip";
import { useSelection } from "./use-selection";

type Picture = Product["images"]["nodes"][number];

// Where a colour swatch looks on its variant's photo, as fractions of the photo. It sits right of
// the centre line, where zips, buttons and drawstrings run, and fits inside the leg of a sock, as a
// pair of socks leaves the backdrop showing at the centre. The seed's placeholder test keeps every
// garment's fabric here.
const SWATCH = { x: 0.615, y: 0.47, side: 0.125 };

/** The options and the add-to-bag button, on the selection in the URL. */
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
          ref={option.name === COLOR_OPTION ? undefined : sizes}
          disabled={!onSelect}
        >
          <legend className="mb-3">
            {words.options[option.name] ?? option.name}
            {selection[option.name] && (
              <span className="text-muted">: {selection[option.name]}</span>
            )}
          </legend>
          <div className="flex flex-wrap gap-2">
            {option.optionValues.map((value) => (
              <OptionValue
                key={value.name}
                name={option.name}
                value={value.name}
                checked={selection[option.name] === value.name}
                available={isValueAvailable(
                  variants,
                  product.options,
                  selection,
                  option.name,
                  value.name,
                )}
                picture={
                  option.name === COLOR_OPTION
                    ? variantWith(variants, COLOR_OPTION, value.name)?.image
                    : undefined
                }
                onSelect={select}
              />
            ))}
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
          className={`${buttonClass("accent")} w-full px-6 py-4 disabled:bg-surface disabled:text-muted`}
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

/** One value of an option: a swatch cut from its garment's photo for a colour, a chip for a size. */
function OptionValue({
  name,
  value,
  checked,
  available,
  picture,
  onSelect,
}: {
  name: string;
  value: string;
  checked: boolean;
  available: boolean;
  picture?: Picture | null;
  onSelect?: (name: string, value: string) => void;
}) {
  const words = useI18n().dictionary.product;
  const status = available ? null : <span className="sr-only"> {words.soldOutOption}</span>;
  const onChange = () => onSelect?.(name, value);

  if (picture) {
    // A colour swatch is a close-up of its own garment, so it shows the fabric as well as the colour.
    return (
      <label className="cursor-pointer has-disabled:cursor-auto">
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span className="relative block size-12 overflow-hidden bg-oatmeal outline-offset-2 peer-checked:outline-2 peer-checked:outline-ink peer-focus-visible:focus-ring">
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
    <ChoiceChip
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      crossedOut={!available}
      className="grid min-w-14 place-items-center px-3"
    >
      {value}
      {status}
    </ChoiceChip>
  );
}
