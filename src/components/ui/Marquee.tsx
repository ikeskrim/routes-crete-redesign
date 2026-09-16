"use client";

import { Fragment, useState } from "react";

import { cn } from "@/lib/utils";

/* The strap's type (C+ SPEC §D.4): Fraunces at optical size 48, weight 360,
   paper on olive (5.74). */
const TYPE = "font-editorial font-[360] leading-[1.2] [font-variation-settings:'opsz'_48]";

/** A separator: a 1.25rem hairline dash in the band-dot tone (decorative). */
function Dash({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block h-px w-5 shrink-0 bg-band-dot", className)} />;
}

/** One half of the moving strap. */
function MovingHalf({ items, ariaHidden }: { items: string[]; ariaHidden?: boolean }) {
  return (
    <span aria-hidden={ariaHidden} className="flex shrink-0 items-center gap-x-10 pr-10">
      {items.map((item, i) => (
        <span key={i} className="flex shrink-0 items-center gap-x-10">
          <span className="whitespace-nowrap">{item}</span>
          <Dash />
        </span>
      ))}
    </span>
  );
}

/**
 * The marquee strap between movements I and II (C+ SPEC §D.4, §G.1 #13):
 * an olive band, `div[data-marquee]`, never a section.
 *
 * Moving: two identical halves translate as one strip (`marquee-track`, 60 s
 * linear, transform only); the second half is `aria-hidden`. The loop never
 * ends on its own, so it carries a pause control (WCAG 2.2.2): a 44 px
 * square with a 1 px paper edge, the only control on the band, whose focus
 * ring is the night token. Pausing only flips `animation-play-state`.
 *
 * Reduced motion is a designed still, not a stopped strip (as the frozen
 * draft sets it): the five phrases in deliberate lines, 2 + 2 + 1 below 1024
 * (left-aligned below 640, where a phrase may wrap) and 3 + 2 from 1024,
 * centred, no pause button. A separator never opens a line.
 *
 * Both compositions are server-rendered and switched by the
 * `prefers-reduced-motion` media query alone, so nothing waits for
 * hydration and nothing moves when it lands. The still strap is a list by
 * role; its phrases are spans, as the moving strap's are.
 *
 * No texture on the band; no gold anywhere on it.
 */
export function Marquee({
  items,
  className,
  speed = 60,
  reverse = false,
}: {
  items: string[];
  className?: string;
  /** Seconds for one full pass. */
  speed?: number;
  reverse?: boolean;
}) {
  const [paused, setPaused] = useState(false);

  return (
    <div
      data-marquee=""
      className={cn(
        "relative w-full bg-band py-7 text-on-band lg:py-9 max-sm:motion-reduce:py-5",
        className,
      )}
    >
      {/* ---- moving ---- */}
      <div className="relative overflow-clip motion-reduce:hidden">
        {/* Feathered edges: the phrases enter and leave rather than clip. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-linear-to-r from-band to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-linear-to-l from-band to-transparent"
        />
        <div
          className={cn(
            "flex w-max text-[length:clamp(1.75rem,3vw,2.75rem)]",
            TYPE,
            reverse ? "marquee-track-reverse" : "marquee-track",
          )}
          style={{
            animationDuration: `${speed}s`,
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          <MovingHalf items={items} />
          <MovingHalf items={items} ariaHidden />
        </div>
      </div>

      {/* Pause. On the right feather, where the phrases already fade, so it
          covers nothing being read; square, like every control but the gold
          pill (§C.12). */}
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        className="absolute top-1/2 right-4 z-20 flex size-11 -translate-y-1/2 items-center justify-center border border-on-band bg-band text-on-band transition-colors duration-250 hover:bg-on-band hover:text-band focus-visible:outline-focus-night lg:right-8 motion-reduce:hidden"
      >
        <span className="sr-only">
          {paused ? "Play the moving text" : "Pause the moving text"}
        </span>
        <svg aria-hidden="true" viewBox="0 0 12 12" fill="currentColor" className="size-3">
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

      {/* ---- still (reduced motion) ---- */}
      <div
        role="list"
        className={cn(
          "mx-(--ed-margin) hidden flex-wrap items-center justify-start gap-x-3.5 gap-y-[0.15rem] motion-reduce:flex",
          "text-[length:clamp(1.25rem,5.6vw,1.5rem)] sm:justify-center sm:gap-x-10 sm:gap-y-0 sm:text-[length:clamp(1.75rem,3vw,2.75rem)]",
          TYPE,
        )}
      >
        {items.map((item, i) => {
          /* Lines of two below 1024, of three from 1024. */
          const opensSmall = i > 0 && i % 2 === 0;
          const opensLarge = i > 0 && i % 3 === 0;
          return (
            <Fragment key={i}>
              {(opensSmall || opensLarge) && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-0 basis-full",
                    opensSmall && !opensLarge && "lg:hidden",
                    opensLarge && !opensSmall && "hidden lg:block",
                  )}
                />
              )}
              <span
                role="listitem"
                className="flex items-center gap-x-3.5 sm:gap-x-10 sm:whitespace-nowrap"
              >
                {i > 0 && (
                  <Dash
                    className={cn(
                      "max-sm:w-4",
                      opensSmall && "max-lg:hidden",
                      opensLarge && "lg:hidden",
                    )}
                  />
                )}
                <span>{item}</span>
              </span>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
