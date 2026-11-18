import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/button";
import { MessagePage } from "@/components/message-page";
import { collectionPath, localePath } from "@/i18n/locales";
import { getDictionary, getLocale } from "@/i18n/server";
import { ALL_COLLECTION } from "@/lib/shopify/catalog";

/** The tab says the page is missing, not the home page's title. */
export async function generateMetadata(): Promise<Metadata> {
  const { notFound } = await getDictionary();
  return { title: notFound.title };
}

export default async function NotFound() {
  const [locale, { notFound }] = await Promise.all([getLocale(), getDictionary()]);
  return (
    <MessagePage title={notFound.title} body={notFound.body}>
      <Link
        href={localePath(locale, collectionPath(ALL_COLLECTION))}
        className={`${buttonClass()} px-6 py-3`}
      >
        {notFound.back}
      </Link>
    </MessagePage>
  );
}
