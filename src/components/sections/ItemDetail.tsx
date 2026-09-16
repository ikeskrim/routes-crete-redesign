import { Fragment, type CSSProperties, type ReactNode } from "react";

import { BookingCta } from "@/components/sections/BookingCta";
import { Gallery } from "@/components/sections/Gallery";
import { ItemHero } from "@/components/sections/ItemHero";
import { RouteJourney } from "@/components/sections/RouteJourney";
import { Button } from "@/components/ui/Button";
import { Caption } from "@/components/ui/Caption";
import { ContentCard } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Plate, PlateBand } from "@/components/ui/Plate";
import { Reveal } from "@/components/ui/Reveal";
import { RichText } from "@/components/ui/RichText";
import { SplitLines } from "@/components/ui/SplitLines";
import {
  getBlur,
  getImageSize,
  getMappableLocations,
  getRelatedItems,
  getSite,
  graded,
} from "@/lib/content";
import { photoCredit } from "@/lib/photo-credit";
import { getPlaceImages } from "@/lib/place-images";
import type { ContentItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/* The reading column of the story (§D.6 item 3, §D.1 640–1023 table):
   `col 2 / span 6` (about 66ch) at ≥1024, `col 1 / span 7` at 640–1023, the
   content width on phones. */
const TEXT_COL =
  "col-[content-start/content-end] max-w-[66ch] sm:col-[col_1/span_7] lg:col-[col_2/span_6]";

/* A department head's column: `col 1 / span 6` from 640 up (§D.1). */
const HEAD_COL = "col-[content-start/content-end] sm:col-[col_1/span_6]";

/**
 * Where a story break sits (§D.6 item 3, §D.1): breaks 1 and 3 bleed left to
 * the end of column 7 (`full-start / col 8`, at 640–1023 and ≥1024), break 2
 * is inset under the text at ≥1024 (`col 2 / col 8`) and bleeds right at
 * 640–1023 (`col 2 / full-end`). Phones: full bleed, then a plate hung from
 * the right edge.
 *
 * A portrait source is set 4:5 no wider than five columns (L-10: operator
 * photographs are at most 1024 px, and a 4:5 plate eight columns wide would
 * be taller than the screen and upscaled).
 */
function breakPlacement(i: number, portrait: boolean) {
  const odd = i % 2 === 0;
  if (portrait) {
    return odd
      ? "col-[full-start/full-end] sm:col-[full-start/col_6]"
      : "col-[col_2/full-end] sm:col-[col_3/col_8]";
  }
  return odd
    ? "col-[full-start/full-end] sm:col-[full-start/col_8]"
    : "col-[col_2/full-end] lg:col-[col_2/col_8]";
}

/**
 * The width each placement paints, as `sizes`, so a screen takes the srcset
 * rung its pixels need and no larger (an inset break is about 72% of a
 * phone, not 100%).
 *
 * The ed-grid is linear between its own breakpoints, so each placement's
 * width is written per regime, exactly or rounded up, never under:
 * phones below 400 (20 px margin, 16 px gutter), 400–479 (5vw margin),
 * 480–639 (columns at their 96 px cap); the 8-column band; from 1024
 * proportional to the viewport, from 1440 with the gutter at 24 px, and
 * from 1574 fixed columns (the margins take the rest). Derived from the
 * grid template (globals.css `ed-grid`, edition.css `--ed-margin`,
 * `--ed-gutter`, `--ed-col-max`) and checked at every width from 320 to
 * 2560 against the painted box (.hunt/cplus/rollout/g6/sizes-sweep.mjs);
 * re-derive them if those tokens change.
 */
const BREAK_SIZES = {
  /* full-start / full-end; from 640 full-start / col 8. */
  landscapeBleed:
    "(min-width: 1574px) calc(50vw + 108px), (min-width: 1440px) calc(57.5vw - 10px), (min-width: 1024px) 56.81vw, (min-width: 640px) calc(83.75vw - 2px), 100vw",
  /* col 2 / full-end; from 1024 col 2 / col 8. */
  landscapeInset:
    "(min-width: 1574px) 696px, (min-width: 1440px) calc(45vw - 12px), (min-width: 1024px) 44.17vw, (min-width: 640px) calc(83.75vw - 2px), (min-width: 480px) calc(50vw + 104px), (min-width: 400px) calc(72.5vw - 4px), calc(75vw - 14px)",
  /* full-start / full-end; from 640 full-start / col 6. */
  portraitBleed:
    "(min-width: 1574px) calc(50vw - 132px), (min-width: 1440px) calc(42.5vw - 14px), (min-width: 1024px) 41.53vw, (min-width: 640px) calc(61.25vw - 6px), 100vw",
  /* col 2 / full-end; from 640 col 3 / col 8. */
  portraitInset:
    "(min-width: 1574px) 576px, (min-width: 1440px) calc(37.5vw - 14px), (min-width: 1024px) 36.53vw, (min-width: 640px) calc(56.25vw - 6px), (min-width: 480px) calc(50vw + 104px), (min-width: 400px) calc(72.5vw - 4px), calc(75vw - 14px)",
} as const;

function breakSizes(i: number, portrait: boolean) {
  const odd = i % 2 === 0;
  if (portrait) return odd ? BREAK_SIZES.portraitBleed : BREAK_SIZES.portraitInset;
  return odd ? BREAK_SIZES.landscapeBleed : BREAK_SIZES.landscapeInset;
}

/* The related cards: the content width on phones, four columns at 640–1023,
   five from 1024 (both cards the same width); per regime as above. */
const RELATED_SIZES =
  "(min-width: 1574px) 576px, (min-width: 1440px) calc(37.5vw - 14px), (min-width: 1024px) 36.53vw, (min-width: 640px) calc(45vw - 8px), (min-width: 480px) 432px, (min-width: 400px) 90vw, calc(100vw - 40px)";

/* ---- The facts strip (§D.6 item 2) ----------------------------------------

   The strip is sized to its own facts, never a fixed four columns (four or
   five facts, depending on the journey). At each width a row holds at most
   `FACTS_PER_ROW` cells; more facts take the fewest rows, the shorter rows
   first (five at three a row: two, then three; five at two: one, then two
   and two), so a row is never one orphan cell. Each row divides the strip
   evenly: the grid has the least common multiple of the row lengths as its
   tracks, and a cell spans its row's share.

   Rules: a 1 px hairline between the cells of a row, and one above every
   row after the first, across all of its cells, so every cell has a divider
   that a row start does not lose. */
type FactsWidth = "base" | "sm" | "lg";

/** Cells per row: two on phones, four from 640 (§D.1), five from 1024 on
    the content width, three when a caption shares the row (cols 1–8). */
const FACTS_PER_ROW = { base: 2, sm: 4, lg: 5, lgBesideCaption: 3 } as const;

function factRows(count: number, perRow: number): number[] {
  const rows = Math.max(1, Math.ceil(count / perRow));
  const sizes = Array.from({ length: rows }, () => Math.floor(count / rows));
  for (let i = 0; i < count % rows; i++) sizes[rows - 1 - i] += 1;
  return sizes;
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const lcm = (sizes: number[]) => sizes.reduce((a, b) => (a * b) / gcd(a, b), 1);

/* Literal class strings, one per width and state, so the stylesheet has
   every one of them. */
const FACT_EDGE: Record<FactsWidth, { start: [string, string]; top: [string, string]; foot: [string, string] }> = {
  base: {
    start: ["border-s-0 ps-0", "border-s ps-4"],
    top: ["border-t-0 pt-0", "border-t pt-6"],
    foot: ["pb-0", "pb-6"],
  },
  sm: {
    start: ["sm:border-s-0 sm:ps-0", "sm:border-s sm:ps-4"],
    top: ["sm:border-t-0 sm:pt-0", "sm:border-t sm:pt-6"],
    foot: ["sm:pb-0", "sm:pb-6"],
  },
  lg: {
    start: ["lg:border-s-0 lg:ps-0", "lg:border-s lg:ps-4"],
    top: ["lg:border-t-0 lg:pt-0", "lg:border-t lg:pt-6"],
    foot: ["lg:pb-0", "lg:pb-6"],
  },
};

/** The grid and every cell's span and rules at one width. */
function factsLayout(count: number, perRow: number, width: FactsWidth) {
  const rows = factRows(count, perRow);
  const tracks = lcm(rows);
  const cells: { span: number; classes: string }[] = [];
  rows.forEach((size, row) => {
    for (let i = 0; i < size; i++) {
      const edge = FACT_EDGE[width];
      cells.push({
        span: tracks / size,
        classes: cn(
          edge.start[i === 0 ? 0 : 1],
          edge.top[row === 0 ? 0 : 1],
          edge.foot[row === rows.length - 1 ? 0 : 1],
        ),
      });
    }
  });
  return { tracks, cells };
}

/**
 * The long-form editorial template. Both experiences and the transfer service
 * render through this — the content files decide everything.
 *
 * C+ (SPEC §D.6, §D.2): one issue's feature spread per journey, set on the
 * editorial grid, in this order:
 *
 *  1. the hero (`ItemHero`): photograph, legibility scrims, category, title,
 *     subtitle; a ledgered hero photograph (the transfer's harbour) takes its
 *     caption and credit OFF the photograph, at the head of the facts strip,
 *     in one figure with the photograph (never with the title);
 *  2. the facts strip on paper: a `dl` sized to its facts (a row of up to
 *     two on phones, four from 640, five from 1024, three beside a caption;
 *     more facts take balanced rows), hairlines between cells and between
 *     rows, labels as letter-spaced capitals, values in the deck step;
 *  3. the story on paper: the paragraphs in one reading column, the first
 *     with the terracotta drop cap, broken by up to three of the operator's
 *     own photographs (no caption: nothing is invented) that bleed off the
 *     page; "On this route" and "Highlights" as hairline rows (the numerals
 *     are gone); the request panel holding still beside the story;
 *  4. the pull quote (Kourtaliotis) on bone, 1.3 × the pull-quote step, a
 *     terracotta rule above and the opening quotation mark hung;
 *  5. the place breaks on paper: the licensed photographs of the real places,
 *     each bleeding right with its place and exact ledger credit holding
 *     still beside it (`PlateBand kind="place"`);
 *  6. the route chart on night (when the journey has places we can plot);
 *  7. the gallery strip on a clean bone section, the frames already printed
 *     above (hero, story breaks) at its end;
 *  8. the related journeys on paper, and the rule link to all of them;
 *  9. the booking bar on phones.
 *
 * Removed: the `gallery[2]` cinematic bridge, which repeated a story break;
 * every legacy colour, the gold hairlines and the gold "included" numerals.
 * No italic anywhere on an item route (§C.2 rule 4).
 */
export function ItemDetail({ item }: { item: ContentItem }) {
  const site = getSite();
  const related = getRelatedItems(item.slug, 2);
  const heroSize = getImageSize(item.heroImage);

  /* Only the locations this route actually visits, and only those we can
     place — unnamed places stay off the map entirely.

     Ordered by the journey, not by the catalogue. The chart this replaced
     sorted its stops west to east, which is a direction rather than a day;
     numbering them 01, 02, 03 only means something if the order is the order
     they are actually visited, which is the order the content file lists. */
  const locations = getMappableLocations()
    .filter((l) => item.locations.includes(l.key))
    .sort((a, b) => item.locations.indexOf(a.key) - item.locations.indexOf(b.key));

  /* The route preview's caption per stop: the place line and its ledger
     credit, rendered here so the ledger never ships to the browser. */
  const placeImages = getPlaceImages();
  const routeCaptions: Record<string, ReactNode> = {};
  for (const location of locations) {
    const image = placeImages[location.key];
    if (!image) continue;
    routeCaptions[location.key] = (
      <Caption file={image.src} place={image.alt} imageAlt={image.alt} tone="night" />
    );
  }

  /* Photographs used as breaks between sections of the story. The card and
     hero images are skipped so nothing repeats immediately. */
  const breakImages = item.gallery
    .filter((g) => g.src !== item.heroImage && g.src !== item.cardImage)
    .slice(0, 3);

  const facts = [
    { label: "Region", value: item.facts.region },
    { label: "Duration", value: item.facts.duration ?? "On request" },
    { label: "Price", value: item.facts.price ?? "On request" },
    {
      label: "Availability",
      value: item.facts.availability ?? "Request availability",
    },
    ...(item.facts.vehicle
      ? [{ label: "Vehicle", value: item.facts.vehicle }]
      : []),
  ].filter((f) => f.value);

  /* One journey's first paragraph is character-for-character its own title, so
     the page printed the title twice — once as the H1 and again as the opening
     line of the story. The paragraph stays in the content file (nothing is
     deleted); it simply is not rendered a second time. Cutting a repetition is
     not the same as cutting content. */
  const story = item.body.filter(
    (paragraph) => paragraph.text?.trim() !== item.title.trim(),
  );

  /* The story is split so images can breathe between passages. */
  const chunkSize = Math.max(2, Math.ceil(story.length / (breakImages.length + 1)));
  const chunks: (typeof item.body)[] = [];
  for (let i = 0; i < story.length; i += chunkSize) {
    chunks.push(story.slice(i, i + chunkSize));
  }

  /* A ledgered hero photograph is credited at the head of the facts strip,
     off the photograph (§D.6 "Transfer detail"): below 1024 under the
     photograph, from 1024 at `col 9 / span 4` beside the facts. ItemHero
     puts it in one figure with the photograph and nothing else (credits-guard
     C15 reads the photograph of a caption's own figure; the title stays out
     of the figure). An operator hero has no ledger record and takes no
     caption. */
  const heroCredited = photoCredit(item.heroImage) !== null;

  /* The facts strip's grid at each width (see factsLayout). */
  const factsAt = {
    base: factsLayout(facts.length, FACTS_PER_ROW.base, "base"),
    sm: factsLayout(facts.length, FACTS_PER_ROW.sm, "sm"),
    lg: factsLayout(
      facts.length,
      heroCredited ? FACTS_PER_ROW.lgBesideCaption : FACTS_PER_ROW.lg,
      "lg",
    ),
  };

  /* Frames printed above the gallery (the hero, the story breaks) go to the
     end of the strip, so its first screen never repeats a photograph the
     reader has just seen. Reordered only: every frame stays in the strip and
     the lightbox. */
  const printed = new Set([item.heroImage, ...breakImages.map((image) => image.src)]);
  const galleryImages = [
    ...item.gallery.filter((g) => !printed.has(g.src)),
    ...item.gallery.filter((g) => printed.has(g.src)),
  ];

  /* Only this route's stops go to the chart (a client island): the rest of
     the place photographs would ship as unused props. */
  const routeImages = Object.fromEntries(
    locations.flatMap((l) => (placeImages[l.key] ? [[l.key, placeImages[l.key]] as const] : [])),
  );

  return (
    <>
      {/* Hero, facts and story on one paper ground (no vignette). */}
      <div className="paper-stock bg-paper text-ink">
        <div aria-hidden="true" className="paper-stock-layer no-vignette" />

        <div className="ed-grid">
          <ItemHero
            eyebrow={item.category}
            title={item.title}
            subtitle={item.subtitle ?? undefined}
            image={item.heroImage}
            blurDataURL={getBlur(item.heroImage)}
            aspect={heroSize ? heroSize.width / heroSize.height : undefined}
            caption={
              heroCredited ? (
                <Caption
                  file={item.heroImage}
                  placement="under"
                  className="col-[content-start/content-end] row-start-2 sm:col-[col_1/span_6] lg:col-[col_9/span_4] lg:mt-0 lg:self-start lg:pt-(--ed-space-block)"
                />
              ) : undefined
            }
            className="col-[full-start/full-end]"
          />

          {/* Quick facts. Beside a caption (≥1024) the strip keeps cols 1–8 and
              is at least as tall as the caption hanging into its row. */}
          <dl
            className={cn(
              "col-[content-start/content-end] grid py-(--ed-space-block)",
              "grid-cols-[repeat(var(--facts-base),minmax(0,1fr))]",
              "sm:grid-cols-[repeat(var(--facts-sm),minmax(0,1fr))]",
              "lg:grid-cols-[repeat(var(--facts-lg),minmax(0,1fr))]",
              heroCredited ? "lg:col-[col_1/span_8] lg:min-h-[14rem]" : undefined,
            )}
            style={
              {
                "--facts-base": factsAt.base.tracks,
                "--facts-sm": factsAt.sm.tracks,
                "--facts-lg": factsAt.lg.tracks,
              } as CSSProperties
            }
          >
            {facts.map((fact, i) => (
              <div
                key={fact.label}
                className={cn(
                  "min-w-0 border-hairline pe-4",
                  "col-span-(--span-base) sm:col-span-(--span-sm) lg:col-span-(--span-lg)",
                  factsAt.base.cells[i].classes,
                  factsAt.sm.cells[i].classes,
                  factsAt.lg.cells[i].classes,
                )}
                style={
                  {
                    "--span-base": factsAt.base.cells[i].span,
                    "--span-sm": factsAt.sm.cells[i].span,
                    "--span-lg": factsAt.lg.cells[i].span,
                  } as CSSProperties
                }
              >
                <dt className="text-eyebrow text-label">{fact.label}</dt>
                {/* Balanced, so a short value breaks between words
                    ("Comfortable / 12-seat van"), not at its hyphen. */}
                <dd className="mt-2 text-deck text-balance text-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>

          {/* The strip's foot rule, across the content width (under the
              caption too). */}
          <div aria-hidden="true" className="col-[content-start/content-end] border-t border-hairline" />
        </div>

        {/* Story + sticky request panel */}
        <section className="ed-grid pt-(--ed-space-block) pb-(--ed-space-section)">
          <div className="col-[full-start/full-end] grid grid-cols-subgrid content-start lg:col-[full-start/col_9] lg:row-start-1">
            {chunks.map((chunk, chunkIndex) => {
              const image = breakImages[chunkIndex];
              const portrait = image ? image.height > image.width : false;
              return (
                <Fragment key={chunkIndex}>
                  <RichText
                    blocks={chunk}
                    lead={chunkIndex === 0}
                    dropcap={chunkIndex === 0}
                    className={TEXT_COL}
                  />

                  {image && (
                    <Plate
                      src={image.src}
                      alt={item.title}
                      ratio={portrait ? "4 / 5" : "3 / 2"}
                      sizes={breakSizes(chunkIndex, portrait)}
                      bleed={chunkIndex % 2 === 0 ? "left" : "right"}
                      blurDataURL={getBlur(image.src)}
                      unclip
                      className={cn(
                        breakPlacement(chunkIndex, portrait),
                        "my-(--ed-space-block)",
                      )}
                    />
                  )}
                </Fragment>
              );
            })}

            {/* Verified brochure facts */}
            {item.included && (
              <Reveal className={cn(TEXT_COL, "mt-(--ed-space-block)")}>
                <Eyebrow>{item.included.label}</Eyebrow>
                <ul className="mt-5 border-b border-hairline">
                  {item.included.items.map((entry) => (
                    <li key={entry} className="border-t border-hairline py-4 text-body text-ink">
                      {entry}
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}

            {/* Highlights, drawn verbatim from the story above */}
            {item.highlights && item.highlights.length > 0 && (
              <Reveal className={cn(TEXT_COL, "mt-(--ed-space-block)")}>
                <Eyebrow>Highlights</Eyebrow>
                <ul className="mt-5 border-b border-hairline">
                  {item.highlights.map((highlight) => (
                    <li key={highlight} className="border-t border-hairline py-4 text-body text-ink">
                      {highlight}
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
          </div>

          {/* The panel runs the story's full height and holds still just
              under the masthead. Not rendered below 1024: the bar replaces it. */}
          <div className="hidden lg:col-[col_9/span_4] lg:row-start-1 lg:block">
            <BookingCta
              variant="panel"
              title={item.title}
              formUrl={site.contact.formUrl}
              whatsapp={site.contact.whatsapp}
              price={item.facts.price ?? null}
              duration={item.facts.duration ?? null}
              availability={item.facts.availability ?? null}
            />
          </div>
        </section>
      </div>

      {/* Pull quote */}
      {item.pullQuote && (
        <section className="ed-grid bone-stock bg-bone py-(--ed-space-section) text-ink">
          <div aria-hidden="true" className="bone-stock-layer" />
          {/* The pull-quote step at 1.3 × (56 px at 1440, 36 at 390), set on
              the wrapper and inherited, so the quote itself stays a plain
              SplitLines paragraph. */}
          <div
            className="col-[content-start/content-end] text-pullquote lg:col-[col_3/span_8]"
            style={{ fontSize: "calc(var(--text-pullquote) * 1.3)" }}
          >
            <span aria-hidden="true" className="mb-5 block h-px w-12 bg-accent" />
            <SplitLines
              as="p"
              text={`“${item.pullQuote}”`}
              className={cn(
                "max-w-[18ch] text-balance text-ink",
                /* The opening mark hangs (§C.4). The indent is inherited, so
                   it is taken back from the measuring words and from every
                   line after the first; each line mask reaches half an em
                   into the margin so the hung mark is never clipped. */
                "pullquote-hang [&_[data-word]]:indent-0 [&_.ed-line~.ed-line_.block]:indent-0",
                "[&_.ed-line]:-ms-[0.5em] [&_.ed-line]:ps-[0.5em]",
              )}
            />
          </div>
        </section>
      )}

      {/* Editorial place breaks.
          Licensed photographs of the real places this journey visits. They sit
          apart from the gallery on purpose: the gallery is the operator's own
          tour photography, and these are not, so each carries its exact ledger
          credit. A sourced landscape passing as our own would be the exact
          dishonesty this project refuses. */}
      {item.placeBreaks && item.placeBreaks.length > 0 && (
        <div className="paper-stock flex flex-col gap-[clamp(4rem,8vw,7rem)] bg-paper py-(--ed-space-section) text-ink">
          <div aria-hidden="true" className="paper-stock-layer no-vignette" />
          {item.placeBreaks.map((place) => (
            <PlateBand
              key={place.src}
              kind="place"
              src={graded(place.src)}
              place={place.place}
              fallbackCredit="Licensed photograph — see credits"
            />
          ))}
        </div>
      )}

      {/* Route map */}
      {locations.length > 0 && (
        <section
          aria-labelledby="route-heading"
          className="grain bg-night py-(--ed-space-section) text-on-night"
        >
          <div aria-hidden="true" className="night-density pointer-events-none absolute inset-0" />
          <div aria-hidden="true" className="grain-overlay" />
          <div className="ed-grid relative z-[1]">
            <Eyebrow tone="night" className={HEAD_COL}>
              The route
            </Eyebrow>
            <SplitLines
              as="h2"
              id="route-heading"
              text="Where this journey takes you"
              className={cn(HEAD_COL, "mt-(--ed-space-pair) text-section text-on-night")}
            />
            <RouteJourney
              stops={locations}
              images={routeImages}
              captions={routeCaptions}
              className="col-[content-start/content-end] mt-(--ed-space-block)"
            />
          </div>
        </section>
      )}

      {/* Gallery */}
      {item.gallery.length > 1 && (
        <section
          id="gallery"
          aria-labelledby="gallery-heading"
          className="ed-grid bg-bone py-(--ed-space-section) text-ink"
        >
          <Eyebrow className={HEAD_COL}>Gallery</Eyebrow>
          <SplitLines
            as="h2"
            id="gallery-heading"
            text="Frames from this route"
            className={cn(HEAD_COL, "mt-(--ed-space-pair) text-section text-ink")}
          />
          {/* The strip starts on the text column and runs off the right edge. */}
          <Gallery
            images={galleryImages.map((g) => ({
              ...g,
              alt: item.title,
              blurDataURL: getBlur(g.src),
            }))}
            variant="strip"
            className="col-[content-start/full-end] mt-(--ed-space-block) pe-(--ed-margin)"
          />
        </section>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section
          aria-labelledby="related-heading"
          className="ed-grid paper-stock bg-paper py-(--ed-space-section) text-ink"
        >
          <div aria-hidden="true" className="paper-stock-layer no-vignette" />
          <Eyebrow className={cn(HEAD_COL, "sm:row-start-1")}>Continue</Eyebrow>
          <SplitLines
            as="h2"
            id="related-heading"
            text="Other ways to see the island"
            className={cn(HEAD_COL, "mt-(--ed-space-pair) text-section text-ink sm:row-start-2")}
          />

          {related.map((other, i) => (
            <ContentCard
              key={other.slug}
              item={other}
              ratio="aspect-[3/2]"
              sizes={RELATED_SIZES}
              className={cn(
                "col-[content-start/content-end] mt-(--ed-space-block) sm:row-start-3",
                i === 0
                  ? "sm:col-[col_1/span_4] lg:col-[col_1/span_5]"
                  : "sm:col-[col_5/span_4] lg:col-[col_7/span_5]",
              )}
            />
          ))}

          <div className="col-[content-start/content-end] mt-(--ed-space-block) sm:row-start-4">
            <Button variant="rule" href="/experiences">
              All experiences
            </Button>
          </div>
        </section>
      )}

      {/* Mobile request bar */}
      <BookingCta
        variant="bar"
        title={item.title}
        formUrl={site.contact.formUrl}
        whatsapp={site.contact.whatsapp}
        price={item.facts.price ?? null}
        duration={item.facts.duration ?? null}
        availability={item.facts.availability ?? null}
      />
    </>
  );
}
