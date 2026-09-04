"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion";

import type { MapLocation } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The route, as a journey rather than a line.
 *
 * What this replaces was honest but inert: a dashed `<polyline>` through the
 * stops, sorted west to east, that did nothing. The client's note was exactly
 * that — "the route is just a line". A day out is a sequence, so this draws
 * itself in that sequence as the reader scrolls, carries a marker along it,
 * and gives every stop the real photograph of the real place.
 *
 * Two decisions are worth the space to explain.
 *
 * FIRST: the projection is uniform, not stretched. The chart this grew out of
 * normalised longitude and latitude independently across the bounding box of
 * the stops. That is fine for nine pins spread over an island; for the three
 * stops of one day it is degenerate. It pins the two extremes to opposite
 * corners no matter what the real geography is, so every route renders as the
 * same corner-to-corner diagonal — and Preveli's lagoon and monastery, a
 * kilometre apart in life, landed on top of each other at 88%,88% and
 * 86%,82%. Scaling both axes by the SAME factor (with longitude corrected for
 * convergence at this latitude) draws the route's true shape: this day really
 * does run nearly due south, and now it looks like it.
 *
 * SECOND: the names live in the ledger beside the chart, not on it. Labels on
 * the chart collided precisely where the stops are closest, which is exactly
 * where a reader most needs to tell them apart.
 *
 * What is inherited unchanged: a place we cannot honestly photograph gets a
 * marker and its name and nothing else — no lookalike, ever — and the one true
 * line under each name is the photograph's own verified caption, what the
 * frame actually depicts, rather than travel copy written to fill a slot.
 *
 * Motion budget: stroke drawing and transforms only. The marker is positioned
 * by writing a transform attribute through a ref, so a scroll frame costs one
 * attribute write and no React render. Reduced motion renders the path fully
 * drawn with every stop present — the design, not a disabled version of it.
 */

type Stop = MapLocation & { lat: number; lng: number };
type StopImage = { src: string; alt: string; blurDataURL?: string };

/* The chart's own box, in viewBox units, with the SAME 4:5 aspect as the
 * element it renders into. That equality is the whole point: a square viewBox
 * stretched into a 4:5 box scales x and y differently, which forces
 * `non-scaling-stroke` to keep the line an even width — and non-scaling-stroke
 * computes the dash pattern in post-transform space, which quietly defeats the
 * pathLength normalisation the draw-on-scroll depends on. The route rendered
 * as a repeating dashed line instead of one stroke arriving. Matching the
 * aspect makes the projection uniform for free, so stroke widths are plain
 * user units and the dashes behave. */
const VIEW_W = 80;
const VIEW_H = 100;
const PAD = 12;

/**
 * Catmull-Rom through the stops, converted to cubic beziers.
 *
 * A polyline reads as a diagram; a road bends. The curve is interpolating — it
 * passes exactly through every control point — which is what lets it be
 * prettier than a polyline without relocating a single place.
 */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    // 1/6 is the standard Catmull-Rom to Bezier tension.
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Great-circle distance in kilometres. Used only to label the scale bar, so
 *  the chart states its own scale from the real coordinates instead of asking
 *  the reader to take the geometry on trust. */
