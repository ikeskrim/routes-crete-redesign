"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
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
        // trim(): each word span carries a trailing space *inside* it, so the
        // raw textContent is "word ". Joining those with another space gave
        // doubled spacing and lines wider than the box they render into.
        grouped[grouped.length - 1].push((wordEl.textContent ?? "").trim());
      });

      /* Fit correction.
       *
       * Grouping by offsetTop measures the inline-block proxy layout, which
       * does not reproduce normal text flow exactly — measured lines came out
       * 4–80px wider than their container and wrapped again on render,
       * leaving orphan fragments ("its natural", "lush valley,") on their own
       * lines. Rather than trust the proxy, every candidate line is measured
       * as it will actually be typeset and any overflow is pushed to the next
       * line. Guarantees each rendered line occupies exactly one line box. */
      const containerWidth = root.getBoundingClientRect().width;
      const probe = document.createElement("span");
      const cs = getComputedStyle(measureEl);
      probe.style.cssText =
        "position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:0";
      probe.style.font = cs.font;
      probe.style.letterSpacing = cs.letterSpacing;
      probe.style.wordSpacing = cs.wordSpacing;
      probe.style.textRendering = cs.textRendering;
      document.body.appendChild(probe);

      const widthOf = (s: string) => {
        probe.textContent = s;
        return probe.getBoundingClientRect().width;
      };

      const queue = grouped.map((g) => [...g]);
      for (let i = 0; i < queue.length; i++) {
        const line = queue[i];
        // Sub-pixel tolerance: a line landing within 1px of the box still
        // wraps once layout rounds it.
        while (line.length > 1 && widthOf(line.join(" ")) > containerWidth - 1) {
          const moved = line.pop();
          if (moved === undefined) break;
          if (!queue[i + 1]) queue.push([]);
          queue[i + 1].unshift(moved);
        }
      }
      probe.remove();

      setLines(queue.filter((g) => g.length > 0).map((g) => g.join(" ")));
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
    return (
      <Tag className={className} data-split-source={text}>
        {text}
      </Tag>
    );
  }

  const show = active !== undefined ? active : onMount || inView;

  return (
    // data-split-source carries the exact source string so the harness can
    // assert that what renders equals what was written.
    <Tag className={className} data-split-source={text}>
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
        {/* The separating space MUST live outside the inline-block.
            Inside it, it is trailing whitespace at the end of that box's own
            line and CSS discards it — which rendered the headline with every
            word jammed together ("Exploretheunknown") for as long as the
            measuring copy is the visible one. Outside, it is ordinary inline
            whitespace between two boxes and survives. */}
        {words.map((word, i) => (
          <Fragment key={i}>
            <span data-word className="inline-block">
              {word}
            </span>
            {i < words.length - 1 ? " " : ""}
          </Fragment>
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
