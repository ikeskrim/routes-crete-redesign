import type { MetadataRoute } from "next";

import { getSite } from "@/lib/content";

export default function robots(): MetadataRoute.Robots {
  const site = getSite();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${site.brand.url}/sitemap.xml`,
    host: site.brand.url,
  };
}
