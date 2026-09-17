import type { Metadata } from "next";

import { ctaClass } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";
import { SplitLines } from "@/components/ui/SplitLines";
import { getPhotoCredits, getSite } from "@/lib/content";
import { cn } from "@/lib/utils";

export function generateMetadata(): Metadata {
  const site = getSite();
  return {
    title: "Photography credits",
    description:
      "Where the photographs on this site come from: the places we photographed ourselves, and the licensed images we did not, with their authors and licences.",
    alternates: { canonical: "/credits" },
    openGraph: {
      title: `Photography credits | ${site.brand.name}`,
      description: site.meta.description,
      url: "/credits",
    },
  };
}

/* A licence or source link: the rule link in eyebrow type, 44 px tall
   (C+ SPEC §D.6 /credits). */
const LEDGER_LINK = cn(ctaClass({ variant: "rule" }), "text-eyebrow");

/* The two links of a ledger row. At ≥1024 they sit in a fixed two-cell grid
   (licence 11rem, source 4.5rem, 24 px apart; each link at its own width),
   so the row's `auto` column is 17rem whatever face is showing. It used to
   be the links' own width, which Inter sets 7–16 px narrower than its
   metric fallback: at the swap that column narrowed, the `1fr` column
   widened and the links moved (CLS 0.00058 on the first row at 1440 × 900
   once the shorter intro brought that row above the fold). Widest labels
   measured: "Unsplash License" 156.9 / 147.3 px, "Source" 66.3 / 60.7 px
   (fallback / Inter, 12.8 px). A share-alike row adds a third link,
   "Download", which takes the next grid row under the licence cell. */
const LEDGER_LINKS =
  "flex flex-wrap items-center gap-x-6 lg:grid lg:grid-cols-[11rem_4.5rem] lg:justify-items-start";

/* Caption measures in em, not ch: `62ch` was 480 px in the fallback and
   508 px in Inter, so the byline rewrapped at the swap. 39.08em is Inter's
   62ch at the caption cut (13 px), so the loaded layout is unchanged. */
const CAPTION_MEASURE = "max-w-[39.08em]";

/**
 * /credits (C+ SPEC §D.6, G7): the colophon, on paper and roman throughout.
 * The title is set, never risen; the intro is never gated on hydration
 * (§K.5), so only the ledger rows and the verification note rise into place.
 *
 * The ledger is an ordered list: its numbers are structural (Inter tabular
 * figures, `aria-hidden`; the order is the list's own), each photograph's
 * subject is its heading, and its licence and source are rule links.
 */
