import type { Metadata } from "next";

/**
 * TEMPORARY — /design-3: three live drafts of the homepage top, built for the
 * client to choose a direction from his phone before anything is rolled out
 * (brief of 2026-09-11). DELETE AFTER THE PICK, exactly:
 *
 *     git rm -r src/app/design-3 public/design3-assets qa/design3-shots.mts
 *     # then remove the "/design-3 DRAFTS" block at the end of src/app/globals.css
 *     # and the data-site-chrome attributes in Nav.tsx and Footer.tsx
 *
 * The same rules the two review pages kept: noindex, nofollow, linked from
 * nowhere public; own captures only, never qa/benchmark.
 *
 * Every draft renders the site's real content through ./_lib/draft-content.ts
 * and carries the `data-draft-page` marker, which is the only thing that
 * hides the site's own bar and footer (see globals.css).
 */
export const metadata: Metadata = {
  title: "Design directions",
  robots: { index: false, follow: false },
};

export default function DraftsLayout({ children }: { children: React.ReactNode }) {
  return <div data-draft-page>{children}</div>;
}
