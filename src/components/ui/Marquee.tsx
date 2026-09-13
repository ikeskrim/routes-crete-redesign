"use client";

import { useState } from "react";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

/** One half of the strip. Declared outside the component so it isn't
 *  recreated on every render. `wrap` lays the same items out as a still,
 *  centred block for reduced motion. */
function MarqueeTrack({
  items,
  ariaHidden,
  wrap = false,
}: {
  items: string[];
  ariaHidden?: boolean;
  wrap?: boolean;
}) {
  return (
    <span
      aria-hidden={ariaHidden}
      className={cn(
        "flex items-center gap-x-14",
        wrap ? "flex-wrap justify-center gap-y-4" : "shrink-0 pr-14",
      )}
    >
      {items.map((item, i) => (
        <span key={i} className={cn("flex items-center gap-x-14", !wrap && "shrink-0")}>
          <span className={wrap ? undefined : "whitespace-nowrap"}>{item}</span>
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
 * The loop never ends on its own, so it carries a pause control (WCAG 2.2.2);
 * pausing only flips `animation-play-state` and adds no work either.
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
  const [paused, setPaused] = useState(false);

  const frame = cn(
    "grain relative w-full overflow-hidden bg-olive-700 py-7 lg:py-9",
    className,
  );

  /* Reduced motion: a still, nowrap strip inside overflow-hidden clipped every
     item past the viewport edge, with no way to reach them, and the left
     feather faded the first one. So: one copy, wrapped and centred, no
     feathers, and nothing to pause. */
  if (reduced) {
    return (
      <div data-marquee className={frame}>
        <div aria-hidden className="grain-overlay" />
        <div className="mx-auto max-w-[92rem] px-6 text-display-md text-sand-50 sm:px-8 lg:px-12">
          <MarqueeTrack items={items} wrap />
        </div>
      </div>
    );
  }

  return (
    <div data-marquee className={frame}>
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
          reverse ? "marquee-track-reverse" : "marquee-track",
        )}
        style={{
          animationDuration: `${speed}s`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        <MarqueeTrack items={items} />
        <MarqueeTrack items={items} ariaHidden />
      </div>

      {/* Pause. It sits on the right feather, where the text is already fading
          out, so it covers nothing a reader is reading; 44px square for the
          tap-target audit. */}
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        className="absolute top-1/2 right-4 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-pill border border-sand-100/25 bg-olive-700 text-sand-100/80 transition-colors duration-500 hover:border-gold-300/60 hover:text-gold-300 lg:right-8"
      >
        <span className="sr-only">
          {paused ? "Play the moving text" : "Pause the moving text"}
        </span>
        <svg aria-hidden viewBox="0 0 12 12" fill="currentColor" className="size-3">
          {paused ? (
            <path d="M3 1.5v9l7.5-4.5z" />
          ) : (
            <>
              <rect x="2.5" y="1.5" width="2.5" height="9" />
              <rect x="7" y="1.5" width="2.5" height="9" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
