import "server-only";

import * as fs from "node:fs";
import * as path from "node:path";

import { getBlur, getExperiences, getSite, getTransfers } from "@/lib/content";

/**
 * TEMPORARY — part of /design-3, deleted with it after the client's pick.
 *
 * The real content every draft renders. One loader, so the three directions
 * are compared on identical words and identical journeys and differ only in
 * design. Nothing here is written for the drafts: every string comes from
 * content/, and the few that live in code (the two hero CTA labels, the
 * journeys heading, the "Duration on request" fallback) are copied verbatim
 * from the live homepage and card.
 */
export function getDraftContent() {
  const site = getSite();

  const journeys = [...getExperiences(), ...getTransfers()].map((item, i) => ({
    index: i + 1,
    href: item.href,
    title: item.title,
    subtitle: item.subtitle ?? null,
    category: item.category,
    facts: [
      item.facts.region,
      item.facts.duration ?? item.facts.availability ?? "Duration on request",
    ].filter((f): f is string => typeof f === "string" && f.length > 0),
    image: item.cardImage,
    blurDataURL: getBlur(item.cardImage),
  }));

  return {
    brand: site.brand.name,
    nav: site.nav.map(({ key, label, href, external }) => ({
      key,
      label,
      href,
      external: !!external,
    })),
    hero: {
      eyebrow: site.hero.eyebrow,
      heading: site.hero.subheading,
      sub: site.hero.sub ?? site.meta.description,
      primaryCta: { label: "Explore Experiences", href: "/experiences" },
      secondaryCta: { label: "Book Now", href: "/contact" },
    },
    positioning: {
      eyebrow: site.positioning.eyebrow,
      statement: site.positioning.statement,
      body: site.positioning.body,
      attributes: site.positioning.attributes,
    },
    journeys: {
      eyebrow: `${site.sections.experiences.heading} & ${site.sections.transfers.heading}`,
      heading: "Journeys into the unknown side of the island",
      items: journeys,
    },
    address: site.contact.address,
  };
}

export type DraftContent = ReturnType<typeof getDraftContent>;

/**
 * A draft's hero photograph, resolved to the graded tree the draft chose.
 *
 * Each direction may sit its hero in a different grade — that is the point of
 * the one-constant grade system — so this takes the grade explicitly rather
 * than going through the site's live `graded()`. Dimensions come from the
 * file's own JPEG header, so `sizes` can be computed for a landscape frame
 * that `object-cover`s a portrait phone screen.
 */
export function draftHero(
  sourcedFile: string,
  grade: "a" | "b" | "c",
  /** "sourced" for CC-licensed masters (committed), "stock-local" for held masters. */
  folder: "sourced" | "stock-local" = "stock-local",
) {
  const src = `/images/graded/${grade}/${folder}/${sourcedFile}`;
  let width = 0;
  let height = 0;
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "public", src));
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        height = buf.readUInt16BE(i + 5);
        width = buf.readUInt16BE(i + 7);
        break;
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  } catch {
    /* A missing file renders as a broken draft, which is the honest outcome. */
  }
  const aspect = width && height ? width / height : 1.5;
  return {
    src,
    width,
    height,
    blurDataURL: getBlur(src),
    /* A landscape frame covering a tall phone hero is scaled to the hero's
       height, so the phone needs ~100svh × aspect of width, not 100vw. */
    sizes: aspect > 1 ? `(orientation: portrait) ${Math.ceil(100 * aspect)}vh, 100vw` : "100vw",
  };
}
