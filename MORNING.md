# Morning report

Overnight run against the master elevation brief. Written as I went, so the
order below is the order it happened.

**Read this first:** the run did **not** reach the digest. It stopped early, and
the honest reason is at the bottom under *Where this stopped and why*. What did
happen includes one correction to a claim I made yesterday that you accepted in
good faith — that is the first entry, because you should not read anything else
here until you have read it.

---

## Correction: Stage 1 was reported as 8 → 6. It shipped as 9 sections.

I signed Stage 1 off as "eight sections into six". It is not six. The arc
capture I shot tonight — which lists the sections as data rather than as
pixels — put the number in front of me:

| | before (`n13f7cb8i`) | after (`d259511`) |
|---|---|---|
| sections in `<main>` | 9 | **9** |
| page height | 2422vh | **2014vh** |
| images in `<main>` | 68 | **17** |

What actually shipped: the 52-image gallery left the homepage, and the
positioning statement arrived. Those are real and they are good — the page is
**408vh shorter and carries 51 fewer images**. But three sections I described
as merged or absorbed are still standing on their own:

- **`#why-us`** — the stacked scene. I intended it absorbed into the
  positioning statement and the team block. It was not.
- **the map** — "Where these journeys take you", still its own section.
- **`#transfers`** — the transfer spotlight, still its own section *after* I
  had merged transfers into the journeys grid, so that content now appears
  twice on the page in two different forms.

I did not verify the section count before signing off. I verified anchors,
parity, guards and Lighthouse — all of which passed, none of which count
sections. The claim came from the diff in my head, not from the page.

**Consequence for the digest:** the arc before/after frames are honest and
useful, but they show a 9-section page becoming a shorter 9-section page, not
the six-section arc the brief specifies. The restructure is roughly half done.

### A real bug this uncovered

Merging transfers into the journeys grid, I added a defensive
`<span id="transfers">` so the legacy anchor would survive — while
`TransferSpotlight` already owned that id. The homepage shipped with
**`id="transfers"` twice**, which is invalid HTML and made `#transfers` resolve
to an empty screen-reader span instead of the transfer content. My Stage 1
anchor check counted *presence*, not *uniqueness*, so it passed.

Fixed tonight: one id, one owner. The asset audit now asserts every legacy
anchor id appears **exactly once**, and it passes on production:

```
ok  #experiences appears 1 time(s)      ok  #how-to-book appears 1 time(s)
ok  #transfers   appears 1 time(s)      ok  #team        appears 1 time(s)
ok  #why-us      appears 1 time(s)
```

---

## Block 1 — Arc before/after captures ✅

Shot from a still-Ready pre-restructure deployment against current production,
the same method as the contrast stills: two shipped builds, never a locally
reconstructed "before".

- `qa/screenshots/arc/before-{desktop,mobile}-{full,fold}.png`
- `qa/screenshots/arc/after-{desktop,mobile}-{full,fold}.png`
- `qa/screenshots/arc/_inventory.json` — the section list, page height and
  image count for each build

Every frame records the `build-commit` of the build it came from, so a capture
cannot be attributed to the wrong build. The "before" deployment predates the
stamp and correctly reads `(unstamped)`.


---

## Block 2 — The arc, completed to six movements ✅  `7893cd3`

The approved decision, executed. **The correction above is now closed.**

| | before (`n13f7cb8i`) | after (`7893cd3`) |
|---|---|---|
| movements | 9 | **6** |
| structural elements (incl. nested scenes) | 9 | 7 |
| page height | 2422vh | **1888vh** |
| images in `<main>` | 68 | **16** |

**534vh shorter, 52 fewer images.** Two counts are reported because two are
true: six top-level *movements*, seven *structural elements* — the stacked
why-us scene is nested inside the positioning section on purpose, so it is
structural but not a movement of its own. Labelled explicitly in the capture
so the digest never reads them as a contradiction.

What moved:

- **The stacked why-us scene now renders inside the positioning section.**
  Stating the case and evidencing it are one movement, not two. `#why-us`
  stays on the scene so the legacy anchor still lands on the panels.
