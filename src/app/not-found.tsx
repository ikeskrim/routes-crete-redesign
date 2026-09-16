import { Button } from "@/components/ui/Button";
import { Caption } from "@/components/ui/Caption";
import { Emphasis } from "@/components/ui/Emphasis";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Plate } from "@/components/ui/Plate";
import { GRADE } from "@/lib/edition";
import { photoCredit } from "@/lib/photo-credit";

/** A ledgered mood frame (`surface: "mood"`): a headland, a beach and clear
 *  water, never named (C+ SPEC §D.6, §E.1). No content file references it,
 *  so its graded path is written from the live grade letter. Full colour:
 *  the page's one duotone is the back cover's, which closes it. */
const PLATE = `/images/graded/${GRADE}/stock-local/pexels-24304887.jpg`;

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/**
 * The paper 404 (C+ SPEC §D.6, G7). The text and the plate share one row,
 * centred in the viewport at ≥1024: the running head "404", the title with
 * its emphasis word (§C.13 #31, line-final), the paragraph, the gold "Back
 * home" pill and the rule link. The plate bleeds right at every width, 4:5,
 * with its ledger caption under it; below 1024 it follows the text.
 *
 * The plate loads eagerly but is not preloaded: on phones it sits below the
 * text, so it is not a single-viewport LCP candidate (§E.1).
 */
export default function NotFound() {
  const alt = photoCredit(PLATE)?.caption ?? "";

  return (
    <section className="ed-grid paper-stock min-h-[100svh] overflow-x-clip bg-paper pt-[calc(var(--ed-masthead-h)+var(--ed-space-block))] pb-(--ed-space-block) text-ink [align-content:safe_center]">
      <div aria-hidden="true" className="paper-stock-layer" />

      <div className="col-[content-start/content-end] sm:col-[col_1/span_7] lg:row-start-1 lg:self-center">
        <Eyebrow>404</Eyebrow>

        {/* Measures in em (17ch and 34ch of Fraunces at these cuts), so the
            box keeps its width while the metric fallback is showing. The
            empty block before the title's text puts that text in an
            anonymous block: the in-line reflow at the font swap is then not
            reported as a shift of the `em` (see EM_LINE on /transfers).
            Below 365 the fallback needs three lines where Fraunces needs two
            ("This path doesn’t" is 7.7em in the fallback, 6.2em in
            Fraunces), so the title reserves three lines there. */}
        <Emphasis
          as="h1"
          text="This path doesn’t lead anywhere"
          word="anywhere"
          className="mt-(--ed-space-pair) max-w-[9.8em] text-statement text-ink before:block before:content-[''] max-[365px]:min-h-[3lh]"
        />

        <p className="mt-(--ed-space-pair) max-w-[20.2em] text-deck text-ink-soft">
          The page you were looking for isn&rsquo;t here. The island still is.
        </p>

        <div className="mt-(--ed-space-block) flex flex-wrap items-center gap-x-8 gap-y-3">
          <Button variant="gold" href="/">
            Back home
          </Button>
          <Button variant="rule" href="/experiences">
            Explore experiences
          </Button>
        </div>
      </div>

      <Plate
        src={PLATE}
        alt={alt}
        ratio="4 / 5"
        sizes="(min-width: 1024px) 38vw, 100vw"
        bleed="right"
        keyline
        loading="eager"
        objectPosition="70% 50%"
        className="col-[col_1/full-end] mt-(--ed-space-block) sm:col-[col_4/full-end] lg:col-[col_9/full-end] lg:row-start-1 lg:mt-0 lg:self-center"
        caption={
          <Caption
            file={PLATE}
            imageAlt={alt}
            placement="under"
            className="pe-(--ed-margin)"
          />
        }
      />
    </section>
  );
}