export default function CreditsPage() {
  const { photographs, verifiedOn } = getPhotoCredits();
  // The ledger stores an ISO date; read it as UTC so the day cannot shift.
  const verifiedLabel = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(verifiedOn));

  return (
    <section className="ed-grid paper-stock bg-paper pt-[calc(var(--ed-masthead-h)+clamp(4rem,9vw,8rem))] pb-(--ed-space-section) text-ink">
      <div aria-hidden="true" className="paper-stock-layer" />

      <Eyebrow className="col-[content-start/content-end] lg:col-[col_1/span_8]">
        Credits
      </Eyebrow>

      {/* Measures in em, so the boxes keep their width while the metric
          fallback (about 25 % wider at the statement cut) is showing, and
          chosen so both faces set the same lines at every width measured
          from 320 to 1920: two lines from 640 up (11.5em), three below 640
          (8em; the 4-column content box tops out at 432 px, too narrow for
          the fallback's "photographs come from" on one line). */}
      <SplitLines
        as="h1"
        text="Where these photographs come from"
        reveal={false}
        className="col-[content-start/content-end] mt-(--ed-space-pair) max-w-[8em] text-statement text-ink sm:max-w-[11.5em] lg:col-[col_1/span_8]"
      />

      {/* A paragraph of about 90 words, so from 640 up it is set in the
          `col 1 / span 7` of §D.6 at a wider measure than the old 34ch
          (20.2em, twelve lines): about eight lines instead of twelve. The
          measure is in em, so both faces break the same lines: the box is a
          fixed number of ems wherever the cap binds, and the deck cut only
          scales with the viewport. 640–1023: 26em (the 7-column span is at
          least 26.4em there, so the cap always binds); from 1024: 32em
          (737 px at 1440, where the column is 746; the column binds from
          1024 to about 1175). A px-wide column let the fallback set 8 lines
          where Fraunces set 9 at 666–670. Below 640 it is 17.6em (the column
          of a 375 viewport): at 390 the full column let the fallback run one
          line longer than Fraunces (13 / 12). Under 335 px the column is
          narrower than that and binds: at 333–334 the fallback sets 16 lines
          and Fraunces 15, so there the box holds 16 lines (320–332 set 16 in
          both faces, so the hold changes nothing else). Line counts measured
          equal in both faces at every width from 320 to 1920, 1 px apart
          (dense-lines.mjs). */}
      <p className="col-[content-start/content-end] mt-(--ed-space-pair) max-w-[17.6em] text-deck text-ink-soft max-[335px]:min-h-[16lh] sm:col-[col_1/span_7] sm:max-w-[26em] lg:max-w-[32em]">
        Every photograph of a tour &mdash; the mill, the cave, the shepherd&rsquo;s
        house, the people we travel with &mdash; is our own. The landscapes are
        not always. Some are licensed photographs of the places these
        journeys visit; others are of Crete more widely, used to set the
        scene and captioned as exactly that, never as somewhere we go.
        Every one of them is listed here with its author and licence, and
        every one has been colour-graded, which the licences require us to
        say.
      </p>

      <ol className="col-[content-start/content-end] mt-(--ed-space-block) border-t-(length:--ed-hair-w) border-hairline">
        {photographs.map((photo, i) => (
          <li
            key={photo.file}
            className="border-b-(length:--ed-hair-w) border-hairline py-8 lg:py-10"
          >
            <Reveal delay={Math.min(i * 0.05, 0.25)}>
              <div className="grid gap-3 lg:grid-cols-[3rem_1fr_auto] lg:items-baseline lg:gap-8">
                <span aria-hidden="true" className="text-caption tabular-nums text-ink-soft">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div>
                  <h2 className="text-title text-ink [font-size:calc(var(--ed-t-title)*0.75)]">
                    {photo.subject}
                  </h2>
                  <p className={cn("mt-2 text-caption text-ink-soft", CAPTION_MEASURE)}>
                    <cite className="not-italic">{photo.title}</cite>
                    {photo.titleAsPublished ? " (title as published)" : ""} by{" "}
                    {photo.author}
                    {photo.modified ? ", colour-graded by Routes Crete" : ""}.
                  </p>
                  {/* Share-alike (CC BY-SA 4.0): the graded file is itself
                      shared under the licence, and the row links it below. */}
                  {photo.shareAlike ? (
                    <p className={cn("mt-2 text-caption text-ink-soft", CAPTION_MEASURE)}>
                      The colour-graded version on this site is shared under{" "}
                      {photo.shareAlike.licence}, as that licence requires.
                    </p>
                  ) : null}
                </div>

                <div className={LEDGER_LINKS}>
                  <a
                    href={photo.licenceUrl}
                    target="_blank"
                    rel="noopener noreferrer license"
                    className={LEDGER_LINK}
                  >
                    {photo.licence}
                    <span className="sr-only"> for {photo.subject}</span>
                  </a>
                  <a
                    href={photo.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={LEDGER_LINK}
                  >
                    Source
                    <span className="sr-only"> for {photo.subject}</span>
                  </a>
                  {photo.shareAlike ? (
                    <a href={photo.shareAlike.derivative} download className={LEDGER_LINK}>
                      Download
                      <span className="sr-only">
                        {" "}
                        the graded file of {photo.subject}, {photo.shareAlike.licence}
                      </span>
                    </a>
                  ) : null}
                </div>
              </div>
            </Reveal>
          </li>
        ))}
      </ol>

      <Reveal delay={0.1} className="col-[content-start/content-end] mt-(--ed-space-block)">
        <p className={cn("text-caption text-ink-soft", CAPTION_MEASURE)}>
          Each file above was matched to its source by SHA-1 checksum, so the
          image we publish is verifiably the one that carries that licence.
          Licences were read from each source page directly rather than
          inferred from a category or a neighbouring file. Last verified{" "}
          <time dateTime={verifiedOn}>{verifiedLabel}</time>.
        </p>
      </Reveal>
    </section>
  );
}
