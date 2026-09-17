/**
 * Shapes of everything under /content.
 *
 * These types are the contract between the JSON files and the UI. Adding a new
 * experience means adding one JSON file that satisfies `ContentItem` — no code
 * changes anywhere.
 */

export interface GalleryImage {
  src: string;
  width: number;
  height: number;
  /** Original URL on routescrete.gr, kept so the mapping is never lost. */
  oldUrl?: string;
  alt?: string;
}

export interface BodyBlock {
  type: "paragraph";
  /**
   * Verbatim copy. Supports a deliberately tiny markup subset:
   *   **bold**   →  <strong>
   *   \n         →  <br>
   * Nothing else is interpreted, so the text stays diff-able against the
   * original site.
   */
  text: string;
  note?: string;
}

export interface ContentFacts {
  region?: string | null;
  duration?: string | null;
  price?: string | null;
  groupSize?: string | null;
  availability?: string | null;
  vehicle?: string | null;
  vehicleNote?: string | null;
}

export interface ContentMeta {
  title: string;
  description: string;
  ogImage?: string | null;
}

/** An experience or a transfer — both render through the same template. */
export interface ContentItem {
  slug: string;
  order: number;
  title: string;
  titleVariantOnCard?: string;
  subtitle?: string | null;
  category: string;
  categoryOriginal?: string;
  sourceModal?: string;
  cardImage: string;
  heroImage: string;
  qrImage?: string | null;
  signature?: boolean;
  facts: ContentFacts;
  locations: string[];
  body: BodyBlock[];
  /**
   * Verified facts from the printed brochure, kept separate from the website
   * body copy so their provenance is never lost.
   */
  included?: { label: string; source: string; items: string[] };
  /** Chapters for the homepage scroll-storytelling scene. */
  scenes?: { bodyIndex: number; label: string; image: string }[];
  scenesNote?: string;
  pullQuote?: string;
  pullQuoteNote?: string;
  highlights?: string[];
  highlightsNote?: string;
  meta: ContentMeta;
  gallery: GalleryImage[];
  /** Injected by the loader: "experiences" | "transfers". */
  collection: Collection;
  /**
   * Licensed photographs of the real places this journey visits, shown as
   * editorial breaks in the story. Distinct from `gallery`, which is the
   * operator's own tour photography — see the caption rule in Bridge.
   */
  placeBreaks?: { src: string; place: string }[];
  /** Injected by the loader: the canonical route for this item. */
  href: string;
}

export type Collection = "experiences" | "transfers";

/* ---------------------------------------------------------------- site */

export interface NavItem {
  key: string;
  label: string;
  href: string;
  external?: boolean;
  legacyAnchor?: string | null;
}

export interface WhyUsBlock {
  key: string;
  icon: string;
  title: string;
  /**
   * Short punctuation line for the stacked scene, written under the brand
   * voice. `text` remains the original live-site copy, verbatim.
   */
  statement?: string;
  text: string;
}

export interface BookingStep {
  key: string;
  number: number;
  title: string;
  /** Original step titles this one absorbed when five became three. */
  absorbed?: string[];
  /** Present when the live site's heading was corrected. */
  titleOriginal?: string;
  titleFlag?: string;
  body: string;
  bodyLead?: string;
  bodyItems?: string[];
}

/* The team movement is out (2026-09-11); the members stay in content so the
   names and roles are never lost. Their photographs are retired: kept under
   assets-src/retired/team/, no longer in public/, so nothing can serve them. */
export interface TeamMember {
  key: string;
  name: string;
  role: string;
  /** Repo path of the retired photograph. Not served. */
  photoRetired?: string;
  width: number;
  height: number;
  oldUrl?: string;
  photoNote?: string;
}

export interface Phone {
  key: string;
  label: string;
  /** Formatted for reading. */
  display: string;
  /** Digits for tel: / wa.me links. */
  dial: string;
}

export interface SocialProof {
  /** The claim itself. Null/empty renders no badge at all. */
  text: string | null;
  /** Where a reader can check it. */
  href: string | null;
  verifiedOn: string | null;
  note?: string;
}

export interface MapLocation {
  key: string;
  name: string;
  lat: number | null;
  lng: number | null;
  type: string;
  needsInput?: boolean;
  source?: string;
}

export interface SectionCopy {
  heading: string;
  subheading: string;
}

export interface SiteContent {
  /** The rotating corner badge's claim. Optional, and empty until the client
   *  supplies something real — see content/site.json for why. */
  socialProof?: SocialProof;
  brand: {
    name: string;
    domain: string;
    url: string;
    logo: string;
    favicon: string;
    gemi: string;
    gemiLabel: string;
    gemiNumber: string;
  };
  meta: {
    title: string;
    description: string;
    keywords: string;
    author: string;
    locale: string;
    ogImage: string | null;
  };
  nav: NavItem[];
  legacyAnchorMap: Record<string, string>;
  hero: {
    /** The visible sub-line. Distinct from meta.description, which is SEO. */
    sub?: string;
    eyebrow: string;
    heading: string;
    subheading: string;
    originalCta: { label: string; href: string };
    backgroundImage: string;
  };
  sections: Record<string, SectionCopy>;
  whyUs: WhyUsBlock[];
  howToBook: {
    image: string;
    steps: BookingStep[];
    /** The complete original five, kept verbatim. Never rendered; never lost. */
    stepsOriginal?: BookingStep[];
    /**
     * A stated reply time is a claim about how the business operates, so it is
     * null until the client supplies a real one and the line is omitted
     * entirely rather than guessed.
     */
    responsePromise?: string | null;
  };
  positioning: {
    eyebrow: string;
    statement: string;
    body: string;
    attributes: string[];
  };
  team: { intro: string; members: TeamMember[] };
  contact: {
    formUrl: string;
    formProvider: string;
    email: string | null;
    phones: Phone[];
    whatsapp: { display: string; dial: string } | null;
    address: string | null;
    openingHours: string | null;
  };
  social: { links: { key: string; label: string; href: string }[] };
  newsletter: { enabled: boolean };
  testimonials: { enabled: boolean; items: unknown[] };
  footer: {
    copyright: string;
    copyrightOriginal: string;
    gemi: string;
    brochure: { label: string; href: string };
  };
  brochure: { label: string; href: string; bytes: number };
  locations: MapLocation[];
}

/**
 * Provenance for a photograph we did not take. Verified by SHA-1 against the
 * source file, so the record is an identity claim rather than a resemblance.
 */
export interface PhotoCredit {
  file: string;
  subject: string;
  title: string;
  author: string;
  licence: string;
  licenceUrl: string;
  source: string;
  sha1: string;
  bytes: number;
  dimensions: string;
  attributionRequired: boolean;
  /** We colour-grade every image, and CC BY requires changes to be marked. */
  modified: boolean;
  /**
   * The licence requires the work's title, and that title names a place the
   * tours do not visit: /credits keeps it verbatim, marked "(title as
   * published)" (ruling of 2026-09-17). Page captions stay generic.
   */
  titleAsPublished?: boolean;
  /**
   * A share-alike licence (CC BY-SA 4.0 only): the graded file the site
   * serves is published under the same licence, and /credits links it for
   * download (qa/credits-guard.mts C16).
   */
  shareAlike?: {
    licence: string;
    licenceUrl: string;
    /** The served graded file, a public path under /images/graded/. */
    derivative: string;
    obligation: string;
  };
  /** A frame that depicts a monument, and where its Greek licence stands. */
  monument?: { name: string; status: string; note: string };
  note: string;
}

export interface PhotoCredits {
  note: string;
  verifiedOn: string;
  photographs: PhotoCredit[];
}
