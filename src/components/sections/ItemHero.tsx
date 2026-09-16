import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { SplitLines } from "@/components/ui/SplitLines";
import { cn } from "@/lib/utils";

/* Advance per character of these titles in the statement cut, in em,
   measured on the shared dev server (title-metrics, report.md): the metric
   fallback face 0.451–0.465, Fraunces at "opsz" 144 0.353–0.361. */
const FALLBACK_EM_PER_CHAR = 0.5; // the fallback's widest, plus 7 % slack
const FRAUNCES_EM_PER_CHAR = 0.35; // Fraunces's narrowest, rounded down

/**
 * The title's measure from 640 up, in em of the title's own size.
 *
 * Why: the metric fallback face sets these titles about 28 % wider than
 * Fraunces at its display optical size (19.85 em against 15.53 em for the
 * Tradition title). Left to the column (and the 17ch measure, which is itself
 * a width of the face in use), a title took three lines before the web font
 * arrived and two after, and the bottom-anchored hero text jumped (CLS 0.027
 * at 1440 with the fonts held for 3 s, the §K.3 method).
 *
 * How: split the title, by characters, into the fewest balanced lines (one up
 * to 20 characters, two up to 48, three beyond; the split that makes the
 * longest line shortest), and set the measure to that longest line in the
 * fallback's widest advance. Then the fallback face needs no more lines than
 * the split has, and Fraunces, about 28 % narrower, still needs as many,
 * because its whole title is wider than the measure times one line fewer.
 * Checked for each title (`stable`); a title that fails the check keeps the
 * column's width. The title stays one text node (a separate node per line
 * would move whenever the line before it changed width), and it keeps the
 * balanced wrapping of every headline.
 *
 * Below 640 the measure is the phone's column, but never wider than the 390
 * phone's (`PHONE_MEASURE_EM`). Measured with fonts blocked and loaded
 * (.hunt/cplus/rollout/g6/title-lines-1.log, cls-items-1.log): at 390 both
 * faces set these titles in the same lines, but a wider phone column let
 * Fraunces take one line fewer than the fallback (412 and 560 px, both
 * measured titles), and the hero text moved when the font arrived (CLS
 * 0.011–0.015). Held to the 390 measure, every phone from 390 to 639 sets
 * the 390 lines. Narrower than 390 the column is the measure (360: the
 * transfer title still differs, an open issue in the G6 record).
 */
function heroMeasure(title: string): number | null {
  const words = title.split(" ");
  const length = title.length;
  const count = length <= 20 || words.length < 2 ? 1 : length <= 48 || words.length < 3 ? 2 : 3;

  let longest = length;
  const search = (start: number, left: number, most: number) => {
    if (left === 1) {
      longest = Math.min(longest, Math.max(most, words.slice(start).join(" ").length));
      return;
    }
    for (let end = start + 1; end <= words.length - (left - 1); end++) {
      search(end, left - 1, Math.max(most, words.slice(start, end).join(" ").length));
    }
  };
  search(0, count, 0);

  const measure = longest * FALLBACK_EM_PER_CHAR;
  const stable = count === 1 || length * FRAUNCES_EM_PER_CHAR > measure * (count - 1);
  return stable ? Math.round(measure * 100) / 100 : null;
}

/* The 390 phone's column (350 px) in em of the phone statement step (42 px). */
const PHONE_MEASURE_EM = 8.33;

/* The narrowest column the title is set in, in em of the statement step:
   the content width at 360 (320 px at 42 px) and `col 1 / span 8` from 1024
   up (measured 11.01–11.14 em; 640–1023 is wider still, 13.7 em and up). */
const PHONE_COLUMN_EM = 7.6;
const WIDE_COLUMN_EM = 11;

/* Words a line should not end on (articles, short prepositions). */
const WEAK_END = /^(?:a|an|the|of|to|in|on|at|by|for|and|or)$/i;

/**
 * A title with a spaced en dash ("Kourtaliotis – The Temple of Nature"),
 * set as pre-split lines so no line ends on the article after the dash.
 * Typography only: the lines join back to the title, character for
 * character (SplitLines checks).
 *
 * Three lines: the name with its dash, then the rest in two balanced parts
 * that never end on a short word. On phones all three are set as lines
 * ("Kourtaliotis –" / "The Temple" / "of Nature"); from 640 up the last two
 * run as one line ("Kourtaliotis –" / "The Temple of Nature"). Every line is
 * checked to fit its narrowest column in the fallback face's widest advance,
 * so the line count is the same before and after the web font arrives (no
 * shift). A title that fails the check keeps the measured setting.
 */
