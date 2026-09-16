import { Fragment, type CSSProperties } from "react";
import Link from "next/link";

import { getImageSize } from "@/lib/content";
import type { ContentItem } from "@/lib/types";
import { cn } from "@/lib/utils";

import { Eyebrow } from "./Eyebrow";
import { MediaFrame } from "./Media";

/**
 * The card's keyboard focus ring, in the ground's focus token (§H.4), drawn
 * twice: on the title and on the plate frame. The link draws none of its
 * own: on the index pages it is a full-bleed subgrid row, so its outline
 * would lie on the viewport edges. The plate ring is there because an entry
 * can be taller than the viewport (a 4:5 plate with the text under it, at
 * 1023 × 768 or on a phone held landscape): the browser then scrolls the
 * link's top into view and the title stays below the fold, so a ring on the
 * title alone would not be seen. The pre-C+ card drew its ring on the frame.
 */
const FOCUS_RING =
  "group-focus-visible:outline-2 group-focus-visible:outline-offset-3 group-focus-visible:outline-focus group-focus-visible:outline-solid";

/**
 * An experience or transfer entry (C+ SPEC §D.6, §E.1): a plate at the
 * photograph's native aspect with its text under it (or beside it, when the
 * composition places the two parts with `plateClassName` / `bodyClassName`,
 * e.g. as a subgrid row). The whole entry is one link.
 *
 * Text, all existing strings: the title (`title` step), the subtitle
 * (`deck`, ink-soft) and the facts (`.text-caption`: region / duration,
 * availability or "Duration on request"). The "Discover" label and the card
 * numeral are gone (§C.6, §J); `index` is accepted and ignored until its call
 * sites drop it.
 *
 * The category (letter-spaced capitals) prints only with `showCategory`. An
 * eyebrow must carry information (§C.5): on an index every entry repeats the
 * category the page already names ("EXPERIENCES" over each entry under the
 * h1 "Experiences"), so the label is off by default, as on the homepage
 * index, where the draft drops it for the same reason. A list whose entries
 * mix categories (an item page's related entries) passes it.
 *
 * Hover and focus underline the title in burnt sienna; the keyboard focus
 * ring (`FOCUS_RING`) is drawn on the title and on the plate frame. No image
 * zoom, no filter, no scrim (§G.2, D2).
 */
export function ContentCard({
  item,
  sizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 42vw",
  ratio = "native",
  preload,
  priority,
  className,
  plateClassName,
  bodyClassName,
  id,
  showCategory = false,
}: {
  item: ContentItem;
  /** @deprecated The card numeral is removed (§C.6); ignored. */
  index?: number;
  sizes?: string;
  /**
   * `"native"` (default) sets the plate at the photograph's own aspect, read
   * from the file; otherwise an aspect-ratio utility such as `aspect-[3/2]`.
   */
  ratio?: string;
  /** The LCP entry only (next/image `preload`, contract C6). */
  preload?: boolean;
  /** @deprecated Renamed `preload` (C+ SPEC §0.4 C6); still honoured. */
  priority?: boolean;
  className?: string;
  /** On the plate, for compositions that place it. */
  plateClassName?: string;
  /** On the text block, for compositions that place it. */
  bodyClassName?: string;
  /**
   * Anchor target. The transfers entry carries #transfers: legacyAnchorMap
   * sends #portfolio1 there, and a legacy link must still land on it.
   */
  id?: string;
  /**
   * Print the category above the title. Off by default: only where the
   * entries around it differ in category does the label say anything (§C.5).
   */
  showCategory?: boolean;
}) {
  /* availability carries transfers, duration carries experiences. */
  const facts = [
    item.facts.region,
    item.facts.duration ?? item.facts.availability ?? "Duration on request",
  ]
    .filter(Boolean)
    .slice(0, 2);

  const size = ratio === "native" ? getImageSize(item.cardImage) : null;
  const nativeStyle = size
    ? ({ aspectRatio: `${size.width} / ${size.height}` } satisfies CSSProperties)
    : undefined;

  return (
    <Link
      id={id}
      href={item.href}
      className={cn("group block focus-visible:outline-none", className)}
    >
      <div className={plateClassName}>
        <MediaFrame
          src={item.cardImage}
          /* Decorative inside this link: the h3 names it. */
          alt=""
          sizes={sizes}
          ratio={ratio === "native" ? (size ? "" : "aspect-[4/5]") : ratio}
          style={nativeStyle}
          /* An outline lies outside the box: the frame's overflow-hidden keeps it. */
          className={FOCUS_RING}
          preload={preload ?? priority}
          quality={68}
        />
      </div>

      {/* Without the label, 24 px from the plate's foot to the title's box:
          the draft's gap under its entry plates (390). On the block, not the
          h3, whose margin would collapse into this one. */}
      <div className={cn(showCategory ? "mt-5" : "mt-6", bodyClassName)}>
        {showCategory && <Eyebrow as="span">{item.category}</Eyebrow>}
        <h3 className={cn(showCategory && "mt-3", "text-title text-ink")}>
          <span
            className={cn(
              "bg-[linear-gradient(var(--ed-accent-text),var(--ed-accent-text))] bg-[length:0_1px] bg-[position:0_100%] bg-no-repeat",
              "[box-decoration-break:clone] transition-[background-size] duration-400 ease-reveal",
              "group-hover:bg-[length:100%_1px] group-focus-visible:bg-[length:100%_1px]",
              FOCUS_RING,
            )}
          >
            {item.title}
          </span>
        </h3>

        {item.subtitle && (
          <p className="mt-2 max-w-[34ch] text-deck text-ink-soft">{item.subtitle}</p>
        )}

        {facts.length > 0 && (
          /* Spans, not a paragraph: the separator is decoration, and the
             spaces around it sit outside it, so the link's accessible name
             reads "Central Crete Day trip". */
          <div className="mt-4 text-caption text-ink-soft">
            {facts.map((fact, i) => (
              <Fragment key={i}>
                {i > 0 && (
                  <>
                    {" "}
                    <span aria-hidden="true" className="mx-1">
                      /
                    </span>{" "}
                  </>
                )}
                <span>{fact}</span>
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
