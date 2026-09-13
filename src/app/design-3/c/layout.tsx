import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";

import styles from "./c.module.css";

/**
 * TEMPORARY — /design-3/c, direction C "Warm Editorial". Deleted with the
 * other drafts after the client's pick (see ../layout.tsx).
 *
 * Instrument Serif is the magazine display voice: the cover line, the italic
 * opening statement, the plate titles, the drop cap. It exists in one weight
 * only (400), so both of its files are static — roman and italic.
 *
 * Instrument Sans carries labels, captions and body. It is loaded as ONE
 * variable file with its width axis, so the small information labels can be
 * set a touch narrower (font-stretch 87.5%) without a second family; weights
 * used are 400, 500 and 600, all inside the one file.
 */
const serif = Instrument_Serif({
  variable: "--font-ed-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const sans = Instrument_Sans({
  variable: "--font-ed-sans",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "C · Warm Editorial",
  robots: { index: false, follow: false },
};

export default function WarmEditorialLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${serif.variable} ${sans.variable} ${styles.root}`}>{children}</div>;
}
