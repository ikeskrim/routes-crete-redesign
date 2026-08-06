import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";

import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";
import { SmoothScroll } from "@/components/ui/SmoothScroll";
import { getSite } from "@/lib/content";

import "./globals.css";

/* Both are variable fonts, self-hosted by next/font — no request ever leaves
   the origin, and there is no layout shift on load. */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export function generateMetadata(): Metadata {
  const site = getSite();

  return {
    metadataBase: new URL(site.brand.url),
    title: {
      default: site.meta.title,
      template: `%s | ${site.brand.name}`,
    },
    description: site.meta.description,
    keywords: site.meta.keywords.split(",").map((k) => k.trim()),
    authors: [{ name: site.meta.author }],
    creator: site.meta.author,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: site.brand.name,
      title: site.meta.title,
      description: site.meta.description,
      url: site.brand.url,
      locale: "en_GB",
    },
    twitter: {
      card: "summary_large_image",
      title: site.meta.title,
      description: site.meta.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    icons: { icon: site.brand.favicon },
  };
}

export const viewport: Viewport = {
  themeColor: "#04141d",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const site = getSite();

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${inter.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        {/* Scroll-reveal animations start at opacity 0. If JavaScript never
            runs, force every one of them visible rather than shipping a blank
            page. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-pill focus:bg-ocean-950 focus:px-6 focus:py-3 focus:text-sand-50"
        >
          Skip to content
        </a>

        <SmoothScroll legacyAnchorMap={site.legacyAnchorMap} />

        <Nav items={site.nav} brandName={site.brand.name} />

        <main id="main" className="flex-1">
          {children}
        </main>

        <Footer site={site} />
      </body>
    </html>
  );
}
