/**
 * The C+ S9 switch (SPEC §0.2 S9 steps 3 and 6, §I.2, §I.3).
 *
 * The new C+ assertions cannot pass before the rollout exists: the paper
 * cover, `data-on-photo`, the golden band, the Fitzroy index, the edition
 * tokens, the migrated colours. They are written now (stage S8) and stay OFF
 * until the S9 integration build, when the integrator turns them on by
 * changing the one literal below to `true`. Nothing else is edited to switch
 * them on.
 *
 * What the switch turns on:
 *   - qa/preflight.mts          P8, P9, P10, P11, P12, P13 (P1 and P7 are
 *                               always on)
 *   - qa/headline-guard.mts     every route must run `ready` (the fallback
 *                               wait is no longer taken; the integrator
 *                               deletes it at S9 step 5)
 *   - qa/nav-flash-guard.mts    `data-nav-tone` / `data-nav-state`, the
 *                               unknown-slug route, `bg-paper` when solid
 *   - qa/text-contrast.mts      `[data-on-photo]` runs, the 4.5 floor below
 *                               24 px, the Ken Burns end frame, >= 1 on-photo
 *                               run per route
 *   - qa/arc-guard.mts          the golden band `div[data-band="bridge"]`
 *   - qa/credits-guard.mts      C15's minimum caption counts (C15 itself
 *                               always runs; before C+ it finds no caption)
 *   - qa/visual-check.mts       the sticky, Fitzroy-touch and reduced-motion
 *                               menu-preview groups
 * qa/copy-subset.mts has no switch: it is a new guard, run from S9 on.
 *
 * Every guard prints the state of the switch, so a proof log shows which
 * instrument ran:
 *
 *     C+ S9 assertions: on
 *
 * Dry runs before S9 (the environment can only turn assertions ON; once the
 * literal below is `true`, nothing turns them off):
 *   QA_CPLUS_S9=1        everything, source rules included;
 *   QA_CPLUS_S9=guards   the browser guards' assertions only, so a surface
 *                        can be checked on the shared dev server while other
 *                        files still fail P8–P13.
 */
export const CPLUS_S9_ON = true;

export type CplusScope = "guards" | "rules";

export function cplusS9(scope: CplusScope = "guards"): boolean {
  if (CPLUS_S9_ON) return true;
  const env = process.env.QA_CPLUS_S9;
  return env === "1" || (scope === "guards" && env === "guards");
}

/** The line every guard prints before it runs. */
export function cplusS9Line(scope: CplusScope = "guards"): string {
  const on = cplusS9(scope);
  const why = CPLUS_S9_ON
    ? "qa/cplus-stage.mts"
    : on
      ? `QA_CPLUS_S9=${process.env.QA_CPLUS_S9}, dry run`
      : "qa/cplus-stage.mts, until S9";
  return `C+ S9 assertions: ${on ? "on" : "off"} (${why})`;
}
