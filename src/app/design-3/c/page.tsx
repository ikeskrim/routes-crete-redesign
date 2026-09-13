import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";

import { getImageSize } from "@/lib/content";

import { draftHero, getDraftContent } from "../_lib/draft-content";

import styles from "./c.module.css";
import { photoCredit } from "./credit";
import { ExternalIcon } from "./icons";
import { EditorialMenu } from "./menu";

/**
 * TEMPORARY — /design-3/c, "Warm Editorial". A long-form travel feature in a
 * printed magazine.
 *
 * The one bold thing is the cover: the headline set huge, its last line
 * indented to the column where the photographic plate begins and printed
 * wholly inside the plate's dusk sky. Everything after it is quiet: an opening
 * spread, a contents page of plates, a colophon. The one motion is the plate
 * being laid down under the type on load.
 *
 * Every string rendered here comes from getDraftContent() or, for the hero's
 * caption and credit, content/photo-credits.json (./credit). The only words in
 * this code are the structural "Menu"/"Close" (in ./menu).
 */

const HERO_FILE = "libyan-sea-coast-dusk.jpg";

/** Sentences of a statement, so each can start its own line. The text itself is untouched. */
function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/);
}

/**
 * The cover line in two: the trailing words that make up no more than ~42% of
 * the heading become the line printed on the plate. The string is untouched;
 * only where it breaks is chosen.
 */
