import Image from "next/image";
import Link from "next/link";
import type { CollectionsQuery } from "../../../generated/storefront.generated";
import { format } from "@/i18n/format";
import { localePath } from "@/i18n/locales";
import { getDictionary, getLocale } from "@/i18n/server";
import { formatMoney, lowestPrice } from "@/lib/money";
import mistyHills from "./misty-hills.webp";

type Collection = CollectionsQuery["collections"]["nodes"][number];

interface HeroProps {
  collections: readonly Collection[];
}

/** Who took the hero photo, for the credit in the footer. */
export const HERO_PHOTO_CREDIT = {
  author: "Francesco Gallarotti",
  url: "https://unsplash.com/photos/-HkuuUSY1pE",
};

/** A quiet landscape under one panel that says what the store is. */
export async function Hero({ collections }: HeroProps) {
  const [locale, dictionary] = await Promise.all([getLocale(), getDictionary()]);
  const { home } = dictionary;

  return (
    <section aria-labelledby="hero-title" className="flex flex-col md:relative">
      {/* The oatmeal field stands in for the mist until the photo arrives. */}
      <div
        aria-hidden="true"
        className="relative h-[62svh] bg-oatmeal md:h-[max(38rem,100svh-4.5rem)]"
      >
        {/*
          A soft photo, 43 KB at 2560 px, so it ships as one file. The loader only resizes
          Shopify's images, and unoptimized says so instead of a srcset of identical URLs.
          It is the home page's LCP. With `preload` the HTML carried neither a preload nor a
          priority for it, so phones fetched it at low priority behind the scripts.
        */}
        <Image
          src={mistyHills}
          alt=""
          fill
          loading="eager"
          fetchPriority="high"
          unoptimized
          className="object-cover"
        />
      </div>

      <div className="grid gap-x-8 gap-y-5 bg-ink p-5 text-ground md:absolute md:bottom-6 md:left-1/2 md:w-[min(64rem,calc(100%-2*var(--spacing-gutter)))] md:-translate-x-1/2 md:grid-cols-[1fr_auto] md:items-end md:p-8">
        <h1 id="hero-title" className="text-title font-medium text-balance md:col-span-2">
          {home.heroTitle}
        </h1>
        <p className="max-w-[36ch] text-lead text-pretty">{home.heroLead}</p>
        <Link
          href="#catalogue"
          className="bg-ground px-6 py-3 text-center font-medium text-ink transition-colors hover:bg-ecru active:scale-[0.98]"
        >
          {dictionary.shopTheBasics}
        </Link>
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-small md:col-span-2">
          {collections.map((collection) => {
            const from = lowestPrice(
              collection.products.nodes.map((product) => product.priceRange.minVariantPrice),
            );
            return (
              <li key={collection.handle}>
                <Link
                  href={localePath(locale, `/collections/${collection.handle}`)}
                  className="underline-offset-4 hover:underline"
                >
                  {from
                    ? format(home.collectionFrom, {
                        collection: collection.title,
                        price: formatMoney(from),
                      })
                    : collection.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
