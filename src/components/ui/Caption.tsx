import { photoCredit } from "@/lib/photo-credit";
import { cn } from "@/lib/utils";

/**
 * A caption set as a photo credit (C+ SPEC §C.9, contract C6). Server
 * component; renders a `<figcaption>`, so it goes inside the plate's figure.
 *
 *     ─── (1.5rem hairline tick)
 *     The Libyan Sea coast of Crete at dusk                               tier 1
 *     Photograph: Miltos Gikas (Aries Tottle), CC BY 2.0 (colour-graded)  tier 2
 *
 * - Tier 1, the place: `place` (a content `placeBreaks[].place`, or the
 *   `place-images.ts` alt line) ?? the ledger `subject`, verbatim. Fraunces
 *   `caption-place`, ink (paper on night).
 * - Tier 2, the credit: `photoCredit(file)` from the ledger. Inter caption,
 *   ink-soft (on-night-soft on night).
 * - No ledger record for `file` → nothing is rendered (fail closed), unless
 *   the caller passes `fallback`, an existing live string used as tier 2 only
 *   for a `place` caption whose file has no record ("Licensed photograph —
 *   see credits", §D.6 item 5).
 * - Operator photographs take no caption at all: nothing is invented.
 *
 * Each tier carries `data-caption-tier` (credits-guard C15, copy-subset).
 * Where tier 1 repeats the plate's `alt` word for word (the ledgered mood
 * plates, §E.1), pass `imageAlt`: tier 1 is then `aria-hidden`, so a screen
 * reader hears the place once, as the image's name. The text stays in the DOM.
 *
 * Placement (§C.9):
 * - `under`: under the plate, 0.75rem below it.
 * - `margin`: hung in a margin column at the plate foot (bottom-aligned by
 *   its column); reserves its block height so a late font never moves it.
 * - `sticky`: at ≥1024 it holds still beside a tall plate while the plate
 *   scrolls past; below 1024 it sits under the plate.
 * The grid placement itself is the composition's (`className`).
 */
export function Caption({
  file,
  place,
  tone = "light",
  placement = "under",
  imageAlt,
  fallback,
  className,
}: {
  /** The photograph: its ledger file name, or any path ending in it. */
  file?: string;
  /** Tier 1 from content instead of the ledger subject (itinerary frames). */
  place?: string;
  tone?: "light" | "night";
  placement?: "margin" | "under" | "sticky";
  /** The alt of the plate this caption names (see above). */
  imageAlt?: string;
  /** A live tier-2 string for a `place` caption with no ledger record. */
  fallback?: string;
  className?: string;
}) {
  const credit = file ? photoCredit(file) : null;
  const tier2 = credit?.credit ?? (place && fallback ? fallback : null);
  const tier1 = place ?? credit?.caption;
  if (!tier1 || !tier2) return null;

  const night = tone === "night";

  return (
    <figcaption
      data-caption-placement={placement}
      className={cn(
        "flex flex-col",
        /* the 1.5rem hairline tick before tier 1 (§C.7) */
        "before:mb-2.5 before:block before:h-(--ed-hair-w) before:w-6 before:content-['']",
        night ? "before:bg-hairline-night" : "before:bg-hairline",
        placement === "under" && "mt-3",
        placement === "sticky" && "mt-3 lg:sticky lg:top-[calc(var(--ed-masthead-h)+2.5rem)] lg:mt-0 lg:self-start",
        /* two tier-2 lines, one tier-1 line, the tick and the tier gap */
        placement === "margin" && "min-h-[calc(1.35em+2*1.5em+0.775rem+1px)] justify-end",
        className,
      )}
    >
      <span
        data-caption-tier="1"
        aria-hidden={imageAlt !== undefined && imageAlt === tier1 ? "true" : undefined}
        className={cn(
          "block text-caption-place text-balance",
          /* On night, reversed type gains weight: tier 1 drops to 380 and
             sets on one line (amended in the draft review). The 18.5em
             measure is §C.3's 28ch written in em, so the fallback face (a
             narrower zero) breaks where Fraunces does. */
          night ? "max-w-none font-[380] text-on-night" : "max-w-[18.5em] text-ink",
        )}
      >
        {tier1}
      </span>
      <span
        data-caption-tier="2"
        className={cn(
          "mt-[0.15rem] block text-caption text-pretty",
          night ? "text-on-night-soft" : "text-ink-soft",
        )}
      >
        {tier2}
      </span>
    </figcaption>
  );
}
