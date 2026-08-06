"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * "Has this element been seen yet?" — for one-shot scroll reveals.
 *
 * Two failure modes this exists to avoid, both of which leave content
 * permanently invisible:
 *
 *  1. A fractional threshold that can never be met. An element taller than the
 *     viewport never reaches `amount: 0.25`, so it stays hidden forever. This
 *     triggers on *any* intersection instead.
 *  2. Being jumped past — a deep link, a restored scroll position, or a fast
 *     flick. The element goes from below the fold to above it without ever
 *     being "in view", so the observer reports a non-intersecting entry and
 *     nothing ever reveals. Passing above the viewport counts as seen.
 */
export function useRevealTrigger(
  ref: RefObject<Element | null>,
  { rootMargin = "0px 0px -5% 0px" }: { rootMargin?: string } = {},
) {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;

    // Already scrolled past before we ever observed it.
    if (el.getBoundingClientRect().bottom <= 0) {
      setSeen(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        const passedAbove = entry.boundingClientRect.bottom <= 0;
        if (entry.isIntersecting || passedAbove) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, seen]);

  return seen;
}
