"use client";

import { Children, useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

import { useReducedMotionSafe } from "@/lib/use-reduced-motion";

/**
 * The scroll machinery for the horizontal journeys pan. Layout only — it never
 * renders a card, it wraps the ones handed to it.
 *
 * WHY THE SPLIT. `ContentCard` reaches `Media`, which imports `getBlur` from
 * the `server-only` content module. Making the whole section a client
 * component therefore pulls server code into the browser bundle and fails the
 * build outright. The cards stay server-rendered and arrive here as children;
 * this file is the only part that needs the browser.
 *
 * WHY sticky AND NOT A ScrollTrigger PIN. The brief asked for a pin; this is
 * the same call `StackedPanels` already documents for the signature scene.
 * `position: sticky` plus scroll progress needs no pin-spacer, cannot
 * desynchronise from Lenis, and reflows on resize for free. The CLS budget on
 * this project is a hard ZERO, and a pin-spacer is a block of height injected
 * into the document after hydration — exactly what that budget forbids. The
 * section's height is derived from the card count and rendered by the server,
 * so the document is its final height on the first paint. Same effect, no
 * shift.
 *
 * WHY ONE LIST. Rendering a grid for small screens and a separate track for
 * large ones would put every card in the DOM twice — including two elements
 * carrying `id="transfers"`, which `legacyAnchorMap` points the old
 * `#portfolio1` at. The duplicate would quietly break an inbound link this
 * project promised to keep working. So the layout switches in CSS, and the
 * horizontal offset travels through a custom property that only the `lg` rule
 * reads: below `lg` the transform does not exist rather than being overridden.
 */
export function JourneyTrack({
  children,
  cardVw,
  gapVw,
  leadVw,
  travelVw,
  sectionVh,
}: {
  children: React.ReactNode;
  cardVw: number;
  gapVw: number;
  leadVw: number;
  travelVw: number;
  sectionVh: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotionSafe();
  const cards = Children.toArray(children);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const pan = useTransform(scrollYProgress, [0, 1], ["0vw", `-${travelVw}vw`]);
  const progress = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  /* Below lg, under reduced motion, and whenever the track would fit the
     viewport anyway: the ordinary editorial grid, staggered. */
  const pans = !reduced && travelVw >= 8;

  if (!pans) {
    return (
      <div className="mt-16 grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:mt-24">
        {cards.map((card, i) => (
          <div key={i} className={i % 2 === 1 ? "sm:mt-28" : undefined}>
            {card}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{ "--track-h": `${sectionVh}vh` } as React.CSSProperties}
      className="mt-16 lg:relative lg:mt-24 lg:h-[var(--track-h)]"
    >
      <div className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-center lg:overflow-hidden">
        {/* `--pan` is written every frame but only READ inside the lg rule, so
            the grid below lg is never transformed at all. */}
        <motion.div
          style={{ "--pan": pan } as React.CSSProperties}
          className="grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:flex lg:translate-x-[var(--pan)] lg:items-stretch lg:gap-0 lg:will-change-transform"
        >
          <span
            aria-hidden
            style={{ width: `${leadVw}vw` }}
            className="hidden shrink-0 lg:block"
          />
          {cards.map((card, i) => (
            <div
              key={i}
              style={
                {
                  "--card-w": `${cardVw}vw`,
                  "--card-gap": `${gapVw}vw`,
                } as React.CSSProperties
              }
              className={
                (i % 2 === 1 ? "sm:mt-28 lg:mt-0 " : "") +
                "lg:w-[var(--card-w)] lg:shrink-0" +
                (i === cards.length - 1 ? "" : " lg:mr-[var(--card-gap)]")
              }
            >
              {card}
            </div>
          ))}
        </motion.div>

        {/* The only affordance telling a reader this section has a length
            rather than being stuck. */}
        <div
          aria-hidden
          className="mx-auto mt-12 hidden h-px w-[42vw] overflow-hidden bg-ink/12 lg:block"
        >
          <motion.span
            style={{ width: progress }}
            className="block h-full bg-gold-600"
          />
        </div>
      </div>
    </div>
  );
}
