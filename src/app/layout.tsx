import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Manrope } from "next/font/google";

import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";
import { FilmGrain } from "@/components/ui/FilmGrain";
import { SpinningBadge } from "@/components/ui/SpinningBadge";
import { SmoothScroll } from "@/components/ui/SmoothScroll";
import { getExperiences, getSite, getTransfers } from "@/lib/content";
import { socialImage } from "@/lib/site-url";

import "./globals.css";

/* Both are variable fonts, self-hosted by next/font — no request ever leaves
   the origin, and there is no layout shift on load. */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

/* The headline face, client-approved after the A/B (D1).
   Variable, so display sizes get real optical sizing rather than a text face
   stretched large. Self-hosted by next/font — no request leaves the origin.
   Applied to h1 and h2 ONLY, which is exactly the scope the A/B compared;
   h3/h4, the eyebrows and the wordmark stay Manrope.

   `opsz` only, deliberately. Shipping it with SOFT as well cost 118 KB for
   this one face — font payload went 90 KB to 208 KB — and dropped the
   experience route's Lighthouse performance from a 94/89/94/89 spread to
   87/89/90/85, i.e. under the 89 floor. Requesting `opsz` alone halves the
   file to 65 KB. SOFT only rounds the serif terminals slightly; optical
   sizing is the reason this face was chosen over a static one, so when only
   one axis could stay, it was never going to be SOFT. */
const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
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
      images: socialImage(site.meta.ogImage)
        ? [{ url: socialImage(site.meta.ogImage)! }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: site.meta.title,
      description: site.meta.description,
      images: socialImage(site.meta.ogImage)
        ? [socialImage(site.meta.ogImage)!]
        : undefined,
    },
    /* Which commit is actually live, readable with a single curl.
     *
     * This session lost real time twice to not knowing: a shipped build that
     * looked missing (stale alias cache), and deployments whose output did not
     * match origin/main with no way to see which source they were built from —
     * `vercel inspect` does not print the commit. Now every response carries
     * it, so "is my fix live?" is one fetch instead of an inference:
     *
     *   curl -s <url> | grep build-commit
     */
    other: {
      "build-commit":
        process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
        process.env.BUILD_COMMIT ??
        "local",
      "build-ref": process.env.VERCEL_GIT_COMMIT_REF ?? "local",
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

  /* One real photograph per menu item, drawn from the content itself so the
     overlay previews can never drift from what the pages actually show. */
  const experiences = getExperiences();
  const transfers = getTransfers();
  const menuPreviews: Record<string, string | undefined> = {
    experiences: experiences[0]?.cardImage,
    transfers: transfers[0]?.cardImage,
    whyUs: experiences[1]?.gallery[3]?.src,
    bookGuide: experiences[0]?.gallery[5]?.src,
    team: site.team.members[0]?.photo,
    contact: experiences[1]?.gallery[1]?.src,
    brochure: experiences[0]?.gallery[2]?.src,
  };

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${fraunces.variable} ${inter.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        {/* Scroll-reveal animations start at opacity 0. If JavaScript never
            runs, force every one of them visible rather than shipping a blank
            page. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important;clip-path:none!important}`}</style>
        </noscript>

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-pill focus:bg-ocean-950 focus:px-6 focus:py-3 focus:text-sand-50"
        >
          Skip to content
        </a>

        {/* Organisation-level structured data. Only fields that actually
            exist are emitted — there is no email, no rating and no price. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "TravelAgency",
              name: site.brand.name,
              url: site.brand.url,
              description: site.meta.description,
              image: `${site.brand.url}${site.meta.ogImage}`,
              telephone: site.contact.phones.map((p) => p.dial),
              address: {
                "@type": "PostalAddress",
                addressLocality: "Rethymno",
                addressRegion: "Crete",
                addressCountry: "GR",
              },
              areaServed: { "@type": "Place", name: "Crete, Greece" },
              identifier: {
                "@type": "PropertyValue",
                name: site.brand.gemiLabel,
                value: site.brand.gemiNumber,
              },
            }),
          }}
        />

        <SmoothScroll legacyAnchorMap={site.legacyAnchorMap} />

        <Nav
          items={site.nav}
          brandName={site.brand.name}
          previews={menuPreviews}
          /* Drawn from the content like every other preview, so the menu's
             backdrop can never drift from a photograph the site actually
             ships. */
          menuBackdrop={experiences[1]?.heroImage ?? experiences[0]?.heroImage}
        />

        <main id="main" className="flex-1">
          {children}
        </main>

        <Footer site={site} />

        {/* Renders nothing until the client supplies a real, checkable claim
            — see content/site.json → socialProof. */}
        <SpinningBadge
          text={site.socialProof?.text}
          href={site.socialProof?.href}
        />

        {/* Last in the body, over everything, interactive with nothing. */}
        <FilmGrain />
      </body>
    </html>
  );
}
