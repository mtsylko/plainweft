import Image from "next/image";
import type { ReactNode } from "react";
import type { ImageFragment } from "../../../generated/storefront.generated";
import { getDictionary } from "@/i18n/server";

/**
 * What the garments are made of, as a board of unlike tiles. The copy restates the catalogue:
 * fabric weights, descriptions and care steps from seed/catalog/products.ts.
 */
export async function Mosaic({ pictures }: { pictures: readonly [ImageFragment, ImageFragment] }) {
  const [large, wide] = pictures;
  const { home } = await getDictionary();

  return (
    // Rows grow past 6rem when a tile's text needs it: Polish copy, a narrow laptop, or a reader's
    // own text spacing would otherwise cut the text off.
    <section
      aria-labelledby="mosaic-title"
      className="mt-section grid grid-cols-2 gap-1.5 px-gutter lg:grid-cols-12 lg:grid-rows-[repeat(8,minmax(6rem,auto))] lg:gap-2"
    >
      <h2
        id="mosaic-title"
        className="rise col-span-2 bg-surface p-6 text-head font-medium lg:col-span-6 lg:col-start-7 lg:row-span-3 lg:row-start-1"
      >
        {home.mosaicTitle}
      </h2>

      <Tile className="col-span-2 aspect-[4/5] overflow-hidden bg-oatmeal lg:col-span-6 lg:col-start-1 lg:row-span-5 lg:row-start-1 lg:aspect-auto">
        <Image
          src={large.url}
          alt={large.altText ?? ""}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover mix-blend-multiply"
        />
      </Tile>

      <Tile className="aspect-square bg-ink p-6 text-ground lg:col-span-3 lg:col-start-7 lg:row-span-2 lg:row-start-4 lg:aspect-auto">
        <p className="text-head font-medium tabular-nums">460 g/m²</p>
        <p className="mt-2 text-small">{home.heaviestFabric}</p>
      </Tile>

      <Tile className="aspect-square bg-sage p-6 lg:col-span-3 lg:col-start-10 lg:row-span-2 lg:row-start-4 lg:aspect-auto">
        <p className="md:text-lead">{home.preWashed}</p>
      </Tile>

      <Tile className="col-span-2 bg-ecru p-6 md:col-span-1 lg:col-span-3 lg:col-start-1 lg:row-span-3 lg:row-start-6">
        <p className="text-lead">{home.hoodies}</p>
      </Tile>

      <Tile className="col-span-2 bg-surface p-6 md:col-span-1 lg:col-span-3 lg:col-start-4 lg:row-span-3 lg:row-start-6">
        <h3 className="font-medium">{home.woolCareTitle}</h3>
        <ul className="mt-2">
          {home.woolCare.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </Tile>

      <Tile className="col-span-2 aspect-[16/10] overflow-hidden bg-stone lg:col-span-6 lg:col-start-7 lg:row-span-3 lg:row-start-6 lg:aspect-auto">
        <Image
          src={wide.url}
          alt={wide.altText ?? ""}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-[50%_35%] mix-blend-multiply"
        />
      </Tile>
    </section>
  );
}

/** A text tile stays unclipped, so a square one grows taller rather than cut its text off. */
function Tile({ className, children }: { className: string; children: ReactNode }) {
  return <div className={`rise relative ${className}`}>{children}</div>;
}
