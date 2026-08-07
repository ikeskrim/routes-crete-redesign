import { notFound } from "next/navigation";

import { DesignDraft, VARIANTS } from "@/components/design/DesignDraft";

/**
 * Phase 8 direction drafts — /design/a and /design/b.
 *
 * Coded previews for the taste checkpoint, not part of the site. Excluded
 * from the sitemap and marked noindex; deleted once a direction is chosen.
 */
export const metadata = {
  title: "Direction draft",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export default async function DesignPage(props: PageProps<"/design/[variant]">) {
  const { variant } = await props.params;
  if (!(variant in VARIANTS)) notFound();
  return <DesignDraft variant={variant as keyof typeof VARIANTS} />;
}
