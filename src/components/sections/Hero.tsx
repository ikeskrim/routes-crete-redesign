"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Fullscreen cinematic hero.
 *
 * The photograph drifts slower than the page and the headline lifts away as you
 * scroll — both driven by scroll progress on transform/opacity only, so the
 * whole scene stays on the compositor.
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
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.06, 1.16]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "42%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const words = heading.split(" ");

  return (
    <section
      ref={ref}
      data-hero
      className="grain relative flex h-[100svh] min-h-[36rem] items-end overflow-hidden bg-ocean-950"
    >
      {/* Photograph */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={reduced ? undefined : { y: imageY, scale: imageScale }}
      >
        <Image
          src={image}
          alt=""
          fill
          priority
          quality={90}
          sizes="100vw"
          placeholder={blurDataURL ? "blur" : undefined}
          blurDataURL={blurDataURL}
          className="object-cover"
        />
      </motion.div>

      <div aria-hidden className="scrim absolute inset-0" />
      <div aria-hidden className="grain-overlay" />

      {/* Copy */}
      <motion.div
        style={reduced ? undefined : { y: contentY, opacity: contentOpacity }}
        className="relative mx-auto w-full max-w-[92rem] px-6 pb-20 sm:px-8 lg:px-12 lg:pb-28"
      >
        <motion.p
          data-reveal
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="text-eyebrow uppercase text-gold-300"
        >
          {eyebrow}
        </motion.p>

        <h1 className="mt-6 max-w-[18ch] text-display-2xl text-sand-50">
          {words.map((word, i) => (
            <span key={i} className="inline-block overflow-hidden align-bottom">
              <motion.span
                data-reveal
                className="inline-block"
                initial={reduced ? false : { y: "100%" }}
                animate={{ y: 0 }}
                transition={{
                  duration: 1.05,
                  delay: 0.25 + i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {word}
                {i < words.length - 1 && " "}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.div
          data-reveal
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"
        >
          <p className="text-body-lg max-w-[34ch] text-sand-100/85">
            {subheading}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button href={primaryCta.href} size="lg" variant="primary">
              {primaryCta.label}
            </Button>
            <Button href={secondaryCta.href} size="lg" variant="onDark">
              {secondaryCta.label}
            </Button>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        aria-hidden
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.1 }}
        style={reduced ? undefined : { opacity: contentOpacity }}
        className={cn(
          "absolute bottom-8 left-1/2 hidden -translate-x-1/2 lg:block",
        )}
      >
        <span className="block h-12 w-px overflow-hidden bg-sand-100/25">
          <motion.span
            className="block h-full w-full bg-gold-400"
            initial={{ y: "-100%" }}
            animate={reduced ? { y: 0 } : { y: ["-100%", "100%"] }}
            transition={
              reduced
                ? undefined
                : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
            }
          />
        </span>
      </motion.div>
    </section>
  );
}
