"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion";

import type { MapLocation } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The real route, plotted from real coordinates.
 *
 * Deliberately not a landmass illustration: drawing a Crete silhouette from
 * memory would put an invented shape on the page. Instead each point sits at
 * its true relative position (equirectangular projection over the bounding box
 * of the actual locations), joined by hairlines — accurate, and it reads as a
 * navigator's chart rather than a tourist map.
 *
 * Locations the copy references but never names carry `needsInput` and are not
 * plotted at all.
 */
export function LocationsMap({
  locations,
  links,
}: {
  locations: (MapLocation & { lat: number; lng: number })[];
  links: Record<string, string>;
}) {
  const reduced = useReducedMotionSafe();
  const [hovered, setHovered] = useState<string | null>(null);

  if (locations.length === 0) return null;

  const lats = locations.map((l) => l.lat);
  const lngs = locations.map((l) => l.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const PAD = 9;
  const project = (loc: { lat: number; lng: number }) => ({
    x: PAD + ((loc.lng - minLng) / (maxLng - minLng || 1)) * (100 - PAD * 2),
    // Latitude increases northward, y increases downward.
    y: PAD + ((maxLat - loc.lat) / (maxLat - minLat || 1)) * (100 - PAD * 2),
  });

  const points = locations.map((loc) => ({ ...loc, ...project(loc) }));
  const airports = points.filter((p) => p.type === "airport");
  const route = points.filter((p) => p.type !== "airport");

  return (
    <div className="relative">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-media border border-sand-100/12 bg-ocean-900 sm:aspect-[2/1]">
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
                stroke="rgba(232,220,198,0.06)"
                strokeWidth="0.15"
              />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />

          {/* Route hairline through the named stops, south-west to north-east */}
          <polyline
            points={route
              .slice()
              .sort((a, b) => a.x - b.x)
              .map((p) => `${p.x},${p.y}`)
              .join(" ")}
            fill="none"
            stroke="rgba(212,174,106,0.45)"
            strokeWidth="0.25"
            strokeDasharray="1.2 1.2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Airports connect with a fainter line — arrivals, not the route */}
          {airports.map((airport) => (
            <line
              key={airport.key}
              x1={airport.x}
              y1={airport.y}
              x2={route[0]?.x ?? airport.x}
              y2={route[0]?.y ?? airport.y}
              stroke="rgba(232,220,198,0.14)"
              strokeWidth="0.15"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* Pins */}
        {points.map((point, i) => {
          const href = links[point.key];
          const isHovered = hovered === point.key;

          /* Keep labels inside the frame: anchor them left or right when the
             pin sits near an edge instead of centring and overflowing. */
          const nearLeft = point.x < 22;
          const nearRight = point.x > 78;
          /* Alternate above/below so near-coincident points — Preveli's
             lagoon and monastery are barely a kilometre apart — don't
             print on top of each other. */
          const above = i % 2 === 1;

          const pin = (
            <motion.span
              initial={reduced ? false : { opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{
                duration: 0.7,
                delay: reduced ? 0 : i * 0.07,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative block"
            >
              <span
                className={cn(
                  "block rounded-pill transition-all duration-500 ease-luxe",
                  point.type === "airport"
                    ? "size-1.5 bg-sand-100/60"
                    : "size-2 bg-gold-400",
                  isHovered && "scale-150",
                )}
              />
              <span
                className={cn(
                  // Hidden on small screens — there is no room for nine
                  // labels; the legend below carries them instead.
                  "absolute hidden whitespace-nowrap text-eyebrow uppercase transition-colors duration-300 sm:block",
                  above ? "bottom-full mb-2" : "top-full mt-2",
                  nearLeft
                    ? "left-0"
                    : nearRight
                      ? "right-0"
                      : "left-1/2 -translate-x-1/2",
                  point.type === "airport"
                    ? "text-sand-200/50"
                    : "text-sand-100/85",
                  isHovered && "text-gold-300",
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
              // The visible label is hidden below `sm`, which left these
              // links with no accessible name at all on mobile.
              aria-label={point.name}
              style={style}
              onMouseEnter={() => setHovered(point.key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(point.key)}
              onBlur={() => setHovered(null)}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-pill focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-400"
            >
              {pin}
            </Link>
          ) : (
            <span
              key={point.key}
              style={style}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              {pin}
            </span>
          );
        })}
      </div>

      {/* Mobile legend — the labels can't live on the chart at this width. */}
      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 sm:hidden">
        {points.map((point) => {
          const href = links[point.key];
          const label = (
            <span className="flex items-baseline gap-2">
              <span
                aria-hidden
                className={cn(
                  "mt-1 block size-1.5 shrink-0 rounded-pill",
                  point.type === "airport" ? "bg-sand-100/60" : "bg-gold-400",
                )}
              />
              <span
                className={cn(
                  "text-eyebrow uppercase",
                  point.type === "airport"
                    ? "text-sand-200/50"
                    : "text-sand-100/85",
                )}
              >
                {point.name}
              </span>
            </span>
          );

          return (
            <li key={point.key}>
              {href ? <Link href={href}>{label}</Link> : label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
