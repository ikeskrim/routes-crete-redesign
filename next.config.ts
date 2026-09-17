import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

/**
 * Build the legacy image redirect map from the content files.
 *
 * Every gallery entry records the URL the image had on routescrete.gr in its
 * `oldUrl` field, so this stays correct on its own — add an experience, its
 * old URLs (if any) are covered without touching this file.
 */
function legacyImageRedirects() {
  const contentDir = path.join(process.cwd(), "content");
  const pairs = new Map<string, string>();

  const collect = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      const oldUrl = record.oldUrl;
      const src = record.src ?? record.photo;
      if (typeof oldUrl === "string" && typeof src === "string") {
        pairs.set(oldUrl, src);
      }
      Object.values(record).forEach(collect);
    }
  };

  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".json") && entry.name !== "blur-map.json") {
        try {
          collect(JSON.parse(fs.readFileSync(full, "utf8")));
        } catch {
          /* A malformed content file should not break the build config. */
        }
      }
    }
  };

  walk(contentDir);

  /* A source is matched against the path as it arrives, and a browser sends
     a Greek file name percent-encoded (/media/spΤΥΡΟΚΟΜ.jpg arrives as
     /media/sp%CE%A4%CE%A5…), so a non-ASCII source is written encoded. These
     two used to be dropped here, and both URLs, still served by the old site,
     would have gone 404 at cutover (qa/cutover-smoke.mts S2, 2026-09-17). */
  return [...pairs.entries()].map(([source, destination]) => ({
    source: /^[\x20-\x7E]*$/.test(source) ? source : encodeURI(source),
    destination,
    permanent: true,
  }));
}

/**
 * Security headers, on every response.
 *
 * CONTENT-SECURITY-POLICY — shipped REPORT-ONLY first, deliberately. A policy
 * that blocks something the site needs fails silently for visitors; report-only
 * logs every violation to the console instead, `qa/security-headers.mts` loads
 * every route and fails on any violation, and only a clean run earns the switch
 * to enforcing (set CSP_ENFORCE below).
 *
 * Two allowances are conscious trade-offs, not oversights:
 *  - script-src 'unsafe-inline': Next's App Router streams small inline
 *    bootstrap scripts, and the organisation JSON-LD is inline. The nonce-based
 *    alternative needs every page rendered per request, which gives up static
 *    generation — the reason the hero paints in under half a second. Everything
 *    else is locked to 'self': no third-party script origin is allowed at all.
 *  - style-src 'unsafe-inline': motion writes transforms into style attributes.
 * frame-src is scoped to the one page that frames anything: /contact allows
 * exactly one origin, the Monday.com booking form; every other route frames
 * nothing.
 *
 * STRICT-TRANSPORT-SECURITY — two years. includeSubDomains and preload are
 * added only when the cutover switch below is on: they commit the domain to
 * HTTPS in browsers' built-in lists, which is hard to undo, so they belong to
 * the cutover (CUTOVER.md), never to an ordinary deploy.
 *
 * Development is left without CSP: the dev server's hot reload needs eval and
 * websockets, and a dev-only exception would only teach the policy to lie.
 */
/* Earned on 2026-09-13: shipped report-only in 36854c0, and security-headers
   loaded all nine routes of that live deployment in Chromium with zero
   violations. Flip back to false first if a new embed or origin is added. */
const CSP_ENFORCE = true;

/* Scoping frame-src to /contact is a tightening, and a tightening can break
   something too, so it earns enforcement the same way the policy did — but
   without ever dropping the live site to report-only. While "trial", the
   existing policy keeps enforcing everywhere and the scoped policy rides
   alongside it as Content-Security-Policy-Report-Only, where
   qa/security-headers.mts counts its violations. A clean run on the deployment
   earns "enforced": the scoped policy becomes the enforcing one and the
   report-only header goes away.
   Earned on 2026-09-14: the trial shipped in aad17be, and on that live
   deployment security-headers saw zero violations on all nine routes, report-only
   included. The form check also passed there: 12 fields and 6 buttons, and no
   request before scrolling. Set back to "trial" before changing frame-src
   again. */
const FRAME_SCOPE: "trial" | "enforced" = "enforced";

const MONDAY_FORMS = "https://forms.monday.com";

