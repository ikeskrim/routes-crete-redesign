import type { Metadata } from "next";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";
import { SplitLines } from "@/components/ui/SplitLines";
import { ContactChannels } from "@/components/sections/ContactChannels";
import { LazyFormEmbed } from "@/components/sections/LazyFormEmbed";
import { getSite } from "@/lib/content";

export function generateMetadata(): Metadata {
  const site = getSite();
  return {
    title: "Contact",
    description:
      "Request a private tour or a VIP transfer in Crete. Send us your details and we’ll respond promptly with availability, final details, and booking confirmation.",
    alternates: { canonical: "/contact" },
    openGraph: {
      title: `Contact | ${site.brand.name}`,
      description: site.meta.description,
      url: "/contact",
    },
  };
}

/**
 * /contact (C+ SPEC §D.6, G7).
 *
 * - The head is night (density and grain layers under the content), with no
 *   photograph: the page's one plate is the back cover's. The title is
 *   pre-split so its emphasis word ends the second line (§C.13 #28), then
 *   the channels directory and the details card (`ContactChannels`).
 * - The form section is plain paper with no texture layer: the Monday form
 *   sits in a white frame with a 1 px control rule. `LazyFormEmbed` and its
 *   sandboxed iframe are untouched; its box is reserved at full height in the
 *   server HTML and mounted as the reader approaches it.
 * - At ≥1024 the frame is `col 1 / span 8`, not the whole measure. Seen in a
 *   real browser (Chrome, 1463 px), the form paints its own pale grey ground
 *   across the iframe with a white card about 640 px wide in the middle, so
 *   a full-width frame was a 1,296 × 1,600 px cool rectangle, the largest
 *   shape on the site; at `span 8` (856 px at 1440) the card keeps about
 *   100 px of ground each side. Beside it, in `col 10 / span 3`, the details
 *   card's closing note is repeated as a margin note, held under the
 *   masthead while the form scrolls past. It is a repeat of a sentence the
 *   head already gives, so it is hidden from assistive technology, and it is
 *   not rendered below 1024, where the frame takes the full measure. The
 *   frame's top edge is where it was, so the lazy mount distance is too.
 */
export default function ContactPage() {
  const site = getSite();

  return (
    <>
      <section
        id="contact"
        className="grain bg-night pt-[calc(var(--ed-masthead-h)+clamp(4rem,9vw,8rem))] pb-(--ed-space-section) text-on-night"
      >
        <div aria-hidden="true" className="night-density pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="grain-overlay" />

        {/* Above both texture layers. The rows: 1 eyebrow, 2 title,
            3 the channels and the details card (ContactChannels). */}
        <div className="ed-grid relative z-[1]">
          <Eyebrow
            tone="night"
            className="col-[content-start/content-end] lg:col-[col_1/span_8]"
          >
            {site.sections.contact.subheading}
          </Eyebrow>

          {/* Slow-font CLS (§K.3): each line is held on one line (Fraunces
              sets "Cretan journey" in 225 px at 42 px, so it fits down to a
              270 px viewport; the wider metric fallback is clipped by the
              line mask until the swap). The emphasis line's text sits in an
              anonymous block (an empty block before it), so the in-line
              reflow at the swap is not reported as a shift of the `em`; see
              EM_LINE on /transfers. */}
          <SplitLines
            as="h1"
            text="Start your Cretan journey"
            lines={["Start your", "Cretan journey"]}
            emphasis="journey"
            reveal={false}
            lineClassName={[
              "whitespace-nowrap",
              "whitespace-nowrap [&>span]:before:block [&>span]:before:content-['']",
            ]}
            className="col-[content-start/content-end] mt-(--ed-space-pair) text-statement text-on-night lg:col-[col_1/span_8]"
          />

          <ContactChannels site={site} />
        </div>
      </section>

      {/* The existing Monday.com form, embedded exactly as before — mounted as
          the reader approaches it (see LazyFormEmbed). */}
      <section className="ed-grid bg-paper py-(--ed-space-section) text-ink">
        <Eyebrow className="col-[content-start/content-end]">
          {site.sections.contact.heading}
        </Eyebrow>

        <Reveal className="col-[content-start/content-end] mt-(--ed-space-pair) lg:col-[col_1/span_8] lg:row-start-2">
          <div className="overflow-hidden border border-rule bg-white">
            <LazyFormEmbed
              src={site.contact.formUrl}
              title="Routes Crete booking request form"
              className="h-[1600px] w-full"
            />
          </div>
        </Reveal>

        {/* The margin note (≥1024): the details card's closing sentence,
            verbatim (ContactChannels). */}
        <p
          aria-hidden="true"
          className="hidden text-caption text-ink-soft lg:sticky lg:top-[calc(var(--ed-masthead-h)+2.5rem)] lg:col-[col_10/span_3] lg:row-start-2 lg:mt-(--ed-space-pair) lg:block lg:self-start"
        >
          We&rsquo;ll respond promptly with availability, final details, and
          booking confirmation.
        </p>
      </section>
    </>
  );
}
