"use client";

import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";

import { useRevealTrigger } from "@/lib/use-reveal-trigger";
import { cn } from "@/lib/utils";

import styles from "./Plate.module.css";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * The element whose intersection decides the reveal: the nearest ancestor
 * with a box of its own (the frame, or the plate's figure).
 *
 * Not the unclip itself: its own `clip-path` collapses it to a zero-area box
 * until it is revealed, and Chromium reports such a target as never
 * intersecting when a clipping ancestor sits between it and the viewport
 * (measured on the pre-C+ journeys pan: plate on screen, no entry; the same
 * element with the clip lifted, intersecting). The parent occupies the same
 * place and is never clipped. A `display: contents` ancestor has no box and
 * is skipped.
 */
function revealTarget(el: HTMLElement | null): Element | null {
  let target: Element | null = el?.parentElement ?? el;
  while (target?.parentElement && getComputedStyle(target).display === "contents") {
    target = target.parentElement;
  }
  return target;
}

/**
 * The plate unclip (C+ SPEC §G.1 #5, as amended in the draft review): a
 * photograph is uncovered once, across from its bleed edge, while it settles
 * out of a slight push-in (1.06 → 1). Two lengths on purpose: the clip lays
 * in 0.9 s on the lay curve, the settle eases for 1.8 s on the reveal curve,
 * so the frame is open a beat before the image stops moving.
 *
 * All CSS (Plate.module.css), reading the edition's easing tokens; this
 * component only flips `data-in` on the first intersection of the plate's
 * box (see `revealTarget`), or when it was already scrolled past. Reduced motion: set from the first
 * paint, no observer needed. JavaScript off: both layers carry
 * `data-reveal`, which the root layout's noscript rule clears. Nothing here
 * touches layout, so CLS is unaffected.
 *
 * Two shapes:
 * - `layer` (default): an absolutely positioned layer inside a frame that
 *   already exists (MediaFrame); the frame keeps its box.
 * - `layer={false}`: this element IS the frame (Plate passes its frame
 *   classes and ratio style), so the frame, its ground and its keyline are
 *   uncovered together, as the draft does.
 *
 * Never on a preloaded (LCP) plate: its callers skip the unclip there.
 */
export function Unclip({
  children,
  delay = 0,
  from = "left",
  layer = true,
  className,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  /** The edge the plate is uncovered from: its bleed edge (left for inset plates). */
  from?: "left" | "right" | "top" | "bottom";
  layer?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const watched = useRef<Element | null>(null);
  /* A layout effect runs before every passive effect, so the observer in
     useRevealTrigger already sees the target. */
  useIsomorphicLayoutEffect(() => {
    watched.current = revealTarget(ref.current);
  }, []);
  const seen = useRevealTrigger(watched);
  const timing = delay
    ? ({ transitionDelay: `${delay}s` } satisfies CSSProperties)
    : undefined;

  return (
    <div
      ref={ref}
      data-reveal=""
      data-from={from}
      data-in={seen ? "" : undefined}
      className={cn(styles.unclip, layer && styles.layer, className)}
      style={timing ? { ...style, ...timing } : style}
    >
      <div data-reveal="" className={styles.unclipInner} style={timing}>
        {children}
      </div>
    </div>
  );
}
