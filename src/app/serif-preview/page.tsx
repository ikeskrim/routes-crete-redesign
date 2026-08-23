import type { Metadata } from "next";
import { Fraunces } from "next/font/google";

import { Hero } from "@/components/sections/Hero";
import { Positioning } from "@/components/sections/Positioning";
import { getBlur, getSite } from "@/lib/content";

/**
 * The serif A/B — a prototype, not a decision.
 *
 * The live site keeps Manrope. This route renders the same hero and the same
 * positioning statement with ONE licensed serif on the headlines only, so the
 * two can be captured under identical conditions and compared as pictures
 * rather than argued about as adjectives.
 *
 * FRAUNCES, chosen over Instrument Serif and Cormorant because:
 *   - it is variable, so the display sizes get real optical sizing rather than
 *     a text face stretched large;
 *   - its SOFT axis takes the edge off the serifs, which suits sunbleached
 *     warmth better than the colder, high-contrast alternatives;
 *   - SIL Open Font License, and `next/font/google` self-hosts it at build
 *     time, so no request leaves the origin — the same contract Manrope and
 *     Inter already keep.
 *
 * Loaded HERE and nowhere else. Putting it in the root layout would make every
 * visitor pay for a typeface that only exists for this comparison.
 *
 * `noindex`: this is a working page for one decision, not part of the site.
 */
const fraunces = Fraunces({
  variable: "--font-serif-ab",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "opsz"],
});

export const metadata: Metadata = {
  title: "Serif A/B (prototype)",
  robots: { index: false, follow: false },
};

export default function SerifPreviewPage() {
  const site = getSite();

  return (
    <div
      className={`${fraunces.variable} [&_h1]:font-[family-name:var(--font-serif-ab)] [&_h2]:font-[family-name:var(--font-serif-ab)] [&_h1]:tracking-[-0.02em] [&_h2]:tracking-[-0.02em]`}
    >
      <Hero
        eyebrow={site.hero.eyebrow}
        heading={site.hero.subheading}
        subheading={site.hero.sub ?? site.meta.description}
        image={site.hero.backgroundImage}
        blurDataURL={getBlur(site.hero.backgroundImage)}
        primaryCta={{ label: "Explore Experiences", href: "/experiences" }}
        secondaryCta={{ label: "Book Now", href: "/contact" }}
      />

      <Positioning
        eyebrow={site.positioning.eyebrow}
        statement={site.positioning.statement}
        body={site.positioning.body}
        attributes={site.positioning.attributes}
      />
    </div>
  );
}
