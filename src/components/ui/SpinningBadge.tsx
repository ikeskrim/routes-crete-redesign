import Link from "next/link";

/**
 * Circular rotating text, fixed to the corner of the viewport.
 *
 * WHY THIS RENDERS NOTHING BY DEFAULT.
 *
 * It was specified as "★ 5-STAR RATED ON TRIPADVISOR ★". No Tripadvisor
 * rating exists anywhere in this project: `site.json` states in its own note
 * that "No count, rating, award or price appears here", and the organisation
 * JSON-LD in the root layout deliberately omits `aggregateRating` for the same
 * reason. Writing that sentence would therefore be inventing a review claim
 * about a real business on its live site — the one thing this project has
 * refused throughout, and in the EU a fabricated review claim is a legal
 * exposure for the operator under the Unfair Commercial Practices Directive,
 * not a matter of taste.
 *
 * So the component is built exactly as asked and the words are left to the
 * client, in the same shape `responsePromise` used: the slot exists, it
 * renders nothing while it is empty, and one line of JSON ships it the moment
 * there is a real, checkable rating to put in it. `verifiedOn` is there so the
 * claim carries the date somebody last confirmed it.
 *
 * Mechanically: an SVG `textPath` around a circle, rotated by one CSS
 * animation on a transform. No JavaScript, no rAF loop, no layout — it costs a
 * composited rotation and nothing on the main thread, which matters against a
 * 250 ms TBT ceiling. Desktop only: at 390 the corner belongs to the sticky
 * booking bar, and a spinning disc over a Book button is a worse trade than no
 * disc. Under prefers-reduced-motion it stops turning and stays legible.
 */
export function SpinningBadge({
  text,
  href,
}: {
  /** The claim itself. Absent or empty renders nothing at all. */
  text?: string | null;
  href?: string | null;
}) {
  const label = text?.trim();
  if (!label) return null;

  // The string is repeated twice around the circle so the ring reads as
  // continuous from any angle rather than having one obvious seam.
  const ring = `${label} · ${label} · `;

  const disc = (
    <span className="relative block size-28 xl:size-32">
      <span className="badge-spin absolute inset-0 block">
        <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
          <defs>
            <path
              id="badge-ring"
              fill="none"
              d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
            />
          </defs>
          <text className="fill-sand-50 text-[7.4px] font-medium tracking-[0.16em] uppercase">
            <textPath href="#badge-ring" startOffset="0%">
              {ring}
            </textPath>
          </text>
        </svg>
      </span>

      {/* The still centre. */}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="block size-2 rounded-pill bg-gold-400" />
      </span>
    </span>
  );

  const shell =
    "fixed bottom-8 right-8 z-50 hidden place-items-center rounded-pill " +
    "bg-ocean-950/85 backdrop-blur-sm shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] " +
    "lg:grid";

  if (href) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className={`${shell} transition-transform duration-700 ease-luxe hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-400`}
      >
        {disc}
      </Link>
    );
  }

  return (
    <span role="img" aria-label={label} className={shell}>
      {disc}
    </span>
  );
}
