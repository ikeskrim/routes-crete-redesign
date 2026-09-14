"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import styles from "./c-plus.module.css";

/**
 * Draft-local equivalents of the two retuned G2 reveals (C+ spec §G.1):
 * #5 plate unclip and #6 slow block rise. Each fires once, on first
 * intersection.
 *
 * Reduced motion is designed in CSS, not here: under
 * `prefers-reduced-motion: reduce` the plate is set and the block present
 * from the first paint, so no observer is needed at all. With JavaScript off,
 * the root layout's noscript rule sets every [data-reveal] in place.
 */
function useFirstIntersection<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, seen] as const;
}

/**
 * A plate frame whose photograph is uncovered once, across from its bleed
 * edge: `from="right"` for a plate that runs off the right edge, else from
 * the left (left-bleeding and inset plates).
 */
export function DraftUnclip({
  className,
  style,
  from = "left",
  children,
}: {
  className?: string;
  style?: CSSProperties;
  from?: "left" | "right";
  children: ReactNode;
}) {
  const [ref, seen] = useFirstIntersection<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={[styles.unclip, className].filter(Boolean).join(" ")}
      style={style}
      data-from={from}
      data-reveal=""
      data-in={seen ? "" : undefined}
    >
      <div className={styles.unclipInner} data-reveal="">
        {children}
      </div>
    </div>
  );
}

/** A block that rises 16px into place, once. */
export function DraftRise({
  as = "div",
  className,
  children,
}: {
  as?: "div" | "li";
  className?: string;
  children: ReactNode;
}) {
  const [ref, seen] = useFirstIntersection<HTMLElement>();
  const props = {
    className: [styles.rise, className].filter(Boolean).join(" "),
    "data-reveal": "",
    "data-in": seen ? "" : undefined,
  };
  return as === "li" ? (
    <li ref={ref as React.Ref<HTMLLIElement>} {...props}>
      {children}
    </li>
  ) : (
    <div ref={ref as React.Ref<HTMLDivElement>} {...props}>
      {children}
    </div>
  );
}