function coverLines(text: string): [string, string] {
  const words = text.split(" ");
  let cut = words.length - 1;
  for (let k = words.length - 1; k >= 1; k--) {
    if (words.slice(k).join(" ").length > text.length * 0.42) break;
    cut = k;
  }
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

export default function WarmEditorialDraft() {
  const content = getDraftContent();
  const hero = draftHero(HERO_FILE, "c", "sourced");
  const credit = photoCredit(HERO_FILE);
  const { nav } = content;
  const [coverLead, coverLast] = coverLines(content.hero.heading);

  /* Plates are set to their own photographs. The lead of the contents page is
     the first landscape experience; a portrait frame keeps a portrait plate;
     the transfer's studio photograph is printed smaller, onto the page. */
  const plates = content.journeys.items.map((item) => {
    const size = getImageSize(item.image);
    const kind = item.href.startsWith("/transfers") ? "transfer" : "experience";
    const shape = size && size.height > size.width ? "portrait" : "landscape";
    const ratio =
      kind === "transfer" ? "16 / 9" : shape === "portrait" ? "4 / 5" : size ? `${size.width} / ${size.height}` : "3 / 2";
    return { item, kind, shape, ratio };
  });
  const leadAt = plates.findIndex((p) => p.kind === "experience" && p.shape === "landscape");
  const ordered = leadAt > 0 ? [plates[leadAt], ...plates.filter((_, i) => i !== leadAt)] : plates;
  const plateSizes = (i: number, kind: string, shape: string) =>
    i === 0
      ? "(min-width: 1024px) min(46vw, 652px), 92vw"
      : kind === "transfer"
        ? "(min-width: 1024px) min(38vw, 539px), (min-width: 640px) 46vw, 92vw"
        : shape === "portrait"
          ? "(min-width: 1024px) min(30vw, 427px), (min-width: 640px) 46vw, 92vw"
          : "(min-width: 1024px) min(38vw, 539px), (min-width: 640px) 46vw, 92vw";

  return (
    <>
      <header className={styles.masthead}>
        <div className={`${styles.wrap} ${styles.mastRow}`}>
          <Link href="/" className={styles.brand}>
            {content.brand}
          </Link>

          <nav className={styles.navRow} aria-label="Main">
            <ul>
              {nav.map((item) => (
                <li key={item.key}>
                  {item.external ? (
                    <a className={styles.navLink} href={item.href} target="_blank" rel="noopener noreferrer">
                      {item.label}
                      <ExternalIcon className={styles.extIcon} />
                    </a>
                  ) : (
                    <Link className={styles.navLink} href={item.href}>
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <EditorialMenu
            brand={content.brand}
            nav={nav}
            cta={content.hero.secondaryCta}
            address={content.address}
          />
        </div>
      </header>

      <article>
        <section className={styles.cover} aria-labelledby="ed-cover-heading">
          <div className={`${styles.wrap} ${styles.coverGrid}`}>
            <h1 id="ed-cover-heading" className={styles.headline}>
              <span className={styles.lineLead}>{coverLead}</span>{" "}
              <span className={styles.lineLast}>{coverLast}</span>
            </h1>

            <figure className={styles.plate}>
              <div className={styles.plateFrame}>
                <Image
                  src={hero.src}
                  alt={credit?.caption ?? ""}
                  fill
                  preload
                  sizes="(min-width: 1024px) min(61vw, 877px), 100vw"
                  quality={75}
                  placeholder={hero.blurDataURL ? "blur" : "empty"}
                  blurDataURL={hero.blurDataURL}
                  className={styles.plateImg}
                />
              </div>
              {credit && (
                <figcaption className={styles.caption}>
                  <span className={styles.captionPlace}>{credit.caption}</span>
                  <span className={`${styles.credit} ${styles.creditCover}`}>{credit.credit}</span>
                </figcaption>
              )}
            </figure>

            <div className={styles.coverLines}>
              <p className={styles.sub}>
                <span className={styles.dateline}>{content.hero.eyebrow}</span> {content.hero.sub}
              </p>
              <div className={styles.ctas}>
                <Link className={styles.button} href={content.hero.primaryCta.href}>
                  {content.hero.primaryCta.label}
                </Link>
                <Link className={styles.textLink} href={content.hero.secondaryCta.href}>
                  {content.hero.secondaryCta.label}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="positioning" className={styles.spread} aria-labelledby="ed-statement">
          <div className={`${styles.wrap} ${styles.spreadGrid}`}>
            <p className={styles.folio}>{content.positioning.eyebrow}</p>
            <h2 id="ed-statement" className={styles.statement}>
              {sentences(content.positioning.statement).map((sentence, i, all) => (
                <Fragment key={i}>
                  <span className={styles.sentence}>{sentence}</span>
                  {i < all.length - 1 ? " " : null}
                </Fragment>
              ))}
            </h2>
            <p className={styles.body}>{content.positioning.body}</p>
            <ul className={styles.attributes}>
              {content.positioning.attributes.map((attribute) => (
                <li key={attribute}>{attribute}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.journeys} aria-labelledby="ed-journeys">
          <div className={styles.wrap}>
            <div className={styles.jHead}>
              <p className={styles.jLabel}>{content.journeys.eyebrow}</p>
              <h2 id="ed-journeys" className={styles.jHeading}>
                {content.journeys.heading}
              </h2>
            </div>

            <ul className={styles.entries}>
              {ordered.map(({ item, kind, shape, ratio }, i) => (
                <li key={item.href} data-kind={kind} data-shape={shape}>
                  <Link href={item.href} className={styles.entry}>
                    <div className={styles.entryPlate} style={{ aspectRatio: ratio }}>
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes={plateSizes(i, kind, shape)}
                        quality={75}
                        placeholder={item.blurDataURL ? "blur" : "empty"}
                        blurDataURL={item.blurDataURL}
                        className={styles.entryImg}
                      />
                    </div>
                    <div className={styles.entryText}>
                      <span className={styles.entryCategory}>{item.category}</span>
                      <h3 className={styles.entryTitle}>{item.title}</h3>
                      {item.subtitle && <p className={styles.entrySub}>{item.subtitle}</p>}
                      <ul className={styles.facts}>
                        {item.facts.map((fact) => (
                          <li key={fact}>{fact}</li>
                        ))}
                      </ul>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </article>

      <footer className={styles.colophon}>
        <div className={`${styles.wrap} ${styles.colophonRow}`}>
          <span className={styles.colophonBrand}>{content.brand}</span>
          <address className={styles.address}>{content.address}</address>
          {credit && <p className={`${styles.credit} ${styles.creditColophon}`}>{credit.credit}</p>}
        </div>
      </footer>
    </>
  );
}
