import "server-only";

import * as fs from "node:fs";
import * as path from "node:path";

import {
  getBlur,
  getExperiences,
  getSignatureExperience,
  getSite,
  getTransfers,
} from "@/lib/content";

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

    /* ---------------- C+ (/design-3/c-plus) only, additive ---------------- */
    ...draftCPlusContent(site),
  };
}

/**
 * The extra real content the C+ draft shows (C+ spec §0.1). Every string is
 * content, or copied verbatim from the live code line named beside it.
 * Photographs are the same content expressions the live pages use, resolved
 * to grade d (the grade C+ is judged in).
 */
function draftCPlusContent(site: ReturnType<typeof getSite>) {
  const experiences = getExperiences();
  const signature = getSignatureExperience();

  /* src/app/page.tsx:100-104 — the why-us photographs. */
  const whyUsImages = [
    signature?.gallery[4]?.src,
    experiences[0]?.gallery[6]?.src,
    signature?.gallery[9]?.src,
  ].filter(Boolean) as string[];

  /* src/app/layout.tsx:119-126 — one operator photograph per menu item. */
  const menuPreviewSources: Record<string, string | undefined> = {
    experiences: experiences[0]?.cardImage,
    transfers: getTransfers()[0]?.cardImage,
    whyUs: experiences[1]?.gallery[3]?.src,
    bookGuide: experiences[0]?.gallery[5]?.src,
    contact: experiences[1]?.gallery[1]?.src,
    brochure: experiences[0]?.gallery[2]?.src,
  };

  return {
    /* site.whyUs[].title / .statement; the statement fallback is page.tsx:139. */
    whyUs: site.whyUs.map((block, i) => ({
      title: block.title,
      statement: block.statement ?? block.text.split(/\r?\n/)[0],
      image: whyUsImages[i] ? draftGradeD(whyUsImages[i]) : null,
    })),

    /* src/app/page.tsx:151-155, verbatim. */
    marquee: [
      "Private journeys",
      "Twelve seats",
      "Family-run",
      "Rethymno · Crete",
      "Booked by conversation",
    ],

    signature:
      signature && signature.scenes && signature.scenes.length > 0
        ? {
            eyebrow: "The signature journey", // src/app/page.tsx:225
            title: signature.title,
            href: signature.href,
            readLabel: "Read the full journey", // src/components/sections/SignatureScene.tsx:39
            /* The scene derivation of src/app/page.tsx:70-76. The content's
               `**` emphasis markers are markup, not words (parity strips them
               too), so they are not printed. */
            scenes: signature.scenes.map((scene) => ({
              label: scene.label,
              text: (signature.body[scene.bodyIndex]?.text ?? "").replace(/\*\*/g, ""),
              image: draftGradeD(scene.image),
            })),
          }
        : null,

    howToBook: {
      subheading: site.sections.howToBook.subheading, // "Step by Step Guide"
      heading: site.sections.howToBook.heading, // "Booking is a conversation"
      steps: site.howToBook.steps.map(({ key, number, title, body }) => ({ key, number, title, body })),
      responsePromise: site.howToBook.responsePromise,
    },

    backCover: {
      address: site.contact.address,
      /* src/components/layout/Footer.tsx:38-43 */
      phones: site.contact.phones.map((phone) => ({
        key: phone.key,
        label: phone.label,
        display: phone.display,
        href: `tel:${phone.dial}`,
      })),
      /* src/components/layout/Footer.tsx:32-36, the wa.me link with its prefill. */
      whatsapp: site.contact.whatsapp
        ? {
            display: site.contact.whatsapp.display,
            href: `https://wa.me/${site.contact.whatsapp.dial}?text=${encodeURIComponent(
              "Hello Routes Crete, I'd like to ask about a private tour or transfer.",
            )}`,
          }
        : null,
      copyright: site.footer.copyright,
      brochure: site.footer.brochure,
      social: site.social.links,
      gemiLabel: site.brand.gemiLabel,
      gemiNumber: site.brand.gemiNumber,
      closing: "Tell us when you’re on the island.", // Footer.tsx:96
      cta: "Plan your day", // Footer.tsx:104
      whatsappLabel: "WhatsApp", // Footer.tsx:113 (and :46 for the channel label)
      columns: ["Navigate", "Contact", "More"] as const, // Footer.tsx:146, 162, 186
      creditsLabel: "Photography credits", // Footer.tsx:231
    },

    menuPreviews: Object.fromEntries(
      Object.entries(menuPreviewSources).map(([key, src]) => [key, src ? draftGradeD(src) : null]),
    ) as Record<string, ReturnType<typeof draftGradeD> | null>,

    menu: {
      open: "Menu", // src/components/layout/Nav.tsx:227
      close: "Close", // Nav.tsx:227
      openSr: "Open menu", // Nav.tsx:221
      closeSr: "Close menu", // Nav.tsx:221, OverlayMenu.tsx:269
      dialogLabel: "Menu", // OverlayMenu.tsx:183
      cta: { label: "Plan your day", href: "/contact" }, // OverlayMenu.tsx:375, Footer.tsx:101-104
    },
  };
}

/** Width and height from a public JPEG's own header (0 × 0 when unreadable). */
function jpegSize(publicPath: string): { width: number; height: number } {
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "public", publicPath));
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  } catch {
    /* unreadable: 0 × 0 */
  }
  return { width: 0, height: 0 };
}

/**
 * C+ draft: a content or operator photograph at grade d. content.ts resolves
 * content paths to the site's live letter; the C+ draft is judged at grade d,
 * so only the letter segment of the graded path changes. Paths that are not
 * graded yet are graded to d the same way `graded()` does.
 */
export function draftGradeD(src: string) {
  const d = src.startsWith("/images/graded/")
    ? src.replace(/^\/images\/graded\/[a-z]\//, "/images/graded/d/")
    : src.replace(/^\/images\//, "/images/graded/d/").replace(/\.(png|jpeg|JPG|PNG)$/i, ".jpg");
  return { src: d, ...jpegSize(d), blurDataURL: getBlur(d) };
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
  grade: "a" | "b" | "c" | "d",
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
