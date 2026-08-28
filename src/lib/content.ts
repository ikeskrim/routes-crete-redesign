import "server-only";

import fs from "node:fs";
import path from "node:path";
import { cache } from "react";

import type {
  Collection,
  ContentItem,
  PhotoCredits,
  SiteContent,
} from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content");

/* ------------------------------------------------------------------ *
 * Colour grade
 *
 * The content files keep pointing at the ORIGINAL photographs. The grade is a
 * rendering concern, so it is resolved here rather than rewritten into every
 * JSON file — which means changing direction, or regrading, is a one-constant
 * edit instead of a migration across all content, and the originals are never
 * lost.
 * ------------------------------------------------------------------ */

/* The live grade.
 *
 * B "sunbleached" shipped through the whole build. The client's verdict on the
 * finished site was that the photographs did not delight him and wanted them
 * "brighter and more vivid" — and he was right about the cause: B ran at
 * sat 0.66, actively DESATURATING every frame, over blacks lifted to matte.
 * The Kourtaliotis river, captioned "crystal clear waters", rendered grey.
 *
 * C "vivid" is the answer, and it is still one constant. Flipping this back to
 * "b" restores the previous look across the entire site in one edit — the
 * graded trees for both live side by side under public/images/graded/. */
const GRADE = "c";
const GRADED_PREFIX = `/images/graded/${GRADE}`;

/**
 * Assets that must never be graded: a desaturated, vignetted QR code can stop
 * scanning, and the wordmark is a brand asset, not photography.
 */
const NEVER_GRADE = ["/images/site/qr-code.png", "/images/brand/logo.png"];

export function graded(src: string): string {
  if (typeof src !== "string") return src;
  if (!src.startsWith("/images/")) return src;
  if (src.startsWith("/images/graded/")) return src;
  if (NEVER_GRADE.includes(src)) return src;
  // The pipeline writes every derivative as .jpg.
  return src
    .replace(/^\/images\//, `${GRADED_PREFIX}/`)
    .replace(/\.(png|jpeg|JPG|PNG)$/i, ".jpg");
}

/** Deep-map every image path in a loaded content tree through the grade. */
function regrade<T>(value: T): T {
  if (typeof value === "string") return graded(value) as unknown as T;
  if (Array.isArray(value)) return value.map(regrade) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Keep the provenance fields pointing at where the file really came from.
      out[k] = k === "oldUrl" || k.endsWith("Original") ? v : regrade(v);
    }
    return out as T;
  }
  return value;
}

function readJson<T>(...segments: string[]): T {
  const file = path.join(CONTENT_DIR, ...segments);
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

/** Content read + grade resolution in one step. */
function readContent<T>(...segments: string[]): T {
  return regrade(readJson<T>(...segments));
}

/** Route prefix for each collection. Transfers live at /transfers/<slug>. */
const HREF_PREFIX: Record<Collection, string> = {
  experiences: "/experiences",
  transfers: "/transfers",
};

function loadCollection(collection: Collection): ContentItem[] {
  const dir = path.join(CONTENT_DIR, collection);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const item = readContent<ContentItem>(collection, f);
      return {
        ...item,
        collection,
        href: `${HREF_PREFIX[collection]}/${item.slug}`,
      };
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

/* ------------------------------------------------------------------ *
 * Public API — all cached per-request so a page that asks for the same
 * content in several places only touches the filesystem once.
 * ------------------------------------------------------------------ */

export const getSite = cache((): SiteContent => readContent<SiteContent>("site.json"));

export const getBlurMap = cache((): Record<string, string> => {
  try {
    return readJson<Record<string, string>>("blur-map.json");
  } catch {
    return {};
  }
});

/** Blur placeholder for a public image path, or undefined if we have none. */
export function getBlur(src: string): string | undefined {
  return getBlurMap()[src];
}

export const getExperiences = cache((): ContentItem[] => loadCollection("experiences"));
export const getTransfers = cache((): ContentItem[] => loadCollection("transfers"));

/** Everything bookable, in one list — used by the sitemap and the booking form. */
export const getAllItems = cache((): ContentItem[] => [
  ...getExperiences(),
  ...getTransfers(),
]);

export const getExperience = cache((slug: string): ContentItem | undefined =>
  getExperiences().find((e) => e.slug === slug),
);

export const getTransfer = cache((slug: string): ContentItem | undefined =>
  getTransfers().find((t) => t.slug === slug),
);

/** The experience flagged as the homepage storytelling centrepiece. */
export const getSignatureExperience = cache((): ContentItem | undefined => {
  const experiences = getExperiences();
  return experiences.find((e) => e.signature) ?? experiences[0];
});

/**
 * Other items to show at the foot of a detail page. Prefers siblings from the
 * same collection and falls back to the other collection so the section is
 * never empty — important while there are only three items in total.
 */
export const getRelatedItems = cache(
  (slug: string, limit = 2): ContentItem[] => {
    const all = getAllItems();
    const current = all.find((i) => i.slug === slug);
    if (!current) return all.slice(0, limit);

    const sameCollection = all.filter(
      (i) => i.slug !== slug && i.collection === current.collection,
    );
    const otherCollection = all.filter(
      (i) => i.slug !== slug && i.collection !== current.collection,
    );

    return [...sameCollection, ...otherCollection].slice(0, limit);
  },
);

/** Only locations we can actually place on a map. */
export const getMappableLocations = cache(() =>
  getSite().locations.filter(
    (l): l is typeof l & { lat: number; lng: number } =>
      typeof l.lat === "number" && typeof l.lng === "number",
  ),
);

export const getPhotoCredits = cache((): PhotoCredits =>
  readContent<PhotoCredits>("photo-credits.json"),
);
