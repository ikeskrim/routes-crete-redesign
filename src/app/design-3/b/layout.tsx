import type { Metadata } from "next";
import { Outfit } from "next/font/google";

import styles from "./b.module.css";

/**
 * TEMPORARY — /design-3/b, direction B "Cycladic Light". Deleted with the
 * other drafts after the client's pick (see ../layout.tsx).
 *
 * Outfit carries the display voice: 300 for the big airy headlines, 500/600
 * for small caps and buttons (400 for card titles). It is loaded as its one
 * variable file, latin only — this Next's Turbopack font loader rejects a
 * weight range ("Unknown weight 300 600"), and an array of static weights
 * would ship three files instead of one.
 *
 * Inter (400/500 body) is NOT loaded here: the root layout already registers
 * the same variable Inter as --font-inter, and loading it a second time only
 * registered a duplicate face. b.module.css reads that variable.
 */
const outfit = Outfit({
  variable: "--font-cy-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "B · Cycladic Light",
  robots: { index: false, follow: false },
};

export default function CycladicLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${outfit.variable} ${styles.root}`}>{children}</div>;
}
