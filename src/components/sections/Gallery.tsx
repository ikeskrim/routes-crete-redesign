"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DragStrip } from "@/components/ui/DragStrip";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion";

import type { GalleryImage } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Masonry gallery, or a strip you can throw, with a lightbox.
 *
 * CSS columns keep the masonry free of layout JS; every image keeps its true
 * aspect ratio so nothing shifts as they load.
 *
 * Each image carries its own blur placeholder. Passing the whole blur map as a
 * prop serialised all 128 entries (~122 KB of base64) into the RSC payload of
 * every page with a gallery, whether or not those images appeared on it.
 *
 * C+ (SPEC §D.6 item 8, §G.1 row 16, §G.2). The tiles sit on a clean bone
 * section: square (radius 0), no hover zoom, no veil, nothing laid over the
 * photograph. A keyboard focus shows as a 2 px burnt-sienna underline under
 * the tile (5.82:1 on bone), drawn in the strip's own bottom padding so the
 * scrolling strip never clips it. The lightbox is opaque night with no blur;
 * it opens with an opacity fade while the frame settles from 0.985, and under
 * reduced motion both are a 150 ms opacity fade with no scale in any state
 * (the fade answers a click).
 *
 * Keyboard: a strip tile that takes keyboard focus is scrolled fully into the
 * strip, so its focus underline is on screen. In the lightbox the counter is
 * a polite live region, so stepping through the frames is announced.
 */

/* The reveal curve of the edition (`--ed-ease-reveal`, as a motion easing). */
const EASE_REVEAL = [0.2, 0.7, 0.1, 1] as const;
const REDUCED_FADE = { duration: 0.15, ease: "linear" } as const;

/**
 * The lightbox's Previous/Next arrow, 24 × 12 px. The served fonts carry no
 * ← or → (SPEC §C.1), so a text glyph painted in a system fallback; this is
 * drawn in the stroke of `ExternalIcon` (ui/icons.tsx) and takes the button's
 * colour. Decorative: the button carries the name.
 */
function StepArrow({ back }: { back: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="block h-3 w-6"
      viewBox="0 0 24 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={back ? "M22.5 6h-21M6.5 1.5 1.5 6l5 4.5" : "M1.5 6h21M17.5 1.5l5 4.5-5 4.5"} />
    </svg>
  );
}

/** Masonry block, or a strip you can throw. */
function Frame({
  strip,
  count,
  className,
  children,
}: {
  strip: boolean;
  count: number;
  className?: string;
  children: React.ReactNode;
}) {
  if (!strip) {
    return (
      <div className={cn("columns-2 gap-3 sm:gap-4 lg:columns-3 xl:columns-4", className)}>
        {children}
      </div>
    );
  }
  return (
    <DragStrip
      ariaLabel={`${count} photographs — drag or scroll sideways`}
      /* A tile scrolled into view stops a margin short of the viewport's
         right edge, the strip's own end (`scroll-padding-inline-end`). */
      className={cn("pb-3 scroll-pe-(--ed-margin)", className)}
    >
      {children}
    </DragStrip>
  );
}