function dashLines(title: string): string[] | null {
  const at = title.indexOf(" – ");
  if (at <= 0) return null;
  const head = title.slice(0, at + 2);
  const words = title.slice(at + 3).split(" ").filter(Boolean);
  if (words.length < 2) return null;

  let best: { lines: [string, string]; worst: number; weak: boolean } | null = null;
  for (let i = 1; i < words.length; i++) {
    const lines: [string, string] = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
    const worst = Math.max(lines[0].length, lines[1].length);
    const weak = WEAK_END.test(words[i - 1]);
    if (!best || (best.weak && !weak) || (best.weak === weak && worst < best.worst)) {
      best = { lines, weak, worst };
    }
  }
  if (!best) return null;

  const lines = [head, ...best.lines];
  const fits = (line: string, column: number) => line.length * FALLBACK_EM_PER_CHAR <= column;
  const stable =
    lines.every((line) => fits(line, PHONE_COLUMN_EM)) &&
    fits(head, WIDE_COLUMN_EM) &&
    fits(best.lines.join(" "), WIDE_COLUMN_EM);
  return stable && lines.join(" ") === title ? lines : null;
}

/* From 640 up the two tail lines run as one: inline, with no mask padding,
   in a block-flow title (`flow-root`, so the first line's mask margin cannot
   collapse through it). The span inside each line is SplitLines' own
   `span.block`; it runs inline too. */
const RUN_ON = "sm:inline sm:overflow-visible sm:m-0 sm:p-0 sm:[&>span]:inline";

/**
 * Full-bleed hero for a detail page. Shorter than the homepage's, so the
 * story starts before the fold rather than after a second full screen.
 *
 * C+ (SPEC §D.6 item 1, §E.1, §G.1 rows 2 and 4, §B.2 "Text on photographs").
 * A server component: the scroll parallax, the content lift-away and the
 * motion-driven scale are gone (a client island less on every item route).
 *
 * - `section[data-hero][data-hero-tone="dark"]`, its photograph frame 82svh
 *   (at least 30rem), on night while the photograph loads. The frame's
 *   `overflow: clip` holds the push without making it a scroll container.
 * - The photograph fills it inside the existing CSS `ken-burns` wrapper
 *   (16 s, 1 → 1.07; still under reduced motion). It is the LCP element:
 *   `preload` + `fetchPriority="high"` + `quality={75}` as measured today,
 *   never clipped or opacity-gated (preflight P13, M1).
 * - Over it, and only for legibility (never a warmth overlay, D2): the
 *   `scrim-top` band under the transparent masthead, and the `scrim-text`
 *   gradient in `--ed-scrim`, drawn by the text block itself, so its night
 *   follows the height of the text rather than of the photograph and the
 *   picture above the text stays clear.
 * - The text on the editorial grid (`col 1 / span 8` at ≥1024, the content
 *   width below), `clamp(3.5rem, 6vw, 5rem)` above the hero's foot: the
 *   category as letter-spaced capitals, the title set in the statement step
 *   (paper, set not risen: `reveal={false}`), the subtitle in the deck step
 *   (on-night-soft). No italic on item routes (§C.2 rule 4).
 * - The category is paper, not the on-night-soft of §D.6 (measured, recorded
 *   in .hunt/cplus/rollout/g6/report.md): 12.8 px capitals sit highest in the
 *   text block, where the scrim is thinnest. On the Kourtaliotis photograph
 *   (grade D) on-night-soft needs about 80 % night behind it at every width
 *   to clear 4.5:1, which would black out the lower 60 % of the picture;
 *   paper needs about 62 %.
 * - Each of the three runs sits inside its own `[data-on-photo]` element, so
 *   text-contrast measures it against the photograph behind it: 3.0 for the
 *   title, 4.5 for the 12.8 px eyebrow and the 19 px subtitle. The eyebrow
 *   and the title are wrapped (the primitives take no data attributes); the
 *   wrapper holds nothing else.
 *
 * Structure. The section is a subgrid row of the page's editorial grid: the
 * photograph frame fills its first row and the text block sits over the
 * frame's foot in the same row (first in the document, so it is read before
 * any caption, and lifted above the frame). A ledgered photograph (the transfer's
 * harbour) takes its `caption` OFF the photograph (§D.6): a `<figure>` holds
 * only the frame and that caption, in the section's second row, so the title
 * is never inside the figure and the figure's name is the caption of the
 * photograph it holds (credits-guard C15 reads the image of the caption's own
 * figure). Below 1024 that row is the caption's own, under the photograph.
 * From 1024 it is a zero-height row: the caption hangs from the photograph's
 * foot into the facts strip's row beside the facts, and the section's box
 * stays exactly the photograph's (the masthead and the booking bar read it).
 * Both stay inside `[data-hero-tone="dark"]` with the photograph, as
 * mobile-audit U6 requires of a title under the transparent masthead.
 */
