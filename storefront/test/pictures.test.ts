import { describe, expect, it } from "vitest";
import { pickPair, viewOf } from "../src/lib/product/pictures";

const picture = (file: string) => ({ url: `https://cdn.shopify.com/s/files/1/0/${file}?v=1` });

describe("viewOf", () => {
  it("reads the view from the end of the file name", () => {
    expect(viewOf(picture("tee-heather-grey-back.png").url)).toBe("back");
    expect(viewOf(picture("tee-black-front.webp").url)).toBe("front");
  });
});

describe("pickPair", () => {
  it("takes the first two pictures of the view", () => {
    const images = ["a-front.png", "a-back.png", "b-front.png", "b-back.png", "c-back.png"].map(
      picture,
    );
    expect(pickPair(images, "back")).toEqual([images[1], images[3]]);
  });

  it("tops up with the other pictures when the view is short", () => {
    const images = ["a-front.png", "b-front.png", "b-back.png"].map(picture);
    expect(pickPair(images, "back")).toEqual([images[2], images[0]]);
    expect(pickPair(images, "side")).toEqual([images[0], images[1]]);
  });

  it("never picks the same picture twice", () => {
    const images = ["a-front.png", "b-back.png"].map(picture);
    expect(pickPair(images, "back")).toEqual([images[1], images[0]]);
  });

  it("gives nothing without two pictures", () => {
    expect(pickPair([picture("a-front.png")], "back")).toBeUndefined();
    expect(pickPair([], "back")).toBeUndefined();
  });
});
