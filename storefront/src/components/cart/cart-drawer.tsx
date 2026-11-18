"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Suspense,
  use,
  useEffect,
  useId,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { format } from "@/i18n/format";
import { useI18n } from "@/i18n/i18n-context";
import { localePath, productPath } from "@/i18n/locales";
import { setLineQuantity } from "@/lib/cart/actions";
import { formatMoney, scaleTotal, sumMoney } from "@/lib/money";
import { selectionToParams } from "@/lib/product/variants";
import type { CartLine } from "@/lib/shopify/cart";
import { buttonClass } from "../button";
import { useCart } from "./cart-context";

export function CartDrawer() {
  const { isOpen, close } = useCart();
  const { cart } = useI18n().dictionary;
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  // What the last change did, for screen readers. The region stays mounted, even when the bag
  // empties, so each new message is read out.
  const [announcement, setAnnouncement] = useState("");

  // A modal <dialog> traps focus, closes on Escape and makes the page behind it inert.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (isOpen && !element.open) element.showModal();
    if (!isOpen && element.open) element.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialog}
      onClose={() => {
        setAnnouncement("");
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      aria-labelledby={titleId}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-md bg-ground p-0 text-ink backdrop:bg-ink/40 open:flex"
    >
      <div className="flex w-full flex-col">
        <div className="flex items-baseline justify-between px-gutter pt-6 pb-4">
          {/* Focus lands here when the line that held it is removed. */}
          <h2
            ref={title}
            id={titleId}
            tabIndex={-1}
            className="text-lead font-medium focus-visible:outline-none"
          >
            {cart.title}
          </h2>
          <button type="button" onClick={close} className="underline-offset-4 hover:underline">
            {cart.close}
          </button>
        </div>
        {isOpen && (
          <Suspense fallback={<p className="px-gutter">{cart.loading}</p>}>
            <CartContents announce={setAnnouncement} onLineRemoved={() => title.current?.focus()} />
          </Suspense>
        )}
        <p role="status" className="sr-only">
          {announcement}
        </p>
      </div>
    </dialog>
  );
}

type QuantityChange = { lineId: string; quantity: number };

function CartContents({
  announce,
  onLineRemoved,
}: {
  /** Reads a change out to screen readers. */
  announce: (message: string) => void;
  /** Called before a line leaves, so focus can move off it first. */
  onLineRemoved: () => void;
}) {
  const { cartPromise, close } = useCart();
  const { locale, dictionary } = useI18n();
  const cart = use(cartPromise);
  const [lines, setOptimisticLines] = useOptimistic(
    cart?.lines.nodes ?? [],
    (current: CartLine[], change: QuantityChange) =>
      current
        .map((line) => (line.id === change.lineId ? withQuantity(line, change.quantity) : line))
        .filter((line) => line.quantity > 0),
  );
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  function changeQuantity(lineId: string, quantity: number) {
    const title = lines.find((line) => line.id === lineId)?.merchandise.product.title ?? "";
    setNotice(null);
    // The button that was pressed goes with its line; without a new place, focus falls to the page.
    if (quantity === 0) onLineRemoved();
    startTransition(async () => {
      setOptimisticLines({ lineId, quantity });
      const result = await setLineQuantity(lineId, quantity, locale);
      setNotice(result.notice);
      const done = quantity === 0 ? dictionary.cart.removed : dictionary.cart.quantityChanged;
      announce(result.notice ?? format(done, { title, quantity }));
    });
  }

  if (!cart || lines.length === 0) {
    return (
      <div className="px-gutter">
        <p>{dictionary.cart.empty}</p>
        <Link
          href={localePath(locale, "/#catalogue")}
          onClick={close}
          className={`${buttonClass()} mt-6 inline-block px-6 py-3`}
        >
          {dictionary.shopTheBasics}
        </Link>
      </div>
    );
  }

  // Added up from the lines, so it follows an optimistic change before Shopify's own arrives.
  const subtotal = sumMoney(
    lines.map((line) => line.cost.totalAmount),
    cart.cost.subtotalAmount.currencyCode,
  );

  return (
    <>
      <ul className="flex-1 overflow-y-auto px-gutter" aria-busy={isPending}>
        {lines.map((line) => (
          <CartLineItem key={line.id} line={line} onQuantity={changeQuantity} onNavigate={close} />
        ))}
      </ul>
      <div className="bg-surface px-gutter pt-5 pb-6">
        {/* Screen readers hear it from the bag's status line, so this one is only shown. */}
        {notice && <p className="mb-4">{notice}</p>}
        <dl className="flex items-baseline justify-between text-lead">
          <dt>{dictionary.cart.subtotal}</dt>
          <dd className={`tabular-nums ${isPending ? "opacity-50" : ""}`}>
            {formatMoney(subtotal)}
          </dd>
        </dl>
        <p className="mt-1 text-small text-muted">{dictionary.cart.taxesAtCheckout}</p>
        <a
          href={cart.checkoutUrl}
          aria-disabled={isPending}
          // pointer-events only stops the mouse; Enter would still follow the link.
          onClick={(event) => {
            if (isPending) event.preventDefault();
          }}
          className={`${buttonClass("accent")} mt-5 block px-6 py-4 text-center aria-disabled:pointer-events-none aria-disabled:opacity-60`}
        >
          {dictionary.cart.checkOut}
        </a>
      </div>
    </>
  );
}

