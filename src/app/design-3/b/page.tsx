import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";

import { draftHero, getDraftContent } from "../_lib/draft-content";

import styles from "./b.module.css";
import { CycladicMenu, ExternalIcon } from "./menu";

/**
 * TEMPORARY — /design-3/b, "Cycladic Light". Noon on a whitewashed terrace.
 *
 * The one bold thing is the arch: the photograph held in a tall doorway with
 * a semicircular head, repeated small on the journeys. Everything around it is
 * white ground, navy type and air, warming to limewash and sand further down
 * the page. The one motion is the doorway opening out of the glare on load.
 *
 * Every string rendered here comes from getDraftContent(); the only words
 * written in this file are the structural "Menu"/"Close", and the hero's
 * caption and credit, which are the photograph's own (see /credits).
 */

const HERO_CAPTION = "Preveli's palm forest running down to the Libyan Sea";
const HERO_CREDIT = "Photograph: Dimitris Kiriakakis / Unsplash (colour-graded)";

/* The hero photograph is a 3:2 landscape covering a 5:7 (desktop) or 3:4
   (phone) arch, so it is scaled to the arch's HEIGHT: the file needs about
   1.5 x the arch height in width, not the viewport width.
     desktop   arch <= 512 x 717  -> ~1075px
     tablet    arch <= 512 x 683  -> ~1025px
     landscape phone, arch beside the text -> well under 60vw
     phone     arch = 100vw-40 x 4/3 -> ~180vw */
const HERO_SIZES =
  "(min-width: 1024px) 1080px, (min-width: 640px) and (orientation: portrait) 1024px, (orientation: landscape) 60vw, 180vw";

/* Art direction for the arch crops, keyed by image path. The van is shot
   three-quarter front on a studio sweep with its grille at the far right, so a
   portrait crop has to sit hard right to keep the whole face and bumper. */
const CARD_FOCUS: Record<string, string> = {
  "/images/graded/c/transfers/private-transfers-rethymno/mercedes-v300.jpg": "93% 50%",
};

/**
 * Where a display heading may break. The words are split into `count`
 * contiguous groups with the most even character counts, and each group is
 * kept whole (white-space: nowrap); the browser still decides how many lines
 * it needs and `text-wrap: balance` evens them. The rendered text is the
 * content string exactly — the groups are joined by the same single spaces.
 */
function lineGroups(text: string, count: number): string[] {
  const words = text.split(" ");
  if (words.length <= count) return words;
  const len = (from: number, to: number) => words.slice(from, to).join(" ").length;
  const best = { cost: Infinity, cuts: [] as number[] };
  const search = (start: number, left: number, cuts: number[], cost: number) => {
    if (left === 1) {
      const total = Math.max(cost, len(start, words.length));
      if (total < best.cost) {
        best.cost = total;
        best.cuts = cuts;
      }
      return;
    }
    for (let end = start + 1; end <= words.length - (left - 1); end++) {
      search(end, left - 1, [...cuts, end], Math.max(cost, len(start, end)));
    }
  };
  search(0, count, [], 0);
  const cuts = [0, ...best.cuts, words.length];
  return cuts.slice(0, -1).map((from, i) => words.slice(from, cuts[i + 1]).join(" "));
}

/** Sentence by sentence, with the original separating space kept. */
function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/);
}

function Grouped({ parts, className }: { parts: string[]; className: string }) {
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span className={className}>{part}</span>
        </Fragment>
      ))}
    </>
  );
}

