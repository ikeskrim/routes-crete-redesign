import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";

import styles from "./c-plus.module.css";

/**
 * TEMPORARY — /design-3/c-plus, direction C+ "Warm Editorial, printed"
 * (.hunt/cplus/spec/SPEC.md §0.1). Deleted with the other drafts after the
 * record is closed (see ../layout.tsx).
 *
 * Fonts, one loader call per family:
 * - Fraunces roman (opsz axis, variable weight) and Inter are already loaded
 *   by the root layout (--font-serif, --font-inter); the draft's family tokens
 *   read `var(--font-fraunces, var(--font-serif))`, so they survive the S5
 *   variable rename without a second roman loader here.
 * - Fraunces ITALIC is the one family only this draft loads: the draft is
 *   where the italic emphasis word is judged (spec §B.6, §K.4; Lighthouse on
 *   the draft is information only). Only the opsz axis is requested.
 */
const italic = Fraunces({
  variable: "--font-fraunces-italic",
  style: "italic",
  axes: ["opsz"],
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

/* §0.1: no robots key. noindex, nofollow is inherited from ../layout.tsx:
   segment metadata merges shallowly, and a key this layout does not set keeps
   the parent's value (node_modules/next/dist/docs, generate-metadata "Merging"). */
export const metadata: Metadata = {
  title: "C+ · Warm Editorial",
};

/* §B.5 THEME_COLOR (C+) and §H.4: the browser chrome matches the paper cover
   instead of the root layout's dark ocean #04141d. */
export const viewport: Viewport = {
  themeColor: "#f6f0e4",
  colorScheme: "light",
};

export default function WarmEditorialPrintedLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${italic.variable} ${styles.root}`}>{children}</div>;
}
