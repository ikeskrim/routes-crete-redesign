/**
 * Route-level loading state.
 *
 * A quiet hairline that fills, on the brand's dark field — no spinner, and
 * nothing that jumps. It occupies the full viewport so the incoming page
 * doesn't shift when it swaps in.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grain relative flex min-h-[100svh] items-end bg-ocean-950"
    >
      <div aria-hidden className="grain-overlay" />

      <div className="relative mx-auto w-full max-w-[92rem] px-6 pb-20 sm:px-8 lg:px-12 lg:pb-28">
        <p className="text-eyebrow uppercase text-sand-200/70">
          Routes Crete
        </p>

        <div className="mt-6 h-px w-full max-w-[24rem] overflow-hidden bg-sand-100/15">
          <span className="loading-sweep block h-full w-1/3 bg-gold-400" />
        </div>

        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}