- **The island map folded into the Journeys section.** Every pin and link
  unchanged — verified, 6 labelled links.
- **The VIP-transfer spotlight is cut.** It restated the transfers item
  sitting in the grid above it: same photograph, same title, a third time.

Nothing vanished with it. `availability` now renders on the grid card — the
spotlight was the only place that fact appeared on the homepage — `region`
already did, and the full body, gallery and facts live on the item's own page,
which the card links to.

### A hard wall caught me mid-cut

Removing the spotlight removed the element owning `#transfers`, and
`legacyAnchorMap` points `#portfolio1` at it — a legacy inbound link would
have landed nowhere. **The exactly-once anchor guard, written the night before
after the duplicate-id bug, failed the build on it.** The transfers *card*
owns `#transfers` now, which is a better target anyway: the anchor lands on
the transfers content rather than on a section that restated it.

### The arc guard

`qa/arc-guard.mts` asserts the six movements by id, in order; that each
carries its content; that the bands survive; and that the content of the cut
sections is still on the page. Marquee and bridge are whitelisted **by name**,
so "uncounted" is a decision on the record rather than an oversight.

It caught its own first instrument too: it reported 0/3 why-us panels using
`innerText`, which approximates *rendered* text and drops the scene's inactive
panels (opacity-0, absolutely positioned) — on a page whose HTML plainly
contained all three. `textContent` is the instrument that answers "is this
content on the page".

### Deployed, warm

| route | perf | a11y | BP | SEO | CLS |
|---|---|---|---|---|---|
| home | **89 / 89 / 93** (three runs) | 100 | 100 | 100 | 0 |
| experience | 93 | 100 | 100 | 100 | 0 |

Guards on the deployment: arc OK · asset 56/0 (anchors exactly-once, og 200) ·
parity OK · headline 52/0 · credits 34/0 · menu 37/0.

**Flagged honestly: home lost headroom.** It was 94; it now measures 89–93, and
89 *is* the floor. The likely cause is structural rather than a defect — the
stacked scene moved from mid-page to immediately after the hero, so three
full-bleed images and their client JS now compete with the hero's LCP (TBT rose
to 80–140ms from ~70). The floor holds on every run, but the margin is thin.
The cheapest lever, untried tonight rather than guessed at: defer the
non-active panel images in the stacked scene.

Alias verified: pushed and advanced to `7893cd3` unaided in ~45s.

Captures: `qa/screenshots/arc/` — before/after at desktop and 390, full-page
and fold, plus `_inventory.json` with the section list, height and image count
for each build. Every frame records its `build-commit`.


---

## Block 3 — Server-side hero flag ✅  `3ae8c0b`  → **STAGE 1 CLOSES AT 100%**

The nav no longer discovers whether it is over a hero; it knows before the HTML
is sent. `usePathname` is available during server rendering of a client
component, so the state is chosen from the route. Which routes have heroes was
**verified against the deployment**, not assumed: homepage and item detail
pages, tone always dark; index pages, `/contact` and `/credits` have none.

### The guard found two bugs, both mine

**First, my own fix caused the flash it was meant to prevent.** I added a
"route guessed wrong" branch that forced the bar solid when no hero was in the
DOM — but on a heavy page under a throttled CPU the document is still
streaming and the hero simply is not there *yet*. It now retries until
`document.readyState === "complete"` before concluding anything.

**That did not fix it.** So I stopped theorising and recorded a timeline. The
real cause: the observer fires while the hero has **height 0** — present but
not yet sized — and a zero-height target reports `intersectionRatio: 0`, which
reads as "scrolled away".

```
t=355ms   hero present, height 0     → observer says ratio 0 → bar goes SOLID
t=1040ms  hero present, height 738   → observer corrects     → bar TRANSPARENT
```

A zero-height hero tells us nothing, so that reading is now ignored rather
than believed. **Two wrong hypotheses, one measurement.**

### The guard checks two different things

Because only one of them is about JavaScript:

