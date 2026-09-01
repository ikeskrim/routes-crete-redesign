"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion";

import { Button } from "@/components/ui/Button";
import { Magnetic } from "@/components/ui/Cinematic";
import { SplitLines } from "@/components/ui/SplitLines";

/**
 * Fullscreen cinematic hero.
 *
 * Four layers move independently: a very slow Ken Burns push on the
 * photograph (12–15s, transform only), a scroll-driven parallax drift, the
 * headline lifting away as you leave, and a kinetic response to the pointer.
 * Everything degrades to a still frame under prefers-reduced-motion.
 *
 * The kinetic layer is deliberately cheap. Pointer position is written into
 * motion values and consumed by transforms, so a mousemove costs a composited
 * transform and NOT a React render — the naive version of this effect sets
 * state on every event and re-renders the largest text on the page at pointer
 * frequency, which is how an ambient flourish eats a 250 ms TBT budget.
 *
 * It is also small on purpose: the headline is the LCP element, and text that
 * chases the cursor is unreadable. The type moves about 10 px at the extremes,
 * the photograph about 16 px in the opposite direction — enough to feel like
 * depth, not enough to feel like a toy. Touch pointers are ignored outright:
 * there is no hover on a phone, and a tap would snap the type sideways.
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

  /* Pointer position across the hero, -1..1 on each axis. Springs so the type
     eases toward the cursor instead of tracking it rigidly. */
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 55, damping: 22, mass: 0.7 });
  const springY = useSpring(pointerY, { stiffness: 55, damping: 22, mass: 0.7 });

  const kineticX = useTransform(springX, [-1, 1], [10, -10]);
  const kineticY = useTransform(springY, [-1, 1], [7, -7]);
  // Opposite direction and slightly further, which is what reads as depth.
  const imageDriftX = useTransform(springX, [-1, 1], [-16, 16]);
  const imageDriftY = useTransform(springY, [-1, 1], [-10, 10]);

  useEffect(() => {
    if (reduced) return;
    const node = ref.current;
    if (!node) return;
    // No hover on touch, and a coarse pointer would snap the type sideways.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = node.getBoundingClientRect();
      pointerX.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
      pointerY.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
    };
    const onLeave = () => {
      pointerX.set(0);
      pointerY.set(0);
    };

    node.addEventListener("pointermove", onMove, { passive: true });
    node.addEventListener("pointerleave", onLeave);
    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, pointerX, pointerY]);

  return (
    <section
      ref={ref}
      data-hero
      data-hero-tone="dark"
      className="grain relative flex h-[100svh] min-h-[34rem] items-end overflow-hidden bg-ocean-950"
    >
      {/* Photograph: scroll parallax on the outer layer, Ken Burns on the
          inner one, so the two never fight for the same transform. */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={reduced ? undefined : { y: imageY, x: imageDriftX }}
      >
        {/* Pointer drift on its own layer: the outer element already owns `y`
            for the scroll parallax, and in motion `y` and `translateY` are the
            same transform property — setting both on one element silently
            drops one of them. */}
        <motion.div
          className="absolute inset-0"
          style={reduced ? undefined : { y: imageDriftY }}
        >
          {/* CSS animation, not motion: the LCP image must not be gated on
              hydration. It paints immediately at scale(1) and the push runs
              from there. */}
          <div className="ken-burns absolute inset-[-4%] will-change-transform">
          <Image
            src={image}
            alt=""
            fill
            priority
            fetchPriority="high"
            quality={70}
            sizes="100vw"
            placeholder={blurDataURL ? "blur" : undefined}
            blurDataURL={blurDataURL}
            className="object-cover"
          />
        </div>
        </motion.div>
      </motion.div>

      {/* Layered cinematic scrim: a vertical film gradient plus a soft corner
          vignette, so the type has contrast without flattening the image. */}
      <div aria-hidden className="scrim absolute inset-0" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(120%_85%_at_70%_15%,transparent_25%,rgba(4,20,29,0.38)_100%)]"
      />
      <div aria-hidden className="grain-overlay" />

      <motion.div
        style={reduced ? undefined : { y: contentY, opacity: contentOpacity }}
        className="relative mx-auto w-full max-w-[92rem] px-6 pb-16 sm:px-8 lg:px-12 lg:pb-24"
      >
        {/* The kinetic offset lives on its own element for the same reason the
            image drift does: `y` here would collide with the scroll parallax
            on the parent. */}
        <motion.div style={reduced ? undefined : { x: kineticX, y: kineticY }}>
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

        <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          {/* Deliberately NOT opacity-gated. This paragraph is the largest
              contentful element in the hero, so fading it in makes it the LCP
              and pins LCP to the end of the animation chain — it measured
              3.4s that way. It paints immediately; only the buttons animate. */}
          <p className="text-body max-w-[38ch] text-sand-100/75">{subheading}</p>

          <motion.div
            data-reveal
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center gap-3"
          >
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
          </motion.div>
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
