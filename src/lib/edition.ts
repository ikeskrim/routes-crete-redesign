/**
 * The edition switches, TypeScript side (C+ SPEC §B.5).
 *
 * Contract C10: `GRADE`, `THEME_COLOR`, `DUOTONE` and `ITALIC_EMPHASIS` are
 * read only from this file. Its CSS twin is `src/app/edition.css` (Layer E);
 * together with the `preload` literals in `src/app/fonts.ts` they are the
 * whole of a token-level edition revert (§B.9). Plain C: `GRADE` "c",
 * `THEME_COLOR` "#faf4e8", `DUOTONE` false, `ITALIC_EMPHASIS` false.
 */

/**
 * The photo grade letter: `/images/graded/<letter>/…`.
 *
 * "d" from the S9 integration on; `src/lib/content.ts` imports it and keeps
 * no literal of its own. qa/parity.mts reads the letter from this file (one
 * line-start declaration, exactly once).
 */
export const GRADE = "d";

/** `viewport.themeColor` in the root layout: the paper ground (§H.4). */
export const THEME_COLOR = "#f6f0e4";

/**
 * The back-cover plate uses the terracotta duotone derivative when this is on
 * and the file exists (`duotonePath()`); off renders the plain graded frame in
 * the same slot with the same caption (§E.3).
 */
export const DUOTONE = true;

/**
 * Headlines wrap their emphasis word in `em.ed-em` (SplitLines `emphasis`,
 * `<Emphasis>`). Whether that word LOOKS italic is decided in CSS by
 * `--ed-em-style` / `--ed-em-family` (§B.7): roman in R1, italic only after
 * the §K.4 budget gate.
 */
export const ITALIC_EMPHASIS = true;
