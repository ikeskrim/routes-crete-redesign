import type { Metadata } from "next";

import { ContentCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SplitLines } from "@/components/ui/SplitLines";
import { getExperiences, getImageSize, getSite } from "@/lib/content";
import type { ContentItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function generateMetadata(): Metadata {
  const site = getSite();
  return {
    title: "Experiences",
    description: site.meta.description,
    alternates: { canonical: "/experiences" },
    openGraph: {
      title: `Experiences | ${site.brand.name}`,
      description: site.meta.description,
      url: "/experiences",
    },
  };
}

/**
 * One entry of the index (C+ SPEC §D.6 `/experiences`, §D.1 640–1023 table):
 * a `ContentCard` laid on the page grid as a subgrid row, its plate bleeding
 * off alternate edges and its text beside it (≥1024) or under it.
 *
 * - odd entries (1st, 3rd…): plate `full-start / col 8`, bleeding left; text
 *   `col 9 / span 4`, bottom-aligned. 640–1023: plate `full-start / col 7`.
 *   Below 640: full bleed.
 * - even entries: plate `col 7 / full-end`, bleeding right; text `col 1 /
 *   span 4`, bottom-aligned. 640–1023: plate `col 3 / full-end`. Below 640:
 *   an 85 % plate hung from the right edge.
 * - 640–1023 and below: the text sits under its plate (`col 1 / span 6`).
 * - portrait plates (4:5) at ≥1024: `full-start / col 6` (odd) or `col 8 /
 *   full-end` (even), text `col 8 / span 5` or `col 1 / span 5`, and the
 *   plate is never taller than the viewport under the masthead less 4rem
 *   (`PORTRAIT_CAP`). At `col 8` a 4:5 plate was 818 × 1023 px at 1440 × 900:
 *   never seen whole, and a 1.2× upscale of its 683 px source. The cap is
 *   the draft's Fitzroy frame cap (`100svh − masthead − 4rem`).
 *
 * Every `col N` placement past column 4 lives behind `sm:` (8 columns) or
 * `lg:` (12 columns), never on the 4-column grid (§D.1).
 */
function entryLayout(i: number, portrait: boolean) {
  const odd = i % 2 === 0;
  const lgPlate = portrait
    ? odd
      ? "lg:col-[full-start/col_6]"
      : "lg:col-[col_8/full-end] lg:justify-self-end"
    : odd
      ? "lg:col-[full-start/col_8]"
      : "lg:col-[col_7/full-end]";
  const lgBody = portrait
    ? odd
      ? "lg:col-[col_8/span_5]"
      : "lg:col-[col_1/span_5]"
    : odd
      ? "lg:col-[col_9/span_4]"
      : "lg:col-[col_1/span_4]";
  return {
    className: "col-[full-start/full-end] grid grid-cols-subgrid content-start",
    plateClassName: cn(
      "col-[full-start/full-end] lg:row-start-1",
      odd
        ? "sm:col-[full-start/col_7]"
        : "w-[85%] justify-self-end sm:w-auto sm:justify-self-stretch sm:col-[col_3/full-end]",
      lgPlate,
      portrait && PORTRAIT_CAP,
    ),
    bodyClassName: cn(
      "col-[content-start/content-end] sm:col-[col_1/span_6] lg:row-start-1 lg:mt-0 lg:self-end",
      lgBody,
    ),
  };
}

/**
 * A portrait plate's width at ≥1024, so that its 4:5 frame is at most the
 * viewport height under the masthead less 4rem. On the grid item (the plate's
 * wrapper): the frame inside fills its width and takes its height from 4:5,
 * and the item keeps its start (or, with `justify-self-end`, end) edge, so
 * the bleed is kept. At 1440 × 900 the column (598 px) is narrower than the
 * cap (618 px); the cap binds on shorter or wider screens (1280 × 720,
 * 1920 × 1080).
 */
const PORTRAIT_CAP = "lg:max-w-[calc((100svh_-_var(--ed-masthead-h)_-_4rem)*4/5)]";

/**
 * `sizes` per entry at ≥1024, from the plate's placement: a portrait plate
 * is at most `full-start / col 6` (41.5 % of the viewport at 1024, 1280 and
 * 1440; capped below that at 1920), so 42vw.
 */
function entrySizes(i: number, portrait: boolean): string {
  if (portrait) return "(min-width: 1024px) 42vw, 100vw";
  return i % 2 === 0
    ? "(min-width: 1024px) 46vw, 100vw"
    : "(min-width: 1024px) 56vw, 100vw";
}

/** A portrait photograph (taller than wide), read from the file. */
function isPortrait(item: ContentItem): boolean {
  const size = getImageSize(item.cardImage);
  return !!size && size.height > size.width;
}

/**
 * The plate's ratio, by the photograph's orientation: portrait frames are set
 * 4:5, landscape frames 3:2 (§D.6: entry 1 "portrait 4:5", entry 2 "3:2").
 */
function plateRatio(portrait: boolean): string {
  return portrait ? "aspect-[4/5]" : "aspect-[3/2]";
}

/**
 * /experiences (C+ SPEC §D.6, G7): the index as a paper spread. A running
 * head ("{n} routes"), the page title set in the statement cut beside its
 * intro, then one entry per experience with its photograph bleeding off
 * alternate edges. Server component; the h1 is set, never risen (§C.2 item 3),
 * and the first plate is the page's one preloaded image (LCP, §K.5).
 */
export default function ExperiencesPage() {
  const experiences = getExperiences();

  return (
    <>
      <section className="ed-grid paper-stock bg-paper pt-[calc(var(--ed-masthead-h)+clamp(4rem,9vw,8rem))] pb-(--ed-space-section) text-ink">
        <div aria-hidden="true" className="paper-stock-layer" />

        <Eyebrow className="col-[content-start/content-end] sm:col-[col_1/span_6]">
          {experiences.length} {experiences.length === 1 ? "route" : "routes"}
        </Eyebrow>

        <SplitLines
          as="h1"
          text="Experiences"
          reveal={false}
          className="col-[content-start/content-end] mt-(--ed-space-pair) text-statement text-ink sm:col-[col_1/span_6] lg:row-start-2 lg:[align-self:last_baseline]"
        />

        {/* At ≥1024 the intro's last line sits on the h1's baseline: both
            items share the row's last-baseline alignment group (measured
            0 px apart at 1024, 1280, 1440 and 1920). The measure is 34ch of
            Fraunces at the deck cut written in em (20.2em), so it keeps its
            width while the metric fallback is showing. */}
        <p className="col-[content-start/content-end] mt-(--ed-space-pair) max-w-[20.2em] text-deck text-ink-soft sm:col-[col_1/span_7] lg:col-[col_7/span_5] lg:row-start-2 lg:mt-0 lg:[align-self:last_baseline]">
          Leave the sea behind for a day and travel into the mountains, the
          gorges and the villages of Crete.
        </p>

        {experiences.length === 0 ? (
          <div className="col-[content-start/content-end] mt-(--ed-space-block)">
            <EmptyState
              eyebrow="Experiences"
              title="New routes are being prepared"
              body="Nothing is listed here just yet. Tell us what you’d like to see on the island and we’ll put a route together."
              action={{ label: "Contact us", href: "/contact" }}
            />
          </div>
        ) : (
          <>
            {/* The cards title themselves in h3, which would follow the h1
                directly. Hidden rather than visible, and not an h2 on the
                card: h2 is set in the serif, so promoting the card title
                would change how every card reads. */}
            <h2 className="sr-only">All experiences</h2>
            <ul className="col-[full-start/full-end] mt-(--ed-space-section) grid grid-cols-subgrid gap-y-(--ed-space-section)">
              {experiences.map((experience, i) => {
                const portrait = isPortrait(experience);
                const layout = entryLayout(i, portrait);
                return (
                  <li
                    key={experience.slug}
                    className="col-[full-start/full-end] grid grid-cols-subgrid"
                  >
                    <ContentCard
                      item={experience}
                      ratio={plateRatio(portrait)}
                      preload={i === 0}
                      sizes={entrySizes(i, portrait)}
                      className={layout.className}
                      plateClassName={layout.plateClassName}
                      bodyClassName={layout.bodyClassName}
                    />
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
