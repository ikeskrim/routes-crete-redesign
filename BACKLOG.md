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

## Standing constraints

These are not tasks; they are things that must remain true and are easy to
erode.

- **`qa/benchmark/`** holds captures of a third-party site for study. It is
  gitignored and must never be published or redistributed.
- **No invented facts.** No awards, years in business, traveller counts,
  reviews, ratings, or prices. No public email address exists — it stays null.
  The "Cretan Routes" Facebook page is a different, unrelated business and must
  never be linked.
- **No AI-generated scenery, people, or experience imagery.** Sourced
  photography must be of the actual places and must carry a licence ledger
  entry.
- **Secrets live in Vercel environment variables**, never in the repo. If the
  enquiry form gains a mail provider, its key goes there.