export function ItemHero({
  eyebrow,
  title,
  subtitle,
  image,
  blurDataURL,
  aspect,
  caption,
  className,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  image: string;
  blurDataURL?: string;
  /** width / height of the hero photograph, read from the file. */
  aspect?: number;
  /**
   * The photograph's `<Caption>` (a `figcaption`), for a ledgered hero. It
   * is placed in the section's second row: its own className carries
   * `row-start-2` and its columns.
   */
  caption?: ReactNode;
  /** On the section: its placement in a parent grid. */
  className?: string;
}) {
  /* What to ask the image optimiser for.
   *
   * A landscape photograph `object-cover`ed into this tall hero on a portrait
   * screen is scaled to the hero's HEIGHT, so the picture is far wider than the
   * viewport. The hero is 82svh and the Ken Burns push ends at 1.07, so the
   * covered width is under 89vh times the image's aspect ratio. Portrait
   * photographs never exceed the viewport's own width by much, so they keep
   * "100vw" and pay nothing extra. */
  const lines = dashLines(title);
  const measure = lines ? null : heroMeasure(title);
  const heroSizes =
    aspect && aspect > 1
      ? `(orientation: portrait) ${Math.ceil(89 * aspect)}vh, 100vw`
      : "100vw";

  /* The photograph: at least 82svh (and 30rem), and never shorter than the
     text over it. The frame clips the Ken Burns push (`overflow: clip`, not
     a scroll container) and is night while the photograph loads. */
  const photo = (
    <div className="relative col-[full-start/full-end] row-start-1 min-h-[max(82svh,30rem)] overflow-clip bg-night">
      <div className="ken-burns absolute inset-0">
        <Image
          src={image}
          alt=""
          fill
          preload
          fetchPriority="high"
          quality={75}
          sizes={heroSizes}
          placeholder={blurDataURL ? "blur" : undefined}
          blurDataURL={blurDataURL}
          className="object-cover"
        />
      </div>

      <div aria-hidden className="scrim-top absolute inset-0" />
    </div>
  );

  return (
    <section
      data-hero
      data-hero-tone="dark"
      className={cn(
        "relative grid grid-cols-subgrid",
        caption ? "lg:grid-rows-[auto_0px]" : undefined,
        className,
      )}
    >
      {/* The text first, so it is read before the photograph's caption; it
          sits over the photograph in the same grid row, lifted above it. */}
      <div className="scrim-text relative z-[1] col-[content-start/content-end] row-start-1 self-end pb-[clamp(3.5rem,6vw,5rem)] lg:col-[col_1/span_8]">
        <div data-on-photo="">
          <Eyebrow tone="night" className="text-on-night">
            {eyebrow}
          </Eyebrow>
        </div>

        <div
          data-on-photo=""
          className="mt-(--ed-space-pair)"
          style={
            lines
              ? undefined
              : ({ "--hero-measure": measure ?? undefined, "--phone-measure": PHONE_MEASURE_EM } as CSSProperties)
          }
        >
          {/* Measured: from 640 up the title is exactly its measure wide (it
              may pass the eighth column; the content box holds it).
              Pre-split: the lines are the measure. */}
          <SplitLines
            as="h1"
            text={title}
            lines={lines ?? undefined}
            lineClassName={lines ? [undefined, RUN_ON, RUN_ON] : undefined}
            reveal={false}
            className={cn(
              "text-statement text-on-night",
              lines
                ? "sm:flow-root"
                : measure
                  ? "max-w-[calc(var(--phone-measure)*1em)] sm:w-[calc(var(--hero-measure)*1em)] sm:max-w-none"
                  : "max-w-[min(17ch,calc(var(--phone-measure)*1em))] sm:max-w-[17ch]",
            )}
          />
        </div>

        {/* Never opacity-gated: this is next to the largest contentful
            element, and fading it in would pin LCP to the end of an
            animation chain. */}
        {subtitle && (
          <p
            data-on-photo=""
            className="mt-(--ed-space-pair) max-w-[34ch] text-deck text-on-night-soft"
          >
            {subtitle}
          </p>
        )}
      </div>

      {caption ? (
        <figure className="col-[full-start/full-end] row-span-2 row-start-1 grid grid-cols-subgrid grid-rows-subgrid">
          {photo}
          {caption}
        </figure>
      ) : (
        photo
      )}
    </section>
  );
}
