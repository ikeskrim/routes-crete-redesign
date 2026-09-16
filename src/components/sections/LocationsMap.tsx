"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion";

import type { MapLocation } from "@/lib/types";
import { cn } from "@/lib/utils";

import styles from "./LocationsMap.module.css";

/* The pin entrance (C+ SPEC §G.1 #14): opacity only, 0.6 s, 0.07 s apart
   (the scale pop is retired); the preview's fade (§G.1, reduced: 150 ms). */
const EASE_REVEAL = [0.2, 0.7, 0.1, 1] as const;

/* Pins stay present under reduced motion (§G.1 #14 "pins present"). The hook
   is false at server render and hydration, so the entrance's server-rendered
   `opacity: 0` would otherwise fade in after all. Same override as Reveal. */
const PRESENT_WHEN_REDUCED = "motion-reduce:opacity-100!";

/* A pin's box, centred on its point: the 8 px dot below `sm`, a 24 px hit
   box from `sm` (half of each is the negative margin). */
const PIN_BOX = "absolute -mt-1 -ml-1 sm:-mt-3 sm:-ml-3 sm:p-2";

/* ---------------------------------------------------------------------------
   Label placement. Each label takes the free side of its pin, so no route or
   arrival line ever runs through a name. Every label also keeps its bone
   knock-out, which stops the grid under the type. Pin positions are the data
   and never move; only the side a label is anchored to is chosen.

   The anchors are the cartographer's order of preference (upper right, lower
   right, upper left, lower left, then level and centred). Each is scored at
   the chart widths the labels show at (the narrowest `sm` chart, the 768,
   1024 and 1280 charts, the widest): leaving the chart, touching a line or
   the gap between the pin and its label, touching another pin or an earlier
   label. Two pins closer than one hit box (Preveli's lagoon and monastery)
   take opposite sides, the upper one above and the lower one below.
   --------------------------------------------------------------------------- */

type Anchor = "ru" | "rd" | "lu" | "ld" | "r" | "l" | "a" | "as" | "ae" | "b" | "bs" | "be";
type Box = [x0: number, y0: number, x1: number, y1: number];
type Plotted = { key: string; name: string; x: number; y: number };

/* Offsets from the pin centre, in px: the dot is 8 px (±4); side labels sit
   8 px off the dot, so they start at the edge of the 24 px hit box. */
const ANCHORS: Record<
  Anchor,
  { h: "right" | "left" | "centre" | "start" | "end"; v: "up" | "down" | "mid" | "above" | "below"; cls: string; pref: number }
> = {
  ru: { h: "right", v: "up", cls: "left-full ml-2 bottom-full", pref: 0 },
  rd: { h: "right", v: "down", cls: "left-full ml-2 top-full", pref: 1 },
  lu: { h: "left", v: "up", cls: "right-full mr-2 bottom-full", pref: 2 },
  ld: { h: "left", v: "down", cls: "right-full mr-2 top-full", pref: 3 },
  r: { h: "right", v: "mid", cls: "left-full ml-2 top-1/2 -translate-y-1/2", pref: 4 },
  l: { h: "left", v: "mid", cls: "right-full mr-2 top-1/2 -translate-y-1/2", pref: 5 },
  as: { h: "start", v: "above", cls: "bottom-full mb-1.5 -left-1", pref: 6 },
  bs: { h: "start", v: "below", cls: "top-full mt-1.5 -left-1", pref: 6 },
  ae: { h: "end", v: "above", cls: "bottom-full mb-1.5 -right-1", pref: 7 },
  be: { h: "end", v: "below", cls: "top-full mt-1.5 -right-1", pref: 7 },
  a: { h: "centre", v: "above", cls: "bottom-full mb-1.5 left-1/2 -translate-x-1/2", pref: 8 },
  b: { h: "centre", v: "below", cls: "top-full mt-1.5 left-1/2 -translate-x-1/2", pref: 8 },
};

/* A letter-spaced capital at the eyebrow size is 8.9–9.3 px wide (measured
   on the served Inter); the estimate errs wide. */
const LABEL_CHAR = 9.4;
const LABEL_PAD = 8; // px-1 on both sides
const LABEL_H = 15.4; // the eyebrow line box
/* The label's hit area reaches 5 px above and below its line box (24 px+). */
const LABEL_HIT = 5;
/* Chart widths at 640, 768, 1024, 1280 and ≥ 1920 (the labels are hidden
   below `sm`). */
