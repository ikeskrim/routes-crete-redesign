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
import { cn } from "@/lib/utils";

import { Unclip } from "./Unclip";

/* ------------------------------------------------------------------ *
 * ImageReveal — a standalone framed photograph, uncovered once as it
 * enters view (C+ SPEC §G.1 #5: across from its edge, 0.9 s, while the
 * image settles from 1.06). The frame is square, bone while loading, with
 * nothing laid over the photograph. A preloaded (LCP) image is never
 * clipped: it paints at once. `Unclip` is the same reveal for frames that
 * already exist.
 * ------------------------------------------------------------------ */

export function ImageReveal({
  src,
  alt,
  blurDataURL,
  sizes,
  className,
  ratio = "aspect-[3/4]",
  preload,
  priority,
  delay = 0,
  from = "left",
  quality,
}: {
  src: string;
  alt: string;
  blurDataURL?: string;
  sizes: string;
  className?: string;
  ratio?: string;
  preload?: boolean;
  /** @deprecated Renamed `preload` (C+ SPEC §0.4 C6); still honoured. */
  priority?: boolean;
  delay?: number;
  /** The edge the photograph is uncovered from. */
  from?: "left" | "right" | "top" | "bottom";
  quality?: number;
}) {
  const eager = preload ?? priority ?? false;
  const image = (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      preload={eager}
      quality={quality}
      placeholder={blurDataURL ? "blur" : undefined}
      blurDataURL={blurDataURL}
      className="object-cover"
    />
  );

  return (
    <div className={cn("relative overflow-hidden bg-bone", ratio, className)}>
      {eager ? (
        image
      ) : (
        <Unclip delay={delay} from={from}>
          {image}
        </Unclip>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Bridge — a full-bleed photograph between blocks, now a still plate.
 *
 * The scroll scrub is retired (C+ SPEC §G.2: still plates), and nothing is
 * laid over the photograph (D2): no scrim, no grain. The caption sits under
 * the frame on the night ground. The C+ surfaces use `PlateBand` instead;
 * this stays until its last call sites move.
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
  return (
    <div className={cn("w-full bg-night", className)}>
      <div className={cn("relative w-full overflow-hidden", height)}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          loading="lazy"
          placeholder={blurDataURL ? "blur" : undefined}
          blurDataURL={blurDataURL}
          className="object-cover"
        />
      </div>

      {caption && (
        <div className="px-(--ed-margin) py-5">
          <p className="text-caption-place text-on-night">{caption}</p>
          {creditNote && (
            <p className="mt-[0.15rem] text-caption text-on-night-soft">{creditNote}</p>
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
