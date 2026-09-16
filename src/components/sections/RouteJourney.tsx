"use client";

import { useRef, useState, type ReactNode } from "react";
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
 * C+ (SPEC §D.6 item 7, §B.2 chart tokens). Printed on night: the chart is a
 * CLEAN night panel (opaque, so the section's grain and density stop at its
 * 1 px `rule-night` edge, 4.68:1), never night-raised (terracotta would fall
 * to 2.92). Every colour is an edition token, never a literal in the SVG:
 *   - grid `chart-grid-night` (1.51, decorative); the road not yet travelled
 *     `hairline-night` (decorative); the route `chart-route-night`,
 *     terracotta 3.35 (≥ 3 for a graphic, 3.32 on a grain speck);
 *   - a stop not yet drawn: `chart-stop-bg-night` fill, `chart-stop-edge-night`
 *     edge (stone, 7.04), `chart-stop-fg-night` numeral (8.20);
 *   - a stop drawn: `chart-stop-lit-edge-night` edge (terracotta, 3.35),
 *     `chart-stop-lit-fg-night` numeral (paper, 14.71);
 *   - the active stop: `chart-stop-active-bg-night` fill and edge (paper,
 *     14.71) with a `chart-stop-active-fg-night` numeral (night, 14.71);
 *   - the marker: a paper core (`chart-pin-night`) in a stone halo at 25 %
 *     fill opacity (decorative).
 * The N arrow and the scale bar are on-night-soft; the preview box is square
 * with a `hairline-night` border and nothing laid over its photograph (D2);
 * its caption is the place line and the ledger credit, rendered on the server
 * (`captions`), in a slot that reserves its height so a new stop never moves
 * the page. No gold anywhere: gold is for the pill alone.
 *
 * Layout: a subgrid row of the section's editorial grid. ≥1024 the chart sits
 * at `col 1 / span 4` and the day at `col 6 / span 7`, column 5 left as air;
 * below 1024 both run `content-start / content-end`, one under the other.
 *
 * Motion budget: stroke drawing and transforms only. The marker is positioned
 * by writing a transform attribute through a ref, so a scroll frame costs one
 * attribute write and no React render. Reduced motion renders the path fully
 * drawn with every stop present — the design, not a disabled version of it —
 * and the preview changes with a 150 ms opacity fade (it answers a pointer or
 * a focus), never a scale.
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

/* The reveal curve of the edition (`--ed-ease-reveal`, as a motion easing). */
const EASE_REVEAL = [0.2, 0.7, 0.1, 1] as const;

/**
 * Coordinates are rounded to thousandths of a viewBox unit before they are
 * written anywhere. The projection runs through `Math.cos` on the server and
 * again in the browser, and the two engines' transcendental functions agree
 * only to about twelve digits: the path strings differed in their last places
 * and React reported a hydration mismatch on every route page (measured on
 * the shared dev server). A thousandth of a unit is well under a hundredth of
 * a pixel at any size this chart is drawn.
 */
const fix = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Catmull-Rom through the stops, converted to cubic beziers.
 *
 * A polyline reads as a diagram; a road bends. The curve is interpolating — it
 * passes exactly through every control point — which is what lets it be
 * prettier than a polyline without relocating a single place.
 *
 * The tangent at a stop is shared out by the lengths of the two legs it joins
 * (chordal weighting). With the plain 1/6 handles, a short leg after a long
 * one overshot: the day that runs south to the Preveli lagoon and turns back
 * a kilometre to the monastery drew its line kilometres past the lagoon, a
 * road that is not there. For legs of equal length the weighting IS the
 * plain 1/6, so an evenly spaced route draws exactly as before; the two ends
 * of the route keep 1/6 of their leg.
 */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const leg = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(b.x - a.x, b.y - a.y);

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const p0 = points[i - 1] ?? p1;
    const p3 = points[i + 2] ?? p2;

    const d12 = leg(p1, p2);
    // An end of the route has no leg beyond it: it counts as this leg.
    const d01 = i > 0 ? leg(p0, p1) : d12;
    const d23 = i + 2 < points.length ? leg(p2, p3) : d12;
    const k1 = d01 + d12 > 0 ? d12 / (3 * (d01 + d12)) : 1 / 6;
    const k2 = d12 + d23 > 0 ? d12 / (3 * (d12 + d23)) : 1 / 6;

    const c1x = fix(p1.x + (p2.x - p0.x) * k1);
    const c1y = fix(p1.y + (p2.y - p0.y) * k1);
    const c2x = fix(p2.x - (p3.x - p1.x) * k2);
    const c2y = fix(p2.y - (p3.y - p1.y) * k2);

    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Where each stop's disc is drawn: on its place, except where two stops are
 * so close that their discs would touch (the Preveli lagoon and monastery,
 * about a kilometre apart). Such a pair is eased apart along the line that
 * joins them until their centres are `MIN_GAP` apart, which keeps both discs
 * on the route between them; the line itself still runs through the real
 * places. `MIN_GAP` is in viewBox units: a 28 px disc grown to 32 px when
 * active, with air, on the smallest chart (296 px wide at 1024, 3.7 px a
 * unit).
 */
