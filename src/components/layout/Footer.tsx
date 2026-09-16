import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Caption } from "@/components/ui/Caption";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ExternalIcon } from "@/components/ui/icons";
import { Plate } from "@/components/ui/Plate";
import { Reveal } from "@/components/ui/Reveal";
import { duotonePath, photoCredit } from "@/lib/photo-credit";
import type { SiteContent } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The back cover (C+ SPEC §H.3, §E.1, §E.3). Server component; the site's one
 * `<footer>`, on every route.
 *
 * Night stock (`night-density` on the ground, the night grain above it and
 * under everything else), in four rows on the editorial grid:
 *
 *   A  `section[data-footer-scene]`: the closing plate, a terracotta duotone
 *      of a ledgered mood frame with its caption and credit under it, beside
 *      the closing block (address, the closing line, the gold pill and the
 *      WhatsApp rule link), vertically centred on the plate.
 *   B  the wordmark set large under a night hairline (`data-back-wordmark`).
 *   C  three link columns: Navigate, Contact, More.
 *   D  the legal line: copyright, address, the GEMI registration (Greek from
 *      Inter's greek file) and the /credits link, which discharges the
 *      attribution our sourced photographs' licences require (credits-guard
 *      C14 looks for it inside this landmark on every route).
 *
 * Every string is a content field or the live string this file already
 * rendered. Every contact channel renders only if the content file has one,
 * so an unknown value never shows as a placeholder. The closing line stays
 * roman: global chrome never requests the italic file (§C.2 rule 4).
 *
 * Placement follows the draft (the C+ draft, removed at close, the back-cover
 * block): below 640 one column; 640–1023 plate `col 1 / span 4` beside the
 * closing block `col 5 / span 4`, link columns two per row; from 1024 the
 * closing block moves to `col 6 / span 7` and the columns sit three across.
 */

/** The closing plate (§E.1): ledgered, `surface: "mood"`, eligible for the
    duotone (§E.3). `duotonePath()` serves the duotone of the live grade when
    the edition switch is on and the file exists, else the colour frame of
    the live grade in the same slot, with the same caption. */
const CLOSING_FILE = "south-coast-storm-cloud.jpg";
const CLOSING_SOURCE = `/images/sourced/${CLOSING_FILE}`;

/** Rendered at `col 1 / span 4` (≥640, capped at 35rem) or across the content
    width (below 640, 1.25rem margins each side at 390), never full bleed. */
const CLOSING_SIZES =
  "(min-width: 1024px) min(28vw, 35rem), (min-width: 640px) 50vw, calc(100vw - 2.5rem)";

/** A column's placement and its night hairline (§C.7 row dividers). */
const COLUMN =
  "[grid-column:content-start/content-end] border-t-(length:--ed-hair-w) border-hairline-night pt-5";

/** Column links (§H.3 row C): Inter `ui`, on-night-soft (8.20:1), 44 px tall,
    paper with a 1 px paper underline on hover and focus. */
const COLUMN_LINK =
  "inline-flex min-h-11 items-baseline gap-3 py-[0.7rem] text-ui text-on-night-soft " +
  "decoration-1 underline-offset-[0.28em] transition-colors duration-300 " +
  "hover:text-on-night hover:underline focus-visible:text-on-night focus-visible:underline";

/** The /credits link in the legal line: the rule-link shape (§C.12) at the
    caption size of its line, on-night-soft over a `rule-night` rule (4.68:1)
    that thickens on hover and focus. */
const CREDITS_LINK =
  "relative inline-flex min-h-11 items-center text-on-night-soft transition-colors duration-300 " +
  "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-[0.7rem] after:h-px " +
  "after:origin-bottom after:bg-rule-night after:transition-transform after:duration-250 " +
  "hover:text-on-night hover:after:scale-y-200 focus-visible:text-on-night focus-visible:after:scale-y-200";

