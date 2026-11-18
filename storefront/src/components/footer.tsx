import Link from "next/link";
import { format } from "@/i18n/format";
import { localePath } from "@/i18n/locales";
import { getDictionary, getLocale } from "@/i18n/server";
import { HERO_PHOTO_CREDIT, STORE_NAME } from "@/lib/site";
import { CollectionLinks } from "./collection-links";
import { ArrowUpRightIcon } from "./icons";

const REPOSITORY = "https://github.com/mtsylko/plainweft";

/** The close of the page: the last two rows of the specimen board. */
export async function Footer() {
  const [locale, dictionary] = await Promise.all([getLocale(), getDictionary()]);
  const { footer } = dictionary;

  return (
    <footer className="mt-section grid grid-cols-2 gap-2 p-2 lg:grid-cols-12">
      {/*
        The boxes set a least height, not a height: longer copy or a reader's own text spacing makes
        the row taller, instead of spilling over the box below.
      */}
      <div className="rise order-6 col-span-2 flex flex-col justify-between gap-8 bg-surface p-5 md:col-span-1 lg:order-none lg:col-span-4 lg:min-h-56 lg:p-6">
        <p className="text-lead">{footer.about}</p>
        <div className="space-y-1 text-small text-muted">
          <p>{footer.fictional}</p>
          <p>
            {/* Underlined: in the same grey as the line above, nothing else would mark it a link. */}
            <a href={HERO_PHOTO_CREDIT.url} className="underline underline-offset-4 hover:text-ink">
              {format(footer.photoCredit, { author: HERO_PHOTO_CREDIT.author })}
            </a>
          </p>
        </div>
      </div>

      <nav
        aria-label={footer.label}
        className="rise order-3 bg-oatmeal p-5 lg:order-none lg:col-span-3 lg:min-h-56 lg:p-6"
      >
        <CollectionLinks className="space-y-1" />
      </nav>

      <p className="rise order-5 col-span-2 bg-sage p-5 md:col-span-1 lg:order-none lg:col-span-2 lg:min-h-56 lg:p-6">
        {footer.builtWith}
      </p>

      <div className="rise order-4 flex flex-col justify-end bg-stone p-5 lg:order-none lg:col-span-3 lg:min-h-56 lg:p-6">
        <a href={REPOSITORY} className="text-lead underline-offset-4 hover:underline">
          {footer.source}
        </a>
      </div>

      <p
        aria-hidden="true"
        className="rise order-1 col-span-2 flex min-h-40 items-center justify-center overflow-hidden bg-ink text-display font-medium text-ground lg:order-none lg:col-span-8 lg:min-h-80"
      >
        {STORE_NAME}
      </p>

      <Link
        href={localePath(locale, "/#catalogue")}
        className="rise group order-2 col-span-2 flex min-h-40 flex-col justify-between bg-accent p-5 text-accent-ink transition-colors hover:bg-accent-strong lg:order-none lg:col-span-4 lg:min-h-80 lg:p-6"
      >
        <span className="text-head font-medium">{dictionary.shopTheBasics}</span>
        <ArrowUpRightIcon className="size-12 self-end transition-transform duration-300 ease-out-expo group-hover:translate-x-1 group-hover:-translate-y-1" />
      </Link>
    </footer>
  );
}
