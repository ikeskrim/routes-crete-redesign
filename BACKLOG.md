# Backlog — deferred, not forgotten

Everything consciously postponed, with the increment it is scheduled into and
the reason it was deferred rather than dropped. An item leaves this file only
by being **done** or by being **explicitly cancelled by the client** — never by
going quiet.

---

## Scheduled: increment 3 (structure & content)

### Server-side hero flag for header initial state

**What.** The header's over-hero state initialises to `false` on the client, so
it is the `IntersectionObserver` that turns the bar transparent. Between first
paint and the observer's first callback there is a window in which a solid bar
is painted over a dark hero.

**Why it is deferred, not fixed.** In production that window closes before it is
perceivable — measured at scroll 0 on a live build, the header reads
`background: rgba(0, 0, 0, 0)`, `heroTone: "dark"`, wordmark `sand-50`. The
defect as originally reported (a solid light band over the dark hero) was a
**dev-build artifact** and does not reproduce in prod. What remains is a
theoretical flash on a slow first paint.

**Why it is still tracked.** "Not perceivable on this machine" is not the same
as "correct". The right fix is to tell the header at render time whether the
page has a hero, rather than discovering it after hydration — which is a small
change to layout plumbing (the page must declare hero presence to the layout),
not a one-line patch. That is increment-3 shaped work.

**Done when.** The header renders its correct initial tone server-side, and a
harness asserts the header's computed background at first paint — before any
observer can run — on both a hero page and a non-hero page.

### Header text contrast during the menu's open/close crossfade

**What.** For roughly 70–130 ms while the overlay fades in or out, the header's
text contrast collapses — measured floors of `1.02:1` opening and `1.08:1`
closing, against `16.96:1` closed and `17.36:1` open. The wordmark is
genuinely absent from the rendered frame, not merely predicted to be.

**Why it happens.** The header text crossfades ink→sand while its ground
crossfades shell→transparent-over-ocean-950. The two endpoints are light-on-dark
inversions of each other, so *any* simultaneous crossfade of foreground and
background passes through mid-grey on mid-grey. No retuning of the two
durations fixes it: earlier gives sand-on-shell, later gives ink-on-ocean-950,
both ≈1.1:1.

**The fix.** Make the inverted header state discrete rather than animated, and
gate it on the panel being fully opaque (`onAnimationComplete`) instead of on
`open`. The colour transition must stay live for the scroll-driven hero↔solid
swap, so it can only be suppressed while the menu is involved.

**Why deferred.** It is a sub-150 ms transient, and it is the only change in
this area with real design risk — it alters how the bar reads on every page,
to fix something most visitors will never consciously see. It wants a visual
diff and a considered look, not a same-day patch.

**Done when.** Sampling `getComputedStyle` per frame for 800 ms across both
open and close, on `/experiences` and on `/` scrolled past the hero, never
drops below 4.5:1 — corroborated by clipped screenshots of the wordmark
region, since a compositing model can be wrong.

---

## Scheduled: increment 4 (enhancement & audit), optional

### Veil page transitions

Demoted from increment 2 by client decision. Optional in increment 4 — to be
built only if the motion system reads as finished without it, and dropped
without ceremony if it does not earn its cost.

### WebGL shimmer on the signature scene

Optional. Same test: it ships only if it adds something the CSS/motion
vocabulary cannot, and never at the expense of the Lighthouse band.

---

## Blocked on client material

### Ambient footage

`/content/video-inbox/` is checked at the start of every block. As of the last
check it contains only its README — no footage has arrived.

**Closure rule (client-set).** If no footage has arrived by increment 4's audit,
the ambient system ships **stills-only** and the video slots are removed rather
than filled. Stock and generated footage are prohibited substitutes — the empty
slot waits for the real thing or the slot goes away.

---

## Found 2026-09-13, not yet scheduled

### A tap on Menu before hydration does nothing

**What.** The overlay menu's trigger is a server-rendered `<button>` whose
click handler arrives with hydration. A visitor who taps Menu in the first
moments of a page load, before React has hydrated the header, gets no response
and has to tap again. On the deployment, headless Chromium measured the menu
usable a median of about 300 ms after `domcontentloaded`, with occasional runs
past 1.5 s under load.

**How it surfaced.** menu-audit's single early click lost this race twice on
the `2b2d00d` deployment, while the machine was heavily loaded. An interleaved
A/B on the immutable `36854c0` and `2b2d00d` deployments showed matching
medians, no CSP violation and no error, so it was not a regression. The same
edge exists on `36854c0`. The audit now waits for the trigger to hydrate before
its one click; the product behaviour is unchanged.

**Why it is deferred, not fixed.** The overlay menu is an approved component,
and the fix changes how it opens rather than how it looks. Candidates: a
native `<dialog>` or `popover` that opens without waiting for React, or a
no-JS fallback that makes an early tap still work. Either needs its own menu
audit and a check of the 250 ms TBT budget, not a late patch.

---

## Standing constraints

These are not tasks; they are things that must remain true and are easy to
erode.

- **`qa/benchmark/`** holds captures of a third-party site for study. It is
  gitignored and must never be published or redistributed.
- **No invented facts.** No awards, years in business, traveller counts,
  reviews, ratings, or prices. No public email address exists — it stays null.
  The "Cretan Routes" Facebook page is a different, unrelated business and must
  never be linked.
- **No AI-generated scenery, people, or experience imagery.** Every sourced
  photograph carries a licence ledger entry, read on its own page. Two rules
  decide where a frame may go, set by the design-reset brief (2026-09-11):
  - **Itinerary surfaces** (cards, galleries, waypoints, route stops, item
    heroes) show only the actual places the tours visit.
  - **Mood surfaces** (the homepage hero, section bands, the closing scene,
    the menu backdrop) may show any verifiable Crete. They are captioned
    honestly and generically, and never name a place the tours do not go.
- **Where masters live.** CC masters are committed. Free-stock and
  written-permission masters stay in the gitignored `assets-src/stock-local/`,
  and Pixabay frames are held entirely — this repository is public.
  `qa/credits-guard.mts` enforces it.
- **Secrets live in Vercel environment variables**, never in the repo. If the
  enquiry form gains a mail provider, its key goes there.
