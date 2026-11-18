import { describe, expect, it } from "vitest";
import {
  COLOR_OPTION,
  isValueAvailable,
  optionValue,
  orderGallery,
  resolveSelection,
  selectedVariant,
  selectionToParams,
  slugify,
  variantWith,
  type VariantLike,
} from "../src/lib/product/variants";

const options = [
  { name: "Color", optionValues: [{ name: "Heather Grey" }, { name: "Black" }] },
  { name: "Size", optionValues: [{ name: "S" }, { name: "M" }] },
];

function variant(color: string, size: string, availableForSale = true) {
  return {
    id: `${color}-${size}`,
    availableForSale,
    selectedOptions: [
      { name: "Color", value: color },
      { name: "Size", value: size },
    ],
    image: { url: `${color}.png` },
  };
}

// Heather Grey is sold out in every size, Black only in M.
const variants = [
  variant("Heather Grey", "S", false),
  variant("Heather Grey", "M", false),
  variant("Black", "S"),
  variant("Black", "M", false),
];

const params = (query: string) => new URLSearchParams(query);

describe("resolveSelection", () => {
  it("defaults the colour to the first one in stock and leaves the size to the shopper", () => {
    expect(resolveSelection(options, variants, params(""))).toEqual({ Color: "Black" });
  });

  it("reads slugged values from the URL", () => {
    expect(resolveSelection(options, variants, params("color=heather-grey&size=m"))).toEqual({
      Color: "Heather Grey",
      Size: "M",
    });
  });

  it("ignores values the product doesn't have", () => {
    expect(resolveSelection(options, variants, params("color=neon&size=xxl"))).toEqual({
      Color: "Black",
    });
  });

  it("preselects an option with a single value", () => {
    const oneSize = [options[0]!, { name: "Size", optionValues: [{ name: "One size" }] }];
    expect(resolveSelection(oneSize, variants, params(""))).toEqual({
      Color: "Black",
      Size: "One size",
    });
  });
});

describe("selectionToParams", () => {
  it("round-trips through resolveSelection", () => {
    const selection = { Color: "Heather Grey", Size: "S" };
    expect(resolveSelection(options, variants, selectionToParams(selection))).toEqual(selection);
  });
});

describe("slugify", () => {
  it("spells Polish colour names in plain letters", () => {
    expect(slugify("Złamana biel")).toBe("zlamana-biel");
    expect(slugify("Szary melanż")).toBe("szary-melanz");
    expect(slugify("Pudrowy błękit")).toBe("pudrowy-blekit");
  });

  it("keeps English names as they were", () => {
    expect(slugify("Off-White")).toBe("off-white");
    expect(slugify("Heather Grey")).toBe("heather-grey");
  });
});

describe("selectedVariant", () => {
  it("is undefined until every option is chosen", () => {
    expect(selectedVariant(variants, options, { Color: "Black" })).toBeUndefined();
  });

  it("finds the variant for a full selection", () => {
    expect(selectedVariant(variants, options, { Color: "Black", Size: "S" })?.id).toBe("Black-S");
  });
});

describe("isValueAvailable", () => {
  const check = (selection: Record<string, string>, option: string, value: string) =>
    isValueAvailable(variants, options, selection, option, value);

  it("treats a colour as available when any of its sizes is", () => {
    expect(check({ Size: "M" }, "Color", "Black")).toBe(true);
    expect(check({}, "Color", "Heather Grey")).toBe(false);
  });

  it("checks a size against the chosen colour", () => {
    expect(check({ Color: "Black" }, "Size", "S")).toBe(true);
    expect(check({ Color: "Black" }, "Size", "M")).toBe(false);
  });
});

describe("variantWith", () => {
  it("finds the first variant with the value", () => {
    expect(variantWith(variants, COLOR_OPTION, "Black")?.id).toBe("Black-S");
    expect(optionValue(variantWith(variants, "Size", "M"), COLOR_OPTION)).toBe("Heather Grey");
  });

  it("finds nothing for a value no variant has, or none at all", () => {
    expect(variantWith(variants, COLOR_OPTION, "Ecru")).toBeUndefined();
    expect(variantWith(variants, COLOR_OPTION, undefined)).toBeUndefined();
  });
});

describe("orderGallery", () => {
  const images = [{ url: "Heather Grey.png" }, { url: "Black.png" }, { url: "back.png" }];

  it("moves the chosen colour's picture to the front", () => {
    expect(orderGallery(images, variants, "Color", "Black").map((i) => i.url)).toEqual([
      "Black.png",
      "Heather Grey.png",
      "back.png",
    ]);
  });

  it("keeps the order when nothing matches", () => {
    const none: VariantLike[] = [];
    expect(orderGallery(images, none, "Color", "Black")).toEqual(images);
  });
});
