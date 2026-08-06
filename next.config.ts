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

const nextConfig: NextConfig = {
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
