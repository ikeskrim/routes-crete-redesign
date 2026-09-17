import "server-only";

import { getSite } from "@/lib/content";

/**
 * Two different origins, on purpose.
 *
 * CANONICAL is where this site will finally live, and it is what every
 * `alternates.canonical` resolves against. It stays fixed at routescrete.gr
 * even while we are serving from somewhere else, because that is the
 * duplicate-content guard: a preview deployment must not advertise itself as
 * the canonical home of this content.
 *
 * SERVING is wherever this build is actually answering requests from right
 * now. Social images have to be absolute and they have to be *fetchable by a
 * crawler that is looking at this deployment* — a scraper reading the preview
 * cannot fetch an image from a domain that does not resolve yet. Pointing
 * og:image at the canonical origin meant every share of the preview showed no
 * image at all.
 *
 * So: canonical URLs use CANONICAL, image URLs use SERVING.
 *
 * The cutover switch, `NEXT_PUBLIC_SITE_URL` (next.config.ts, CUTOVER.md),
 * ends the split. Once routescrete.gr points at this site, it is set to the
 * canonical origin, and SERVING becomes CANONICAL on every deployment,
 * including the vercel.app alias, whose canonical URLs already pointed there.
 * next.config.ts refuses any other value at build time.
 */
export function canonicalOrigin(): string {
  return getSite().brand.url.replace(/\/$/, "");
}

/** The origin the cutover switch declares, or null while it is unset. */
export function liveOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : null;
}

export function servingOrigin(): string {
  const live = liveOrigin();
  if (live) return live;
  // Vercel's own project domain is stable and shareable, unlike the
  // per-deployment hash URL, so it is preferred when both are present.
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  if (process.env.NEXT_PUBLIC_SITE_ORIGIN) {
    return process.env.NEXT_PUBLIC_SITE_ORIGIN.replace(/\/$/, "");
  }
  // Off Vercel — a local build or the real domain — the canonical origin is
  // also the serving origin.
  return canonicalOrigin();
}

/** Absolute URL for a social image, on whatever origin is actually serving. */
export function socialImage(
  src: string | null | undefined,
): string | undefined {
  if (!src) return undefined;
  if (/^https?:\/\//.test(src)) return src;
  return `${servingOrigin()}${src.startsWith("/") ? "" : "/"}${src}`;
}
