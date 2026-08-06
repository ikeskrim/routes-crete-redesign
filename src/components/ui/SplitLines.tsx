"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Headline reveal, line by line, from behind an overflow mask.
 *
 * Real line boxes are measured after layout — words are grouped by their
 * vertical offset — so the mask follows however the text actually wraps at the
 * current viewport rather than a guess.
 *
 * The measuring copy stays mounted (absolutely positioned and invisible, so it
 * still wraps at the container's width but contributes no layout). Removing it
 * would resize the element and re-trigger the ResizeObserver that measured it,
 * which loops. Re-measurement is therefore gated on the width actually
 * changing.
 *
 * Server-renders as plain text, so there is no hydration mismatch, the copy is
 * always crawlable, and it stays visible if JavaScript never runs.
 */
export function SplitLines({
  text,
  className,
  as: Tag = "h2",
  delay = 0,
  stagger = 0.09,
  duration = 1.1,
  /** Animate on mount (hero) instead of on scroll into view. */
  onMount = false,
  /** Drive the reveal externally — used by the scrubbed signature scene. */
  active,
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "div";
  delay?: number;
  stagger?: number;
  duration?: number;
  onMount?: boolean;
  active?: boolean;
}) {
  const reduced = useReducedMotionSafe();
  const rootRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const lastWidth = useRef(0);
  const [lines, setLines] = useState<string[] | null>(null);
  const inView = useInView(rootRef, { once: true, amount: 0.2 });

  const words = text.split(/\s+/).filter(Boolean);

  useIsomorphicLayoutEffect(() => {
    if (reduced) return;
    const root = rootRef.current;
    const measureEl = measureRef.current;
    if (!root || !measureEl) return;

    const measure = () => {
      const wordEls = measureEl.querySelectorAll<HTMLElement>("[data-word]");
      if (!wordEls.length) return;

      const grouped: string[][] = [];
      let lastTop: number | null = null;

      wordEls.forEach((wordEl) => {
        const top = wordEl.offsetTop;
        if (lastTop === null || Math.abs(top - lastTop) > 2) {
          grouped.push([]);
          lastTop = top;
        }
        grouped[grouped.length - 1].push(wordEl.textContent ?? "");
      });

      setLines(grouped.map((g) => g.join(" ")));
    };

    lastWidth.current = root.getBoundingClientRect().width;
    measure();

    /* Web fonts change metrics without changing the container width, so the
       resize guard below would never re-fire. Measuring against fallback
       metrics produces visibly ragged lines, so re-measure once fonts land. */
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      // Only a width change can alter where the text wraps. Without this
      // guard, hiding the measuring copy resizes it and loops forever.
      if (Math.abs(width - lastWidth.current) < 1) return;
      lastWidth.current = width;
      measure();
    });
    observer.observe(root);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [text, reduced]);

  if (reduced) {
    return <Tag className={className}>{text}</Tag>;
  }

  const show = active !== undefined ? active : onMount || inView;

  return (
    <Tag className={className}>
      <span ref={rootRef} className="relative block">
      {/* Measuring copy. Visible (and the only copy) until lines are known. */}
      <span
        ref={measureRef}
        aria-hidden={lines ? true : undefined}
        className={cn(
          "block",
          lines && "pointer-events-none invisible absolute inset-x-0 top-0",
        )}
      >
        {words.map((word, i) => (
          <span key={i} data-word className="inline-block">
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>

      {lines && (
        <>
          <span aria-hidden className="block">
            {lines.map((line, i) => (
              <span key={i} className="block overflow-hidden">
                <motion.span
                  data-reveal
                  className="block will-change-transform"
                  initial={{ y: "115%" }}
                  animate={show ? { y: "0%" } : { y: "115%" }}
                  transition={{
                    duration,
                    delay: delay + i * stagger,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </span>
          {/* The real string for assistive tech and crawlers, now that the
              visible copy is decorative. */}
          <span className="sr-only">{text}</span>
        </>
      )}
      </span>
    </Tag>
  );
}
