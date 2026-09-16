import type { Metadata } from "next";
import Link from "next/link";

import { ctaClass } from "@/components/ui/Button";
import { ContentCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Plate } from "@/components/ui/Plate";
import { SplitLines } from "@/components/ui/SplitLines";
import { getSite, getTransfers } from "@/lib/content";
import { cn } from "@/lib/utils";

export function generateMetadata(): Metadata {
  const site = getSite();
  const primary = getTransfers()[0];
  return {
    title: "Transfers",
    description: primary?.meta.description ?? site.meta.description,
    alternates: { canonical: "/transfers" },
    openGraph: {
      title: `Transfers | ${site.brand.name}`,
      description: primary?.meta.description ?? site.meta.description,
      url: "/transfers",
    },
  };
}

/** A pre-split title line held on one line from 360 up (see the h1). */
const HOLD_LINE = "min-[360px]:whitespace-nowrap";

/**
 * The line that carries the emphasis word. Its text is two nodes (the roman
 * run and the `em`), and when the display face swaps in, the roman run
 * narrows and the `em` starts earlier on the same line. Chromium reports that
 * as a layout shift of the `em`'s text, although it is the same in-line
 * reflow a heading without an `em` goes through unreported. An empty block
 * before the line's text puts that text in an anonymous block, which is how
 * the cover's first line is built (its inline spans beside a block line) and
 * how it measures 0: measured on /transfers and /contact with every font held
 * 3 s, 0.0050 / 0.0018 before, 0 after. Paint and layout are unchanged (the
 * block is empty, 0 px tall).
 */
const EM_LINE = "[&>span]:before:block [&>span]:before:content-['']";

/**
 * The van is a studio cut-out on a grey seamless, so it is mounted on the
 * same 3:2 bone mat as its plate in the homepage's Fitzroy index
 * (HorizontalJourneys.module.css `.mat`: contained, 8 % of each side), not
 * laid raw on paper. The frame (`Plate`, bone) is the mat; the photograph is
 * inset by padding on the image: 8 % of the width at the sides, 8 % of the
 * height at top and bottom (padding percentages resolve against the width,
 * and the frame is 3:2, hence 8 % / 1.5), so the box it is contained in
 * stays 3:2 and the photograph fills it exactly. The blur placeholder is
 * painted in that box only (background origin and clip), never over the
 * mat. `object-fit` needs `!`: Plate.module.css sets `cover` outside any
 * layer. The frame box, `preload`, `sizes` and q68 are unchanged, so the
 * reserved box and the LCP configuration are too.
 */
const VAN_MAT = "object-contain! px-[8%] py-[calc(8%/1.5)] bg-origin-content bg-clip-content";

/**
 * A rest-grid entry (every transfer after the primary), on the /experiences
 * entry pattern (C+ SPEC §D.6): odd entries bleed left (`full-start / col 8`),
 * even entries bleed right (`col 7 / full-end`), text beside at ≥1024 and
 * under the plate below it (640–1023 per §D.1). Plates at native aspect.
 */
function restLayout(i: number) {
  const odd = i % 2 === 0;
  return {
    className: "col-[full-start/full-end] grid grid-cols-subgrid content-start",
    plateClassName: cn(
      "col-[full-start/full-end] lg:row-start-1",
      odd
        ? "sm:col-[full-start/col_7] lg:col-[full-start/col_8]"
        : "w-[85%] justify-self-end sm:w-auto sm:justify-self-stretch sm:col-[col_3/full-end] lg:col-[col_7/full-end]",
    ),
    bodyClassName: cn(
      "col-[content-start/content-end] sm:col-[col_1/span_6] lg:row-start-1 lg:mt-0 lg:self-end",
      odd ? "lg:col-[col_9/span_4]" : "lg:col-[col_1/span_4]",
    ),
  };
}

/**
 * /transfers (C+ SPEC §D.6, G7), one paper spread. The promise as the page
 * title, pre-split so its emphasis word ends the second line (§C.13 #23);
 * then the one service: the van plate (the page's LCP, preloaded, not
 * bleeding: the source is 930 px wide; mounted on a bone mat, see
 * `VAN_MAT`) with its title, the first three paragraphs, its facts on
 * hairlines and a rule link to the full page.
 */
