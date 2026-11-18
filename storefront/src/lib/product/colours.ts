import { COLOR_OPTION, optionValue, slugify, type SelectedOption } from "./variants";

interface ColourSource<I> {
  handle: string;
  title: string;
  variants: {
    nodes: readonly {
      availableForSale: boolean;
      selectedOptions: readonly SelectedOption[];
      image?: I | null;
    }[];
  };
}

export interface ColourEntry<I> {
  name: string;
  slug: string;
  /** Products that have this colour in stock in at least one size, with its picture. */
  products: { handle: string; title: string; image: I }[];
}

/** Every in-stock colour across the catalogue, the ones shared by most products first. */
export function groupByColour<I>(
  products: readonly ColourSource<I>[],
  optionName = COLOR_OPTION,
): ColourEntry<I>[] {
  const byName = new Map<string, ColourEntry<I>>();

  for (const product of products) {
    const seen = new Set<string>();
    for (const variant of product.variants.nodes) {
      const name = optionValue(variant, optionName);
      if (!name || seen.has(name) || !variant.availableForSale || !variant.image) continue;
      seen.add(name);

      const entry = byName.get(name) ?? { name, slug: slugify(name), products: [] };
      entry.products.push({ handle: product.handle, title: product.title, image: variant.image });
      byName.set(name, entry);
    }
  }

  // Array.prototype.sort is stable, so ties keep the catalogue's order.
  return [...byName.values()].sort((a, b) => b.products.length - a.products.length);
}
