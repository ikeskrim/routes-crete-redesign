import type { MetadataRoute } from "next";

import { getExperiences, getSite, getTransfers } from "@/lib/content";

/**
 * Generated from the content files, so a new experience appears here the
 * moment its JSON is added — no edit to this file required.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSite();
  const base = site.brand.url;

  const statics: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/experiences`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/transfers`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.7 },
  ];

  const items = [...getExperiences(), ...getTransfers()].map((item) => ({
    url: `${base}${item.href}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...statics, ...items];
}
