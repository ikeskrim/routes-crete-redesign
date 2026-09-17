import type { Metadata, Viewport } from "next";

import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";
import { FilmGrain } from "@/components/ui/FilmGrain";
import { SpinningBadge } from "@/components/ui/SpinningBadge";
import { SmoothScroll } from "@/components/ui/SmoothScroll";
import { getBlur, getExperiences, getSite, getTransfers } from "@/lib/content";
import { THEME_COLOR } from "@/lib/edition";
import { socialImage } from "@/lib/site-url";

import { fontVariables } from "./fonts";
import "./globals.css";

/* Fonts: every loader, and the edition's preload profile, is in ./fonts.ts
   (C+ SPEC §B.6). Their CSS variables all go on <html>; the family tokens in
   ./edition.css decide which faces a page actually uses. */

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
      /* The cutover switch this build was made with (next.config.ts,
         CUTOVER.md): "unset" before the cutover, the canonical origin after.
         qa/security-headers.mts checks the HSTS header against it. */
      "site-url": process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "unset",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    icons: { icon: site.brand.favicon },
  };
}

/* The browser chrome matches the paper ground (§H.4). */
export const viewport: Viewport = {
  themeColor: THEME_COLOR,
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
    contact: experiences[1]?.gallery[1]?.src,
    brochure: experiences[0]?.gallery[2]?.src,
  };

  /* Contract C7 (C+ SPEC §0.4): the three new optional Nav props, handed over
     as one spread so this file compiles on both sides of the masthead
     migration (a spread variable carries no excess-property check; once Nav
     declares a prop, its type is checked):
     - previewBlur: the blur placeholder of each menu preview;
     - address: the menu foot's address line;
     - itemHrefs: every experience and transfer page that exists, so only a
       real item route is treated as having a dark photographic hero (a slug
       that 404s gets the solid masthead at load).
     The menu backdrop photograph is retired (C7, §G.2): no `menuBackdrop` is
     passed, and the open menu shows no drifting photograph. */
  const navContract = {
    previewBlur: Object.fromEntries(
      Object.entries(menuPreviews).map(([key, src]) => [key, src ? getBlur(src) : undefined]),
    ) as Record<string, string | undefined>,
    address: site.contact.address ?? undefined,
    itemHrefs: [
      ...experiences.map((item) => `/experiences/${item.slug}`),
      ...transfers.map((item) => `/transfers/${item.slug}`),
    ],
  };

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${fontVariables} h-full`}
    >
      <body className="flex min-h-full flex-col">
        {/* Scroll-reveal animations start at opacity 0. If JavaScript never
            runs, force every one of them visible rather than shipping a blank
            page. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important;clip-path:none!important}`}</style>
        </noscript>

        {/* Square, on night, with the paper focus ring (§0.2 S5, §C.12: the
            gold pill is the only rounded control). */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-none focus:bg-night focus:px-6 focus:py-3 focus:text-on-night focus-visible:outline-focus-night"
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
          {...navContract}
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
          verifiedOn={site.socialProof?.verifiedOn}
        />

        {/* Site-wide film grain: rendered, but `display: none` in C+
            (--ed-film-grain-display, §F.1). */}
        <FilmGrain />
      </body>
    </html>
  );
}