export default function CycladicLightDraft() {
  const content = getDraftContent();
  const hero = draftHero("unsplash-G9KqlQdOlwA.jpg", "c", "stock-local");
  const { nav } = content;

  return (
    <>
      <header className={styles.header}>
        <div className={`${styles.wrap} ${styles.headerRow}`}>
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
                      <ExternalIcon />
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

          <CycladicMenu nav={nav} cta={content.hero.secondaryCta} address={content.address} />
        </div>
      </header>

      {/* Not a <main>: the root layout already renders <main id="main">, the
          skip link's target. */}
      <div>
        <section className={styles.hero} aria-labelledby="cy-hero-heading">
          <div className={`${styles.wrap} ${styles.heroGrid}`}>
            <div className={styles.heroHead}>
              <p className={`${styles.eyebrow} ${styles.rise1}`}>{content.hero.eyebrow}</p>
              <h1 id="cy-hero-heading" className={`${styles.heading} ${styles.rise2}`}>
                <Grouped parts={lineGroups(content.hero.heading, 3)} className={styles.keep} />
              </h1>
            </div>

            <div className={styles.heroBody}>
              <p className={`${styles.sub} ${styles.rise3}`}>{content.hero.sub}</p>
              <div className={`${styles.ctas} ${styles.rise4}`}>
                <Link className={styles.pill} href={content.hero.primaryCta.href}>
                  {content.hero.primaryCta.label}
                </Link>
                <Link className={styles.pillGhost} href={content.hero.secondaryCta.href}>
                  {content.hero.secondaryCta.label}
                </Link>
              </div>
            </div>

            <figure className={styles.heroFigure}>
              <div className={styles.arch}>
                <Image
                  src={hero.src}
                  alt={HERO_CAPTION}
                  fill
                  preload
                  sizes={HERO_SIZES}
                  quality={75}
                  placeholder={hero.blurDataURL ? "blur" : "empty"}
                  blurDataURL={hero.blurDataURL}
                  className={styles.archImg}
                  style={{ objectPosition: "50% 55%" }}
                />
                <span aria-hidden className={styles.archVeil} />
              </div>
              <figcaption className={styles.caption}>
                <span className={styles.captionPlace}>{HERO_CAPTION}</span>
                <span>{HERO_CREDIT}</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="positioning" className={styles.positioning} aria-labelledby="cy-positioning">
          <div className={styles.wrap}>
            <p className={styles.sectionLabel}>{content.positioning.eyebrow}</p>
            <div className={styles.posGrid}>
              <h2 id="cy-positioning" className={styles.statement}>
                <Grouped parts={sentences(content.positioning.statement)} className={styles.sentence} />
              </h2>
              <p className={styles.posBody}>{content.positioning.body}</p>
            </div>
            <ul className={styles.attributes}>
              {content.positioning.attributes.map((attribute) => (
                <li key={attribute}>{attribute}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.journeys} aria-labelledby="cy-journeys">
          <div className={styles.wrap}>
            <div className={styles.journeysHead}>
              <p className={styles.journeysLabel}>{content.journeys.eyebrow}</p>
              <h2 id="cy-journeys" className={styles.journeysHeading}>
                <Grouped parts={lineGroups(content.journeys.heading, 2)} className={styles.keep} />
              </h2>
            </div>

            <ul className={styles.cards}>
              {content.journeys.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={styles.card}>
                    <div className={styles.cardArch}>
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
                        quality={75}
                        placeholder={item.blurDataURL ? "blur" : "empty"}
                        blurDataURL={item.blurDataURL}
                        className={styles.cardImg}
                        style={CARD_FOCUS[item.image] ? { objectPosition: CARD_FOCUS[item.image] } : undefined}
                      />
                    </div>
                    <span className={styles.cardCategory}>{item.category}</span>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    {item.subtitle && <p className={styles.cardSubtitle}>{item.subtitle}</p>}
                    <ul className={styles.facts}>
                      {item.facts.map((fact) => (
                        <li key={fact}>{fact}</li>
                      ))}
                    </ul>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <footer className={styles.colophon}>
        <div className={`${styles.wrap} ${styles.colophonRow}`}>
          <span className={styles.colophonBrand}>{content.brand}</span>
          {content.address && <address className={styles.address}>{content.address}</address>}
        </div>
      </footer>
    </>
  );
}
