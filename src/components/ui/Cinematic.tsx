"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,

  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion";
import { useRevealTrigger } from "@/lib/use-reveal-trigger";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * ImageReveal — clip-path wipe + slow scale-down as it enters view.
 * ------------------------------------------------------------------ */

export function ImageReveal({
  src,
  alt,
  blurDataURL,
  sizes,
  className,
  ratio = "aspect-[3/4]",
  priority,
  delay = 0,
  from = "bottom",
}: {
  src: string;
  alt: string;
  blurDataURL?: string;
  sizes: string;
  className?: string;
  ratio?: string;
  priority?: boolean;
  delay?: number;
  from?: "bottom" | "left";
}) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRevealTrigger(ref);
  const show = seen || reduced;
  const hidden =
    from === "bottom" ? "inset(100% 0% 0% 0%)" : "inset(0% 100% 0% 0%)";

  return (
    <motion.div
      ref={ref}
      data-reveal
      
      className={cn("relative overflow-hidden bg-ocean-900", ratio, className)}
      initial={reduced ? false : { clipPath: hidden }}
      animate={{ clipPath: show ? "inset(0% 0% 0% 0%)" : hidden }}
      transition={{
        duration: 1.3,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <motion.div
        className="absolute inset-0 will-change-transform"
        initial={reduced ? false : { scale: 1.15 }}
        animate={{ scale: show ? 1 : 1.15 }}
        transition={{
          duration: 1.8,
          delay,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          placeholder={blurDataURL ? "blur" : undefined}
          blurDataURL={blurDataURL}
          className="object-cover"
        />
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * Bridge — full-bleed cinematic image band between scenes, scrubbed by
 * scroll so the photograph drifts and breathes as it passes.
 * ------------------------------------------------------------------ */

export function Bridge({
  src,
  alt,
  blurDataURL,
  caption,
  creditNote,
  className,
  height = "h-[62vh] min-h-[22rem] lg:h-[78vh]",
}: {
  src: string;
  alt: string;
  blurDataURL?: string;
  caption?: string;
  /**
   * Marks a frame as a LICENSED photograph of the place rather than one of
   * ours from a tour. The galleries on these pages are the operator's own
   * work, so a sourced landscape sitting among them has to say what it is —
   * otherwise the page quietly implies we took it.
   */
  creditNote?: string;
  className?: string;
  height?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotionSafe();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.12, 1.04, 1.12]);

  return (
    <div
      ref={ref}
      className={cn("grain relative w-full overflow-hidden bg-ocean-950", height, className)}
    >
      <motion.div
        className="absolute inset-[-10%] will-change-transform"
        style={reduced ? undefined : { y, scale }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          placeholder={blurDataURL ? "blur" : undefined}
          blurDataURL={blurDataURL}
          className="object-cover"
        />
      </motion.div>

      <div aria-hidden className="scrim-soft absolute inset-0" />
      <div aria-hidden className="grain-overlay" />

      {caption && (
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 lg:p-14">
          <p className="text-eyebrow uppercase text-sand-100/70">{caption}</p>
          {creditNote && (
            <p className="text-caption mt-1.5 text-sand-200/55">{creditNote}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Magnetic — pointer-attracted wrapper for buttons.
 * Desktop pointers only; never engages on touch.
 * ------------------------------------------------------------------ */

export function Magnetic({
  children,
  className,
  strength = 0.32,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotionSafe();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 140, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 140, damping: 18, mass: 0.4 });

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || event.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={reduced ? undefined : { x: sx, y: sy }}
      className={cn("inline-block will-change-transform", className)}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * Parallax — depth layer. Background elements drift slower than the
 * foreground text that sits over them.
 * ------------------------------------------------------------------ */

export function Parallax({
  children,
  className,
  distance = 60,
}: {
  children: React.ReactNode;
  className?: string;
  /** Positive drifts down as you scroll; negative drifts up. */
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotionSafe();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-distance, distance]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <motion.div
        className="will-change-transform"
        style={reduced ? undefined : { y }}
      >
        {children}
      </motion.div>
    </div>
  );
}
