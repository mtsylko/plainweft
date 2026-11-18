import Link from "next/link";
import { localePath } from "@/i18n/locales";
import { getDictionary, getLocale } from "@/i18n/server";
import { STORE_NAME } from "@/lib/site";
import { CartButton } from "./cart/cart-button";
import { CollectionLinks } from "./collection-links";
import { SearchIcon } from "./icons";
import { LocaleSwitcher } from "./locale-switcher";

export async function Header() {
  const [locale, { layout }] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <header className="z-20 flex flex-wrap items-center justify-between gap-x-10 gap-y-3 bg-ground px-gutter py-4 md:sticky md:top-0">
      <Link href={localePath(locale)} className="text-lead font-semibold tracking-tight">
        {STORE_NAME}
      </Link>
      <nav
        aria-label={layout.collections}
        className="order-last w-full md:order-none md:mr-auto md:w-auto"
      >
        <CollectionLinks className="flex flex-wrap gap-x-6" />
      </nav>
      <div className="flex items-center gap-6">
        <Link
          href={localePath(locale, "/search")}
          className="font-medium underline-offset-4 hover:underline"
        >
          {/* A phone's first row only fits the logo, the languages and the bag beside a glass. */}
          <SearchIcon className="size-5 md:hidden" />
          <span className="sr-only md:not-sr-only">{layout.search}</span>
        </Link>
        <LocaleSwitcher />
        <CartButton />
      </div>
    </header>
  );
}
