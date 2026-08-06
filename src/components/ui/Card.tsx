import Link from "next/link";
import type { ContentItem } from "@/lib/types";
import { cn, pad } from "@/lib/utils";
import { MediaFrame } from "./Media";

/**
 * The large editorial card used for experiences and transfers.
 *
 * Sized to look deliberate at two items and to tile cleanly at ten — the grid
 * that holds it decides the columns, the card only owns its own proportions.
 */
export function ContentCard({
  item,
  index,
  sizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 42vw",
  ratio = "aspect-[4/5]",
  priority = false,
  className,
}: {
  item: ContentItem;
  index?: number;
  sizes?: string;
  ratio?: string;
  priority?: boolean;
  className?: string;
}) {
  const facts = [item.facts.region, item.facts.duration ?? "Duration on request"]
    .filter(Boolean)
    .slice(0, 2);

  return (
    <Link
      href={item.href}
      className={cn(
        "group block focus-visible:outline-none",
        // The whole card is one link; the focus ring goes on the frame.
        "[&:focus-visible_.card-frame]:outline [&:focus-visible_.card-frame]:outline-2",
        "[&:focus-visible_.card-frame]:outline-offset-4 [&:focus-visible_.card-frame]:outline-gold-500",
        className,
      )}
    >
      <MediaFrame
        src={item.cardImage}
        alt={item.title}
        sizes={sizes}
        ratio={ratio}
        priority={priority}
        className="card-frame"
      >
        <div aria-hidden className="scrim-soft absolute inset-0" />

        {index !== undefined && (
          <span
            aria-hidden
            className="absolute top-6 left-6 font-display text-eyebrow tabular-nums text-sand-100/80"
          >
            {pad(index)}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <span className="text-eyebrow uppercase text-gold-300">
            {item.category}
          </span>
          <h3 className="text-display-md mt-3 text-sand-50">{item.title}</h3>

          {item.subtitle && (
            <p className="text-body-sm mt-2 max-w-[28rem] text-sand-200/80">
              {item.subtitle}
            </p>
          )}

          <div className="mt-6 flex items-center gap-3 overflow-hidden">
            <span
              aria-hidden
              className="h-px w-8 shrink-0 bg-sand-100/40 transition-all duration-700 ease-luxe group-hover:w-14 group-hover:bg-gold-400"
            />
            <span className="text-eyebrow uppercase text-sand-100/85">
              Discover
            </span>
          </div>
        </div>
      </MediaFrame>

      {facts.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1">
          {facts.map((fact, i) => (
            <span key={i} className="text-caption text-rock-500">
              {i > 0 && <span aria-hidden className="mr-4 text-rock-300">/</span>}
              {fact}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
