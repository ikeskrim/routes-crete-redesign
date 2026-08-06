import "server-only";

import fs from "node:fs";
import path from "node:path";
import { cache } from "react";

import type { Collection, ContentItem, SiteContent } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content");

function readJson<T>(...segments: string[]): T {
  const file = path.join(CONTENT_DIR, ...segments);
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
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
      const item = readJson<ContentItem>(collection, f);
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

export const getSite = cache((): SiteContent => readJson<SiteContent>("site.json"));

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
