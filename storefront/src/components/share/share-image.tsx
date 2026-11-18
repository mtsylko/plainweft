import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import { STORE_NAME } from "@/lib/site";
import { themeColours } from "@/lib/theme";

/** The size Open Graph and X both show whole. */
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };

/** The catalogue grid's gap. */
const GAP = 8;
/** Two rows of 4:5 pictures fill the height, so the tiles keep the catalogue's proportions. */
const TILE_HEIGHT = (SHARE_IMAGE_SIZE.height - GAP * 3) / 2;
const TILE_WIDTH = Math.round((TILE_HEIGHT * 4) / 5);
const TILES = 4;
/** Twice a tile's width, so the picture stays sharp when a network shows the image larger. */
const PICTURE_WIDTH = 480;
const FONT_STYLESHEET = "https://api.fontshare.com/v2/css?f[]=roundo@500&display=swap";

// Read once, when the module loads: a file read inside the handler would make it dynamic.
const COLOURS = themeColours(await readFile(join(process.cwd(), "src/app/globals.css"), "utf8"));

interface ShareImageProps {
  title: string;
  caption: string;
  /** The products to pick pictures from, in the collection's order. */
  products: ReadonlyArray<{
    availableForSale: boolean;
    featured?: { value: string } | null;
    featuredImage?: { url: string } | null;
  }>;
}

/**
 * A page's shared image, drawn like the catalogue: the name on the putty ground, and products
 * alone on tiles beside it.
 */
export async function shareImage({ title, caption, products }: ShareImageProps) {
  // What can be bought comes first, and of that, what the merchandiser featured, as in the grid.
  const urls = products
    .toSorted(
      (a, b) =>
        Number(b.availableForSale) - Number(a.availableForSale) ||
        Number(Boolean(b.featured)) - Number(Boolean(a.featured)),
    )
    .flatMap((product) => product.featuredImage?.url ?? [])
    .slice(0, TILES);
  const [font, pictures] = await Promise.all([
    loadFont().catch((error: unknown) => {
      // The default font is a fair stand-in: a missing image would be worse.
      console.error("share-image.font.failed", error);
      return null;
    }),
    Promise.all(
      urls.map((url) =>
        loadPicture(url).catch((error: unknown) => {
          console.error("share-image.picture.failed", error);
          return null;
        }),
      ),
    ),
  ]);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        gap: GAP,
        padding: GAP,
        backgroundColor: COLOURS.ground,
        color: COLOURS.ink,
        fontFamily: "Roundo",
      }}
    >
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "36px 40px",
        }}
      >
        <div style={{ fontSize: 40, letterSpacing: -0.5 }}>{STORE_NAME}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, lineHeight: 1, letterSpacing: -2.3 }}>{title}</div>
          <div style={{ fontSize: 32, color: COLOURS.muted }}>{caption}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", width: TILE_WIDTH * 2 + GAP, gap: GAP }}>
        {Array.from({ length: TILES }, (_, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              width: TILE_WIDTH,
              height: TILE_HEIGHT,
              // Satori can't multiply a picture into a coloured field, as the site does, so the
              // tile takes the pictures' own backdrop instead.
              backgroundColor: COLOURS.backdrop,
            }}
          >
            {pictures[index] && (
              // Satori draws plain images; next/image is for pages.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pictures[index]}
                alt=""
                width={TILE_WIDTH}
                height={TILE_HEIGHT}
                style={{ objectFit: "contain" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>,
    {
      ...SHARE_IMAGE_SIZE,
      // Without fonts of its own, ImageResponse falls back to its built-in one.
      ...(font && { fonts: [{ name: "Roundo", data: Buffer.from(font, "base64"), weight: 500 }] }),
    },
  );
}

/** Roundo from Fontshare, as TrueType: Satori can't read the WOFF2 the site loads. */
async function loadFont(): Promise<string> {
  "use cache";
  cacheLife("max");
  const stylesheet = await fetch(FONT_STYLESHEET).then((response) => response.text());
  const url = /url\('([^']+\.ttf)'\)/.exec(stylesheet)?.[1];
  if (!url) throw new Error("Fontshare's stylesheet has no TrueType file");
  // The stylesheet links its files without a scheme (//cdn.fontshare.com/…).
  return base64(await fetch(new URL(url, FONT_STYLESHEET)));
}

/**
 * A product picture as a data URL. Shopify gives a changed file a new URL (`?v=`), so a cached one
 * never goes stale.
 */
async function loadPicture(url: string): Promise<string> {
  "use cache";
  cacheLife("max");
  const src = new URL(url);
  src.searchParams.set("width", String(PICTURE_WIDTH));
  // Satori reads PNG and JPEG, not the WebP the CDN could pick otherwise.
  const response = await fetch(src, { headers: { accept: "image/png,image/jpeg" } });
  return `data:${response.headers.get("content-type") ?? "image/png"};base64,${await base64(response)}`;
}

async function base64(response: Response): Promise<string> {
  if (!response.ok) throw new Error(`${response.url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer()).toString("base64");
}
