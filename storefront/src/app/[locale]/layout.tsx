import type { Metadata } from "next";
import { CartProvider } from "@/components/cart/cart-context";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { dictionaryFor } from "@/i18n/dictionaries";
import { I18nProvider } from "@/i18n/i18n-context";
import { LOCALES } from "@/i18n/locales";
import { openGraph, SITE_URL } from "@/i18n/metadata";
import { getDictionary, getLocale } from "@/i18n/server";
import { getCart } from "@/lib/cart/get-cart";
import { STORE_NAME } from "@/lib/site";
import "../globals.css";

/** Every page prerenders once per language. */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const [locale, { meta }] = await Promise.all([getLocale(), getDictionary()]);
  return {
    // hreflang links and shared images need absolute URLs.
    metadataBase: SITE_URL,
    title: { default: meta.title, template: `%s · ${STORE_NAME}` },
    description: meta.description,
    openGraph: openGraph(locale),
    // A link shared on X shows the wide picture, as it does everywhere else.
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await getLocale();
  const dictionary = dictionaryFor(locale);

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=roundo@400,500,600&display=swap"
        />
      </head>
      <body>
        <I18nProvider locale={locale} dictionary={dictionary}>
          {/* Not awaited: the cart streams in wherever it is read, and the rest stays static. */}
          <CartProvider cartPromise={getCart()}>
            <a
              href="#main"
              className="sr-only bg-ink px-4 py-2 text-ground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
            >
              {dictionary.layout.skipToContent}
            </a>
            <Header />
            <main id="main">{children}</main>
            <Footer />
            <CartDrawer />
          </CartProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
