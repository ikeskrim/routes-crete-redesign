import Image from "next/image";
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
  children,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  ratio?: string;
  zoom?: boolean;
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
      <Media
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        imgClassName={cn(
          "transition-transform duration-[1.2s] ease-luxe will-change-transform",
          zoom && "group-hover:scale-[1.045]",
        )}
      />
      {children}
    </div>
  );
}
