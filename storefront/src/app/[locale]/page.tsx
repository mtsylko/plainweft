import type { Metadata } from "next";
import { Catalogue } from "@/components/catalogue";
import { ColourFinder } from "@/components/home/colour-finder";
import { Hero } from "@/components/home/hero";
import { Mosaic } from "@/components/home/mosaic";
import { PageIntro } from "@/components/page-intro";
import { formatPlural } from "@/i18n/format";
import { alternates, openGraph } from "@/i18n/metadata";
import { getDictionary, getLocale } from "@/i18n/server";
import { groupByColour } from "@/lib/product/colours";
import { pickPair } from "@/lib/product/pictures";
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

  // The tiles above show each product's first picture, so the mosaic shows backs.
  const mosaicPictures = pickPair(
    products.flatMap((product) => product.images.nodes),
    "back",
  );

  return (
    <>
      <Hero collections={collections} />

      <section id="catalogue" aria-labelledby="catalogue-title" className="px-gutter pt-section">
        <PageIntro
          section
          id="catalogue-title"
          title={formatPlural(locale, home.catalogueTitle, products.length)}
          lead={home.catalogueLead}
          className="mb-10"
        />
        <Catalogue products={products} />
      </section>

      <ColourFinder colours={groupByColour(colourIndex).slice(0, COLOURS_SHOWN)} />

      {mosaicPictures && <Mosaic pictures={mosaicPictures} />}
    </>
  );
}
