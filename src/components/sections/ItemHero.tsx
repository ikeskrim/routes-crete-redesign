"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";

import { SplitLines } from "@/components/ui/SplitLines";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion";

/** Full-bleed hero for a detail page. Shorter than the homepage's, so the
 *  story starts before the fold rather than after a second full screen. */
export function ItemHero({
  eyebrow,
  title,
  subtitle,
  image,
  blurDataURL,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  image: string;
  blurDataURL?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotionSafe();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "38%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section
      ref={ref}
      data-hero
      className="grain relative flex h-[82svh] min-h-[30rem] items-end overflow-hidden bg-ocean-950"
    >
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={reduced ? undefined : { y: imageY }}
      >
        <motion.div
          className="absolute inset-[-4%] will-change-transform"
          initial={reduced ? false : { scale: 1 }}
          animate={reduced ? undefined : { scale: 1.06 }}
          transition={{ duration: 16, ease: "linear" }}
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

      <div aria-hidden className="scrim absolute inset-0" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(120%_85%_at_72%_18%,transparent_22%,rgba(4,20,29,0.58)_100%)]"
      />
      <div aria-hidden className="grain-overlay" />

      <motion.div
        style={reduced ? undefined : { y: contentY, opacity: contentOpacity }}
        className="relative mx-auto w-full max-w-[92rem] px-6 pb-14 sm:px-8 lg:px-12 lg:pb-20"
      >
        <motion.div
          data-reveal
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-4"
        >
          <span aria-hidden className="h-px w-10 bg-gold-400/70" />
          <p className="text-eyebrow uppercase text-gold-300">{eyebrow}</p>
        </motion.div>

        <SplitLines
          as="h1"
          text={title}
          onMount
          delay={0.26}
          stagger={0.1}
          duration={1.2}
          className="mt-6 max-w-[17ch] text-display-xl text-sand-50"
        />

        {/* Not opacity-gated, for the same reason as the homepage hero: this
            is the largest contentful element here, so fading it in makes it
            the LCP and pins LCP to the end of the animation chain. */}
        {subtitle && (
          <p className="text-body-lg mt-6 max-w-[42ch] text-sand-100/80">
            {subtitle}
          </p>
        )}
      </motion.div>
    </section>
  );
}
