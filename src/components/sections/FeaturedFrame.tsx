import Link from "next/link";

import { ImageReveal } from "@/components/ui/Cinematic";
import { Reveal } from "@/components/ui/Reveal";
import { getBlur } from "@/lib/content";

/**
 * A single photograph given room to be looked at.
 *
 * Held to a ~1000px column on purpose: the frame this is built for is only
 * 1024px on its long edge, and stretching it full-bleed on a desktop display
 * would show every one of its limits. At this size it is pin sharp.
 */
export function FeaturedFrame({
  src,
  caption,
  credit,
  href,
  ratio = "aspect-[3/2]",
}: {
  src: string;
  caption: string;
  credit?: string;
  href?: string;
  ratio?: string;
}) {
  const frame = (
    <ImageReveal
      src={src}
      alt={caption}
      blurDataURL={getBlur(src)}
      // Never asks for more than the source actually holds.
      sizes="(max-width: 1024px) 100vw, 1000px"
      ratio={ratio}
      className="w-full"
    />
  );

  return (
    <figure className="mx-auto w-full max-w-[62.5rem]">
      {href ? (
        <Link href={href} className="group block">
          {frame}
        </Link>
      ) : (
        frame
      )}

      {/* figcaption must be the figure's direct child, and Reveal always
          renders a wrapper div — so the reveal goes inside the caption. */}
      <figcaption className="mt-6">
        <Reveal delay={0.1}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
            <p className="text-body-sm max-w-[52ch] text-rock-600">{caption}</p>
            {credit && (
              <p className="text-eyebrow uppercase text-rock-400">{credit}</p>
            )}
          </div>
        </Reveal>
      </figcaption>
    </figure>
  );
}
