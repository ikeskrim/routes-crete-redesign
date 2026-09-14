import fs from "node:fs";
import path from "node:path";
import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";

import { draftGradeD, draftHero, getDraftContent } from "../_lib/draft-content";
import { photoCredit } from "../c/credit";
import { ExternalIcon } from "../c/icons";

import styles from "./c-plus.module.css";
import { DraftLines } from "./lines";
import { DraftMasthead } from "./menu";
import { DraftCaption, DraftEyebrow, DraftPlate, cx } from "./parts";
import { DraftRise } from "./reveal";

/**
 * TEMPORARY — /design-3/c-plus, "Warm Editorial, printed": one issue of the
 * magazine, top to bottom, built to .hunt/cplus/spec/SPEC.md §0.1 and §D.4.
 *
 *   masthead (div) · cover · I positioning + why-us · marquee strap ·
 *   II journeys · III signature essay · golden band · IV how to book ·
 *   back cover (div)
 *
 * Every string comes from getDraftContent() (content, or a live code line it
 * names) or the photo ledger through ../c/credit. Roman folios and chapter
 * numerals are structural numbering, aria-hidden.
 */

const COVER_FILE = "libyan-sea-coast-dusk.jpg";
const BAND_FILE = "pexels-27015910.jpg";
const BACK_FILE = "south-coast-storm-cloud.jpg";

/** §C.13: the one italic word per headline (none in chrome). */
const COVER_EMPHASIS = "unknown";
const HOW_TO_BOOK_EMPHASIS = "conversation";

/** Sentences of a statement, so each can start its own line; the text is untouched. */
function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/);
}

/**
 * §D.4 phone cover split, ["Explore the", "unknown", "side of Crete"]: the
 * words before the emphasis word, the word alone, the words after. On desktop
 * the first two spans run on one line (CSS), giving ["Explore the unknown",
 * "side of Crete"]. If the content no longer has the word inside, one line.
 */
function coverLines(text: string, word: string): string[] | undefined {
  const words = text.split(" ");
  const at = words.indexOf(word);
  if (at < 1 || at > words.length - 2) return undefined;
  return [words.slice(0, at).join(" "), words[at], words.slice(at + 1).join(" ")];
}

/**
 * A step body as blocks: the content's blank lines separate paragraphs, and
 * consecutive paragraphs that start "• " form one list. Markup only — every
 * character is the content's own.
 */
type StepBlock = { kind: "p"; text: string } | { kind: "ul"; items: string[] };
function stepBlocks(body: string): StepBlock[] {
  const blocks: StepBlock[] = [];
  for (const para of body.split(/\n\s*\n/)) {
    const last = blocks[blocks.length - 1];
    if (para.startsWith("• ")) {
      if (last?.kind === "ul") last.items.push(para);
      else blocks.push({ kind: "ul", items: [para] });
    } else {
      blocks.push({ kind: "p", text: para });
    }
  }
  return blocks;
}

/** §0.1: the terracotta duotone when it exists at build, else the colour grade-D frame. */
function backCoverImage() {
  const duotone = "/images/graded/d/duotone/sourced/south-coast-storm-cloud.jpg";
  if (fs.existsSync(path.join(process.cwd(), "public", duotone))) return draftGradeD(duotone);
  return draftHero(BACK_FILE, "d", "sourced");
}

