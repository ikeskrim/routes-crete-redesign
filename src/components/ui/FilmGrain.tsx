/**
 * The film grain that sits over the whole site.
 *
 * A single fixed layer, `pointer-events: none`, above the page and below the
 * overlay menu. Server-rendered with no JavaScript at all: it is a static
 * element with a CSS background, so it costs one paint and nothing else — no
 * hydration, no canvas, no rAF loop, and nothing on the main thread. That
 * matters here because the TBT ceiling is 250 ms and a grain layer is exactly
 * the sort of ambient flourish that gets implemented as an animation loop and
 * quietly eats the budget.
 *
 * The noise is one inline `feTurbulence` SVG as a data URI — no network
 * request, and the same fractal-noise source the sectional `grain` uses, so
 * the two read as one system rather than two different films.
 *
 * WHY NOT THE `grain` UTILITY: `@utility grain` is `position: relative` and
 * Tailwind emits it into the same layer as `.fixed`, at equal specificity,
 * AFTER it — so `grain fixed` silently resolves to `position: relative`. That
 * shipped once: the "fullscreen" overlay menu became an in-flow block that
 * left 243 px of page visible below it at 390x844. `qa/preflight.mts` now
 * fails the build on the pairing, and `film-grain` is its own utility with its
 * own `position: fixed` so this layer can never rediscover that bug.
 *
 * The z-index sits at 60: above the page, below the overlay menu at z-40's
 * stacking context and below the skip link at z-100. Grain over the menu would
 * be grain over a photograph over a scrim, which is one layer too many.
 */
export function FilmGrain() {
  return <div aria-hidden className="film-grain" />;
}
