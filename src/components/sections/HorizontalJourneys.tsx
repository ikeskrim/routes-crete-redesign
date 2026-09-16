import { Fragment, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { SplitLines } from "@/components/ui/SplitLines";
import { getBlur, getImageSize } from "@/lib/content";
import type { ContentItem } from "@/lib/types";
import { cn } from "@/lib/utils";

import styles from "./HorizontalJourneys.module.css";

/**
 * Movement II, the journeys (C+ SPEC §D.4): `section#experiences` on paper,
 * folio II, the heading, the Fitzroy index and the island map. Server
 * component.
 *
 * `#experiences` lives on this section. `#transfers` is not duplicated: it
 * belongs to the transfer's own entry in the index. One id, one owner.
 */
export function Journeys({
  eyebrow,
  heading,
  items,
  map,
}: {
  /** "Experiences & Transfers", composed by the page from the two section headings. */
  eyebrow: string;
  heading: string;
  items: ContentItem[];
  /** The island map block, when there are mappable locations. */
  map?: { heading: string; chart: ReactNode };
}) {
  return (
    <section
      id="experiences"
      aria-labelledby="journeys-heading"
      className={cn("ed-grid", styles.section)}
    >
      <Eyebrow folio="II" className={styles.folio}>
        {eyebrow}
      </Eyebrow>

      <SplitLines
        as="h2"
        id="journeys-heading"
        text={heading}
        className={cn("text-section", styles.heading)}
      />

      <HorizontalJourneys items={items} />

      {/* The island map: every pin and link unchanged; a map of where these
          journeys go belongs with the journeys. */}
      {map && (
        <div className={cn("ed-grid", styles.mapBlock)}>
          <h3 className={cn("text-title", styles.mapHeading)}>{map.heading}</h3>
          <div className={styles.chart}>{map.chart}</div>
        </div>
      )}
    </section>
  );
}

/**
 * The Fitzroy index (C+ SPEC §D.4, §0.4 C3, as built and amended in the
 * frozen draft): the journeys as a contents list of titles. Server component,
 * CSS only; `JourneyTrack` and its pan are no longer imported.
 *
 * - **Fine pointer, ≥1024:** the list sits on columns 8–12. Each entry's plate
 *   lifts out of the flow into one stage running from the viewport edge to the
 *   end of column 5, sticky under the masthead while the list scrolls. The
 *   first plate shows by default; pointing at or focusing another entry
 *   shows its plate (700 ms in, 500 ms out; 150 ms under reduced motion) and
 *   the first steps back. Each frame is sized to its own photograph (native
 *   aspect, never taller than the viewport under the masthead), so no bone
 *   ever shows around a picture. The title underlines in burnt sienna.
 * - **Every other case** (touch or coarse pointers at any width, or <1024):
 *   each entry is a full-bleed subgrid row with its plate in flow above the
 *   text, bleeding full, right, then left, at the photograph's native aspect.
 *
 * One `<img>` per journey in every mode (no duplicate download). The plates
 * are operator photographs, decoration beside the linked title: `alt=""`,
 * lazy, the later two at low fetch priority. The studio photograph of the van
 * (the transfer) is mounted on a 3:2 bone mat instead of being cropped.
 *
 * Text, all existing strings: title, subtitle and facts (region / duration,
 * availability or "Duration on request"). No category label: folio II already
 * names both departments (amended in the draft review).
 */
export function HorizontalJourneys({ items }: { items: ContentItem[] }) {
  return (
    <ul data-journeys="" className={cn("ed-grid", styles.contents)}>
      {items.map((item, i) => {
        const transfer = item.href.startsWith("/transfers");
        const size = getImageSize(item.cardImage);
        const blur = getBlur(item.cardImage);
        /* the plate's own proportions; the van's mat is 3:2 */
        const ratio = transfer ? "3 / 2" : size ? `${size.width} / ${size.height}` : "4 / 5";
        const aspect = transfer ? 1.5 : size ? size.width / size.height : 0.8;
        /* availability carries transfers, duration carries experiences */
        const facts = [
          item.facts.region,
          item.facts.duration ?? item.facts.availability ?? "Duration on request",
        ].filter((fact): fact is string => typeof fact === "string" && fact.length > 0);

        return (
          <li key={item.href} className={styles.entry}>
            <figure aria-hidden="true" className={cn("motion-fade-reduced", styles.plate)}>
              <div
                className={cn(styles.frame, transfer && styles.mat)}
                style={{ "--j-ratio": ratio, "--j-aspect": aspect } as CSSProperties}
              >
                <div className={styles.fill}>
                  <Image
                    src={item.cardImage}
                    alt=""
                    fill
                    loading="lazy"
                    fetchPriority={i > 0 ? "low" : undefined}
                    quality={68}
                    sizes="(min-width: 1024px) 42vw, (min-width: 640px) 85vw, 100vw"
                    placeholder={blur ? "blur" : "empty"}
                    blurDataURL={blur}
                    className={styles.img}
                  />
                </div>
              </div>
            </figure>

            <Link
              href={item.href}
              /* The transfer's entry owns #transfers: legacyAnchorMap sends
                 #portfolio1 here, and a legacy link must still land on it. */
              id={transfer ? "transfers" : undefined}
              className={styles.entryLink}
            >
              <h3 className={cn("text-title", styles.title)}>
                <span className={styles.titleText}>{item.title}</span>
              </h3>
              {item.subtitle && <p className={cn("text-deck", styles.deck)}>{item.subtitle}</p>}
              {facts.length > 0 && (
                <span className={cn("text-caption", styles.facts)}>
                  {facts.map((fact, j) => (
                    <Fragment key={fact}>
                      {/* literal spaces outside the hidden slash keep the
                          facts apart in the link's accessible name */}
                      {j > 0 && (
                        <>
                          {" "}
                          <span aria-hidden="true">/</span>{" "}
                        </>
                      )}
                      <span>{fact}</span>
                    </Fragment>
                  ))}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
