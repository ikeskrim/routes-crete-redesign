import Image from "next/image";
import Link from "next/link";

import { draftHero, getDraftContent } from "../_lib/draft-content";

import styles from "./a.module.css";
import { AegeanBar } from "./bar";
import { AegeanMenu, ExternalIcon } from "./menu";

/**
 * TEMPORARY — /design-3/a, "Deep Aegean". A night crossing.
 *
 * The one bold thing is the hero: the night sky seen from inside a sea cave,
 * the Milky Way standing in the cave mouth over a misty sea. It is a processed
 * astrophotograph and is credited as one (see /credits). On a phone the
 * portrait frame fills a tall band, the headline set on the dark rock and
 * sea; on a wide screen it is full bleed, cropped to the cave mouth and the
 * horizon, and darkened only under the text column. The one motion is that
 * frame settling on load while the gold horizon draws under the bar.
 * Everything after it is quiet: a dark chapter with a midnight glow for the
 * statement, and the journeys on a deeper band, every photograph given one
 * night grade.
 *
 * Every string rendered here comes from getDraftContent(); the only words
 * written in this file are the structural "Menu"/"Close"/"opens in a new tab",
 * and the hero's caption and credit, which are the photograph's own (see
 * /credits and content/photo-credits.json).
 */

const HERO_CAPTION = "The Cretan coast at night";
const HERO_CREDIT = "Photograph: Evgeni Tcherkasski / Unsplash (colour-graded)";

export default function DeepAegeanDraft() {
  const content = getDraftContent();
  const hero = draftHero("unsplash-3atB9u9SG_o.jpg", "a", "stock-local");
  const { nav, positioning, journeys } = content;

  return (
    <>
      {/* One grade for every journey photograph. Neutral near-white (a vehicle
          shot on a studio sweep) is keyed out so the night shows through —
          only where all three channels are above 0.95 is a pixel keyed: each
          channel makes its own mask, 20·(0.95 − c), and the masks are merged,
          so blue sky (low red) and warm stone (low blue) always stay solid.
          Then colour is quietened and the blacks lift toward the palette's
          deep blue. */}
      <svg aria-hidden focusable="false" width="0" height="0" className={styles.defs}>
        <filter id="dae-night" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -20 0 0 0 19" result="keyR" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 -20 0 0 19" result="keyG" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 -20 0 19" result="keyB" />
          <feMerge result="key">
            <feMergeNode in="keyR" />
            <feMergeNode in="keyG" />
            <feMergeNode in="keyB" />
          </feMerge>
          <feComposite in="SourceGraphic" in2="key" operator="in" result="keyed" />
          <feColorMatrix in="keyed" type="saturate" values="0.55" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="0.94" intercept="0.025" />
            <feFuncG type="linear" slope="0.93" intercept="0.055" />
            <feFuncB type="linear" slope="0.9" intercept="0.09" />
          </feComponentTransfer>
        </filter>
      </svg>

      <AegeanBar>
        <div className={`${styles.wrap} ${styles.barRow}`}>
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

          <AegeanMenu
            brand={content.brand}
            nav={nav}
            journeysLabel={journeys.eyebrow}
            journeys={journeys.items.map(({ href, title, category }) => ({ href, title, category }))}
            address={content.address}
          />
        </div>
        <div className={styles.wrap}>
          <span aria-hidden className={styles.hairline} />
        </div>
      </AegeanBar>

      <section className={styles.hero} aria-labelledby="dae-hero-heading">
        <div className={styles.heroMedia}>
          <Image
            src={hero.src}
            alt={HERO_CAPTION}
            fill
            preload
            sizes={hero.sizes}
            quality={75}
            placeholder={hero.blurDataURL ? "blur" : "empty"}
            blurDataURL={hero.blurDataURL}
            className={styles.heroImg}
          />
          <span aria-hidden className={styles.scrim} />
        </div>

        <div className={styles.heroCopy}>
          <div className={`${styles.wrap} ${styles.heroHead}`}>
            <p className={`${styles.eyebrow} ${styles.rise}`} style={{ "--dae-delay": "500ms" } as React.CSSProperties}>
              {content.hero.eyebrow}
            </p>
            <h1
              id="dae-hero-heading"
              className={`${styles.heading} ${styles.rise}`}
              style={{ "--dae-delay": "650ms" } as React.CSSProperties}
            >
              {content.hero.heading}
            </h1>
          </div>
          <div className={`${styles.wrap} ${styles.heroRest}`}>
            <p className={`${styles.sub} ${styles.rise}`} style={{ "--dae-delay": "900ms" } as React.CSSProperties}>
              {content.hero.sub}
            </p>
            <div className={`${styles.ctas} ${styles.rise}`} style={{ "--dae-delay": "1050ms" } as React.CSSProperties}>
              <Link className={styles.ctaPrimary} href={content.hero.primaryCta.href}>
                {content.hero.primaryCta.label}
              </Link>
              <Link className={styles.ctaSecondary} href={content.hero.secondaryCta.href}>
                {content.hero.secondaryCta.label}
              </Link>
            </div>
          </div>
        </div>

        <p className={`${styles.wrap} ${styles.caption}`}>
          {/* The image's alt already says this; the credit is what is new. */}
          <span aria-hidden>{HERO_CAPTION}</span>
          <span>{HERO_CREDIT}</span>
        </p>
      </section>

      <section className={styles.chapter} aria-labelledby="dae-statement">
        <div className={`${styles.wrap} ${styles.grid}`}>
          <p className={styles.label}>{positioning.eyebrow}</p>
          <div>
            <h2 id="dae-statement" className={styles.statement}>
              {/* Split only for layout: the rejoined text is the string, unchanged. */}
              {positioning.statement.split(/(?<=\.)\s+/).map((sentence, i, all) => (
                <span key={sentence} className={styles.sentence}>
                  {sentence}
                  {i < all.length - 1 ? " " : null}
                </span>
              ))}
            </h2>
            <div className={styles.chapterDetail}>
              <p className={styles.chapterBody}>{positioning.body}</p>
              <ul className={styles.attributes}>
                {positioning.attributes.map((attribute) => (
                  <li key={attribute}>{attribute}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.journeys} aria-labelledby="dae-journeys">
        <div className={styles.wrap}>
          <div className={styles.grid}>
            <p className={styles.label}>{journeys.eyebrow}</p>
            <h2 id="dae-journeys" className={styles.journeysHeading}>
              {journeys.heading}
            </h2>
          </div>

          <ul className={styles.cards}>
            {journeys.items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.card}>
                  <div className={styles.cardMedia}>
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      /* A 4:3 box: a 3:2 landscape frame is height-limited in
                         it, so it needs ~1.125 × the box width. */
                      sizes="(min-width: 1536px) 494px, (min-width: 1024px) 32vw, (min-width: 640px) 52vw, 100vw"
                      quality={75}
                      placeholder={item.blurDataURL ? "blur" : "empty"}
                      blurDataURL={item.blurDataURL}
                      className={styles.cardImg}
                    />
                  </div>
                  <div className={styles.cardHead}>
                    <p className={styles.category}>{item.category}</p>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    {item.subtitle && <p className={styles.subtitle}>{item.subtitle}</p>}
                  </div>
                  <div className={styles.cardFoot}>
                    <span aria-hidden className={styles.cardRule} />
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
    </>
  );
}
