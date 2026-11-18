import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { products } from "../catalog/products.ts";
import { drawGarment, HEIGHT, paintGarment, placeGarment, WIDTH } from "../scripts/garments.ts";
import { encodePng, crc32 } from "../scripts/png.ts";
import { addSpan, blur, Canvas, crossingsAt, Mask } from "../scripts/raster.ts";
import { noise, surface } from "../scripts/texture.ts";

describe("encodePng", () => {
  it("writes a valid PNG that decodes back to the same pixels", () => {
    const rgb = Uint8Array.from([255, 0, 0, 0, 255, 0, 0, 0, 255, 10, 20, 30]);
    const png = encodePng(2, 2, rgb);

    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(png.readUInt32BE(16)).toBe(2);
    expect(png.readUInt32BE(20)).toBe(2);

    const idatLength = png.readUInt32BE(33);
    const raw = inflateSync(png.subarray(41, 41 + idatLength));
    // Each row has a filter byte in front.
    expect([...raw]).toEqual([0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 255, 10, 20, 30]);
  });

  it("uses the standard CRC-32", () => {
    expect(crc32(Buffer.from("IEND"))).toBe(0xae426082);
  });
});

describe("raster", () => {
  it("finds where a square crosses a line", () => {
    const square = [
      [1, 1],
      [3, 1],
      [3, 3],
      [1, 3],
    ] as const;
    expect(crossingsAt(square, 2)).toEqual([1, 3]);
    expect(crossingsAt(square, 5)).toEqual([]);
  });

  it("gives partial coverage to pixels at span edges", () => {
    const coverage = new Float32Array(4);
    addSpan(coverage, 0.5, 2.25, 1);
    expect([...coverage]).toEqual([0.5, 1, 0.25, 0]);
  });

  it("fills covered pixels and blends edge pixels", () => {
    const canvas = new Canvas(2, 1, [0, 0, 0]);
    canvas.fill(
      [
        [0, 0],
        [1.5, 0],
        [1.5, 1],
        [0, 1],
      ],
      [200, 100, 50],
    );
    expect([...canvas.toRgb()]).toEqual([200, 100, 50, 100, 50, 25]);
  });
});

describe("Canvas.shade", () => {
  it("darkens towards black and lightens towards white by the offset", () => {
    const canvas = new Canvas(2, 1, [100, 100, 100]);
    canvas.shade(Float32Array.from([-0.5, 0.5]));
    expect([...canvas.toRgb()]).toEqual([50, 50, 50, 178, 178, 178]);
  });
});

describe("Mask", () => {
  it("keeps the stronger value where shapes overlap", () => {
    const mask = new Mask(3, 1);
    const square = (x1: number, x2: number) =>
      [
        [x1, 0],
        [x2, 0],
        [x2, 1],
        [x1, 1],
      ] as const;
    mask.fill(square(0, 2), 0.5);
    mask.fill(square(1, 3), 0.8);
    expect([...mask.data].map((v) => Math.round(v * 10) / 10)).toEqual([0.5, 0.8, 0.8]);
  });
});

describe("blur", () => {
  it("keeps a flat plane flat and spreads a point", () => {
    expect([...blur(new Float32Array(9).fill(0.5), 3, 3, 1)]).toEqual(Array(9).fill(0.5));
    const point = new Float32Array(25);
    point[12] = 1;
    const spread = blur(point, 5, 5, 1);
    expect(spread[12]).toBeLessThan(1);
    expect(spread[11]).toBeGreaterThan(0);
  });
});

describe("texture", () => {
  it("is repeatable, so unchanged products render to the same bytes", () => {
    expect(noise(3.7, 12.2)).toBe(noise(3.7, 12.2));
    expect(surface("fleece", 120, 340)).toBe(surface("fleece", 120, 340));
  });

  it("stays a small offset", () => {
    for (const texture of ["jersey", "slub", "fleece", "terry", "fine-knit", "rib-knit"] as const) {
      for (let x = 0; x < 200; x += 7) {
        expect(Math.abs(surface(texture, x, x * 1.3))).toBeLessThan(0.1);
      }
    }
  });
});

describe("drawGarment", () => {
  const widthOf = (look: Parameters<typeof drawGarment>[0]) => {
    const rgb = paintGarment(drawGarment(look, "front"), "#1C1C1C");
    // The widest dark run across the image, which is the sleeves.
    let widest = 0;
    for (let y = 0; y < HEIGHT; y += 10) {
      const row = Array.from({ length: WIDTH }, (_, x) => rgb[(y * WIDTH + x) * 3] as number);
      const dark = row.flatMap((v, x) => (v < 120 ? [x] : []));
      if (dark.length > 0) widest = Math.max(widest, (dark.at(-1) as number) - (dark[0] as number));
    }
    return widest;
  };

  it("paints the garment in its color on the store's background", () => {
    const rgb = paintGarment(
      drawGarment({ garment: "sweater", fit: "regular", texture: "fine-knit" }, "front"),
      "#B98A5A",
    );
    expect([...rgb.subarray(0, 3)]).toEqual([0xec, 0xe9, 0xe4]);

    const center = ((HEIGHT / 2) * WIDTH + WIDTH / 2) * 3;
    const [r, g, b] = rgb.subarray(center, center + 3);
    expect(Math.abs((r as number) - 0xb9)).toBeLessThan(16);
    expect(Math.abs((g as number) - 0x8a)).toBeLessThan(16);
    expect(Math.abs((b as number) - 0x5a)).toBeLessThan(16);
  });

  it("draws a boxy tee wider than a regular one", () => {
    expect(widthOf({ garment: "tee", fit: "boxy", texture: "jersey" })).toBeGreaterThan(
      widthOf({ garment: "tee", fit: "regular", texture: "jersey" }) + 40,
    );
  });

  // The product page's colour swatch is this square of the photo (SWATCH in the storefront's
  // components/product/purchase.tsx), so a redrawn garment mustn't leave the backdrop showing there.
  it("keeps fabric where the colour swatch looks", () => {
    const side = WIDTH * 0.125;
    const [left, top] = [WIDTH * 0.615 - side / 2, HEIGHT * 0.47 - side / 2];
    for (const product of products) {
      const mask = new Mask(WIDTH, HEIGHT);
      for (const layer of placeGarment(product, "front").layers) {
        if (layer.piece) mask.fill(layer.shape);
      }
      let bare = 0;
      for (let y = Math.floor(top); y < top + side; y++) {
        for (let x = Math.floor(left); x < left + side; x++) {
          if ((mask.data[y * WIDTH + x] as number) < 0.99) bare++;
        }
      }
      expect(bare, product.handle).toBe(0);
    }
  });
});
