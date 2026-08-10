"use client";

import { useReducedMotionSafe } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

/** One half of the strip. Declared outside the component so it isn't
 *  recreated on every render. */
function MarqueeTrack({
  items,
  ariaHidden,
}: {
  items: string[];
  ariaHidden?: boolean;
}) {
  return (
    <span
      aria-hidden={ariaHidden}
      className="flex shrink-0 items-center gap-x-14 pr-14"
    >
      {items.map((item, i) => (
        <span key={i} className="flex shrink-0 items-center gap-x-14">
          <span className="whitespace-nowrap">{item}</span>
          <span
            aria-hidden
            className="inline-block size-1.5 shrink-0 rounded-pill bg-gold-400/80"
          />
        </span>
      ))}
    </span>
  );
}

/**
 * A slow repeating text track.
 *
 * Two identical halves translate as one strip; when the first has travelled
 * exactly its own width the animation restarts, so the seam never shows. The
 * transform is the only animated property, and the whole thing is one CSS
 * animation rather than a rAF loop, so it costs nothing on the main thread.
 *
 * Under prefers-reduced-motion the track holds still and simply reads as a
 * line of text.
 */
export function Marquee({
  items,
  className,
  speed = 48,
  reverse = false,
}: {
  items: string[];
  className?: string;
  /** Seconds for one full pass. Slower is more expensive-looking. */
  speed?: number;
  reverse?: boolean;
}) {
  const reduced = useReducedMotionSafe();

  return (
    <div
      data-marquee
      className={cn(
        "grain relative w-full overflow-hidden bg-olive-700 py-7 lg:py-9",
        className,
      )}
    >
      <div aria-hidden className="grain-overlay" />

      {/* Feathered edges so the text enters and leaves rather than clipping. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-olive-700 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-olive-700 to-transparent"
      />

      <div
        className={cn(
          "flex w-max text-display-md text-sand-50",
          !reduced && (reverse ? "marquee-track-reverse" : "marquee-track"),
        )}
        style={reduced ? undefined : { animationDuration: `${speed}s` }}
      >
        <MarqueeTrack items={items} />
        <MarqueeTrack items={items} ariaHidden />
      </div>
    </div>
  );
}
