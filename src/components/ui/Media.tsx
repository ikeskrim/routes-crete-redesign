import Image from "next/image";
import { Unclip } from "./Unclip";
import { getBlur } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * next/image with our generated blur placeholder wired in automatically.
 *
 * Every image on the site goes through here so the blur-up, sizing and lazy
 * behaviour stay consistent. `priority` is reserved for the LCP image only.
 */
export function Media({
  src,
  alt,
  width,
  height,
  fill,
  sizes,
  priority = false,
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
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  quality?: number;
}) {
  const blurDataURL = getBlur(src);
  const placeholder = blurDataURL ? ("blur" as const) : undefined;

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
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
      priority={priority}
      quality={quality}
      placeholder={placeholder}
      blurDataURL={blurDataURL}
      className={cn(imgClassName, className)}
    />
  );
}

/**
 * A framed image that scales up gently on hover. The scale lives on the image
 * while the frame clips it, so nothing outside the frame is repainted.
 */
export function MediaFrame({
  src,
  alt,
  sizes,
  priority,
  className,
  ratio = "aspect-[4/5]",
  zoom = true,
  reveal = true,
  revealDelay = 0,
  children,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  ratio?: string;
  zoom?: boolean;
  /** The unclip reveal. Off for anything above the fold that must paint at once. */
  reveal?: boolean;
  revealDelay?: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-media bg-rock-200",
        ratio,
        className,
      )}
    >
      {(() => {
        const media = (
          <Media
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            imgClassName={cn(
              // Slow scale plus a grade shift: on hover the frame warms and
              // opens very slightly, as though the same photograph were graded
              // a stop brighter. Transform and filter only.
              //
              // Deepened in the beauty pass, but NOT by adding colour. Grade C
              // already carries the saturation; pushing saturate further on
              // top of it compounds into the garish HDR look the grade was
              // tuned to avoid. So the scale and the light go up and the
              // saturation comes DOWN — on hover the frame opens rather than
              // shouts.
              "transition-[transform,filter] duration-[1.2s] ease-luxe will-change-transform",
              zoom &&
                "group-hover:scale-[1.065] group-hover:brightness-[1.09] group-hover:saturate-[1.06] group-hover:contrast-[1.05]",
            )}
          />
        );
        /* An LCP candidate must never wait behind a reveal — that is the
           mistake this project already made once, when an opacity-gated
           subheading became the LCP element at 3420ms. `priority` marks the
           image the page is measured on, so it paints immediately. */
        return reveal && !priority ? (
          <Unclip delay={revealDelay}>{media}</Unclip>
        ) : (
          media
        );
      })()}
      {children}
    </div>
  );
}
