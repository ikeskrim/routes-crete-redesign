import { cn } from "@/lib/utils";

/**
 * The seam between two movements, dissolved rather than ruled.
 *
 * Where a dark movement meets a light one the page currently changes colour on
 * a straight line, which reads as two web sections stacked. This band paints
 * the INCOMING colour and masks it with a grain-textured gradient, so the
 * outgoing scene breaks up into the next one — the boundary you get between
 * two shots in a film rather than between two divs.
 *
 * DELIBERATELY ZERO JAVASCRIPT. The scroll-scrubbed version of this idea is
 * more spectacular and would have cost main-thread time the budget does not
 * have: TBT on the homepage already measures 120-230ms against a 250ms
 * ceiling, and every motion block is charged against it. A mask that is
 * painted once by the compositor costs nothing to scroll past, and at a seam
 * the eye crosses in half a second the scrubbed version buys very little.
 *
 * Its height is fixed and present from first paint, so it cannot shift layout.
 */
export function SceneEdge({
  /** Tailwind background class of the section BELOW this seam. */
  to,
  flip = false,
  className,
}: {
  to: string;
  /** Mirror the dissolve, for a light-into-dark seam. */
  flip?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "scene-edge pointer-events-none relative h-20 w-full lg:h-28",
        flip && "scene-edge--flip",
        to,
        className,
      )}
    />
  );
}