function CartLineItem({
  line,
  onQuantity,
  onNavigate,
}: {
  line: CartLine;
  onQuantity: (lineId: string, quantity: number) => void;
  onNavigate: () => void;
}) {
  const { locale, dictionary } = useI18n();
  const words = dictionary.cart;
  const { product, image, selectedOptions } = line.merchandise;
  // The same slugs the product page reads, e.g. ?color=heather-grey&size=m.
  const params = selectionToParams(
    Object.fromEntries(selectedOptions.map((option) => [option.name, option.value])),
  );
  const label = selectedOptions.map((option) => option.value).join(" · ");

  return (
    <li className="flex gap-4 py-4">
      <div className="relative aspect-[4/5] w-24 shrink-0 bg-oatmeal">
        {image && (
          <Image
            src={image.url}
            alt=""
            fill
            sizes="96px"
            className="object-cover mix-blend-multiply"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-4">
          <Link
            href={localePath(locale, productPath(product.handle, params))}
            onClick={onNavigate}
            className="font-medium underline-offset-4 hover:underline"
          >
            {product.title}
          </Link>
          <p className="shrink-0 tabular-nums">{formatMoney(line.cost.totalAmount)}</p>
        </div>
        <p className="text-small text-muted">{label}</p>
        <div className="mt-auto flex items-center gap-1">
          <QuantityButton
            label={format(words.oneFewer, { title: product.title })}
            onClick={() => onQuantity(line.id, line.quantity - 1)}
          >
            −
          </QuantityButton>
          <span className="w-8 text-center tabular-nums">
            <span className="sr-only">{words.quantity} </span>
            {line.quantity}
          </span>
          <QuantityButton
            label={format(words.oneMore, { title: product.title })}
            onClick={() => onQuantity(line.id, line.quantity + 1)}
          >
            +
          </QuantityButton>
          <button
            type="button"
            onClick={() => onQuantity(line.id, 0)}
            className="ml-auto text-small text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            {words.remove}
          </button>
        </div>
      </div>
    </li>
  );
}

function QuantityButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="size-9 bg-surface text-lead leading-none transition-colors hover:bg-stone active:scale-95"
    >
      {children}
    </button>
  );
}

/** Scales the line total with the quantity, so an optimistic change shows the right price. */
function withQuantity(line: CartLine, quantity: number): CartLine {
  const totalAmount = scaleTotal(line.cost.totalAmount, line.quantity, quantity);
  return { ...line, quantity, cost: { ...line.cost, totalAmount } };
}