export default function TransfersPage() {
  const site = getSite();
  const transfers = getTransfers();
  const [primary, ...rest] = transfers;

  return (
    <section className="ed-grid paper-stock bg-paper pt-[calc(var(--ed-masthead-h)+clamp(4rem,9vw,8rem))] pb-(--ed-space-section) text-ink">
      <div aria-hidden="true" className="paper-stock-layer" />

      {/* Slow-font CLS at 360–376: Inter sets this running head in 319.8 px
          (one line from a 360 viewport) and its metric fallback in 336 px
          (two lines up to 376). In that band the line is held, so the
          fallback runs at most 16 px into the 20 px margin until the swap. */}
      <Eyebrow className="col-[content-start/content-end] min-[360px]:max-[377px]:whitespace-nowrap lg:col-[col_1/span_9]">
        {site.sections.transfers.subheading}
      </Eyebrow>

      {/* Slow-font CLS (§K.3): the metric fallback sets these lines about
          27 % wider than Fraunces, so from 360 up each line is held on one
          line (Fraunces fits: "Because getting there" 315 of 320 px at 360;
          the wider fallback is clipped by the line mask until the swap).
          Below 360 Fraunces wraps the first line too (three lines, the
          fallback four), so the title reserves four lines there.
          `EM_LINE` on the emphasis line: see its comment. */}
      <SplitLines
        as="h1"
        text="Because getting there should feel easy"
        lines={["Because getting there", "should feel easy"]}
        emphasis="easy"
        reveal={false}
        lineClassName={[HOLD_LINE, cn(HOLD_LINE, EM_LINE)]}
        className="col-[content-start/content-end] mt-(--ed-space-pair) text-statement text-ink max-[360px]:min-h-[4lh] lg:col-[col_1/span_9]"
      />

      {transfers.length === 0 ? (
        <div className="col-[content-start/content-end] mt-(--ed-space-block)">
          <EmptyState
            eyebrow="Transfers"
            title="Our transfer routes are being prepared"
            body="Nothing is listed here just yet. Tell us where you’re arriving and where you’re staying, and we’ll arrange it directly."
            action={{ label: "Contact us", href: "/contact" }}
          />
        </div>
      ) : (
        /* One service, so it gets an editorial spread rather than a grid —
           a lone card in a grid always reads as something failing to load. */
        <>
          <Plate
            src={primary.cardImage}
            alt={primary.title}
            ratio="3 / 2"
            sizes="(max-width: 1024px) 100vw, 56vw"
            preload
            /* the keyline sits on the frame, i.e. only where the bone mat
               meets paper (§F.1); the photograph's own edge meets bone */
            keyline
            imgClassName={VAN_MAT}
            className="col-[content-start/content-end] mt-(--ed-space-block) lg:col-[col_1/span_7] lg:row-start-3"
          />

          <div className="col-[content-start/content-end] mt-(--ed-space-pair) sm:col-[col_1/span_7] lg:col-[col_9/span_4] lg:row-start-3 lg:mt-(--ed-space-block) lg:self-start">
            {/* An em measure, not ch: the fallback's zero is 3 % narrower at
                this cut, and 18ch let it break the title onto three lines
                before the swap (1440 and 390). With 12em both faces set the
                same lines at every width measured from 320 to 1920. */}
            <h2 className="max-w-[12em] text-title text-ink">{primary.title}</h2>

            <div className="mt-(--ed-space-pair) flex flex-col gap-[1em]">
              {primary.body.slice(0, 3).map((block, i) => (
                <p
                  key={i}
                  className={
                    i === 0 ? "text-body-lg text-ink" : "text-body text-ink-soft"
                  }
                >
                  {block.text}
                </p>
              ))}
            </div>

            <dl className="mt-(--ed-space-pair) border-b-(length:--ed-hair-w) border-hairline">
              <div className="border-t-(length:--ed-hair-w) border-hairline py-3">
                <dt className="text-eyebrow text-label">Region</dt>
                <dd className="mt-1 text-deck text-ink">{primary.facts.region}</dd>
              </div>
              <div className="border-t-(length:--ed-hair-w) border-hairline py-3">
                <dt className="text-eyebrow text-label">Availability</dt>
                <dd className="mt-1 text-deck text-ink">
                  {primary.facts.availability ?? "Request availability"}
                </dd>
              </div>
            </dl>

            <Link
              href={primary.href}
              className={cn(ctaClass({ variant: "rule" }), "mt-(--ed-space-pair)")}
            >
              Full details
            </Link>
          </div>

          {/* Scales up the moment a second service is added. */}
          {rest.length > 0 && (
            <ul className="col-[full-start/full-end] mt-(--ed-space-section) grid grid-cols-subgrid gap-y-(--ed-space-section)">
              {rest.map((transfer, i) => {
                const layout = restLayout(i);
                return (
                  <li
                    key={transfer.slug}
                    className="col-[full-start/full-end] grid grid-cols-subgrid"
                  >
                    <ContentCard
                      item={transfer}
                      sizes={
                        i % 2 === 0
                          ? "(min-width: 1024px) 46vw, 100vw"
                          : "(min-width: 1024px) 56vw, 100vw"
                      }
                      className={layout.className}
                      plateClassName={layout.plateClassName}
                      bodyClassName={layout.bodyClassName}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
