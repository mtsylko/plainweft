import { describe, expect, it } from "vitest";
import { parseList, productJsonLd } from "../src/lib/product/details";

describe("parseList", () => {
  it("reads a JSON list of strings", () => {
    expect(parseList('["Wash at 30°C","Dry flat"]')).toEqual(["Wash at 30°C", "Dry flat"]);
  });

  it("keeps only the strings", () => {
    expect(parseList('["Dry flat", 3, null]')).toEqual(["Dry flat"]);
  });

  it("reads anything else as no list", () => {
    expect(parseList(null)).toEqual([]);
    expect(parseList("")).toEqual([]);
    expect(parseList("not json")).toEqual([]);
    expect(parseList('{"a":1}')).toEqual([]);
  });
});

describe("productJsonLd", () => {
  const product = {
    title: "Heavy tee",
    description: "Cotton, </script><script>alert(1)",
    images: { nodes: [{ url: "https://cdn.shopify.com/tee.png" }] },
    variants: {
      nodes: [
        { sku: "TEE-M", availableForSale: true, price: { amount: "79.0", currencyCode: "PLN" } },
        { sku: "TEE-L", availableForSale: false, price: { amount: "79.0", currencyCode: "PLN" } },
      ],
    },
  };

  it("describes the product with an offer per variant", () => {
    const data = JSON.parse(productJsonLd(product));
    expect(data).toMatchObject({
      "@type": "Product",
      name: "Heavy tee",
      brand: { name: "Plainweft" },
      image: ["https://cdn.shopify.com/tee.png"],
    });
    expect(data.offers).toEqual([
      expect.objectContaining({ sku: "TEE-M", availability: "https://schema.org/InStock" }),
      expect.objectContaining({ sku: "TEE-L", availability: "https://schema.org/OutOfStock" }),
    ]);
  });

  it("can't close its script tag", () => {
    expect(productJsonLd(product)).not.toContain("</script>");
    expect(JSON.parse(productJsonLd(product)).description).toBe(product.description);
  });
});
