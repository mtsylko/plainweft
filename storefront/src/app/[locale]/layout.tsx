import type { Metadata } from "next";
import localFont from "next/font/local";
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
import "../globals.css";

/**
 * Roundo, served from this site (SIL OFL, see `fonts/OFL.txt`). From Fontshare it took a
 * render-blocking stylesheet and two more origins before the first paint: on Lighthouse's phone
 * that paint came at 1.5 s, and at 0.9 s from here. Next.js preloads these files and sizes a
 * fallback to match them.
 */
const ROUNDO = localFont({
  src: [
    { path: "../fonts/roundo-regular.woff2", weight: "400" },
    { path: "../fonts/roundo-medium.woff2", weight: "500" },
    { path: "../fonts/roundo-semibold.woff2", weight: "600" },
  ],
  variable: "--font-roundo",
  display: "swap",
});

/** Every page prerenders once per language. */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const [locale, { meta }] = await Promise.all([getLocale(), getDictionary()]);
  return {
    // hreflang links and shared images need absolute URLs.
    metadataBase: SITE_URL,
    title: { default: meta.title, template: "%s · Plainweft" },
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
    <html lang={locale} className={ROUNDO.variable}>
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
