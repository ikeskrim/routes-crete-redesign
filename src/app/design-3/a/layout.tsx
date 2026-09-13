import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";

import styles from "./a.module.css";

/**
 * TEMPORARY — /design-3/a, direction A "Deep Aegean". Deleted with the other
 * drafts after the client's pick (see ../layout.tsx).
 *
 * Cormorant Garamond carries the display voice: 300 for the hero and the
 * statement, 400 for the wordmark and card titles, 400 italic for subtitles.
 * Jost 400/500 for body, labels and UI.
 *
 * Both load as their variable files (latin only): one upright and one italic
 * Cormorant file, one Jost file. This Next's font loader rejects weight RANGES,
 * and an array of static weights would ship more files, not fewer.
 */
const display = Cormorant_Garamond({
  variable: "--font-dae-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const body = Jost({
  variable: "--font-dae-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "A · Deep Aegean",
  robots: { index: false, follow: false },
};

export default function DeepAegeanLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} ${body.variable} ${styles.root}`}>{children}</div>;
}