export default function WarmEditorialPrintedDraft() {
  const content = getDraftContent();
  const { hero, positioning, journeys, whyUs, marquee, signature, howToBook, backCover } = content;

  const cover = draftHero(COVER_FILE, "d", "sourced");
  const band = draftHero(BAND_FILE, "d", "stock-local");
  const back = backCoverImage();
  const coverCredit = photoCredit(COVER_FILE);
  const bandCredit = photoCredit(BAND_FILE);
  const backCredit = photoCredit(BACK_FILE);

  const year = String(new Date().getFullYear());
  const pageLinks = content.nav.filter((item) => !item.external);

  return (
    <>
      <DraftMasthead
        brand={content.brand}
        nav={content.nav}
        bookNow={hero.secondaryCta}
        address={content.address}
        strings={content.menu}
        previews={{
          ...content.menuPreviews,
          /* The transfer's only operator photograph is a studio cut-out of
             the van; the Transfers item shows a place frame the menu already
             carries (the Why Us frame) instead of a product shot. */
          transfers: content.menuPreviews.whyUs ?? content.menuPreviews.transfers,
        }}
      />

      {/* ------------------------------------------------------------ cover */}
      <section
        data-hero=""
        data-hero-tone="light"
        aria-labelledby="cp-cover"
        className={cx(styles.edGrid, styles.paperStock, styles.cover)}
      >
        <div aria-hidden="true" className={styles.paperStockLayer} />

        <p data-masthead-sentinel="" className={cx(styles.eyebrow, styles.coverHead)}>
          {hero.eyebrow}
        </p>

        <DraftLines
          as="h1"
          id="cp-cover"
          text={hero.heading}
          lines={coverLines(hero.heading, COVER_EMPHASIS)}
          emphasis={COVER_EMPHASIS}
          className={cx(styles.tCover, styles.coverH1)}
          lineClassName={[styles.coverL0, styles.coverL1, styles.coverL2]}
          onPhotoLine={2}
        />

        <figure className={styles.coverPlate}>
          <div className={cx(styles.plateFrame, styles.keyline, styles.coverFrame)}>
            <div className={cx(styles.kenBurnsCover, styles.coverKb)}>
              <Image
                src={cover.src}
                alt={coverCredit?.caption ?? ""}
                fill
                preload
                fetchPriority="high"
                quality={68}
                sizes="(min-width: 1024px) 67vw, 100vw"
                placeholder={cover.blurDataURL ? "blur" : "empty"}
                blurDataURL={cover.blurDataURL}
                className={cx(styles.plateImg, styles.coverImg)}
              />
            </div>
          </div>
          <DraftCaption file={COVER_FILE} imageAlt={coverCredit?.caption} className={styles.coverCaption} />
        </figure>

        <div className={styles.coverMargin}>
          <p className={cx(styles.tDeck, styles.coverDeck)}>{hero.sub}</p>
          <div className={styles.coverCtas}>
            <Link href={hero.primaryCta.href} className={styles.ctaGold}>
              {hero.primaryCta.label}
            </Link>
            <Link href={hero.secondaryCta.href} className={styles.ctaRule}>
              {hero.secondaryCta.label}
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------- I · positioning spread */}
      <section
        id="positioning"
        aria-labelledby="cp-positioning"
        className={cx(styles.edGrid, styles.paperStock, styles.positioning)}
      >
        <div aria-hidden="true" className={styles.paperStockLayer} />

        <DraftEyebrow folio="I" className={styles.posFolio}>
          {positioning.eyebrow}
        </DraftEyebrow>

        <DraftLines
          as="h2"
          id="cp-positioning"
          text={positioning.statement}
          lines={sentences(positioning.statement)}
          className={cx(styles.tStatement, styles.posStatement)}
          lineClassName={[undefined, styles.posIndent]}
        />

        <p className={cx(styles.tBodyLg, styles.edDropcap, styles.posBody)}>{positioning.body}</p>

        <ul className={styles.posAttrs}>
          {positioning.attributes.map((attribute) => (
            <li key={attribute} className={styles.tDeck}>
              {attribute}
            </li>
          ))}
        </ul>

        {/* why-us: pull quotes that hold still beside their photographs */}
        <section id="why-us" data-stacked="" className={cx(styles.boneStock, styles.whyUs)}>
          <div aria-hidden="true" className={styles.boneStockLayer} />
          {whyUs.map((row, i) => (
            <article key={row.title} className={cx(styles.edGrid, styles.whyRow)}>
              {row.image && (
                <DraftPlate
                  image={row.image}
                  sizes={i === 1 ? "(min-width: 1024px) 57vw, 100vw" : "(min-width: 1024px) 42vw, 100vw"}
                  ratio={i === 1 ? "3 / 2" : "4 / 5"}
                  unclip
                  from={i === 1 ? "right" : "left"}
                  className={styles.whyPlate}
                  /* row 1: crop the midday sky out, keep the grove */
                  imgClassName={i === 0 ? styles.pos5085 : undefined}
                />
              )}
              <div className={styles.whyText}>
                <span aria-hidden="true" className={styles.quoteRule} />
                <p className={cx(styles.tPullquote, styles.whyStatement)}>{row.statement}</p>
                <p className={cx(styles.tCaption, styles.whyCredit)}>{row.title}</p>
              </div>
            </article>
          ))}
        </section>
      </section>

      {/* ------------------------------------------------- marquee strap */}
      <div data-marquee="" className={styles.marquee}>
        <ul className={styles.marqueeList}>
          {marquee.map((item, i) => (
            <li key={item} className={styles.marqueeItem}>
              {i > 0 && <span aria-hidden="true" className={styles.marqueeDot} />}
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ------------------------------------------------- II · journeys */}
      <section id="experiences" aria-labelledby="cp-journeys" className={cx(styles.edGrid, styles.journeys)}>
        <DraftEyebrow folio="II" className={styles.jFolio}>
          {journeys.eyebrow}
        </DraftEyebrow>

        <DraftLines
          as="h2"
          id="cp-journeys"
          text={journeys.heading}
          className={cx(styles.tSection, styles.jHeading)}
        />

        {/* The Fitzroy index: pointing at a title shows its photograph (fine
            pointers ≥1024); every other case sets the plates inline. */}
        <ul data-journeys="" className={cx(styles.edGrid, styles.contents)}>
          {journeys.items.map((item, i) => {
            const image = draftGradeD(item.image);
            const transfer = item.href.startsWith("/transfers");
            /* The transfer's plate is a studio cut-out: a 3:2 bone mat. */
            const ratio = transfer
              ? "3 / 2"
              : image.width && image.height
                ? `${image.width} / ${image.height}`
                : "4 / 5";
            const ar = transfer ? 1.5 : image.width && image.height ? image.width / image.height : 0.8;
            return (
              <li key={item.href} className={styles.entry}>
                <figure aria-hidden="true" className={styles.jPlate}>
                  <div
                    className={cx(styles.jFrame, transfer && styles.jMat)}
                    style={{ "--cp-ratio": ratio, "--cp-ar": ar } as React.CSSProperties}
                  >
                    <div className={styles.jFill}>
                      <Image
                        src={image.src}
                        alt=""
                        fill
                        loading="lazy"
                        fetchPriority={i > 0 ? "low" : undefined}
                        quality={68}
                        sizes="(min-width: 1024px) 42vw, (min-width: 640px) 85vw, 100vw"
                        placeholder={image.blurDataURL ? "blur" : "empty"}
                        blurDataURL={image.blurDataURL}
                        className={styles.jImg}
                      />
                    </div>
                  </div>
                </figure>
                <Link
                  href={item.href}
                  id={transfer ? "transfers" : undefined}
                  className={styles.entryLink}
                >
                  {/* No category eyebrow: folio II already names the department
                      ("Experiences & Transfers"), and a label above every title
                      repeated "Experiences" twice in a row (§C.5). */}
                  <h3 className={cx(styles.tTitle, styles.entryTitle)}>
                    <span className={styles.entryTitleText}>{item.title}</span>
                  </h3>
                  {item.subtitle && <p className={cx(styles.tDeck, styles.entryDeck)}>{item.subtitle}</p>}
                  <p className={cx(styles.tCaption, styles.entryFacts)}>
                    {item.facts.map((fact, j) => (
                      <Fragment key={fact}>
                        {/* literal spaces outside the hidden slash keep the
                            facts apart in the link's accessible name */}
                        {j > 0 && (
                          <>
                            {" "}
                            <span aria-hidden="true">/</span>{" "}
                          </>
                        )}
                        {fact}
                      </Fragment>
                    ))}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ------------------------------------ III · the signature photo essay */}
      {signature && (
        <section
          id="signature"
          data-scene=""
          aria-labelledby="cp-signature"
          className={cx("grain", styles.night, styles.signature)}
        >
          <div aria-hidden="true" className={styles.nightDensity} />
          <div aria-hidden="true" className={cx("grain-overlay", styles.nightGrain)} />

          <div className={cx(styles.edGrid, styles.sigHead)}>
            <DraftEyebrow folio="III" tone="night" className={styles.sigFolio}>
              {signature.eyebrow}
            </DraftEyebrow>
            <h2 id="cp-signature" className={cx(styles.tSection, styles.sigTitle)}>
              {signature.title}
            </h2>
            <Link href={signature.href} className={cx(styles.ctaRule, styles.ctaRuleNight, styles.sigRead)}>
              {signature.readLabel}
            </Link>
          </div>

          {signature.scenes.map((scene, i) => {
            const portrait = scene.image.height > scene.image.width;
            /* Pacing (chapters keep the journey's own order): 1 a wide crop
               that keeps the midday sky out; 2 mirrored, plate bleeding left;
               3 as set; 4 one wide breath across the content width with its
               text under it; 5 the inset portrait. */
            const sky = !portrait && i === 0;
            const mirror = !portrait && i === 1;
            const wide = !portrait && i === 3;
            return (
              <article
                key={scene.label}
                className={cx(styles.edGrid, styles.chapter, mirror && styles.chapterMirror, wide && styles.chapterWide)}
              >
                <DraftPlate
                  image={scene.image}
                  sizes={
                    portrait
                      ? "(min-width: 1024px) 36vw, 100vw"
                      : wide
                        ? "(min-width: 1024px) 90vw, 100vw"
                        : "(min-width: 1024px) 64vw, 100vw"
                  }
                  ratio={portrait ? "4 / 5" : "3 / 2"}
                  unclip
                  from={portrait || mirror || wide ? "left" : "right"}
                  className={portrait ? styles.chapterPlatePortrait : styles.chapterPlate}
                  frameClassName={sky ? styles.chapterFrameSky : wide ? styles.chapterFrameWide : undefined}
                  imgClassName={portrait ? styles.pos5040 : sky ? styles.pos5080 : wide ? styles.pos5070 : undefined}
                />
                <div className={styles.chapterText}>
                  <div className={styles.chapterHead}>
                    <span aria-hidden="true" className={cx(styles.tFolio, styles.chapterNumeral)}>
                      {i + 1}
                    </span>
                    <p className={cx(styles.tCaptionPlace, styles.chapterLabel)}>{scene.label}</p>
                  </div>
                  <DraftLines as="p" text={scene.text} className={cx(styles.tDeck, styles.chapterBody)} />
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* ------------------------------------------------- the golden band */}
      <div data-band="bridge" className={cx(styles.edGrid, styles.paperStock, styles.band)}>
        <div aria-hidden="true" className={cx(styles.paperStockLayer, styles.noVignette)} />
        <DraftPlate
          image={band}
          alt={bandCredit?.caption ?? ""}
          sizes="(min-width: 1024px) 65vw, 100vw"
          keyline
          unclip
          from="left"
          className={styles.bandFigure}
          frameClassName={styles.bandFrame}
          imgClassName={styles.bandImg}
          caption={<DraftCaption file={BAND_FILE} className={styles.bandCaption} />}
        />
      </div>

      {/* ------------------------------------------------ IV · how to book */}
      <section
        id="how-to-book"
        aria-labelledby="cp-how"
        className={cx(styles.edGrid, styles.boneStock, styles.howToBook)}
      >
        <div aria-hidden="true" className={styles.boneStockLayer} />

        <DraftEyebrow folio="IV" className={styles.hFolio}>
          {howToBook.subheading}
        </DraftEyebrow>

        <DraftLines
          as="h2"
          id="cp-how"
          text={howToBook.heading}
          emphasis={HOW_TO_BOOK_EMPHASIS}
          className={cx(styles.tSection, styles.hHeading)}
        />

        <ol className={styles.steps}>
          {howToBook.steps.map((step) => (
            <DraftRise as="li" key={step.key} className={styles.step}>
              <span aria-hidden="true" className={cx(styles.tNumeralStep, styles.stepNumeral)}>
                {step.number}
              </span>
              <h3 className={cx(styles.tTitle, styles.stepTitle)}>{step.title}</h3>
              <div className={cx(styles.tBody, styles.stepBody)}>
                {stepBlocks(step.body).map((block, b) =>
                  block.kind === "p" ? (
                    <p key={b}>{block.text}</p>
                  ) : (
                    <ul key={b} className={styles.stepList}>
                      {block.items.map((item) => (
                        <li key={item}>
                          <span aria-hidden="true">•</span>
                          {item.slice(1)}
                        </li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            </DraftRise>
          ))}
        </ol>

        <div className={styles.promise}>
          <span aria-hidden="true" className={styles.quoteRule} />
          <p className={cx(styles.tPullquote, styles.promiseText)}>{howToBook.responsePromise}</p>
        </div>
      </section>

      {/* ------------------------------------------------------ back cover */}
      <div data-back-cover="" className={cx("grain", styles.night, styles.backCover)}>
        <div aria-hidden="true" className={styles.nightDensity} />
        <div aria-hidden="true" className={cx("grain-overlay", styles.nightGrain)} />

        <div data-footer-scene="" className={cx(styles.edGrid, styles.bcScene)}>
          <DraftPlate
            image={back}
            alt={backCredit?.caption ?? ""}
            sizes="(min-width: 1024px) min(28vw, 35rem), (min-width: 640px) 50vw, calc(100vw - 2.5rem)"
            ratio="4 / 5"
            unclip
            from="left"
            className={styles.bcPlate}
            imgClassName={styles.pos5840}
            caption={<DraftCaption file={BACK_FILE} tone="night" className={styles.bcCaption} />}
          />

          <DraftRise className={styles.bcClosing}>
            {backCover.address && (
              <p className={cx(styles.tCaption, styles.bcAddress)}>{backCover.address}</p>
            )}
            <p className={cx(styles.tStatement, styles.bcLine)}>{backCover.closing}</p>
            <div className={styles.bcCtas}>
              <Link href="/contact" className={styles.ctaGold}>
                {backCover.cta}
              </Link>
              {backCover.whatsapp && (
                <a
                  href={backCover.whatsapp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx(styles.ctaRule, styles.ctaRuleNight)}
                >
                  {backCover.whatsappLabel}
                </a>
              )}
            </div>
          </DraftRise>
        </div>

        <div data-back-wordmark="" className={cx(styles.edGrid, styles.bcWordmarkRow)}>
          <DraftRise className={styles.bcWordmarkWrap}>
            <h2 aria-label={content.brand} translate="no" className={cx(styles.tWordmarkBack, styles.bcWordmark)}>
              {content.brand}
            </h2>
          </DraftRise>
        </div>

        <div className={cx(styles.edGrid, styles.bcColumns)}>
          <div className={styles.bcColumn}>
            <h3 className={cx(styles.eyebrow, styles.eyebrowNight, styles.bcColHead)}>{backCover.columns[0]}</h3>
            {/* a navigation landmark (no <header>/<footer> in the draft) */}
            <nav aria-label={backCover.columns[0]}>
              <ul className={styles.bcList}>
                {pageLinks.map((item) => (
                  <li key={item.key}>
                    <Link href={item.href} className={cx(styles.tUi, styles.bcLink)}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className={styles.bcColumn}>
            <h3 className={cx(styles.eyebrow, styles.eyebrowNight, styles.bcColHead)}>{backCover.columns[1]}</h3>
            <ul className={styles.bcList}>
              {backCover.phones.map((phone) => (
                <li key={phone.key}>
                  <a href={phone.href} className={cx(styles.tUi, styles.bcLink)}>
                    <span className={styles.bcChannelLabel}>{phone.label}</span>
                    <span>{phone.display}</span>
                  </a>
                </li>
              ))}
              {backCover.whatsapp && (
                <li>
                  <a
                    href={backCover.whatsapp.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cx(styles.tUi, styles.bcLink)}
                  >
                    <span className={styles.bcChannelLabel}>{backCover.whatsappLabel}</span>
                    <span>{backCover.whatsapp.display}</span>
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div className={styles.bcColumn}>
            <h3 className={cx(styles.eyebrow, styles.eyebrowNight, styles.bcColHead)}>{backCover.columns[2]}</h3>
            <ul className={styles.bcList}>
              <li>
                <a
                  href={backCover.brochure.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx(styles.tUi, styles.bcLink)}
                >
                  {backCover.brochure.label}
                  <ExternalIcon className={styles.bcExt} />
                </a>
              </li>
              {backCover.social.map((link) => (
                <li key={link.key}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className={cx(styles.tUi, styles.bcLink)}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={cx(styles.edGrid, styles.bcLegalRow)}>
          <div className={cx(styles.tCaption, styles.bcLegal)}>
            <p>{backCover.copyright.replace("{year}", year)}</p>
            {backCover.address && <p>{backCover.address}</p>}
            <p>
              <span lang="el">{backCover.gemiLabel}</span>: {backCover.gemiNumber}
            </p>
            <Link href="/credits" className={styles.bcCredits}>
              {backCover.creditsLabel}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
