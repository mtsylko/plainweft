import { SHARE_IMAGE_SIZE, shareImage } from "@/components/share/share-image";
import { dictionaryFor } from "@/i18n/dictionaries";
import { formatPlural } from "@/i18n/format";
import { hasLocale } from "@/i18n/locales";
import { getCollectionPreview } from "@/lib/shopify/catalog";
import { STORE_NAME } from "@/lib/site";

interface Params {
  locale: string;
  handle: string;
}

export async function generateImageMetadata({ params }: { params: Params }) {
  const preview = hasLocale(params.locale)
    ? await getCollectionPreview(params.handle, params.locale)
    : null;
  return [
    {
      id: "card",
      alt: preview?.title ?? STORE_NAME,
      size: SHARE_IMAGE_SIZE,
      contentType: "image/png",
    },
  ];
}

export default async function Image({ params }: { params: Promise<Params> }) {
  const { locale, handle } = await params;
  const preview = hasLocale(locale) ? await getCollectionPreview(handle, locale) : null;
  if (!hasLocale(locale) || !preview) return new Response(null, { status: 404 });
  const products = preview.products.nodes;
  return shareImage({
    title: preview.title,
    caption: formatPlural(locale, dictionaryFor(locale).browse.results, products.length),
    products,
  });
}
