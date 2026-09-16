import { Fraunces, Instrument_Sans, Instrument_Serif, Inter } from "next/font/google";

/**
 * The one literal list of font loaders (C+ SPEC §B.6).
 *
 * next/font needs literal options, so a `preload` flag cannot read a
 * constant: the flags below ARE the edition's preload profile, and the
 * plain-C revert flips them here (§B.9). All five loaders exist in both
 * editions; the family tokens in `src/app/edition.css` decide which faces are
 * used. A loaded-but-unused family costs its `@font-face` CSS and no font
 * bytes, because no glyph ever requests the file. Every `.variable` goes on
 * `<html>` (`fontVariables`, root layout). Self-hosted by next/font: no request
 * leaves the origin. `adjustFontFallback` stays at its default (true) on every
 * call, so the metric fallback holds line boxes while a face swaps in.
 *
 * Preloaded in C+ (§K.1): Fraunces roman and Inter, two files. Manrope is
 * gone; nothing references it.
 */

/**
 * Display: Fraunces, roman. `opsz` is the only axis requested (weight is the
 * default variable axis). SOFT and WONK are never requested: shipping SOFT as
 * well once cost 118 KB for this one face and dropped the experience route
 * under the Lighthouse floor, while optical sizing is the reason this face was
 * chosen. Plain C: `preload: false`.
 */
export const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  preload: true,
});

/**
 * Display italic: only the single emphasis word in a headline, referenced
 * only through `--font-fraunces-italic` (in `--ed-em-family`). Never
 * preloaded in either edition: the file is requested only by a page that
 * renders an `em.ed-em` while `--ed-em-style` is italic (R2, §B.7, §K.4).
 */
export const frauncesItalic = Fraunces({
  variable: "--font-fraunces-italic",
  style: "italic",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  preload: false,
});

/** Text and UI: Inter (its greek file carries "Γ.Ε.ΜΗ." on use). Plain C: `preload: true`. */
export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

/** Plain C's display face; unused by C+ tokens. Plain C: `preload: true`. */
export const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

/** Plain C's text face; unused by C+ tokens. Plain C: `preload: true`. */
export const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  preload: false,
});

/** Every loader's CSS-variable class, for `<html className>`. */
export const fontVariables = [
  fraunces.variable,
  frauncesItalic.variable,
  inter.variable,
  instrumentSerif.variable,
  instrumentSans.variable,
].join(" ");
