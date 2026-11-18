import Link from "next/link";
import { collectionPath, localePath } from "@/i18n/locales";
import { getDictionary, getLocale } from "@/i18n/server";
import { ALL_COLLECTION, getCollections } from "@/lib/shopify/catalog";

/** Every product first, then each collection: what the header and the footer both list. */
export async function CollectionLinks({ className }: { className: string }) {
  const [collections, locale, { layout }] = await Promise.all([
    getCollections(),
    getLocale(),
    getDictionary(),
  ]);

  return (
    <ul className={className}>
      {[{ handle: ALL_COLLECTION, title: layout.allBasics }, ...collections].map((collection) => (
        <li key={collection.handle}>
          <Link
            href={localePath(locale, collectionPath(collection.handle))}
            className="underline-offset-4 hover:underline"
          >
            {collection.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