const CHECK_WIDTHS = [576, 691, 922, 1152, 1416];
const MISS = 100;

function labelBoxes(anchor: Anchor, w: number): { label: Box; gap: Box } {
  const { h, v } = ANCHORS[anchor];
  const x0 = h === "right" ? 12 : h === "left" ? -12 - w : h === "centre" ? -w / 2 : h === "start" ? -8 : 8 - w;
  const y0 = v === "up" ? -4 - LABEL_H : v === "down" ? 4 : v === "mid" ? -LABEL_H / 2 : v === "above" ? -10 - LABEL_H : 10;
  const label: Box = [x0, y0, x0 + w, y0 + LABEL_H];
  /* the strip between the dot and the label: a line crossing it would read
     as running between a pin and its own name */
  const gap: Box =
    h === "right"
      ? [4, label[1], 12, label[3]]
      : h === "left"
        ? [-12, label[1], -4, label[3]]
        : v === "above"
          ? [label[0], -10, label[2], -4]
          : [label[0], 4, label[2], 10];
  return { label, gap };
}

const shift = (b: Box, dx: number, dy: number): Box => [b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy];
const grow = (b: Box, gx: number, gy: number): Box => [b[0] - gx, b[1] - gy, b[2] + gx, b[3] + gy];
const overlaps = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/** Does the segment (x0,y0)–(x1,y1) pass through the box? (Liang–Barsky) */
function crosses(x0: number, y0: number, x1: number, y1: number, b: Box): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  for (const [p, q] of [
    [-dx, x0 - b[0]],
    [dx, b[2] - x0],
    [-dy, y0 - b[1]],
    [dy, b[3] - y0],
  ]) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      t0 = Math.max(t0, t);
    } else {
      if (t < t0) return false;
      t1 = Math.min(t1, t);
    }
  }
  return true;
}

function placeLabels(
  points: Plotted[],
  lines: [Plotted, Plotted][],
  aspect: number,
): { anchors: Record<string, Anchor>; raised: Set<string> } {
  const width = (p: Plotted) => p.name.length * LABEL_CHAR + LABEL_PAD;

  const cost = (p: Plotted, anchor: Anchor, placed: Record<string, Anchor>) => {
    let c = ANCHORS[anchor].pref;
    const { label, gap } = labelBoxes(anchor, width(p));
    for (const W of CHECK_WIDTHS) {
      const H = W / aspect;
      const at = (q: Plotted) => [(q.x * W) / 100, (q.y * H) / 100] as const;
      const [cx, cy] = at(p);
      const L = shift(label, cx, cy);
      const G = shift(gap, cx, cy);
      if (L[0] < 0 || L[1] < 0 || L[2] > W || L[3] > H) c += MISS;
      const reach = grow(L, 2, 2);
      for (const [s, e] of lines) {
        const [x0, y0] = at(s);
        const [x1, y1] = at(e);
        if (crosses(x0, y0, x1, y1, reach) || crosses(x0, y0, x1, y1, G)) c += MISS;
      }
      for (const q of points) {
        if (q === p) continue;
        const [qx, qy] = at(q);
        const dot: Box = [qx - 4, qy - 4, qx + 4, qy + 4];
        if (overlaps(grow(dot, 2, LABEL_HIT), L) || overlaps(dot, G)) c += MISS;
        const qa = placed[q.key];
        if (qa && overlaps(grow(shift(labelBoxes(qa, width(q)).label, qx, qy), 2, LABEL_HIT), L)) c += MISS;
      }
    }
    return c;
  };

  const best = (p: Plotted, placed: Record<string, Anchor>) =>
    (Object.keys(ANCHORS) as Anchor[]).reduce(
      (acc, a) => {
        const c = cost(p, a, placed);
        return c < acc.c ? { a, c } : acc;
      },
      { a: "ru" as Anchor, c: Infinity },
    );

  /* Pairs closer than one 24 px hit box at the narrowest chart. */
  const W0 = CHECK_WIDTHS[0];
  const H0 = W0 / aspect;
  const offset = (p: Plotted, q: Plotted) => [((q.x - p.x) * W0) / 100, ((q.y - p.y) * H0) / 100] as const;
  const nearest = (p: Plotted) =>
    points
      .filter((q) => q !== p)
      .reduce<{ q: Plotted | null; d: number }>(
        (acc, q) => {
          const d = Math.hypot(...offset(p, q));
          return d < acc.d ? { q, d } : acc;
        },
        { q: null, d: Infinity },
      );

  const placed: Record<string, Anchor> = {};
  const raised = new Set<string>();
  for (const p of points) {
    if (placed[p.key]) continue;
    const { q, d } = nearest(p);
    if (q && d < 24 && !placed[q.key] && nearest(q).q === p) {
      const [dx, dy] = offset(p, q);
      const vertical = Math.abs(dy) >= Math.abs(dx);
      const [first, second] = (vertical ? dy >= 0 : dx >= 0) ? [p, q] : [q, p];
      const combos: [Anchor, Anchor][] = vertical
        ? [
            ["lu", "rd"],
            ["ru", "ld"],
          ]
        : (["l", "lu", "ld"] as Anchor[]).flatMap((a) => (["r", "ru", "rd"] as Anchor[]).map((b) => [a, b] as [Anchor, Anchor]));
      let pick = combos[0];
      let min = Infinity;
      for (const [a, b] of combos) {
        const c = cost(first, a, placed) + cost(second, b, { ...placed, [first.key]: a });
        if (c < min) [pick, min] = [[a, b], c];
      }
      placed[first.key] = pick[0];
      raised.add(first.key);
      placed[second.key] = pick[1];
    } else {
      placed[p.key] = best(p, placed).a;
    }
  }
  return { anchors: placed, raised };
}

