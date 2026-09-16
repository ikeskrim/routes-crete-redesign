import { Button } from "@/components/ui/Button";
import { Caption } from "@/components/ui/Caption";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Plate } from "@/components/ui/Plate";
import { SplitLines } from "@/components/ui/SplitLines";
import { photoCredit } from "@/lib/photo-credit";
import { cn } from "@/lib/utils";

import styles from "./Hero.module.css";

/**
 * The cover (C+ SPEC §D.4): movement one, a printed page. Server component.
 *
 * A paper page with the headline set across it and a photographic plate that
 * runs off the right edge (desktop) or both edges (phones). The last line of
 * the headline is printed on the plate's sky (`data-on-photo`, measured by
 * text-contrast against the photograph); every other line sits on paper.
 *
 *   ≥1024  "Explore the unknown" / "side of Crete" (line 2 starts on column 5,
 *          where the plate starts); the margin column beside the plate holds
 *          the deck, the CTAs and, from 1280, the hung caption.
 *   <1024  "Explore the" / "unknown" / "side of Crete"; the plate full bleed
 *          at its native 3:2, the caption under it, then the deck and CTAs.
 *
 * One DOM for both: three line spans, the first two run inline on desktop.
 * Every piece of the composition is in em of the cover size or in reserved
 * `lh`/`rem` rows, so a font swap changes widths only (CLS, §K.3).
 *
 * The plate is whatever `site.hero.backgroundImage` points at. Its caption and
 * `alt` come from the photo ledger for that file, so an operator photograph
 * (no ledger record) has neither, and the ledgered dusk coast gets its subject
 * and credit. The crops put the top band of the frame under the printed line:
 * the amber sky of the dusk coast, the blue sky of the olive-grove frame.
 *
 * Motion (§G.1 #1, #4): the plate pushes in from scale(1) in CSS
 * (`ken-burns-cover`, first frame painted unclipped, never gated on
 * hydration); the headline is set, not risen. Under reduced motion the cover
 * is the same composition, still. The kinetic cursor, parallax, lift-away
 * and scroll cue are retired (§G.2).
 */

/**
 * The phone split around the emphasis word: the words before it, the word
 * alone, the words after it. Desktop runs the first two spans as one line.
 * `undefined` (a measured, wrapping headline) if the content no longer has the
 * word inside it, so a copy edit never breaks the headline's text.
 */
function coverLines(text: string, word: string): string[] | undefined {
  const words = text.split(" ");
  const at = words.indexOf(word);
  if (at < 1 || at > words.length - 2) return undefined;
  return [words.slice(0, at).join(" "), words[at], words.slice(at + 1).join(" ")];
}

export function Hero({
  eyebrow,
  heading,
  subheading,
  image,
  primaryCta,
  secondaryCta,
}: {
  eyebrow: string;
  heading: string;
  subheading: string;
  /** The graded plate (`graded(site.hero.backgroundImage)`). */
  image: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
}) {
  const credit = photoCredit(image);
  const alt = credit?.caption ?? "";
  /* §C.13: "unknown" is the cover's one emphasis word, line-final on desktop
     and alone on its line on phones (the same literal as `emphasis` below). */
  const lines = coverLines(heading, "unknown");

  return (
    <section
      data-hero=""
      data-hero-tone="light"
      aria-labelledby="cover-heading"
      className={cn("ed-grid paper-stock", styles.cover)}
    >
      <div aria-hidden="true" className="paper-stock-layer" />

      <Eyebrow className={styles.head}>{eyebrow}</Eyebrow>

      <SplitLines
        as="h1"
        id="cover-heading"
        text={heading}
        lines={lines}
        emphasis="unknown"
        reveal={false}
        className={cn("text-cover", styles.h1)}
        lineClassName={[styles.l0, styles.l1, styles.l2]}
        onPhotoLine={2}
      />

      <Plate
        cover
        src={image}
        alt={alt}
        sizes="(min-width: 1024px) 67vw, 100vw"
        preload
        fetchPriority="high"
        quality={68}
        bleed="right"
        className={styles.plate}
        frameClassName={styles.frame}
        imgClassName={styles.img}
        caption={
          credit ? (
            <Caption file={image} placement="margin" imageAlt={alt} className={styles.caption} />
          ) : undefined
        }
      />

      <div className={styles.margin}>
        {/* Never opacity-gated: the deck paints with the page. */}
        <p className={cn("text-deck", styles.deck)}>{subheading}</p>
        <div className={styles.ctas}>
          <Button variant="gold" href={primaryCta.href}>
            {primaryCta.label}
          </Button>
          <Button variant="rule" href={secondaryCta.href}>
            {secondaryCta.label}
          </Button>
        </div>
      </div>
    </section>
  );
}