function contentSecurityPolicy(frameSrc: string, enforcing: boolean) {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self'",
    `frame-src ${frameSrc}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    /* Meaningless in a report-only policy — browsers say so in the console — so
       it is only sent in a policy that enforces. */
    ...(enforcing ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/* The CSP header(s) for a route whose own frame-src is `scopedFrameSrc`.
   Production only (see above). */
function cspHeaders(scopedFrameSrc: string) {
  if (process.env.NODE_ENV !== "production") return [];
  const key = CSP_ENFORCE ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
  if (FRAME_SCOPE === "enforced") {
    return [{ key, value: contentSecurityPolicy(scopedFrameSrc, CSP_ENFORCE) }];
  }
  return [
    { key, value: contentSecurityPolicy(MONDAY_FORMS, CSP_ENFORCE) },
    ...(CSP_ENFORCE
      ? [{ key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy(scopedFrameSrc, false) }]
      : []),
  ];
}

/**
 * THE CUTOVER SWITCH: `NEXT_PUBLIC_SITE_URL` (CUTOVER.md).
 *
 * Unset, as today, the site is served from its Vercel domain while
 * routescrete.gr still serves the old site. Set it to the canonical origin
 * (`brand.url` in content/site.json, https://www.routescrete.gr) and this
 * build declares itself live on its own domain. Then:
 *   - HSTS adds includeSubDomains and preload (here);
 *   - social images resolve on the canonical origin (src/lib/site-url.ts);
 *   - every page's `site-url` meta says so, and qa/security-headers.mts
 *     checks the header against it.
 * Canonical URLs do not change: they always resolve against `brand.url`.
 *
 * Any other value fails the build: a typo (the apex instead of www, http,
 * a trailing path) must not ship. Next reads the variable from the
 * environment first, then from .env.production. It is a build-time value, so
 * changing it takes a new deployment.
 */
function cutoverSwitch(): { live: boolean; url: string | null } {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return { live: false, url: null };
  const site = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "site.json"), "utf8")) as {
    brand: { url: string };
  };
  const canonical = site.brand.url.replace(/\/$/, "");
  const url = raw.replace(/\/$/, "");
  if (url !== canonical) {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL is "${raw}", but the canonical origin (content/site.json brand.url) is "${canonical}". ` +
        "Set it to exactly the canonical origin, or leave it unset (CUTOVER.md).",
    );
  }
  return { live: true, url };
}

const CUTOVER = cutoverSwitch();

const HSTS = CUTOVER.live ? "max-age=63072000; includeSubDomains; preload" : "max-age=63072000";

const SECURITY_HEADERS = [
  ...cspHeaders("'none'"),
  { key: "Strict-Transport-Security", value: HSTS },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  /* No "X-Powered-By: Next.js" — it tells an attacker which advisories to try. */
  poweredByHeader: false,

  images: {
    /* The source photography is heavy but modest in resolution (most assets cap
       at 1024px). AVIF first, WebP as the fallback. */
    formats: ["image/avif", "image/webp"],
    deviceSizes: [420, 640, 768, 1024, 1280, 1536, 1920, 2560],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    /* Next 16 defaults to [75]; 68 is enough for these photographs and shaves a
       meaningful amount off the gallery pages. 75 is the item heroes' measured
       LCP setting (C+ contract C8). 90 served only the /design-3 drafts and
       left with them. */
    qualities: [68, 75],
    minimumCacheTTL: 31_536_000,
  },

  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      ...legacyImageRedirects(),
    ];
  },

  async headers() {
    return [
      /* Declaring the headers is not serving them: the first version of this
         file defined SECURITY_HEADERS and never listed it here, and
         qa/security-headers.mts caught every route going out without them. */
      { source: "/:path*", headers: SECURITY_HEADERS },
      /* /contact frames the booking form. A later entry that sets the same key
         overrides the earlier one ("Header Overriding Behavior" in the
         next.config headers docs), and a CSP value is replaced, not merged, so
         this is a complete policy that differs only in frame-src.
         Only emitted when it has headers: in development cspHeaders() is empty,
         and Next rejects an entry with `headers: []` at startup ("Invalid
         header found"). That crashed `next dev` for 634f538 while every
         production build and live check passed. */
      ...(cspHeaders(MONDAY_FORMS).length > 0
        ? [{ source: "/contact", headers: cspHeaders(MONDAY_FORMS) }]
        : []),
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