export function Gallery({
  images,
  variant = "masonry",
  className,
}: {
  images: (GalleryImage & { alt: string; blurDataURL?: string })[];
  /**
   * "strip" lays the frames out as one horizontal run you can throw, instead
   * of a masonry block. Curated to ~14 frames, a strip reads as a sequence —
   * the order the day happened in — where a masonry reads as an archive.
   */
  variant?: "masonry" | "strip";
  /** On the strip or masonry block: its placement in the section's grid. */
  className?: string;
}) {
  const reduced = useReducedMotionSafe();
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpen((current) =>
        current === null
          ? null
          : (current + delta + images.length) % images.length,
      ),
    [images.length],
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isOpen = open !== null;

  /* Keys, focus trap and scroll lock — the same shape as OverlayMenu's effect.
     Keyed on open/closed, NOT on the index: re-running on every step would
     hand focus back to the tile behind the viewer and pull it in again on each
     arrow press or Next click. */
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    /* The viewer's node for this opening; AnimatePresence keeps it mounted
       through the exit fade, so the cleanup below still reaches it. */
    const dialog = dialogRef.current;

    /* `overflow: hidden` alone does not hold the page: Lenis scrolls
       programmatically, which overflow permits (measured behind the menu, see
       OverlayMenu). Stopping Lenis is the lock; the overflow lock covers
       reduced motion, where Lenis is never constructed. */
    const lenis = (window as Window & { __lenis?: { stop: () => void; start: () => void } })
      .__lenis;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop();

    // Reopened during its exit fade, AnimatePresence reuses the same node.
    if (dialog) dialog.inert = false;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key !== "Tab") return;

      const focusables = dialogRef.current
        ? [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])")]
        : [];
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      // Anything outside the viewer (a click on the backdrop drops focus to
      // the body) is pulled back in rather than walking the page behind.
      if (!active || !focusables.includes(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    // The tile that opened the viewer is now underneath it.
    closeRef.current?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      lenis?.start();
      /* The viewer stays mounted for its exit fade. `inert` goes on BEFORE
         focus is restored, so the fading dialog is out of the tab order. */
      if (dialog) dialog.inert = true;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [isOpen, close, step]);

  const current = open === null ? null : images[open];

  /* A tile reached by the keyboard is brought fully into the strip. The
     browser's own focus scrolling leaves a tile that is already partly in
     view where it is, so every other tile was focused at the strip's edge
     with its focus underline outside it. Keyboard focus only
     (`:focus-visible`): a pointer press starts a drag, and moving the strip
     under it would break the throw. Instant, and within the strip's
     scroll padding. */
  const bringIntoStrip = (event: React.FocusEvent<HTMLButtonElement>) => {
    const tile = event.currentTarget;
    if (!tile.matches(":focus-visible")) return;
    tile.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  };

  return (
    <>
      <Frame strip={variant === "strip"} count={images.length} className={className}>
        {images.map((image, i) => (
          <button
            key={image.src}
            type="button"
            onClick={() => setOpen(i)}
            onFocus={variant === "strip" ? bringIntoStrip : undefined}
            aria-label={`View image ${i + 1} of ${images.length}`}
            className={cn(
              "relative block focus-visible:outline-none",
              /* The focus underline: 2 px sienna, 6 px under the tile. */
              "after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-2 after:h-0.5 after:bg-accent-text after:opacity-0 focus-visible:after:opacity-100",
              variant === "strip"
                ? "h-[58vw] w-[78vw] shrink-0 sm:h-[34vw] sm:w-[46vw] lg:h-[26rem] lg:w-[34rem]"
                : "mb-3 w-full sm:mb-4",
            )}
          >
            <span
              className={cn(
                "relative block overflow-clip bg-hairline-bone",
                variant === "strip" && "h-full w-full",
              )}
            >
              <Image
                src={image.src}
                alt={image.alt}
                {...(variant === "strip"
                  ? { fill: true }
                  : { width: image.width, height: image.height })}
                sizes={
                  variant === "strip"
                    ? "(max-width: 640px) 78vw, (max-width: 1024px) 46vw, 34rem"
                    : "(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 24vw"
                }
                placeholder={image.blurDataURL ? "blur" : undefined}
                blurDataURL={image.blurDataURL}
                className={variant === "strip" ? "object-cover" : "h-auto w-full"}
              />
            </span>
          </button>
        ))}
      </Frame>

      <AnimatePresence>
        {current && (
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Image viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduced ? REDUCED_FADE : { duration: 0.4, ease: EASE_REVEAL }}
            className="fixed inset-0 z-[60] flex flex-col bg-night text-on-night"
            onClick={close}
          >
            <div className="flex items-center justify-between px-(--ed-margin) py-2">
              {/* A polite live region: stepping through the frames is
                  announced by the counter (every frame's alt is the same
                  title). */}
              <span
                aria-live="polite"
                aria-atomic="true"
                className="text-eyebrow tabular-nums text-stone"
              >
                {String((open ?? 0) + 1).padStart(2, "0")} /{" "}
                {String(images.length).padStart(2, "0")}
              </span>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="inline-flex min-h-11 items-center text-eyebrow text-on-night underline-offset-[0.28em] hover:underline"
              >
                Close
              </button>
            </div>

            <div
              className="relative flex flex-1 items-center justify-center px-4 pb-6"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                key={current.src}
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                transition={reduced ? REDUCED_FADE : { duration: 0.55, ease: EASE_REVEAL }}
                className="relative h-full w-full"
              >
                <Image
                  src={current.src}
                  alt={current.alt}
                  fill
                  sizes="100vw"
                  quality={75}
                  placeholder={current.blurDataURL ? "blur" : undefined}
                  blurDataURL={current.blurDataURL}
                  className="object-contain"
                />
              </motion.div>

              {[-1, 1].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => step(delta)}
                  aria-label={delta < 0 ? "Previous image" : "Next image"}
                  className={cn(
                    /* 64 × 96 px target, as the glyph's was (65.7 × 96). */
                    "absolute top-1/2 inline-flex h-24 -translate-y-1/2 items-center px-5 text-on-night-soft transition-colors duration-250 hover:text-on-night",
                    delta < 0 ? "left-0" : "right-0",
                  )}
                >
                  <StepArrow back={delta < 0} />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
