import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import { photoCredit } from "../c/credit";

import styles from "./c-plus.module.css";
import { DraftUnclip } from "./reveal";

/**
 * Draft-local equivalents of the G2 editorial primitives (C+ spec §0.1,
 * §C.5, §C.6, §C.9, §E): <Eyebrow>, <Caption>, <Plate>. Server components.
 */

export const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(" ");

/**
 * Letter-spaced capitals (never "small caps": no served font has smcp/c2sc
 * and faux small caps are forbidden). With `folio`, the folio row:
 * [Roman numeral] [3.5rem hairline] [department name], baseline-aligned.
 */
export function DraftEyebrow({
  children,
  folio,
  tone = "light",
  as: Tag = "p",
  className,
}: {
  children: ReactNode;
  folio?: "I" | "II" | "III" | "IV";
  tone?: "light" | "night";
  as?: "p" | "span" | "h3";
  className?: string;
}) {
  const label = cx(styles.eyebrow, tone === "night" && styles.eyebrowNight);
  if (!folio) return <Tag className={cx(label, className)}>{children}</Tag>;
  return (
    <div className={cx(styles.folioRow, tone === "night" && styles.folioRowNight, className)}>
      <span aria-hidden="true" className={cx(styles.tFolio, styles.folioNumeral)}>
        {folio}
      </span>
      <span aria-hidden="true" className={styles.folioRule} />
      <Tag className={label}>{children}</Tag>
    </div>
  );
}

/**
 * A caption set as a photo credit: tier 1 the place (ledger subject, or a
 * content place string), tier 2 the credit. No ledger record, no figcaption.
 *
 * `imageAlt` is the alt of the plate this caption names. Where tier 1 repeats
 * it word for word (the ledgered mood plates: §E.1 "alt = caption"), tier 1 is
 * aria-hidden, so a screen reader hears the place once, as the image's name,
 * and the figure is named by the credit. The text stays in the DOM and on the
 * page (credits-guard C15 and copy-subset read textContent).
 */
export function DraftCaption({
  file,
  place,
  imageAlt,
  tone = "light",
  className,
}: {
  file: string;
  place?: string;
  imageAlt?: string;
  tone?: "light" | "night";
  className?: string;
}) {
  const credit = photoCredit(file);
  if (!credit) return null;
  const tier1 = place ?? credit.caption;
  return (
    <figcaption className={cx(styles.caption, tone === "night" && styles.captionNight, className)}>
      <span
        className={cx(styles.tCaptionPlace, styles.captionPlace)}
        data-caption-tier="1"
        aria-hidden={tier1 && imageAlt === tier1 ? "true" : undefined}
      >
        {tier1}
      </span>
      <span className={cx(styles.tCaption, styles.captionCredit)} data-caption-tier="2">
        {credit.credit}
      </span>
    </figcaption>
  );
}

type PlateImage = { src: string; width: number; height: number; blurDataURL?: string };

/**
 * A photographic plate: an aspect-ratio frame (no filter, blend or overlay on
 * the photograph — D2), an optional 1px inset keyline where a pale edge meets
 * paper, an optional unclip, and an optional caption.
 */
export function DraftPlate({
  image,
  alt = "",
  sizes,
  ratio,
  keyline,
  unclip,
  from,
  className,
  frameClassName,
  imgClassName,
  caption,
}: {
  image: PlateImage;
  alt?: string;
  sizes: string;
  /** "4 / 5" etc. Omit when a class sets the ratio per breakpoint. */
  ratio?: string;
  keyline?: boolean;
  unclip?: boolean;
  /** The bleed edge the unclip opens from (≥1024 placement). */
  from?: "left" | "right";
  className?: string;
  frameClassName?: string;
  imgClassName?: string;
  caption?: ReactNode;
}) {
  /* An uncaptioned operator photograph with alt="" is decoration beside its
     text: a plain box, not an empty, unnamed figure role. <figure> only when
     the plate is named or captioned (the ledgered plates). */
  const Wrapper = alt || caption ? "figure" : "div";
  const frameClass = cx(styles.plateFrame, keyline && styles.keyline, frameClassName);
  const frameStyle = ratio ? ({ "--cp-ratio": ratio } as CSSProperties) : undefined;
  const img = (
    <Image
      src={image.src}
      alt={alt}
      fill
      loading="lazy"
      quality={68}
      sizes={sizes}
      placeholder={image.blurDataURL ? "blur" : "empty"}
      blurDataURL={image.blurDataURL}
      className={cx(styles.plateImg, imgClassName)}
    />
  );

  return (
    <Wrapper className={className}>
      {unclip ? (
        <DraftUnclip className={frameClass} style={frameStyle} from={from}>
          {img}
        </DraftUnclip>
      ) : (
        <div className={frameClass} style={frameStyle}>
          {img}
        </div>
      )}
      {caption}
    </Wrapper>
  );
}
