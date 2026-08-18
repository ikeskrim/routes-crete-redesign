"use client";

import { useRef } from "react";
import { motion } from "motion/react";

import { useReducedMotionSafe } from "@/lib/use-reduced-motion";
import { useRevealTrigger } from "@/lib/use-reveal-trigger";
import { cn } from "@/lib/utils";

/**
 * The "unclip" reveal: a photograph wipes open from its own edge while it
 * settles out of a slow push-in.
 *
 * Two motions, deliberately different lengths — the clip finishes at 1.3s and
 * the scale keeps easing to 1.8s, so the frame is fully open a beat before the
 * image stops moving. That lag is what makes it read as a photograph settling
 * rather than a box opening.
 *
 * Rendered as an absolutely-positioned layer so it drops inside an existing
 * ratio frame without changing its geometry: the frame keeps its box, this
 * only animates what is inside it. Nothing here touches layout, so CLS is
 * unaffected.
 *
 * `ImageReveal` in Cinematic.tsx is the same idea for standalone images that
 * own their own frame; this is the version for frames that already exist.
 */
export function Unclip({
  children,
  delay = 0,
  from = "bottom",
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  /** Which edge the frame opens from. */
  from?: "bottom" | "left";
  className?: string;
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
      className={cn("absolute inset-0", className)}
      initial={reduced ? false : { clipPath: hidden }}
      animate={{ clipPath: show ? "inset(0% 0% 0% 0%)" : hidden }}
      transition={{ duration: 1.3, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="absolute inset-0 will-change-transform"
        initial={reduced ? false : { scale: 1.12 }}
        animate={{ scale: show ? 1 : 1.12 }}
        transition={{ duration: 1.8, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
