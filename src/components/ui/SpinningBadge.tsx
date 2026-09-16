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
  verifiedOn,
}: {
  /** The claim itself. */
  text?: string | null;
  /** The listing a reader can check it against. Required. */
  href?: string | null;
  /** The date somebody last confirmed the claim. Required. */
  verifiedOn?: string | null;
}) {
  /* R10, the client's ruling (2026-09-11): the badge renders only from verified
     data, with the link visible. All three fields or nothing — a claim with no
     link a reader can follow, or with no date anyone confirmed it, is exactly
     the unverifiable social proof this component exists to refuse. There is
     deliberately no unlinked fallback. */
  const label = text?.trim();
  const link = href?.trim();
  const verified = verifiedOn?.trim();
  if (!label || !link || !verified) return null;

  // The string is repeated twice around the circle so the ring reads as
  // continuous from any angle rather than having one obvious seam.
  const ring = `${label} · ${label} · `;

  const disc = (
    <span className="relative block size-28 xl:size-32">
      {/* The ring loops forever, so it stops while the pointer is on the
          badge or the badge has focus (WCAG 2.2.2), and never turns under
          reduced motion (globals.css). */}
      <span className="badge-spin absolute inset-0 block group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
        <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
          <defs>
            <path
              id="badge-ring"
              fill="none"
              d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
            />
          </defs>
          <text className="fill-on-night text-[7.4px] font-medium tracking-[0.16em] uppercase">
            <textPath href="#badge-ring" startOffset="0%">
              {ring}
            </textPath>
          </text>
        </svg>
      </span>

      {/* The still centre: a stone mark, decorative (gold is reserved for the
          gold pill, C+ SPEC §B.2). */}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="block size-2 rounded-pill bg-stone" />
      </span>
    </span>
  );

  /* Clearance (measured with a text-free stand-in of this disc at 1024-1920
     on /, an item page and /contact, .hunt/cplus/rollout/g1/badge-*.log): at
     the end of a page the disc rests over empty night; the back cover's legal
     line is packed to the left, and "Photography credits" ends far short of
     the disc. A link focused mid-page, though, is scrolled to the viewport's
     bottom edge, under the disc, so `data-spinning-badge` raises the page's
     bottom scroll padding while the badge renders (globals.css, as for the
     booking bar). Re-measure if the legal line ever runs to the right edge. */
  /* C+ edition: an opaque night disc (no backdrop blur, no shadow literal) in
     paper type. Its round shape is allowlisted by preflight P8 because it
     renders only verified social proof.
     The disc is fixed, so it passes over paper and night grounds alike: its
     focus ring is two-tone, a 2 px paper outline against the disc (14.71:1,
     and against any night ground) inside a 2 px sienna band from a 4 px ring
     (6.53:1 on paper). Neither colour alone is visible on both grounds. */
  const shell =
    "fixed bottom-8 right-8 z-50 hidden place-items-center rounded-pill bg-night lg:grid";
  const focusRing =
    "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus-night " +
    "focus-visible:ring-4 focus-visible:ring-focus";

  return (
    <Link
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} — verified ${verified}, opens the listing`}
      data-spinning-badge=""
      className={`group ${shell} ${focusRing} transition-transform duration-700 ease-luxe hover:scale-105`}
    >
      {disc}
    </Link>
  );
}