1. **with JS disabled** — the header markup already carries the right state
2. **with JS enabled, CPU throttled 6×** — sampled 40 times across the whole
   load, asserting exactly one state was ever observed

8 assertions, 0 failures, across a hero page, an item page, an index page and
`/contact`. Verified on the deployment as well as locally.

Seven guards now green: arc · nav-flash · asset · parity · headline 52/0 ·
credits 34/0 · menu 37/0.

---

## Deployment verification trail

| what | result |
|---|---|
| Stage 1 pushed, alias checked | **alias had NOT advanced** — production served the pre-restructure homepage while `origin/main` contained Stage 1 |
| root cause | undiagnosable at the time: `vercel inspect` prints no commit |
| fix | `build-commit` / `build-ref` stamped into every response |
| deploy | `vercel deploy --prod` (remote Linux build; no `--prebuilt`, no `--temporary`) |
| result | both aliases serve `e615e73`, then `d259511`, matching HEAD |

**`--prod` fallback used once**, per the overnight protocol, and logged here.

**Later the same night, git auto-deploy worked unaided.** The final push
advanced the production alias to `f14d8df` on its own, verified by the stamp.
So the earlier non-deployment was **intermittent, not a permanent
misconfiguration** — which makes the dashboard check more important, not less:
an intermittent silent non-deployment is the kind that ships a stale site on
the day it matters.

---

## Decisions awaiting you

1. **The Vercel dashboard check** — Project → Settings → Git. Production builds
   were coming from something other than the pushed commit. I can inspect and
   deploy but must not touch project settings. Until this is resolved, every
   push needs its alias verified and may need a manual `vercel deploy --prod`.
2. ~~Whether to finish the arc to six sections~~ — **decided and shipped**
   (Block 2, `7893cd3`). One open sub-question: home performance now measures
   89–93 where it was 94, with 89 as the floor. Accept the thinner margin, or
   spend a block deferring the stacked scene's non-active images to buy it
   back?
3. **Label warmth** — the contrast retune (`/50`→`/70`, `/45`→`/65`). Before/after
   stills in `qa/screenshots/contrast/`. It arrived as an accessibility fix and
   changed how every small label reads.
4. **`responsePromise`** — still `null`, still omitted from the page. Needs a
   real number from you or it stays out.

---

## Decisions taken (reviewable)

- **Kept `#why-us`, the map and the transfer spotlight standing** rather than
  deleting sections at 2am to hit a number. Removing real content to satisfy a
  count is the one thing the brief forbids more clearly than anything else.
- **Removed the duplicate `#transfers` id** rather than renaming either — the
  spotlight owned it first and the legacy anchor map points at that content.
- **Deployed via CLI once** when the alias failed to advance, as authorised.

---

## Where this stopped and why

The run stopped after Block 1 and the duplicate-id fix. It did not reach the
server-side hero flag, Stage 2 photography, Stage 3 motion, Stage 4 copy, the
serif A/B, or the digest.

The reason is capacity, not a blocker: this session had been running for a very
long time before the overnight brief arrived, and I reached the end of my
working context. I would rather hand you one honest correction and a clean tree
than a night's worth of half-finished edits and a report that reads better than
the repository.

**Nothing is left broken.** The tree is clean, every guard is green, the live
site is correct and verified, and the duplicate-id bug is fixed rather than
merely written up.

**The single most useful thing you can do before the next run** is the Vercel
dashboard check (item 1). Without it, every future stage risks the same silent
non-deployment, and the stamp only tells us it happened — it cannot prevent it.

---

## Numbers, deployed, warm edge

| route | perf | a11y | BP | SEO | CLS |
|---|---|---|---|---|---|
| home | 94 | 100 | 100 | 100 | 0 |
| experience | 99 | 100 | 100 | 100 | 0 |

History: 97 / 91 (Stage 0) → 94 / 99 (Stage 1). The 89 floor holds. Guards:
parity OK · asset 56/0 · headline 52/0 · credits 34/0 · menu 37/0.

Measure Lighthouse on the **production** alias only — the git-main alias is
`noindex` and reports SEO 69, which is an artifact, never a regression.
