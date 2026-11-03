import type { Metadata } from "next";
import { Catalogue } from "@/components/catalogue";
import { ColourFinder } from "@/components/home/colour-finder";
import { Hero } from "@/components/home/hero";
import { Mosaic } from "@/components/home/mosaic";
import { formatPlural } from "@/i18n/format";
import { alternates, openGraph } from "@/i18n/metadata";
import { getDictionary, getLocale } from "@/i18n/server";
import { groupByColour } from "@/lib/product/colours";
import { getColourIndex, getCollections, getProducts } from "@/lib/shopify/catalog";

const COLOURS_SHOWN = 6;

export async function generateMetadata(): Promise<Metadata> {
  const [locale, { meta }] = await Promise.all([getLocale(), getDictionary()]);
  return {
    alternates: alternates(locale),
    openGraph: { ...openGraph(locale), title: meta.title, description: meta.description },
  };
}

export default async function Home() {
  const [products, collections, colourIndex, locale, { home }] = await Promise.all([
    getProducts(),
    getCollections(),
    getColourIndex(),
    getLocale(),
    getDictionary(),
  ]);

  const images = products.flatMap((product) => product.images.nodes);
  // The seed names files <handle>-<colour>-<view>; alt text is translated, file names are not.
  const backViews = images.filter((image) => /-back\.\w+$/.test(new URL(image.url).pathname));
  const mosaicPictures = [backViews[0] ?? images[0], backViews[1] ?? images[1]] as const;

  return (
    <>
      <Hero collections={collections} />

      <section id="catalogue" aria-labelledby="catalogue-title" className="px-gutter pt-section">
        {/* Laid out like a collection's heading: the lead starts on the grid's third column. */}
        <div className="mb-10 grid gap-4 lg:grid-cols-12 lg:items-start lg:gap-2">
          <h2 id="catalogue-title" className="rise text-head font-medium lg:col-span-6 lg:trim-cap">
            {formatPlural(locale, home.catalogueTitle, products.length)}
          </h2>
          <p className="rise max-w-[40ch] text-pretty lg:col-span-6 lg:col-start-7 lg:trim-cap">
            {home.catalogueLead}
          </p>
        </div>
        {/* Under the hero: on a phone its first tiles would take the bandwidth the photo needs. */}
        <Catalogue products={products} belowTheFold />
      </section>

      <ColourFinder colours={groupByColour(colourIndex).slice(0, COLOURS_SHOWN)} />

      {mosaicPictures[0] && mosaicPictures[1] && (
        <Mosaic pictures={[mosaicPictures[0], mosaicPictures[1]]} />
      )}
    </>
  );
}
