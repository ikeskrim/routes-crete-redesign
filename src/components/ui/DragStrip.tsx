"use client";

import { useCallback, useRef } from "react";

import { useReducedMotionSafe } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * A horizontal strip you can throw.
 *
 * IDLE AT LOAD, and that is the whole design constraint. There is no effect,
 * no rAF loop, no scroll listener and no observer attached on mount — the only
 * thing wired up is React's own `onPointerDown` on the container. The
 * animation frame starts on release and stops itself the moment the throw dies
 * below a pixel per frame. A strip nobody touches costs exactly nothing, which
 * is what keeps this inside the TBT budget the rest of Stage 3 is measured
 * against.
 *
 * It scrolls the container's own `scrollLeft` rather than transforming a
 * track, so the browser keeps doing the work it is good at: native overflow
 * scrolling still works with a trackpad, a wheel, and the keyboard, and the
 * children stay in normal flow for focus and screen readers.
 *
 * Drag is discriminated from click by distance: dragging past a few pixels
 * suppresses the click that would otherwise fire on release, so throwing the
 * strip never opens whatever tile you happened to let go over.
 *
 * Under prefers-reduced-motion the throw lands immediately instead of gliding.
 */
export function DragStrip({
  children,
  className,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement>(null);

  /* All interaction state lives in a ref, not React state: a drag updates on
     every pointermove, and re-rendering the strip sixty times a second to
     store a number nobody renders would be the most expensive possible way to
     hold it. */
  const drag = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    lastX: 0,
    lastT: 0,
    velocity: 0,
    moved: 0,
    frame: 0,
    captured: false,
    pointerId: -1,
  });

  const glide = useCallback(() => {
    const el = ref.current;
    const d = drag.current;
    if (!el) return;

    d.velocity *= 0.94;
    el.scrollLeft -= d.velocity;

    // Stop the loop rather than let it idle at zero: an animation frame that
    // runs forever to move nothing is the exact cost this component avoids.
    if (Math.abs(d.velocity) > 0.4) {
      d.frame = requestAnimationFrame(glide);
    } else {
      d.frame = 0;
    }
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Let the browser handle a real scroll gesture on touch; this is for
      // pointers that cannot flick.
      if (event.pointerType === "touch") return;
      const el = ref.current;
      if (!el) return;

      const d = drag.current;
      if (d.frame) cancelAnimationFrame(d.frame);
      d.frame = 0;
      d.active = true;
      d.startX = event.clientX;
      d.lastX = event.clientX;
      d.lastT = event.timeStamp;
      d.startScroll = el.scrollLeft;
      d.velocity = 0;
      d.moved = 0;
      d.captured = false;
      d.pointerId = event.pointerId;
      /* Deliberately NOT capturing the pointer yet.
         setPointerCapture on pointerdown redirects the eventual `click` to the
         capturing container, so the tile's own onClick never fires — measured:
         it silently broke every gallery tile, a click opened nothing. Capture
         is taken only once a real drag starts, below. */
    },
    [],
  );

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = ref.current;
    if (!d.active || !el) return;

    const dx = event.clientX - d.lastX;
    const dt = Math.max(1, event.timeStamp - d.lastT);
    // A pixels-per-frame velocity, smoothed so one stuttering sample cannot
    // launch the strip across the page.
    d.velocity = d.velocity * 0.7 + (dx / dt) * 16 * 0.3;
    d.lastX = event.clientX;
    d.lastT = event.timeStamp;
    d.moved += Math.abs(dx);

    // Now it is a drag, not a click: take the pointer so the gesture keeps
    // working if it leaves the strip.
    if (!d.captured && d.moved > 4) {
      el.setPointerCapture(event.pointerId);
      d.captured = true;
    }

    el.scrollLeft = d.startScroll - (event.clientX - d.startX);
  }, []);

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      const el = ref.current;
      if (!d.active || !el) return;
      d.active = false;
      if (d.captured) {
        el.releasePointerCapture(event.pointerId);
        d.captured = false;
      }

      if (!reduced && Math.abs(d.velocity) > 1) {
        d.frame = requestAnimationFrame(glide);
      }
    },
    [glide, reduced],
  );

  /* A drag that travelled more than a few pixels swallows the click on
     release. Capture phase, so it lands before the tile's own handler. */
  const onClickCapture = useCallback((event: React.MouseEvent) => {
    if (drag.current.moved > 6) {
      event.preventDefault();
      event.stopPropagation();
      drag.current.moved = 0;
    }
  }, []);

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
      data-drag-strip
      className={cn(
        /* NO scroll-snap. Mandatory snapping and inertia are mutually
           exclusive: the browser snaps to the nearest point the instant the
           pointer lifts, which overrides the glide entirely — measured, the
           throw travelled 0px with snapping on. A strip you throw should land
           where you threw it. */
        "no-scrollbar flex gap-4 overflow-x-auto overscroll-x-contain",
        "cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      {children}
    </div>
  );
}
