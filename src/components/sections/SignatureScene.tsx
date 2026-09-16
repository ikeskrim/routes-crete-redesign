import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Plate } from "@/components/ui/Plate";
import { SplitLines } from "@/components/ui/SplitLines";
import { getImageSize } from "@/lib/content";
import { cn } from "@/lib/utils";

import styles from "./SignatureScene.module.css";

export interface Scene {
  label: string;
  text: string;
  /** Graded operator photograph. */
  image: string;
}

/**
 * Movement III, the signature journey as a photo essay (C+ SPEC §D.4, as
 * built and paced in the frozen draft). Server component: the GSAP pinned
 * film, ScrollTrigger, the Lenis bridge, the chapter state and the progress
 * ticks have left the homepage (§G.2, §K.2).
 *
 * Night ground with its density and grain layers under the plates; folio III,
 * the journey's title and a rule link to its page; then five chapters in the
 * journey's own order. Each chapter is a row as tall as its photograph, with
 * its numeral, label and text in a column that holds still (sticky) while the
 * photograph scrolls past, under reduced motion too. Phones: the plate full
 * bleed, then the numeral, label and text.
 *
 * Pacing (chapters keep the content order): 1 a wide crop that keeps most of
 * the midday sky out; 2 mirrored, the plate bleeding left and the text on the
 * right; 3 as set; 4 one wide breath across the content width (the sources
 * are 1024 px, so never stretched to full bleed) with its text under it; any
 * portrait source (5) an inset 4:5 plate.
 *
 * Chapter texts are the experience's own paragraphs, referenced by index;
 * the content's `**` emphasis markers are markup, not words, and are not
 * printed (parity strips them too). Each is a `[data-split-source]`
 * paragraph that rises once. The photographs are operator frames: `alt=""`,
 * no caption, lazy, unclipped once from their bleed edge.
 *
 * Kept: `section#signature[data-scene]`. Retired: `data-scene-image`,
 * `data-scene-inner` (no guard reads them).
 */
export function SignatureScene({
  eyebrow,
  title,
  scenes,
  href,
  ctaLabel = "Read the full journey",
}: {
  eyebrow: string;
  title: string;
  scenes: Scene[];
  href: string;
  ctaLabel?: string;
}) {
  return (
    <section
      id="signature"
      data-scene=""
      aria-labelledby="signature-heading"
      className={cn("grain", styles.section)}
    >
      <div aria-hidden="true" className="night-density absolute inset-0 pointer-events-none" />
      <div aria-hidden="true" className="grain-overlay" />

      <div className={cn("ed-grid", styles.head)}>
        <Eyebrow folio="III" tone="night" className={styles.folio}>
          {eyebrow}
        </Eyebrow>
        <h2 id="signature-heading" className={cn("text-section", styles.title)}>
          {title}
        </h2>
        <Button variant="rule" tone="night" href={href} className={styles.read}>
          {ctaLabel}
        </Button>
      </div>

      {scenes.map((scene, i) => {
        const size = getImageSize(scene.image);
        const portrait = size ? size.height > size.width : false;
        const sky = !portrait && i === 0;
        const mirror = !portrait && i === 1;
        const wide = !portrait && i === 3;
        return (
          <article
            key={scene.label}
            className={cn(
              "ed-grid",
              styles.chapter,
              mirror && styles.mirror,
              wide && styles.wide,
            )}
          >
            <Plate
              src={scene.image}
              alt=""
              ratio={portrait ? "4 / 5" : sky || wide ? undefined : "3 / 2"}
              sizes={
                portrait
                  ? "(min-width: 1024px) 36vw, 100vw"
                  : wide
                    ? "(min-width: 1024px) 90vw, 100vw"
                    : "(min-width: 1024px) 64vw, 100vw"
              }
              /* the unclip opens from the bleed edge (inset plates from the left) */
              bleed={portrait || wide ? undefined : mirror ? "left" : "right"}
              unclip
              className={portrait ? styles.platePortrait : styles.plate}
              frameClassName={sky ? styles.frameSky : wide ? styles.frameWide : undefined}
              imgClassName={
                portrait ? styles.cropPortrait : sky ? styles.cropSky : wide ? styles.cropWide : undefined
              }
            />
            <div className={styles.text}>
              <div className={styles.chapterHead}>
                <span aria-hidden="true" className={cn("text-folio", styles.numeral)}>
                  {i + 1}
                </span>
                <p className={cn("text-caption-place", styles.label)}>{scene.label}</p>
              </div>
              <SplitLines
                as="p"
                text={scene.text.replace(/\*\*/g, "")}
                stagger={0.06}
                className={cn("text-deck", styles.body)}
              />
            </div>
          </article>
        );
      })}
    </section>
  );
}
