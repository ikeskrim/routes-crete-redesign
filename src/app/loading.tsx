/**
 * Route-level loading state (C+ SPEC §D.6 "loading.tsx", §G.1 row 17).
 *
 * Plain paper (no texture layer, §F.1). At the foot, on the editorial grid's
 * first column line: the wordmark, and under it a quiet 1 px × 24rem hairline
 * track along which a one-third burnt-sienna bar sweeps (transform only,
 * 1.6 s). No spinner, nothing that jumps.
 *
 * Two boxes:
 * - The outer one stays in the flow, the full viewport tall, so the page
 *   below (the footer) keeps its place and the incoming page does not shift
 *   when it swaps in. On an unknown slug the server streams this fallback
 *   first, so that geometry is also what the first paint lays out.
 * - The paper sheet is fixed to the viewport. A client navigation keeps the
 *   old scroll position until the new page lands, so a sheet in the flow
 *   would sit above the viewport, off screen. Fixed, it covers the viewport
 *   at any scroll position. At z-40 it sits under the masthead (z-50), which
 *   stays usable. Without scripting, the streamed page never swaps in, so the
 *   sheet stays in the flow as before (`noscript:static`) and the footer
 *   stays reachable.
 *
 * Only "Loading…" is the live region; the wordmark is not announced with it.
 *
 * Reduced motion is a designed still, not a missing animation: the bar
 * holds over the left third of its track (globals.css, `loading-sweep`).
 */
export default function Loading() {
  return (
    <div data-loading-boundary className="min-h-[100svh]">
      <div className="fixed inset-0 z-40 ed-grid min-h-[100svh] content-end bg-paper pb-(--ed-space-section) noscript:static">
        <div className="[grid-column:content-start/content-end]">
          <p translate="no" className="text-wordmark text-ink">
            Routes Crete
          </p>

          <div
            aria-hidden="true"
            className="mt-6 h-px w-full max-w-[24rem] overflow-hidden bg-hairline"
          >
            <span className="loading-sweep block h-full w-1/3 bg-accent-text" />
          </div>

          <span role="status" aria-live="polite" className="sr-only">
            Loading…
          </span>
        </div>
      </div>
    </div>
  );
}
