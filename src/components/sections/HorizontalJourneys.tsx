import { JourneyTrack } from "@/components/sections/JourneyTrack";
import { ContentCard } from "@/components/ui/Card";
import type { ContentItem } from "@/lib/types";

/**
 * The journeys, panned horizontally while the section holds.
 *
 * A server component: the cards stay server-rendered — `ContentCard` reaches
 * `Media`, which imports from the `server-only` content module — and only the
 * scroll machinery in `JourneyTrack` runs in the browser. The geometry is
 * computed here so the track's height is in the HTML from the very first
 * paint, which is what keeps a pinned section compatible with a CLS budget of
 * zero.
 *
 * Travel is proportional to how many journeys exist. With the three currently
 * in the catalogue the pan is real but short; every experience added lengthens
 * it with no code change, and if the catalogue ever shrinks so the track fits
 * the viewport, `travelVw` collapses and `JourneyTrack` renders the plain grid
 * rather than pinning the page for nothing.
 */

/** Card width and gutter on the track, in vw. The geometry and the section
 *  height derive from these, so the two cannot disagree. */
const CARD_VW = 42;
const GAP_VW = 3;
/** Leading inset, so the first card is not flush to the viewport edge. */
const LEAD_VW = 6;
/** Vertical scroll spent per vw of horizontal travel. Higher is a slower, more
 *  deliberate pan; below about 1.2 it reads as a flick. */
const SCROLL_RATIO = 1.5;

export function HorizontalJourneys({ items }: { items: ContentItem[] }) {
  const trackVw =
    items.length * CARD_VW + (items.length - 1) * GAP_VW + LEAD_VW * 2;
  const travelVw = Math.max(0, trackVw - 100);
  const sectionVh = 100 + travelVw * SCROLL_RATIO;

  return (
    <JourneyTrack
      cardVw={CARD_VW}
      gapVw={GAP_VW}
      leadVw={LEAD_VW}
      travelVw={travelVw}
      sectionVh={sectionVh}
    >
      {items.map((item, i) => (
        <ContentCard
          key={item.href}
          item={item}
          index={i + 1}
          /* The transfers card owns #transfers. legacyAnchorMap points the old
             #portfolio1 at it, and this layout must not leave that pointing at
             nothing — which is also why there is only one list of cards. */
          id={item.href.startsWith("/transfers") ? "transfers" : undefined}
          ratio="aspect-[4/5]"
        />
      ))}
    </JourneyTrack>
  );
}
