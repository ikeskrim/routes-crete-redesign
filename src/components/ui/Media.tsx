import Image from "next/image";

import { getBlur } from "@/lib/content";
import { cn } from "@/lib/utils";

import { Unclip } from "./Unclip";

/**
 * next/image with our generated blur placeholder wired in automatically.
 *
 * `preload` is reserved for the LCP image only (next/image `preload`; the
 * `priority` prop is deprecated in Next 16, image.md:291-293). `priority` is
 * still accepted here as an alias until every call site is renamed.
 */
export function Media({
  src,
  alt,
  width,
  height,
  fill,
  sizes,
  preload,
  priority,
  className,
  imgClassName,
  quality,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes: string;
  preload?: boolean;
  /** @deprecated Use `preload` (C+ SPEC §0.4 C6). */
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  quality?: number;
}) {
  const blurDataURL = getBlur(src);
  const placeholder = blurDataURL ? ("blur" as const) : undefined;
  const eager = preload ?? priority ?? false;

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        preload={eager}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        className={cn("object-cover", imgClassName, className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      preload={eager}
      quality={quality}
      placeholder={placeholder}
      blurDataURL={blurDataURL}
      className={cn(imgClassName, className)}
    />
  );
}

/**
 * A framed image (C+ SPEC §E): square corners, bone while loading, nothing
 * laid over the photograph. The hover zoom and grade shift are retired
 * (§G.2: no filter on a photograph, no generic hover motion); `zoom` is
 * accepted and ignored until its call sites drop it.
 *
 * Below the fold the photograph is uncovered once (`Unclip`); the LCP image
 * (`preload`) never waits behind a reveal.
 */
export function MediaFrame({
  src,
  alt,
  sizes,
  preload,
  priority,
  className,
  ratio = "aspect-[4/5]",
  reveal = true,
  revealDelay = 0,
  quality,
  style,
  children,
}: {
  src: string;
  alt: string;
  sizes: string;
  preload?: boolean;
  /** @deprecated Use `preload` (C+ SPEC §0.4 C6). */
  priority?: boolean;
  className?: string;
  /** An aspect-ratio utility, e.g. `aspect-[3/2]` (or an `aspectRatio` in `style`). */
  ratio?: string;
  /** @deprecated Retired in C+ (§G.2); ignored. */
  zoom?: boolean;
  /** The unclip reveal. Off for anything above the fold that must paint at once. */
  reveal?: boolean;
  revealDelay?: number;
  quality?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const eager = preload ?? priority ?? false;
  const media = (
    <Media src={src} alt={alt} fill sizes={sizes} preload={eager} quality={quality} />
  );

  return (
    <div className={cn("relative overflow-hidden bg-bone", ratio, className)} style={style}>
      {/* An LCP candidate must never wait behind a reveal: an opacity-gated
          subheading once became the LCP element at 3420ms. */}
      {reveal && !eager ? <Unclip delay={revealDelay}>{media}</Unclip> : media}
      {children}
    </div>
  );
}
