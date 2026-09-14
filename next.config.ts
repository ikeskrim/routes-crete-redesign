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

  return [...pairs.entries()]
    // Non-ASCII source paths can't be matched reliably by the router.
    .filter(([source]) => /^[\x20-\x7E]*$/.test(source))
    .map(([source, destination]) => ({
      source,
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
 * STRICT-TRANSPORT-SECURITY — two years, but WITHOUT includeSubDomains or
 * preload. Those two commit the whole routescrete.gr domain, every subdomain
 * included, to HTTPS in browsers' built-in lists, which is hard to undo; that
 * is a domain decision and belongs to the cutover, taken with the client.
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
   report-only header goes away. */
const FRAME_SCOPE: "trial" | "enforced" = "trial";

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

const SECURITY_HEADERS = [
  ...cspHeaders("'none'"),
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
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
       meaningful amount off the gallery pages. */
    qualities: [68, 75, 90],
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
         this is a complete policy that differs only in frame-src. */
      { source: "/contact", headers: cspHeaders(MONDAY_FORMS) },
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
