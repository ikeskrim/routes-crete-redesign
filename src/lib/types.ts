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
  text: string;
}

export interface BookingStep {
  key: string;
  number: number;
  title: string;
  /** Present when the live site's heading was corrected. */
  titleOriginal?: string;
  titleFlag?: string;
  body: string;
  bodyLead?: string;
  bodyItems?: string[];
}

export interface TeamMember {
  key: string;
  name: string;
  role: string;
  photo: string;
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
    eyebrow: string;
    heading: string;
    subheading: string;
    originalCta: { label: string; href: string };
    backgroundImage: string;
  };
  sections: Record<string, SectionCopy>;
  whyUs: WhyUsBlock[];
  howToBook: { image: string; steps: BookingStep[] };
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
