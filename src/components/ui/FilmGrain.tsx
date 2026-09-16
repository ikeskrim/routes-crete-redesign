/**
 * The site-wide film grain: one fixed layer, `pointer-events: none`, over the
 * whole viewport.
 *
 * OFF IN C+. The `film-grain` utility reads `display: var(--ed-film-grain-display)`,
 * which the edition sets to `none` (C+ SPEC §F.1): the texture is printed into
 * the paper and bone sections instead (`paper-stock`, `bone-stock`), so no
 * full-viewport overlay blend layer composites over the page, the overlay
 * menu or the lightbox. The element stays so an edition can switch it back on
 * with one token.
 *
 * Server-rendered with no JavaScript at all: a static element with a CSS
 * background costs one paint and nothing else — no hydration, no canvas, no
 * rAF loop, nothing on the main thread against the 250 ms TBT ceiling. The
 * noise is one inline `feTurbulence` SVG as a data URI, so no network request.
 *
 * WHY NOT THE `grain` UTILITY: `@utility grain` is `position: relative` and
 * Tailwind emits it into the same layer as `.fixed`, at equal specificity,
 * AFTER it — so `grain fixed` silently resolves to `position: relative`. That
 * shipped once: the "fullscreen" overlay menu became an in-flow block that
 * left 243 px of page visible below it at 390x844. `qa/preflight.mts` now
 * fails the build on the pairing, and `film-grain` is its own utility with its
 * own `position: fixed` so this layer can never rediscover that bug.
 *
 * Stacking, when switched on: z-index 60 puts it ABOVE the fixed masthead
 * (z-50) and the overlay menu (z-40), and below only the skip link (z-100).
 * It is last in <body>, so at that z-index it lies over everything a visitor
 * sees, photographs included.
 */
export function FilmGrain() {
  return <div aria-hidden className="film-grain" />;
}
