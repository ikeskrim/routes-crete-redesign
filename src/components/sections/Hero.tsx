"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion";

import { Button } from "@/components/ui/Button";
import { Magnetic } from "@/components/ui/Cinematic";
import { SplitLines } from "@/components/ui/SplitLines";

/**
 * Fullscreen cinematic hero.
 *
 * Three layers move independently: a very slow Ken Burns push on the
 * photograph (12–15s, transform only), a scroll-driven parallax drift, and the
 * headline lifting away as you leave. Everything degrades to a still frame
 * under prefers-reduced-motion.
 */
export function Hero({
  eyebrow,
  heading,
  subheading,
  image,
  blurDataURL,
  primaryCta,
  secondaryCta,
}: {
  eyebrow: string;
  heading: string;
  subheading: string;
  image: string;
  blurDataURL?: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotionSafe();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "48%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  return (
    <section
      ref={ref}
      data-hero
      className="grain relative flex h-[100svh] min-h-[34rem] items-end overflow-hidden bg-ocean-950"
    >
      {/* Photograph: scroll parallax on the outer layer, Ken Burns on the
          inner one, so the two never fight for the same transform. */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={reduced ? undefined : { y: imageY }}
      >
        <motion.div
          className="absolute inset-[-4%] will-change-transform"
          initial={reduced ? false : { scale: 1 }}
          animate={reduced ? undefined : { scale: 1.07 }}
          transition={{ duration: 14, ease: "linear" }}
        >
          <Image
            src={image}
            alt=""
            fill
            priority
            fetchPriority="high"
            quality={75}
            sizes="100vw"
            placeholder={blurDataURL ? "blur" : undefined}
            blurDataURL={blurDataURL}
            className="object-cover"
          />
        </motion.div>
      </motion.div>

      {/* Layered cinematic scrim: a vertical film gradient plus a soft corner
          vignette, so the type has contrast without flattening the image. */}
      <div aria-hidden className="scrim absolute inset-0" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(120%_85%_at_70%_15%,transparent_25%,rgba(4,20,29,0.55)_100%)]"
      />
      <div aria-hidden className="grain-overlay" />

      <motion.div
        style={reduced ? undefined : { y: contentY, opacity: contentOpacity }}
        className="relative mx-auto w-full max-w-[92rem] px-6 pb-16 sm:px-8 lg:px-12 lg:pb-24"
      >
        <motion.div
          data-reveal
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-4"
        >
          <span aria-hidden className="h-px w-10 bg-gold-400/70" />
          <p className="text-eyebrow uppercase text-gold-300">{eyebrow}</p>
        </motion.div>

        <SplitLines
          as="h1"
          text={heading}
          onMount
          delay={0.3}
          stagger={0.11}
          duration={1.25}
          className="mt-7 max-w-[15ch] text-display-2xl text-sand-50"
        />

        <motion.div
          data-reveal
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"
        >
          <p className="text-body max-w-[38ch] text-sand-100/75">{subheading}</p>

          <div className="flex flex-wrap items-center gap-3">
            <Magnetic>
              <Button href={primaryCta.href} size="lg" variant="primary">
                {primaryCta.label}
              </Button>
            </Magnetic>
            <Magnetic>
              <Button href={secondaryCta.href} size="lg" variant="onDark">
                {secondaryCta.label}
              </Button>
            </Magnetic>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        aria-hidden
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 1.3 }}
        style={reduced ? undefined : { opacity: contentOpacity }}
        className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 lg:block"
      >
        <span className="block h-14 w-px overflow-hidden bg-sand-100/20">
          <motion.span
            className="block h-1/2 w-full bg-gold-400/90"
            initial={{ y: "-100%" }}
            animate={reduced ? { y: 0 } : { y: ["-100%", "200%"] }}
            transition={
              reduced
                ? undefined
                : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
            }
          />
        </span>
      </motion.div>
    </section>
  );
}
