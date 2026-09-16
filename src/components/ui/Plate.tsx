import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";

import { getBlur, getImageSize } from "@/lib/content";
import { photoCredit } from "@/lib/photo-credit";
import { cn } from "@/lib/utils";

import { Caption } from "./Caption";
import styles from "./Plate.module.css";
import { Unclip } from "./Unclip";

type Bleed = "left" | "right" | "both";

const BLEED_CLASS: Record<Bleed, string> = {
  left: styles.bleedLeft,
  right: styles.bleedRight,
  both: styles.bleedBoth,
};

export type PlateProps = {
  /** A served image path (graded, or a duotone from `duotonePath()`). */
  src: string;
  /** The ledger subject for a ledgered mood plate, `""` for operator decoration. */
  alt: string;
  /** `"4 / 5"`, `"3 / 2"`… Omit when `frameClassName` sets the ratio by width. */
  ratio?: string;
  sizes: string;
  /**
   * The edge the plate runs off (its ≥1024 placement is the composition's).
   * The keyline is left off that edge and the unclip opens from it.
   */
  bleed?: Bleed;
  /** The LCP plate only. Never unclipped; `loading` is then left unset. */
  preload?: boolean;
  fetchPriority?: "high" | "low" | "auto";
  loading?: "lazy" | "eager";
  /** The 1px inset keyline where a pale edge meets paper (§F.1). */
  keyline?: boolean;
  /** A `<Caption>` (the plate then renders as a `<figure>`). */
  caption?: ReactNode;
  /** 68 by default; 75 only where a slot declares it (C8). */
  quality?: 68 | 75;
  /** Uncover the plate on its first intersection (§G.1 #5), from its bleed edge. */
  unclip?: boolean;
  /**
   * The cover plate (§D.4): its frame carries the print layer and keyline
   * (`--ed-plate-print`), its photograph takes no grade filter and sits in
   * the `ken-burns-cover` push. Always drawn with a keyline, never unclipped.
   */
  cover?: boolean;
  /** `object-position`, when one crop serves every width. */
  objectPosition?: string;
  /** Overrides the blur placeholder read from content/blur-map.json. */
  blurDataURL?: string;
  /** On the outer element (figure or div): its grid placement. */
  className?: string;
  /**
   * On the frame. Plate.module.css positions the frame (`relative`), and an
   * unlayered module rule outranks a Tailwind utility, so the frame is placed
   * and sized by a composition's module class, not by position utilities.
   */
  frameClassName?: string;
  /** On the image, for crops that change by width (`object-position`). */
  imgClassName?: string;
};

/**
 * A photographic plate (C+ SPEC §E, §F.1, contract C6). Server component.
 *
 * An aspect-ratio frame holding one photograph with nothing laid over it
 * (D2): no filter, blend or overlay beyond the two edition tokens that are
 * `none` in C+ (Plate.module.css). Bone shows while the image loads.
 *
 * A named or captioned plate is a `<figure>`; an uncaptioned operator
 * photograph with `alt=""` is decoration beside its text and renders a plain
 * `<div>`, not an empty, unnamed figure.
 */
export function Plate({
  src,
  alt,
  ratio,
  sizes,
  bleed,
  preload = false,
  fetchPriority,
  loading,
  keyline = false,
  caption,
  quality = 68,
  unclip = false,
  cover = false,
  objectPosition,
  blurDataURL,
  className,
  frameClassName,
  imgClassName,
}: PlateProps) {
  const blur = blurDataURL ?? getBlur(src);
  const Wrapper = alt || caption ? "figure" : "div";

  const frameClass = cn(
    styles.frame,
    ratio && styles.ratio,
    bleed && BLEED_CLASS[bleed],
    keyline && !cover && styles.keyline,
    cover && styles.cover,
    frameClassName,
  );
  const frameStyle = ratio ? ({ "--plate-ratio": ratio } as CSSProperties) : undefined;

  const image = (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      quality={quality}
      preload={preload || undefined}
      fetchPriority={fetchPriority}
      loading={preload ? undefined : (loading ?? "lazy")}
      placeholder={blur ? "blur" : "empty"}
      blurDataURL={blur}
      className={cn(cover ? styles.imgCover : styles.img, imgClassName)}
      style={objectPosition ? { objectPosition } : undefined}
    />
  );

  let frame: ReactNode;
  if (cover) {
    frame = (
      <div className={frameClass} style={frameStyle}>
        <div className={cn("ken-burns-cover", styles.kenBurns)}>{image}</div>
      </div>
    );
  } else if (unclip && !preload) {
    frame = (
      <Unclip layer={false} from={bleed === "right" ? "right" : "left"} className={frameClass} style={frameStyle}>
        {image}
      </Unclip>
    );
  } else {
    frame = (
      <div className={frameClass} style={frameStyle}>
        {image}
      </div>
    );
  }

  return (
    <Wrapper className={className}>
      {frame}
      {caption}
    </Wrapper>
  );
}