const MIN_GAP = 10;

function discPositions(points: { x: number; y: number }[]): { x: number; y: number }[] {
  const discs = points.map((p) => ({ x: p.x, y: p.y }));
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (let i = 0; i < discs.length; i++) {
      for (let j = i + 1; j < discs.length; j++) {
        const a = discs[i];
        const b = discs[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        if (dist >= MIN_GAP - 0.001) continue;
        if (dist < 0.001) {
          // The same place twice: stack them north–south.
          dx = 0;
          dy = 1;
          dist = 1;
        }
        const push = (MIN_GAP - Math.hypot(b.x - a.x, b.y - a.y)) / 2;
        a.x -= (dx / dist) * push;
        a.y -= (dy / dist) * push;
        b.x += (dx / dist) * push;
        b.y += (dy / dist) * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const inside = (v: number, max: number) => Math.min(max - PAD / 2, Math.max(PAD / 2, v));
  return discs.map((p) => ({ x: fix(inside(p.x, VIEW_W)), y: fix(inside(p.y, VIEW_H)) }));
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
    x: fix(offsetX + (gx[i] - minX) * usable),
    y: fix(offsetY + (gy[i] - minY) * usable),
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
  captions = {},
  className,
}: {
  /** In journey order — the order of the day, not of the catalogue. */
  stops: Stop[];
  images?: Record<string, StopImage>;
  /**
   * The preview's caption per location key: a server-rendered `<Caption>`
   * (the place line and its ledger credit), so the ledger never ships to the
   * browser. No caption, no figcaption.
   */
  captions?: Record<string, ReactNode>;
  /** On the root, a subgrid row: its placement in the section's grid. */
  className?: string;
}) {
  const reduced = useReducedMotionSafe();
  const sectionRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const markerRef = useRef<SVGGElement>(null);

  const [active, setActive] = useState(0);
  /* The first preview is printed with the page (and stays visible with
     JavaScript off); only a preview the reader asked for fades in. */
  const [chosen, setChosen] = useState(false);
  const select = (i: number) => {
    if (i === active) return;
    setChosen(true);
    setActive(i);
  };
  const [reached, setReached] = useState(0);
  /** Cumulative distance to each stop, 0..1 along the path, per path. */
  const marksRef = useRef<{ d: string; marks: number[] } | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 85%", "end 70%"],
  });

  const { points, kmPerUnit } = stops.length
    ? project(stops)
    : { points: [] as ReturnType<typeof project>["points"], kmPerUnit: 0 };
  const d = smoothPath(points);
  const discs = discPositions(points);

  /* A scale bar with a round number on it. Pick the nicest distance that fits
     comfortably inside the chart, then draw the bar that distance is worth. */
  const scale = (() => {
    if (!kmPerUnit) return null;
    for (const km of [1, 2, 5, 10, 20, 50]) {
      const units = km / kmPerUnit;
      if (units >= 12 && units <= 38) return { km, width: fix((units / VIEW_W) * 100) };
    }
    return null;
  })();

  /* Where each stop falls along the path, measured rather than estimated.
     Building the curve up one segment at a time and asking each partial path
     for its own length gives the exact cumulative distance at every stop —
     which is what decides when a stop lights up as the line reaches it.
     Measured once per path, on the first scroll frame that needs it (a DOM
     measurement, so never during render, and no state of its own). */
  const marksFor = (path: string): number[] => {
    if (marksRef.current?.d === path) return marksRef.current.marks;
    let marks: number[] = [];
    if (points.length >= 2) {
      const probe = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const lengths: number[] = [0];
      for (let i = 2; i <= points.length; i++) {
        probe.setAttribute("d", smoothPath(points.slice(0, i)));
        lengths.push(probe.getTotalLength());
      }
      const total = lengths[lengths.length - 1] || 1;
      marks = lengths.map((l) => l / total);
    }
    marksRef.current = { d: path, marks };
    return marks;
  };

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

    const marks = marksFor(d);
    if (marks.length) {
      let count = 0;
      for (const mark of marks) if (progress >= mark - 0.001) count++;
      setReached((previous) => (previous === count ? previous : count));
    }
  });

  if (stops.length === 0) return null;

  const activeKey = points[active]?.key;
  const preview = activeKey ? images[activeKey] : undefined;
  const caption = activeKey && preview ? captions[activeKey] : undefined;
  const drawn = reduced ? stops.length : reached;
  /* A named photograph is a figure with its caption; the honest-absence
     sentence is not a figure. */
  const Preview = preview ? "figure" : "div";

  return (
    <div
      ref={sectionRef}
      className={cn("grid grid-cols-subgrid items-start gap-y-(--ed-space-block)", className)}
    >
      {/* The chart: a clean night panel with a 1 px rule-night edge. */}
      <div className="col-[content-start/content-end] lg:col-[col_1/span_4]">
        <div className="relative aspect-[4/5] w-full overflow-clip border border-rule-night bg-night">
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
                  className="stroke-chart-grid-night"
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
              className="stroke-hairline-night"
              strokeWidth="0.3"
              strokeLinecap="round"
            />

            {/* The route itself, drawing as the reader descends.
                pathLength={1} is load-bearing. Motion drives this by writing
                strokeDasharray as a FRACTION ("0.57 1"), which only means
                "57% drawn" if the path reports its own length as 1. Without
                the attribute those fractions are user units against a path
                ~75 units long, and the route renders as a repeating dashed
                line instead of one stroke arriving. */}
            <motion.path
              ref={pathRef}
              d={d}
              pathLength={1}
              fill="none"
              className="stroke-chart-route-night"
              strokeWidth="0.45"
              strokeLinecap="round"
              style={reduced ? { pathLength: 1 } : { pathLength: scrollYProgress }}
            />

            {!reduced && (
              <g ref={markerRef}>
                <circle r="1.5" className="fill-stone" fillOpacity={0.25} />
                <circle r="0.5" className="fill-chart-pin-night" />
              </g>
            )}
          </svg>

          {/* Chart furniture. North, and a scale bar whose label is computed
              from the real coordinates — the chart states its own scale rather
              than asking to be taken on trust. Set in the caption step, like
              every other note on the page; "km" keeps its lower case (a unit
              symbol, never capitals). The bar's box is the scale's share of
              the chart's width (a percentage of the chart, its containing
              block), and the rule fills it. */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-5 right-5 flex flex-col items-center gap-1 text-on-night-soft"
          >
            <svg viewBox="0 0 12 16" className="h-4 w-3" fill="none">
              <path d="M6 0 L10 12 L6 9.5 L2 12 Z" fill="currentColor" />
            </svg>
            <span className="text-caption leading-none">N</span>
          </div>

          {scale && (
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-5 left-5 flex flex-col gap-1.5 text-on-night-soft"
              style={{ width: `${scale.width}%` }}
            >
              <span className="block h-px w-full bg-on-night-soft" />
              <span className="text-caption leading-none whitespace-nowrap tabular-nums">
                {scale.km} km
              </span>
            </div>
          )}

          {/* Waypoints. The number rides the chart; the name lives in the
              ledger, because on a real route the closest two stops are where
              labels collide and where telling them apart matters most. A
              pointer selects a stop here as it does in the ledger. The
              keyboard reaches each stop once, by its ledger row (the labelled
              control with the same action), so the discs are out of the tab
              order. The discs are data marks, the one round shape here
              (preflight P8 allowlist), drawn at `discs` (eased apart where two
              stops would touch). */}
          {points.map((point, i) => {
            const lit = i < drawn;
            const isActive = i === active;

            return (
              <button
                key={point.key}
                type="button"
                tabIndex={-1}
                style={{
                  left: `${fix((discs[i].x / VIEW_W) * 100)}%`,
                  top: `${fix((discs[i].y / VIEW_H) * 100)}%`,
                }}
                onMouseEnter={() => select(i)}
                onFocus={() => select(i)}
                onClick={() => select(i)}
                aria-label={`Stop ${String(i + 1).padStart(2, "0")}: ${point.name}`}
                // The disc reads at 28px; the target must be 44. The padding
                // buys the missing 16px without inflating the mark — the
                // mobile audit failed this at 28x28 and was right to.
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-pill p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-night"
              >
                {/* The numeral is structural numbering (§C.6), hidden from
                    assistive tech: the button is named by its aria-label. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-7 items-center justify-center rounded-pill border font-editorial text-[0.625rem] tabular-nums",
                    "transition-[scale,color,background-color,border-color] duration-700 ease-reveal",
                    isActive
                      ? "scale-115 border-chart-stop-active-bg-night bg-chart-stop-active-bg-night text-chart-stop-active-fg-night"
                      : lit
                        ? "border-chart-stop-lit-edge-night bg-chart-stop-bg-night text-chart-stop-lit-fg-night"
                        : "border-chart-stop-edge-night bg-chart-stop-bg-night text-chart-stop-fg-night",
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
      <div className="col-[content-start/content-end] lg:col-[col_6/span_7]">
        {/* The active stop, at a fixed size so selecting one can never move
            the layout — CLS stays 0 whatever the reader hovers. */}
        <Preview>
          <div className="relative aspect-[16/9] w-full overflow-clip border border-hairline-night bg-night">
            {preview ? (
              <motion.div
                key={preview.src}
                initial={chosen ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={
                  reduced
                    ? { duration: 0.15, ease: "linear" }
                    : { duration: 0.6, ease: EASE_REVEAL }
                }
                className="absolute inset-0"
              >
                <Image
                  src={preview.src}
                  alt={preview.alt}
                  fill
                  /* The frame's inner width: the content width below 1024,
                     col 6 / span 7 from 1024, less the 1 px border. The
                     place photographs are no wider than 16:9, so the cover
                     crop is width-driven. Per ed-grid regime, as
                     ItemDetail's BREAK_SIZES (checked at every width,
                     .hunt/cplus/rollout/g6/sizes-sweep.mjs). */
                  sizes="(min-width: 1574px) 814px, (min-width: 1440px) calc(52.5vw - 12px), (min-width: 1024px) calc(51.81vw - 2px), (min-width: 640px) calc(90vw - 2px), (min-width: 480px) 430px, (min-width: 400px) calc(90vw - 2px), calc(100vw - 42px)"
                  quality={68}
                  loading="lazy"
                  placeholder={preview.blurDataURL ? "blur" : undefined}
                  blurDataURL={preview.blurDataURL}
                  className="object-cover"
                />
              </motion.div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
                <p className="text-caption max-w-[28ch] text-on-night-soft">
                  No photograph we can honestly caption as this place — so it
                  gets none.
                </p>
              </div>
            )}
          </div>
          {/* The caption slot keeps the height of the tallest caption (one
              place line, two credit lines on a phone), so a stop with a
              shorter caption, or none, moves nothing below it. */}
          <div className="min-h-[6.75rem] sm:min-h-[4.75rem]">{caption}</div>
        </Preview>

        <ol className="mt-(--ed-space-pair) flex flex-col">
          {points.map((point, i) => {
            const image = images[point.key];
            const lit = i < drawn;
            const isActive = i === active;

            return (
              <li key={point.key}>
                <button
                  type="button"
                  onMouseEnter={() => select(i)}
                  onFocus={() => select(i)}
                  onClick={() => select(i)}
                  aria-current={isActive ? "true" : undefined}
                  className="flex w-full items-baseline gap-5 border-t border-hairline-night px-1 py-4 text-left focus-visible:outline-focus-night"
                >
                  <span
                    className={cn(
                      "font-editorial text-[0.8125rem] tabular-nums transition-colors duration-500",
                      lit || isActive ? "text-on-night" : "text-on-night-soft",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body text-on-night">{point.name}</span>
                    {image && image.alt !== point.name && (
                      <span className="text-caption mt-1 block text-on-night-soft">
                        {image.alt}
                      </span>
                    )}
                  </span>
                  <span
                    aria-hidden
                    // Fixed width, scaled from the right edge: the old w-5/w-10
                    // swap squeezed the name beside it and could re-wrap the
                    // row on every hover. Half of 40px is the old 20px. The
                    // active mark is terracotta (a graphic, 3.35 on night).
                    className={cn(
                      "h-px w-10 shrink-0 origin-right self-center transition-[scale,background-color] duration-700 ease-reveal",
                      isActive ? "scale-x-100 bg-accent" : "scale-x-50 bg-rule-night",
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