function haversineKm(a: Stop, b: Stop) {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** True-shape projection: one scale for both axes, longitude corrected for
 *  convergence, then centred in the box. */
function project(stops: Stop[]) {
  const midLat = (Math.min(...stops.map((s) => s.lat)) + Math.max(...stops.map((s) => s.lat))) / 2;
  const k = Math.cos((midLat * Math.PI) / 180);

  const gx = stops.map((s) => s.lng * k);
  const gy = stops.map((s) => -s.lat); // south is down
  const minX = Math.min(...gx);
  const minY = Math.min(...gy);
  const spanX = Math.max(...gx) - minX;
  const spanY = Math.max(...gy) - minY;

  const availX = VIEW_W - PAD * 2;
  const availY = VIEW_H - PAD * 2;
  const scale = Math.min(
    spanX > 0 ? availX / spanX : Infinity,
    spanY > 0 ? availY / spanY : Infinity,
  );
  const usable = Number.isFinite(scale) ? scale : 1;

  const offsetX = (VIEW_W - spanX * usable) / 2;
  const offsetY = (VIEW_H - spanY * usable) / 2;

  const points = stops.map((s, i) => ({
    ...s,
    x: offsetX + (gx[i] - minX) * usable,
    y: offsetY + (gy[i] - minY) * usable,
  }));

  /* What one viewBox unit is worth on the ground. The scale is uniform now, so
     this is a single number rather than a per-axis fudge. */
  let kmPerUnit = 0;
  if (points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    const span = Math.hypot(last.x - first.x, last.y - first.y);
    if (span > 0) kmPerUnit = haversineKm(stops[0], stops[stops.length - 1]) / span;
  }

  return { points, kmPerUnit };
}

export function RouteJourney({
  stops,
  images = {},
}: {
  /** In journey order — the order of the day, not of the catalogue. */
  stops: Stop[];
  images?: Record<string, StopImage>;
}) {
  const reduced = useReducedMotionSafe();
  const sectionRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const markerRef = useRef<SVGGElement>(null);

  const [active, setActive] = useState(0);
  const [reached, setReached] = useState(0);
  /** Cumulative distance to each stop, 0..1 along the path. */
  const [marks, setMarks] = useState<number[]>([]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 85%", "end 70%"],
  });

  const { points, kmPerUnit } = stops.length
    ? project(stops)
    : { points: [] as ReturnType<typeof project>["points"], kmPerUnit: 0 };
  const d = smoothPath(points);

  /* A scale bar with a round number on it. Pick the nicest distance that fits
     comfortably inside the chart, then draw the bar that distance is worth. */
  const scale = (() => {
    if (!kmPerUnit) return null;
    for (const km of [1, 2, 5, 10, 20, 50]) {
      const units = km / kmPerUnit;
      if (units >= 12 && units <= 38) return { km, units };
    }
    return null;
  })();

  /* Where each stop falls along the path, measured rather than estimated.
     Building the curve up one segment at a time and asking each partial path
     for its own length gives the exact cumulative distance at every stop —
     which is what decides when a stop lights up as the line reaches it. */
  useEffect(() => {
    if (points.length < 2) return;
    const probe = document.createElementNS("http://www.w3.org/2000/svg", "path");

    const lengths: number[] = [0];
    for (let i = 2; i <= points.length; i++) {
      probe.setAttribute("d", smoothPath(points.slice(0, i)));
      lengths.push(probe.getTotalLength());
    }
    const total = lengths[lengths.length - 1] || 1;
    setMarks(lengths.map((l) => l / total));
    // The path string fully describes the geometry; rebuilding on every render
    // of the same route would be wasted work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);

  /* One attribute write per frame, no re-render. setState is called only when
     the count of reached stops actually changes — at most once per stop. */
  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (reduced) return;

    const path = pathRef.current;
    if (path && markerRef.current) {
      const total = path.getTotalLength();
      const point = path.getPointAtLength(Math.max(0, Math.min(1, progress)) * total);
      markerRef.current.setAttribute("transform", `translate(${point.x} ${point.y})`);
    }

    if (marks.length) {
      let count = 0;
      for (const mark of marks) if (progress >= mark - 0.001) count++;
      setReached((previous) => (previous === count ? previous : count));
    }
  });

  if (stops.length === 0) return null;

  const preview = images[points[active]?.key];
  const drawn = reduced ? stops.length : reached;

  return (
    <div ref={sectionRef} className="grid gap-10 lg:grid-cols-12 lg:gap-14">
      {/* The chart */}
      <div className="lg:col-span-4">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-media border border-sand-100/12 bg-ocean-900">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            <defs>
              <pattern id="route-grid" width="6.25" height="6.25" patternUnits="userSpaceOnUse">
                <path
                  d="M 6.25 0 L 0 0 0 6.25"
                  fill="none"
                  stroke="rgba(232,220,198,0.06)"
                  strokeWidth="0.12"
                />
              </pattern>
            </defs>
            <rect width={VIEW_W} height={VIEW_H} fill="url(#route-grid)" />

            {/* The road not yet travelled: the whole route, faint, so the
                shape of the day is legible before the line arrives. */}
            <path
              d={d}
              fill="none"
              stroke="rgba(232,220,198,0.16)"
              strokeWidth="0.22"
              strokeLinecap="round"
            />

            {/* The route itself, drawing as the reader descends.
                `non-scaling-stroke` means these widths are CSS pixels, not
                viewBox units — at 0.7 the line was very nearly invisible. */}
            {/* pathLength={1} is load-bearing. Motion drives this by writing
                strokeDasharray as a FRACTION ("0.57 1"), which only means
                "57% drawn" if the path reports its own length as 1. Without
                the attribute those fractions are user units against a path
                ~75 units long, and the route renders as a repeating dashed
                line instead of one stroke arriving. */}
            <motion.path
              d={d}
              pathLength={1}
              fill="none"
              stroke="rgba(212,174,106,0.26)"
              strokeWidth="1.15"
              strokeLinecap="round"
              style={reduced ? { pathLength: 1 } : { pathLength: scrollYProgress }}
            />
            <motion.path
              ref={pathRef}
              d={d}
              pathLength={1}
              fill="none"
              stroke="rgb(226,190,124)"
              strokeWidth="0.38"
              strokeLinecap="round"
              style={reduced ? { pathLength: 1 } : { pathLength: scrollYProgress }}
            />

            {!reduced && (
              <g ref={markerRef}>
                <circle r="1.5" fill="rgba(212,174,106,0.20)" />
                <circle r="0.5" fill="rgb(245,226,182)" />
              </g>
            )}
          </svg>

          {/* Chart furniture. North, and a scale bar whose label is computed
              from the real coordinates — the chart states its own scale rather
              than asking to be taken on trust. */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-5 right-5 flex flex-col items-center gap-1 text-sand-200/70"
          >
            <svg viewBox="0 0 12 16" className="h-4 w-3" fill="none">
              <path d="M6 0 L10 12 L6 9.5 L2 12 Z" fill="currentColor" />
            </svg>
            <span className="text-[0.5625rem] tracking-[0.18em] uppercase">N</span>
          </div>

          {scale && (
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-5 left-5 flex flex-col gap-1.5 text-sand-200/70"
            >
              <span
                className="block h-px bg-sand-200/40"
                style={{ width: `${(scale.units / VIEW_W) * 100}%` }}
              />
              <span className="text-[0.5625rem] tracking-[0.16em] uppercase tabular-nums">
                {scale.km} km
              </span>
            </div>
          )}

          {/* Waypoints. Buttons rather than decoration: each is reachable by
              keyboard, and focus selects the same chapter hover does. The
              number rides the chart; the name lives in the ledger, because on
              a real route the closest two stops are where labels collide and
              where telling them apart matters most. */}
          {points.map((point, i) => {
            const lit = i < drawn;
            const isActive = i === active;

            return (
              <button
                key={point.key}
                type="button"
                style={{
                  left: `${(point.x / VIEW_W) * 100}%`,
                  top: `${(point.y / VIEW_H) * 100}%`,
                }}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                aria-label={`Stop ${String(i + 1).padStart(2, "0")}: ${point.name}`}
                // The disc reads at 28px; the target must be 44. The padding
                // buys the missing 16px without inflating the mark — the
                // mobile audit failed this at 28x28 and was right to.
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-pill p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-pill border font-display text-[0.625rem] tabular-nums transition-all duration-700 ease-luxe",
                    lit
                      ? "border-gold-400/70 bg-ocean-950/80 text-gold-300"
                      : "border-sand-100/20 bg-ocean-950/60 text-sand-200/55",
                    isActive && "scale-115 border-gold-300 bg-gold-400 text-ocean-950",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The day as chapters */}
      <div className="lg:col-span-8">
        {/* The active stop, at a fixed size so selecting one can never move
            the layout — CLS stays 0 whatever the reader hovers. */}
        <div className="overflow-hidden rounded-media border border-sand-100/12 bg-ocean-900">
          <div className="relative aspect-[16/9] w-full bg-ocean-900">
            {preview ? (
              <motion.div
                key={preview.src}
                initial={reduced ? false : { opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0"
              >
                <Image
                  src={preview.src}
                  alt={preview.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 46vw"
                  quality={70}
                  placeholder={preview.blurDataURL ? "blur" : undefined}
                  blurDataURL={preview.blurDataURL}
                  className="object-cover"
                />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ocean-950/70 to-transparent" />
              </motion.div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
                <p className="text-caption max-w-[28ch] text-sand-200/70">
                  No photograph we can honestly caption as this place — so it
                  gets none.
                </p>
              </div>
            )}
          </div>
        </div>

        <ol className="mt-4 flex flex-col">
          {points.map((point, i) => {
            const image = images[point.key];
            const lit = i < drawn;
            const isActive = i === active;

            return (
              <li key={point.key}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "flex w-full items-baseline gap-5 border-t border-sand-100/12 px-1 py-4 text-left transition-colors duration-500",
                    isActive ? "bg-sand-100/[0.04]" : "hover:bg-sand-100/[0.02]",
                  )}
                >
                  <span
                    className={cn(
                      "font-display text-eyebrow tabular-nums transition-colors duration-500",
                      lit ? "text-gold-400" : "text-sand-200/55",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-body transition-colors duration-500",
                        isActive ? "text-gold-300" : "text-sand-50",
                      )}
                    >
                      {point.name}
                    </span>
                    {image && image.alt !== point.name && (
                      <span className="text-caption mt-1 block text-sand-200/65">
                        {image.alt}
                      </span>
                    )}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "h-px shrink-0 self-center transition-all duration-700 ease-luxe",
                      isActive ? "w-10 bg-gold-400" : "w-5 bg-sand-100/25",
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