/**
 * A full-bleed photographic band between blocks: a `div[data-band]`, never a
 * `<section>` (arc-guard counts exactly five movements on `/`).
 *
 * - `kind="bridge"`, the golden band (§D.4): paper stock without vignette,
 *   the plate bleeding left at ≥1024 (2:1), 16:9 at 640–1023 and 1:1 below,
 *   crops that keep the road's car out of frame, a keyline where the pale
 *   cloud meets paper, and the ledger caption hung at the plate foot. `alt`
 *   defaults to the ledger subject.
 * - `kind="place"`, one itinerary place break (§D.6 item 5): the plate
 *   bleeding right (3:2, or 4:5 for a portrait source, read from the file),
 *   the caption (`place` + the ledger credit) sticky beside it at ≥1024 and
 *   under it below. `alt` defaults to `place`. No texture of its own (the
 *   page section carries the stock), no keyline (dark edges); the rhythm
 *   between breaks is the composition's (`className`).
 *
 * `src` is the served path; the ledger file is its basename (`file`
 * overrides it). A plate without a ledger record renders no caption, or
 * `fallbackCredit` for a place break.
 */
export function PlateBand({
  kind = "bridge",
  src,
  file,
  alt,
  place,
  sizes,
  portrait,
  fallbackCredit,
  unclip = true,
  className,
}: {
  kind?: "bridge" | "place";
  src: string;
  file?: string;
  alt?: string;
  place?: string;
  sizes?: string;
  /** Place breaks: the source's orientation, read from the JPEG when omitted. */
  portrait?: boolean;
  fallbackCredit?: string;
  unclip?: boolean;
  className?: string;
}) {
  const ledgerFile = file ?? src;

  if (kind === "place") {
    const size = portrait === undefined ? getImageSize(src) : null;
    const tall = portrait ?? (size ? size.height > size.width : false);
    const name = alt ?? place ?? "";
    return (
      <div data-band="place" className={cn("ed-grid", styles.place, className)}>
        <Plate
          src={src}
          alt={name}
          sizes={sizes ?? "(min-width: 1024px) 64vw, 100vw"}
          bleed="right"
          unclip={unclip}
          className={styles.placeFigure}
          frameClassName={cn(styles.placeFrame, tall && styles.placePortrait)}
          objectPosition={tall ? "50% 40%" : undefined}
          caption={
            <Caption
              file={ledgerFile}
              place={place}
              placement="sticky"
              imageAlt={name}
              fallback={fallbackCredit}
              className={styles.placeCaption}
            />
          }
        />
      </div>
    );
  }

  const name = alt ?? photoCredit(ledgerFile)?.caption ?? "";
  return (
    <div data-band="bridge" className={cn("ed-grid paper-stock", styles.band, className)}>
      <div aria-hidden="true" className="paper-stock-layer no-vignette" />
      <Plate
        src={src}
        alt={name}
        sizes={sizes ?? "(min-width: 1024px) 65vw, 100vw"}
        bleed="left"
        keyline
        unclip={unclip}
        className={styles.bandFigure}
        frameClassName={styles.bandFrame}
        imgClassName={styles.bandImg}
        caption={
          <Caption
            file={ledgerFile}
            placement="under"
            imageAlt={name}
            className={styles.bandCaption}
          />
        }
      />
    </div>
  );
}
