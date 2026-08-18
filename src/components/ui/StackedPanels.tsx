"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";

import { useReducedMotionSafe } from "@/lib/use-reduced-motion";
import { cn, pad } from "@/lib/utils";

export interface StackedPanel {
  /** Small uppercase label above the statement. */
  eyebrow: string;
  /** The centred statement. Kept short — this is punctuation, not prose. */
  statement: string;
  /** Optional supporting line beneath. */
  detail?: string;
  image?: string;
  blurDataURL?: string;
}

/**
 * A section that holds while its content transitions, then releases.
 *
 * Generalises the machinery proven in the signature scene. The section is
 * `panels.length` viewports tall; an inner sticky frame pins the view while
 * scroll progress crossfades the imagery and advances the statement, and the
 * page carries on when the last panel is done.
 *
 * Deliberately built on `position: sticky` plus scroll progress rather than a
 * ScrollTrigger pin: sticky needs no pin-spacer, cannot desynchronise from
 * Lenis, and reflows correctly on resize for free.
 *
 * Under prefers-reduced-motion the pin is dropped entirely and the panels
 * render as a plain stacked sequence.
 */
export function StackedPanels({
  panels,
  id,
  className,
}: {
  panels: StackedPanel[];
  id?: string;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotionSafe();
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = Math.min(
      panels.length - 1,
      Math.max(0, Math.floor(v * panels.length + 0.12)),
    );
    setActive((current) => (current === next ? current : next));
  });

  /* Ambient: the imagery drifts the whole way through the hold, so the scene
     is never fully still even while the statement is settled. */
  const drift = useTransform(scrollYProgress, [0, 1], ["-3%", "3%"]);
  const zoom = useTransform(scrollYProgress, [0, 1], [1.06, 1.14]);

  /* Layered depth: the words travel the opposite way to the photograph behind
     them, and a third of the distance. Parallax reads as depth only when the
     planes disagree — matching rates just looks like the whole scene sliding.
     Transform only, so it composites and costs no layout. */
  const textDrift = useTransform(scrollYProgress, [0, 1], ["1.4%", "-1.4%"]);
  const vignetteScale = useTransform(scrollYProgress, [0, 1], [1.08, 1]);

  if (reduced) {
    return (
      <section
        id={id}
        data-stacked
        className={cn("grain relative bg-olive-700 py-section-lg", className)}
      >
        <div aria-hidden className="grain-overlay" />
        <div className="relative mx-auto flex max-w-[92rem] flex-col gap-20 px-6 sm:px-8 lg:px-12">
          {panels.map((panel, i) => (
            <article key={i} className="max-w-[36ch]">
              <p className="text-eyebrow uppercase text-gold-300">
                {pad(i + 1)} — {panel.eyebrow}
              </p>
              <p className="text-display-md mt-5 text-sand-50">{panel.statement}</p>
              {panel.detail && (
                <p className="text-body mt-5 text-sand-200/75">{panel.detail}</p>
              )}
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      ref={ref}
      data-stacked
      className={cn("relative bg-olive-700", className)}
      style={{ height: `${panels.length * 100}svh` }}
    >
      <div className="grain sticky top-0 flex h-[100svh] items-center overflow-hidden">
        {/* Imagery: one layer per panel, crossfading. */}
        {panels.map((panel, i) =>
          panel.image ? (
            <motion.div
              key={i}
              className="absolute inset-0"
              animate={{ opacity: i === active ? 1 : 0 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                className="absolute inset-[-8%] will-change-transform"
                style={{ y: drift, scale: zoom }}
              >
                <Image
                  src={panel.image}
                  alt=""
                  fill
                  quality={68}
                  sizes="100vw"
                  placeholder={panel.blurDataURL ? "blur" : undefined}
                  blurDataURL={panel.blurDataURL}
                  className="object-cover"
                />
              </motion.div>
            </motion.div>
          ) : null,
        )}

        {/* The photograph is atmosphere, not subject. Side by side with the
            benchmark a 72% wash left the image still legible and the statement
            reading washy; the reference holds its centred statements on a
            near-black ground. Deeper wash plus a vignette gives the type the
            same punch while the imagery still drifts behind it. */}
        <div aria-hidden className="absolute inset-0 bg-olive-700/90" />
        <motion.div
          aria-hidden
          style={{ scale: vignetteScale }}
          className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_50%,transparent_10%,rgba(20,23,26,0.55)_100%)] will-change-transform"
        />
        <div aria-hidden className="grain-overlay" />

        {/* Sticky chapter index: a vertical ledger pinned to the edge for the
            whole hold, so you always know how far through the scene you are.
            Hidden on small screens, where the horizontal ledger below carries
            it instead. */}
        <div
          aria-hidden
          className="absolute top-1/2 left-6 hidden -translate-y-1/2 flex-col gap-4 lg:left-12 lg:flex"
        >
          {panels.map((_, i) => (
            <span key={i} className="flex items-center gap-3">
              <span
                className={cn(
                  "h-px transition-all duration-700 ease-luxe",
                  i === active ? "w-8 bg-gold-400" : "w-4 bg-sand-100/30",
                )}
              />
              <span
                className={cn(
                  "font-display text-eyebrow tabular-nums transition-colors duration-700",
                  i === active ? "text-gold-300" : "text-sand-100/35",
                )}
              >
                {pad(i + 1)}
              </span>
            </span>
          ))}
        </div>

        {/* Centred statement — punctuation between the lighter sections. */}
        <motion.div
          style={{ y: textDrift }}
          className="relative mx-auto w-full max-w-[92rem] px-6 text-center will-change-transform sm:px-8 lg:px-12"
        >
          {panels.map((panel, i) => (
            <div
              key={i}
              aria-hidden={i !== active}
              className={cn(
                "ease-luxe",
                i === active
                  ? "opacity-100 transition-opacity delay-300 duration-500"
                  : "pointer-events-none absolute inset-x-0 top-0 opacity-0 transition-opacity duration-200",
              )}
            >
              {/* pad(i + 1), NOT the section `index` prop. This read the
                  component-level section number inside a per-panel loop, so
                  all three statements printed the same "03 ·" while the
                  ledger below them counted 01 02 03 correctly — the two
                  disagreed on screen. The reduced-motion branch above always
                  had this right. */}
              <p className="text-eyebrow uppercase text-gold-300">
                {`${pad(i + 1)} · `}
                {panel.eyebrow}
              </p>
              <p className="text-display-lg mx-auto mt-7 max-w-[20ch] text-balance text-sand-50">
                {panel.statement}
              </p>
              {panel.detail && (
                <p className="text-body mx-auto mt-7 max-w-[46ch] text-sand-100/75">
                  {panel.detail}
                </p>
              )}
            </div>
          ))}

          {/* Ledger */}
          <div className="mt-14 flex items-center justify-center gap-3">
            {panels.map((_, i) => (
              <span
                key={i}
                aria-hidden
                className={cn(
                  "font-display text-eyebrow tabular-nums transition-colors duration-500",
                  i === active ? "text-gold-300" : "text-sand-100/35",
                )}
              >
                {pad(i + 1)}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
