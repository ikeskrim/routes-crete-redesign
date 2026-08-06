"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "left" | "right" | "none";

const OFFSET: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 28 },
  down: { x: 0, y: -28 },
  left: { x: 28, y: 0 },
  right: { x: -28, y: 0 },
  none: { x: 0, y: 0 },
};

/**
 * Scroll-triggered reveal. Animates transform + opacity only, so it stays on
 * the compositor at 60fps.
 *
 * Three things it deliberately guards against:
 *  - `prefers-reduced-motion` → renders the final state, no animation at all.
 *  - Landing *below* the element (a deep link, or a restored scroll position)
 *    → an intersection would never fire, so the content is shown immediately
 *    instead of staying invisible forever.
 *  - JavaScript never running → the `data-reveal` hook lets a <noscript> rule
 *    in the layout force everything visible.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  duration = 0.8,
  direction = "up",
  amount = 0.25,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: Direction;
  /** Fraction of the element that must be visible before it triggers. */
  amount?: number;
  once?: boolean;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount });
  const [alreadyPassed, setAlreadyPassed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Mounted already scrolled past this element — reveal without waiting.
    if (el.getBoundingClientRect().bottom <= 0) setAlreadyPassed(true);
  }, []);

  if (reduced) {
    return (
      <div ref={ref} data-reveal className={className}>
        {children}
      </div>
    );
  }

  const { x, y } = OFFSET[direction];
  const show = inView || alreadyPassed;

  return (
    <motion.div
      ref={ref}
      data-reveal
      className={cn(className)}
      initial={{ opacity: 0, x, y }}
      animate={show ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x, y }}
      transition={{
        duration,
        delay: alreadyPassed ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggers its direct children. Each child animates transform/opacity only;
 * the stagger is expressed as a delay so nothing layout-thrashes.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.09,
  initialDelay = 0,
  direction = "up",
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  initialDelay?: number;
  direction?: Direction;
  as?: "div" | "ul";
}) {
  const Tag = as;
  const items = Array.isArray(children) ? children : [children];

  return (
    <Tag className={className}>
      {items.map((child, i) => {
        const revealed = (
          <Reveal
            delay={initialDelay + i * stagger}
            direction={direction}
          >
            {child}
          </Reveal>
        );

        return as === "ul" ? (
          <li key={i}>{revealed}</li>
        ) : (
          <div key={i}>{revealed}</div>
        );
      })}
    </Tag>
  );
}
