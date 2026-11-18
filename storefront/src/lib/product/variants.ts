export interface SelectedOption {
  name: string;
  value: string;
}

export interface VariantLike {
  id: string;
  availableForSale: boolean;
  selectedOptions: readonly SelectedOption[];
}

export interface OptionLike {
  name: string;
  optionValues: readonly { name: string }[];
}

/** The colour option's name. Option names stay English in Shopify; their labels come from the dictionary. */
export const COLOR_OPTION = "Color";

/** Option name to value, e.g. { Color: "Black", Size: "M" }. A missing key is not chosen yet. */
export type Selection = Readonly<Record<string, string>>;

/**
 * Options the shopper has to pick on purpose. A preselected size leads to wrong-size orders,
 * while a preselected color just shows the product.
 */
const CHOSEN_BY_SHOPPER = new Set(["size"]);

/**
 * URL-safe and readable in every language: "Złamana biel" becomes zlamana-biel. NFD splits letters
 * from their marks, all but ł, which is a letter of its own.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** The URL form of a selection: ?color=heather-grey&size=m. */
export function selectionToParams(selection: Selection): URLSearchParams {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(selection)) params.set(slugify(name), slugify(value));
  return params;
}

/**
 * Reads a selection from the URL, falling back to defaults. Values that don't belong to the
 * product are ignored, so a stale or edited link still shows a valid page.
 */
export function resolveSelection(
  options: readonly OptionLike[],
  variants: readonly VariantLike[],
  params: Pick<URLSearchParams, "get">,
): Selection {
  const fallback = defaultVariant(variants);
  const selection: Record<string, string> = {};

  for (const option of options) {
    const slug = params.get(slugify(option.name));
    const fromUrl = option.optionValues.find((value) => slugify(value.name) === slug)?.name;
    const preset =
      option.optionValues.length === 1
        ? option.optionValues[0]?.name
        : CHOSEN_BY_SHOPPER.has(option.name.toLowerCase())
          ? undefined
          : optionValue(fallback, option.name);

    const value = fromUrl ?? preset;
    if (value) selection[option.name] = value;
  }
  return selection;
}

/** The variant matching every option, or undefined while the shopper is still choosing. */
export function selectedVariant<V extends VariantLike>(
  variants: readonly V[],
  options: readonly OptionLike[],
  selection: Selection,
): V | undefined {
  if (options.some((option) => !selection[option.name])) return undefined;
  return variants.find((variant) =>
    variant.selectedOptions.every((option) => selection[option.name] === option.value),
  );
}

/**
 * Whether picking this value can lead to something in stock. Each option only looks at the
 * options before it: a color counts as available when any size is, and a size when it is
 * in stock for the chosen color.
 */
export function isValueAvailable(
  variants: readonly VariantLike[],
  options: readonly OptionLike[],
  selection: Selection,
  optionName: string,
  value: string,
): boolean {
  const index = options.findIndex((option) => option.name === optionName);
  const earlier = options.slice(0, Math.max(index, 0)).map((option) => option.name);

  return variants.some(
    (variant) =>
      variant.availableForSale &&
      optionValue(variant, optionName) === value &&
      earlier.every((name) => !selection[name] || optionValue(variant, name) === selection[name]),
  );
}

/** The first variant with this value, as the first black one: its picture shows that colour. */
export function variantWith<V extends VariantLike>(
  variants: readonly V[],
  optionName: string,
  value: string | undefined,
): V | undefined {
  if (!value) return undefined;
  return variants.find((variant) => optionValue(variant, optionName) === value);
}

/** Puts the images of the chosen color first, keeping the rest in their original order. */
export function orderGallery<I extends { url: string }>(
  images: readonly I[],
  variants: readonly (VariantLike & { image?: { url: string } | null })[],
  optionName: string,
  value: string | undefined,
): I[] {
  const url = variantWith(variants, optionName, value)?.image?.url;
  const first = images.find((image) => image.url === url);
  return first ? [first, ...images.filter((image) => image !== first)] : [...images];
}

function defaultVariant<V extends VariantLike>(variants: readonly V[]): V | undefined {
  return variants.find((variant) => variant.availableForSale) ?? variants[0];
}

/** The variant's value for one option, as "Black" for Color. */
export function optionValue(
  variant: Pick<VariantLike, "selectedOptions"> | undefined,
  optionName: string,
): string | undefined {
  return variant?.selectedOptions.find((option) => option.name === optionName)?.value;
}