/**
 * The real route, plotted from real coordinates (C+ SPEC §D.4 map block).
 *
 * Deliberately not a landmass illustration: drawing a Crete silhouette from
 * memory would put an invented shape on the page. Instead each point sits at
 * its true relative position (equirectangular projection over the bounding box
 * of the actual locations, the chart as wide as that box is on the ground, so
 * both axes share one scale), joined by a dashed route line: a navigator's
 * chart rather than a tourist map.
 *
 * Printed on a clean bone inset (no texture under the chart): a warm grid
 * hairline, the route in terracotta dashes, route stops as ink dots, airports
 * as ink-soft rings, labels in letter-spaced capitals in ink-soft. Colours
 * are edition tokens (`--ed-chart-*`), never literals in the SVG.
 *
 * Locations the copy references but never names carry `needsInput` and are not
 * plotted at all.
 */
export function LocationsMap({
  locations,
  links,
  images = {},
  captions = {},
}: {
  locations: (MapLocation & { lat: number; lng: number })[];
  links: Record<string, string>;
  /**
   * One real, licence-verified photograph per location key.
   *
   * The chart plots where the journeys go; these show what is actually there.
   * Every one is credited on /credits and captioned only with what it truly
   * depicts — a place with no photograph we can honestly caption simply has
   * no preview, which is why this is a partial map rather than a required one.
   *
   * Mounted only while a pin is hovered or focused, so the chart costs nothing
   * until someone reaches for it — the same contract the overlay menu keeps.
   */
  images?: Record<string, { src: string; alt: string; blurDataURL?: string }>;
  /**
   * The preview's caption per location key: a server-rendered `<Caption>`
   * (the place line and its ledger credit), so the ledger never ships to the
   * browser. No caption, no figcaption.
   */
  captions?: Record<string, ReactNode>;
}) {
  const reduced = useReducedMotionSafe();
  const [hovered, setHovered] = useState<string | null>(null);

  const chart = useMemo(() => {
    if (locations.length === 0) return null;

    const lats = locations.map((l) => l.lat);
    const lngs = locations.map((l) => l.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    /* The chart's aspect is the ground's: east–west span (shortened by the
       cosine of the mid latitude) over north–south span, kept between 1.6
       and 2.6 so a lopsided set of places can't make a strip or a tower. */
    const spanX = (maxLng - minLng) * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
    const spanY = maxLat - minLat;
    const aspect =
      spanX > 0 && spanY > 0 ? Math.round(Math.min(2.6, Math.max(1.6, spanX / spanY)) * 1000) / 1000 : 2;

    const PAD = 9;
    const project = (loc: { lat: number; lng: number }) => ({
      x: PAD + ((loc.lng - minLng) / (maxLng - minLng || 1)) * (100 - PAD * 2),
      // Latitude increases northward, y increases downward.
      y: PAD + ((maxLat - loc.lat) / (maxLat - minLat || 1)) * (100 - PAD * 2),
    });

    const points = locations.map((loc) => ({ ...loc, ...project(loc) }));
    const airports = points.filter((p) => p.type === "airport");
    const route = points.filter((p) => p.type !== "airport");
    const routeLine = route.slice().sort((a, b) => a.x - b.x);

    /* Pins in reading order (top to bottom, then left to right), so Tab moves
       down the chart instead of jumping with the data order. The legend
       keeps the content order. */
    const pins = points.slice().sort((a, b) => a.y - b.y || a.x - b.x);

    const lines: [Plotted, Plotted][] = [
      ...(route[0] ? airports.map((a) => [a, route[0]] as [Plotted, Plotted]) : []),
      ...routeLine.slice(1).map((p, i) => [routeLine[i], p] as [Plotted, Plotted]),
    ];

    return { aspect, points, airports, route, routeLine, pins, ...placeLabels(pins, lines, aspect) };
  }, [locations]);

  const preview = hovered ? images[hovered] : undefined;

  if (!chart) return null;
  const { aspect, points, airports, route, routeLine, pins, anchors, raised } = chart;

  return (
    <div className="relative">
      <div data-map className={styles.chart} style={{ "--map-aspect": aspect } as CSSProperties}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <pattern id="grid" width="6.25" height="6.25" patternUnits="userSpaceOnUse">
              <path
                d="M 6.25 0 L 0 0 0 6.25"
                fill="none"
                className={styles.grid}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />

          {/* Airports connect with a fainter line — arrivals, not the route */}
          {airports.map((airport) => (
            <line
              key={airport.key}
              x1={airport.x}
              y1={airport.y}
              x2={route[0]?.x ?? airport.x}
              y2={route[0]?.y ?? airport.y}
              className={styles.arrival}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* The route through the named stops, south-west to north-east */}
          <polyline
            points={routeLine.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            className={styles.route}
            strokeWidth="1.5"
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* The place itself, as a framed plate at columns 8–12 of the chart,
            with its caption: shown while a pin with an honest photograph is
            pointed at or focused. Nothing moves when it appears (CLS 0), and
            nothing is laid over the photograph. Desktop only. */}
        <div aria-hidden className={styles.previewSlot}>
          {preview && (
            <motion.figure
              key={preview.src}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={
                reduced
                  ? { duration: 0.15, ease: "linear" }
                  : { duration: 0.6, ease: EASE_REVEAL }
              }
              className={styles.preview}
            >
              <div className={styles.previewFrame}>
                <Image
                  src={preview.src}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 0px, 42vw"
                  quality={68}
                  placeholder={preview.blurDataURL ? "blur" : undefined}
                  blurDataURL={preview.blurDataURL}
                  className="object-cover"
                />
              </div>
              {hovered ? captions[hovered] : null}
            </motion.figure>
          )}
        </div>

        {/* Pins. Stacking inside the isolated chart: the links' 24 px hit
            boxes sit under every dot and label (z-1), so pointing at a dot
            or a name always reaches that place, even where two hit boxes
            overlap. */}
        {pins.map((point, i) => {
          const href = links[point.key];
          const isHovered = hovered === point.key;
          const airport = point.type === "airport";

          const pin = (
            <motion.span
              data-reveal
              initial={reduced ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{
                duration: reduced ? 0 : 0.6,
                delay: reduced ? 0 : i * 0.07,
                ease: EASE_REVEAL,
              }}
              // `visible`: below `sm` the link is hidden from the tab order
              // and the accessibility tree, the dot still prints. The focus
              // ring is drawn here, round, on the edge of the 24 px hit box.
              className={cn(
                "visible relative block rounded-full",
                // the upper pin of a close pair prints over the lower one
                raised.has(point.key) ? "z-2" : "z-1",
                "group-focus-visible:outline-2 group-focus-visible:outline-offset-[6px] group-focus-visible:outline-focus",
                PRESENT_WHEN_REDUCED,
              )}
            >
              {/* Data marks, the only round shapes besides the gold pill. */}
              <span
                className={cn(
                  "block rounded-full transition-transform duration-500",
                  airport ? "size-2 border border-ink-soft" : "size-2 bg-chart-pin",
                  isHovered && "scale-150",
                )}
              />
              <span
                className={cn(
                  // Hidden on small screens — there is no room for the
                  // labels; the legend below carries them instead. Knocked
                  // out of the chart on its own bone, so the grid never runs
                  // through a letter; the side is chosen so no line does.
                  // The transparent `before` makes the name a 24 px target.
                  "absolute hidden whitespace-nowrap bg-bone px-1 text-eyebrow text-ink-soft transition-colors duration-300 sm:block",
                  "before:absolute before:inset-x-0 before:-inset-y-[5px]",
                  ANCHORS[anchors[point.key]].cls,
                  isHovered && "text-accent-text",
                )}
              >
                {point.name}
              </span>
            </motion.span>
          );

          const style = {
            left: `${point.x}%`,
            top: `${point.y}%`,
          } as const;

          return href ? (
            <Link
              key={point.key}
              href={href}
              // The visible label is hidden below `sm`, so the name is on the
              // link itself. Below `sm` the link is `invisible` (out of the
              // tab order and the accessibility tree): the legend under the
              // chart carries the same six links as full-size rows.
              aria-label={point.name}
              style={style}
              onMouseEnter={() => setHovered(point.key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(point.key)}
              onBlur={() => setHovered(null)}
              // From `sm`, 8 px of padding makes a 24 × 24 target round the
              // 8 px dot without enlarging it (as RouteJourney's stops do).
              // Centred with negative margins, not a transform: a transform
              // would make each link a stacking context and trap the dot's
              // z-1 under the next link's hit box. The box is square (a
              // rounded one would only hit-test as a 24 px circle); the ring
              // is drawn round on the dot's wrapper instead.
              className={cn(PIN_BOX, "group focus-visible:outline-none max-sm:invisible")}
            >
              {pin}
            </Link>
          ) : (
            <span
              key={point.key}
              style={style}
              className={PIN_BOX}
            >
              {pin}
            </span>
          );
        })}
      </div>

      {/* Mobile legend — the labels can't live on the chart at this width. */}
      <ul className="mt-6 grid grid-cols-1 gap-y-1 sm:hidden">
        {points.map((point) => {
          const href = links[point.key];
          const image = images[point.key];
          const airport = point.type === "airport";
          const label = (
            <span className="flex items-baseline gap-2">
              <span
                aria-hidden
                className={cn(
                  "mt-1 block size-2 shrink-0 rounded-full",
                  airport ? "border border-ink-soft" : "bg-chart-pin",
                )}
              />
              <span className="text-eyebrow text-ink-soft">{point.name}</span>
            </span>
          );

          return (
            <li key={point.key}>
              {/* min-h-11: this legend IS the map on a phone, where the 8px
                  pins are unusable — so its rows have to be real targets. */}
              {/* Touch has no hover, so the desktop preview has no counterpart
                  here unless the photograph comes to the legend. A small
                  thumbnail per row is the tasteful equivalent: it shows the
                  place without pretending a hover state exists. Rows with no
                  honest photograph simply have no thumbnail — the same rule as
                  the chart. */}
              {href ? (
                <Link href={href} className="flex min-h-11 items-center gap-3">
                  {image && (
                    <Image
                      src={image.src}
                      alt=""
                      width={40}
                      height={40}
                      quality={68}
                      sizes="40px"
                      placeholder={image.blurDataURL ? "blur" : undefined}
                      blurDataURL={image.blurDataURL}
                      className="size-10 shrink-0 object-cover"
                    />
                  )}
                  {label}
                </Link>
              ) : (
                <span className="flex min-h-11 items-center gap-3">
                  {image && (
                    <Image
                      src={image.src}
                      alt=""
                      width={40}
                      height={40}
                      quality={68}
                      sizes="40px"
                      placeholder={image.blurDataURL ? "blur" : undefined}
                      blurDataURL={image.blurDataURL}
                      className="size-10 shrink-0 object-cover"
                    />
                  )}
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