export function Footer({ site }: { site: SiteContent }) {
  const { brand, contact, footer, social, nav } = site;
  const year = new Date().getFullYear();
  const copyright = footer.copyright.replace("{year}", String(year));

  const closingSrc = duotonePath(CLOSING_SOURCE);
  /* The plate is named by its ledger subject (§J.1 alt text); no record, no
     name and no caption (fail closed). */
  const closingAlt = photoCredit(CLOSING_FILE)?.caption ?? "";

  const waHref = contact.whatsapp
    ? `https://wa.me/${contact.whatsapp.dial}?text=${encodeURIComponent(
        "Hello Routes Crete, I'd like to ask about a private tour or transfer.",
      )}`
    : null;

  const channels = [
    ...contact.phones.map((phone) => ({
      label: phone.label,
      value: phone.display,
      href: `tel:${phone.dial}`,
    })),
    contact.whatsapp && waHref
      ? {
          label: "WhatsApp",
          value: contact.whatsapp.display,
          href: waHref,
          external: true,
        }
      : null,
    contact.email
      ? { label: "Email", value: contact.email, href: `mailto:${contact.email}` }
      : null,
  ].filter(Boolean) as {
    label: string;
    value: string;
    href: string;
    external?: boolean;
  }[];

  const pageLinks = nav.filter((item) => !item.external);

  return (
    <footer data-site-chrome className="grain night-density bg-night text-on-night">
      {/* The night grain: above the ground, under every row (each row is
          positioned and comes later in the tree). */}
      <div aria-hidden="true" className="grain-overlay" />

      {/* ------------------------------------------- A: the closing scene */}
      <section
        data-footer-scene
        className="ed-grid relative items-center py-(--ed-space-section)"
      >
        <Plate
          src={closingSrc}
          alt={closingAlt}
          ratio="4 / 5"
          sizes={CLOSING_SIZES}
          objectPosition="58% 40%"
          unclip
          className="max-w-[35rem] [grid-column:content-start/content-end] sm:[grid-column:col_1/span_4]"
          caption={
            <Caption
              file={CLOSING_FILE}
              tone="night"
              placement="under"
              imageAlt={closingAlt}
            />
          }
        />

        <Reveal className="mt-(--ed-space-block) [grid-column:content-start/content-end] sm:mt-0 sm:[grid-column:col_5/span_4] lg:[grid-column:col_6/span_7]">
          {contact.address && (
            <p className="text-caption text-on-night-soft">{contact.address}</p>
          )}
          <p className="mt-(--ed-space-pair) max-w-[14ch] text-statement text-balance text-on-night">
            Tell us when you&rsquo;re on the island.
          </p>

          <div className="mt-(--ed-space-pair) flex flex-wrap items-center gap-x-7 gap-y-3">
            <Button variant="gold" tone="night" href="/contact">
              Plan your day
            </Button>
            {waHref && (
              <Button variant="rule" tone="night" href={waHref} external>
                WhatsApp
              </Button>
            )}
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------ B: the wordmark */}
      <div data-back-wordmark="" className="ed-grid relative">
        {/* The brand mark rises once as it comes into view (§G.1 #6). A
            preloader carrying the same animation once measured a Speed Index
            regression from 1.6s to 3.9s, because a full-screen overlay hides
            content that has already painted; here the motion costs nothing.
            Set still under reduced motion. */}
        <Reveal className="border-t-(length:--ed-hair-w) border-hairline-night pt-(--ed-space-block) [grid-column:content-start/content-end]">
          <h2
            aria-label={brand.name}
            // The brand is a name, not words: keep browser auto-translate off it.
            translate="no"
            className="text-wordmark-back text-on-night [overflow-wrap:anywhere]"
          >
            {brand.name}
          </h2>
        </Reveal>
      </div>

      {/* ----------------------------------------------- C: the link columns */}
      <div className="ed-grid relative gap-y-(--ed-space-pair) py-(--ed-space-block)">
        <nav
          aria-label="Footer"
          className={cn(COLUMN, "sm:[grid-column:col_1/span_4]")}
        >
          <Eyebrow as="h3" tone="night" className="mb-3">
            Navigate
          </Eyebrow>
          <ul className="flex flex-col">
            {pageLinks.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className={COLUMN_LINK}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={cn(COLUMN, "sm:[grid-column:col_5/span_4]")}>
          <Eyebrow as="h3" tone="night" className="mb-3">
            Contact
          </Eyebrow>
          <ul className="flex flex-col">
            {channels.map((channel) => (
              <li key={channel.label}>
                <a
                  href={channel.href}
                  {...(channel.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className={COLUMN_LINK}
                >
                  <span className="min-w-[5.5rem]">{channel.label}</span>
                  <span>{channel.value}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div
          className={cn(
            COLUMN,
            "sm:[grid-column:col_1/span_4] lg:[grid-column:col_9/span_4]",
          )}
        >
          <Eyebrow as="h3" tone="night" className="mb-3">
            More
          </Eyebrow>
          <ul className="flex flex-col">
            <li>
              <a
                href={footer.brochure.href}
                target="_blank"
                rel="noopener noreferrer"
                className={COLUMN_LINK}
              >
                {footer.brochure.label}
                {/* The served fonts carry no arrow glyph (§C.1). */}
                <ExternalIcon className="size-2.5 self-center" />
              </a>
            </li>
            {social.links.map((link) => (
              <li key={link.key}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={COLUMN_LINK}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ------------------------------------------------ D: the legal line */}
      <div className="ed-grid relative">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-t-(length:--ed-hair-w) border-hairline-night pt-4 pb-8 text-caption text-on-night-soft [grid-column:content-start/content-end]">
          <p>{copyright}</p>
          {contact.address && <p>{contact.address}</p>}
          <p>
            {/* Γ Ε Μ Η come from Inter's greek file (unicode-range); the
                language is marked for assistive technology. */}
            <span lang="el">{brand.gemiLabel}</span>: {brand.gemiNumber}
          </p>
          {/* Not decoration: the licences on our sourced photographs require
              attribution, and this is where it is discharged. */}
          <Link href="/credits" className={CREDITS_LINK}>
            Photography credits
          </Link>
        </div>
      </div>
    </footer>
  );
}
