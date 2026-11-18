import { describe, expect, it } from "vitest";
import { formatMoney, isOnSale, lowestPrice, scaleTotal, sumMoney } from "../src/lib/money";
import shopifyImageLoader from "../src/lib/shopify/image-loader";

const pln = (amount: string) => ({ amount, currencyCode: "PLN" });

// Intl separates the number and the currency with a no-break space.
const normalise = (text: string) => text.replace(/\s/g, " ");

describe("formatMoney", () => {
  it("drops the decimals of a whole amount", () => {
    expect(normalise(formatMoney(pln("79.00")))).toBe("79 zł");
  });

  it("keeps cents when there are some", () => {
    expect(normalise(formatMoney(pln("79.5")))).toBe("79,50 zł");
  });
});

describe("isOnSale", () => {
  it("needs a compare-at price above the price", () => {
    expect(isOnSale(pln("149.00"), pln("179.00"))).toBe(true);
    expect(isOnSale(pln("149.00"), pln("149.00"))).toBe(false);
    expect(isOnSale(pln("149.00"), null)).toBe(false);
  });
});

describe("lowestPrice", () => {
  it("picks the smallest amount", () => {
    expect(lowestPrice([pln("249.00"), pln("79.00"), pln("119.00")])).toEqual(pln("79.00"));
    expect(lowestPrice([])).toBeUndefined();
  });
});

describe("scaleTotal", () => {
  it("prices a line at its new quantity", () => {
    expect(scaleTotal(pln("239.97"), 3, 2)).toEqual(pln("159.98"));
    expect(scaleTotal(pln("79.00"), 1, 4)).toEqual(pln("316.00"));
    expect(scaleTotal(pln("79.00"), 1, 0)).toEqual(pln("0.00"));
  });
});

describe("sumMoney", () => {
  it("adds amounts without float drift", () => {
    // 0.1 + 0.2 in floats is 0.30000000000000004.
    expect(sumMoney([pln("0.10"), pln("0.20")], "PLN")).toEqual(pln("0.30"));
    expect(sumMoney([pln("159.98"), pln("79.00")], "PLN")).toEqual(pln("238.98"));
    expect(sumMoney([], "PLN")).toEqual(pln("0.00"));
  });
});

describe("shopifyImageLoader", () => {
  it("asks Shopify's CDN for the width next/image wants", () => {
    const src = "https://cdn.shopify.com/s/files/1/0/tee.png?v=1";
    expect(shopifyImageLoader({ src, width: 640 })).toBe(
      "https://cdn.shopify.com/s/files/1/0/tee.png?v=1&width=640",
    );
  });

  it("leaves other URLs alone", () => {
    expect(shopifyImageLoader({ src: "/icon.png", width: 64 })).toBe("/icon.png");
  });
});
