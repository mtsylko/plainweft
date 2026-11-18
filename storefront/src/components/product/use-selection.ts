import { useSearchParams } from "next/navigation";
import { resolveSelection, selectionToParams, type Selection } from "@/lib/product/variants";
import type { Product } from "@/lib/shopify/catalog";

/**
 * The shopper's colour and size. They live in the URL, so a link to a colour and size opens on that
 * variant. Reads useSearchParams: a component using it sits in Suspense.
 */
export function useSelection(product: Product): [Selection, (name: string, value: string) => void] {
  const params = useSearchParams();
  const selection = resolveSelection(product.options, product.variants.nodes, params);

  function select(name: string, value: string) {
    const next = selectionToParams({ ...selection, [name]: value });
    // Next.js keeps useSearchParams in sync with the History API, with no server round trip.
    window.history.replaceState(null, "", `?${next}`);
  }

  return [selection, select];
}
