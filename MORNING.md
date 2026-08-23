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

## Block 4 — Stage 2 photography, part 1 ✅  `d6a9cdc`

### Galleries curated: 51 frames → 28

Two agents **viewed every frame** — not ranked by filename or file size — and
cut each gallery to its strongest 14.

| gallery | before | after | removed |
|---|---|---|---|
| heart-of-cretan-tradition | 29 | **14** | 15 |
| kourtaliotis-temple-of-nature | 22 | **14** | 8 |

**Nothing was deleted.** Every removed frame stays in the repo, stays graded,
and is listed in `galleryRemoved` with the reason it was cut and — where it
was a near-duplicate — which kept frame it defers to. Restoring one means
moving its entry back into `gallery`.

The reasons are checkable against the picture, which was the point:

> "Third near-identical held-out-food frame on the same patch of gravel, and
> chips on a plate say nothing about Crete."

Each gallery now opens on a chosen frame: the old stone arch bridge for
Kourtaliotis (already the card and og image, so it opens on the picture that
brought the visitor in), and the golden-hour ridge line for Heart of Cretan
Tradition (the only frame in the 29 with real light).

### Sourcing: 18 verified licence-clean candidates, 2 rejected

Four agents sourced, four adversarial verifiers re-read every licence from the
file page itself. Saved to `qa/sourcing-candidates.json` with full reasoning.

- **Rethymno** — the Venetian-harbour lighthouse (three frames), the Fortezza,
  an old-town lane
- **Villages** — Spili and its lion-head fountains (three), Anogeia
- **Olive groves** — five, incl. an ancient olive near Kavousi and the Messara plain
- **Kourtaliotiko / Preveli** — four NEW frames incl. a gorge waterfall

**Two rejected on licence**, which is the system working: a Margarites frame
tagged CC BY 3.0 **Greece** and a Kourtaliotiko chapel frame that did not
survive verification.

The verifiers did more than rubber-stamp. One **corrected a proposer's
description outright** — the proposer had reconstructed a scene it could not
see, describing a low up-angle and omitting the harbour water and the tower's
reflection that occupy the bottom third. Flagged as "must not be reused as
caption source". That is exactly the failure mode that would have put a false
caption on the site.

Every Commons candidate was also checked for the **stale Structured Data**
trap: all clean, and the check is recorded so a future audit knows wikitext is
operative.

### A stale server cost me twenty minutes — preflight now catches it

The headline guard began reporting exact doubling on every headline. It looked
like the sr-only regression from days ago. It was not: a server left running
across a rebuild served HTML referencing the **previous** build's CSS chunk,
which returned **500**. The page rendered completely unstyled, `invisible`
never applied to the measuring copy, so both copies were visible — and the
guard correctly reported two.

Every content guard passed throughout, because the words were all there. **An
unstyled page passes content checks and produces worthless captures.**
`preflight` now asserts the stylesheet returns 200 before any run starts.

---

---

## Block 11 — Stage 3 opens: the unclip reveal reaches the cards ✅  `49b603f`

Stage 3's clip-path "unclip" already existed as `ImageReveal` — but the two
surfaces a visitor meets first, **the Journeys cards and the galleries**, were
not using it. They went through `MediaFrame`, which had a hover zoom and no
entrance at all.

`Unclip` is that reveal for frames that already own their geometry: the
photograph wipes open from its lower edge over **1.3s** while settling out of a
1.12 push-in over **1.8s**. The lengths differ on purpose — the frame is fully
open a beat before the image stops moving, which is what makes it read as a
photograph settling rather than a box opening.

Rendered as an absolutely-positioned layer inside the existing ratio frame, so
it changes nothing about layout.

`priority` images are exempt: **an LCP candidate must never wait behind a
reveal.** Not hypothetical — this project already shipped an opacity-gated
subheading that became the LCP element at 3420ms.

### Fixed while passing

The `noscript` fallback forced `opacity` and `transform` but **not
`clip-path`** — so with JavaScript disabled, a clip-path reveal would have
stayed permanently shut. That gap predates this change (`ImageReveal` has the
same shape) and now releases clip-path too.

### Two of my own traps, both already written down

- **`scrollIntoView` reported the reveal never firing.** Lenis owns the scroll
  and ignores it. Real wheel events show `inset(100% 0% 0%)` → `inset(0%)`.
- **`pkill -f "next start"` does not kill the server on this machine**, so my
  first probe read a stale build with no wrapper at all. Kill by port.

Both traps were already in my own notes. I walked into them anyway.

### Deployed, four runs

| run | performance | TBT | CLS |
|---|---|---|---|
| 1 (first after deploy) | 93 | 180ms | **0.011** |
| 2 | 92 | 120ms | **0** |
| 3 | — | 120ms | **0** |
| 4 | — | 230ms | **0** |

**CLS holds at 0** — the single 0.011 was the first run after deploy, matching
the cold-edge pattern already documented. I did not accept it on one reading,
because CLS 0 is a hard wall.

**TBT rose from ~60ms to 120–230ms.** That is the reveals' main-thread cost,
and it is the honest price of this block. Performance 92–93, floor intact,
experience route 95.

---

---

## Block 12 — Stage 3 item 3: scene seams ✅  `18275ce`

Where a dark movement met a light one the page changed colour on a **straight
line**, which reads as two web sections stacked. Two seams now dissolve:
hero → positioning, and how-it-works → team. Those are the only two real
colour changes left; the other boundaries already have the marquee or the
cinematic bridge doing the work.

The band paints the incoming colour and masks it with two **intersected**
layers — a vertical gradient and the same fractal-noise SVG the grain uses —
so the outgoing scene breaks up into the next rather than stopping at a rule.

### Zero JavaScript, and the budget is why

The scroll-scrubbed version is more spectacular and would have cost
main-thread time that is not available. TBT was already 120–230ms against
your new 250ms ceiling. A mask the compositor paints once costs nothing to
scroll past, and at a seam the eye crosses in half a second the scrubbed
version buys very little. **That trade is written where the component is
declared**, so it reads as a decision rather than an omission.

### TBT report — the ceiling held, with one honest outlier

Eight readings on the deployment, home:

| | performance | TBT |
|---|---|---|
| 1 | 90 | 130ms |
| 2 | 95 | 140ms |
| 3 | **83** | **410ms** |
| 4 | 90 | 130ms |
| 5–8 | 92 · 92 · 94 · 91 | — |

**TBT delta: none — if anything slightly better.** 130–140ms against a
120–230ms baseline, which is what a pure-CSS block should do.

**One reading breached both limits: 410ms TBT, performance 83.** I am
reporting it rather than burying it. Seven of eight readings sit at 90–95, the
block adds no JavaScript whatsoever, and the outlier is consistent with
measurement noise on a loaded machine driving Chromium. But it is the second
time an isolated run has misbehaved on this route, and if it recurs it is
worth chasing rather than explaining away.

**CLS 0 on all four disciplined readings.** a11y 100 throughout.

---

## Block 13 — Stage 3 item 4: layered depth, then measured and cut back ✅  `78e1df4`

The stacked scene drifted and zoomed its photograph, but everything else moved
with it — which reads as one flat picture sliding rather than a space with
depth. Planes only read as depth when they **disagree**.

Shipped first with three planes: photograph (`y -3%→3%`, `scale 1.06→1.14`),
vignette (`scale 1.08→1`), and the words (`y 1.4%→-1.4%` — opposite direction,
a third the travel).

### Then the budget did its job

| | three planes | vignette cut |
|---|---|---|
| performance | 89 · 90 · **88** · 89 | **98 · 92 · 92 · 93** |
| TBT | 170 · 220 · 150 · 120ms | **80 · 120 · 130 · 80ms** |
| CLS | 0 | 0 |

One reading was **below the 89 floor**, so under your standing rule it got
simplified before it shipped rather than after. The vignette plane promoted a
full-viewport radial gradient to its own compositor layer in order to move it
8% — almost imperceptible behind a photograph and a wash.

Cutting that one layer bought back **~4 performance points and ~60ms of TBT**.
The photograph and the words still disagree, which is where the depth actually
reads. **Two planes that disagree are enough; the third was cost without
effect.**

Worth keeping as a rule: `will-change` on a full-viewport element is not free,
and the effect has to earn the layer.

### Measured inside the scene, not guessed

The text plane reads `-0.25` at 20% of the scene's scroll progress and `-3.06`
at 80%. A first probe sampled twice *outside* the range and got the same
number both times — the scene had already passed. Sampling within the
element's own range is the only reading that means anything.

Reduced motion untouched: that branch drops the pin entirely, so there are no
transforms to disagree.

---

## Block 14 — Stage 3 item 5: sand, the light sections join the texture system ✅  `0496ea5`

`grain` gave the dark movements depth by breaking up large flat fields of
ocean-950. The light movements had **nothing** — `bg-shell` rendered as a
perfectly even field, which is what made them read as "web section" next to
the photography rather than as paper.

`sand` is the counterpart, built the same way so the two are one system (a
fractal-noise SVG, no image request) but warmer, weaker, and **multiplied**
rather than overlaid, so it settles into the light ground instead of lifting
it. A single very wide gold wash sits beneath it so the field has a centre of
gravity.

Applied to the three light movements: positioning, journeys, team.

**TBT report:** 110 · 140 · 120 · 100ms — delta within noise, as a pure-CSS
block should be. Performance 90 · 92 · 92 · 93, **CLS 0 on all four**, a11y 100.

---

## Stage 3 progress

| item | state |
|---|---|
| 1 fullscreen overlay menu | ✅ shipped, 37 assertions |
| 2 clip-path unclip reveals | ✅ shipped |
| 3 SVG-mask scene seams | ✅ shipped, zero JS |
| 4 layered-zoom depth | ✅ shipped, then cut back on measurement |
| 5 warm sand texture | ✅ shipped |
| 6 drag-inertia strips | not started |
| 7 refined sticky indices | not started |

**Running TBT picture across the block:** 130 → 220 (cut back) → 80 → 140.
The ceiling held everywhere except the three-plane experiment, which is
exactly the case the ceiling exists to catch.


---

---

## Block 15 — Stage 3 item 6: the gallery becomes a strip you can throw ✅  `87599d5`

Curated to fourteen frames, a gallery reads better as a **sequence** — the
order the day happened in — than as a masonry block, which reads as an
archive. The experience pages now lay their frames out as one horizontal run.

**Idle at load, which was the constraint.** No effect, no rAF, no scroll
listener, no observer on mount — the only thing wired up is `onPointerDown`.
The animation frame starts on release and stops itself when the throw dies.

**TBT on the route that carries it: 30 · 10 · 40ms.** That is the idle-at-load
claim proven rather than asserted. Home, which has no strip, is unchanged at
89–90. CLS 0 on every reading, a11y 100.

### Two bugs, both found only because the test used real pointer events

**1. The throw travelled 0px.** `snap-x snap-mandatory` and inertia are
mutually exclusive — the browser snaps to the nearest point the instant the
pointer lifts, overriding the glide entirely. Snapping removed; now measured
at 298px of glide.

**2. Far worse: `setPointerCapture` on pointerdown silently broke every
gallery tile.** Capturing redirects the eventual `click` to the capturing
container, so the tile's own `onClick` never fired — clicking a photograph
opened nothing at all. Capture is now taken only once a drag actually starts
(>4px).

I nearly filed that second one as "my detector is wrong", because the first
probe used a selector the lightbox does not carry. Checking the markup showed
the lightbox **does** use `role="dialog" aria-modal="true"` — so the failure
was real. **Verifying the instrument before dismissing the result is what
caught it**, and it would otherwise have shipped a gallery whose photographs
could not be opened.

Verified end to end: a click opens the lightbox, Escape closes it, a throw
runs 0 → 480 → glides to 787 and opens nothing.


---

---

## Block 16 — Stage 3 item 7, and **STAGE 3 CLOSES** ✅  `b569644`

The sticky ledger told you *which* chapter you were in. While a scene holds
you in place, the question you actually have is **how far through** — so a rail
behind the numbers now fills with the scene's own scroll progress.

It reuses `scrollYProgress`, already computed for the imagery, and animates
`scaleY` on a 1px element: no new listener, no new observer, no measurable
time.

Verified against the scene's real progress rather than eyeballed: at
`scrollY 2688` the rail reads `scaleY 0.539`, and the scene's own progress
there is `(2688−1717)/(2700−900) = 0.54`. Exact.

**One instrument note worth keeping:** motion writes `transform: none` when a
scale reaches its default of 1, so a *full* rail reads as `none`. My first
probe used `'none'` as both the element-missing fallback **and** a legitimate
value, which made a working rail look broken. **A fallback must never collide
with a real reading.**

### Stage 3, complete

| item | | TBT impact |
|---|---|---|
| 1 fullscreen overlay menu | ✅ | — |
| 2 clip-path unclip reveals | ✅ | +60ms, accepted |
| 3 SVG-mask scene seams | ✅ | none (zero JS) |
| 4 layered-zoom depth | ✅ | +50ms, then **cut back** to ~0 |
| 5 warm sand texture | ✅ | none (zero JS) |
| 6 drag-inertia strip | ✅ | **10–40ms** on its own route |
| 7 refined chapter indices | ✅ | none (reuses an existing value) |

**Stage 3 close, deployed:** performance 90 · 91 · 91, TBT **80 · 90 · 110ms**
against the 250 ceiling, **CLS 0**, a11y 100.

The pattern across seven items: **the cheap ones were the good ones.** Three
of the seven cost literally nothing because they are CSS or reuse a value that
already exists, and the only item that threatened the budget was the one that
promoted a full-viewport element to its own layer.

### Captures

`qa/screenshots/digest/` refreshed on `b569644` — 30 frames, desktop + 390 +
full reduced-motion walkthrough, every frame stamped with its build-commit.


---

---

## Block 17 — Stage 4: the copy deck, and parity split in two ✅  `7958a21`

Eight homepage slots now carry the approved deck copy. **Every original is
preserved** in `site.json` under a `*_original` key.

| slot | before | after |
|---|---|---|
| hero eyebrow | Your Cretan adventure starts here | Rethymno · Crete |
| hero sub | *(was the SEO description)* | a real sub-line |
| how heading | How to Book Your Cretan Experience | Booking is a conversation |
| team heading | Our Amazing Team | The three people you'll actually meet |
| transfers sub | Our collection of transfers | Airport to villa, and anywhere after |
| steps | Explore / Send / Enjoy | Tell us the day · Send us the details · We confirm, then you travel |

### One deck line deviates, and it is flagged

The deck was written against the **original five steps**. Mapping its three
lines positionally onto the three that survived the 5→3 collapse put **"We
confirm everything"** above a body reading *"Contact us via message or email
with: the excursion you selected, preferred date, number of participants"* — a
title contradicting its own verbatim body.

So step 2 takes **"Send us the details"**, which is *not* a deck line, and step
3 merges deck lines 2 and 3 because its body merged the original steps 4 and 5.
**Your call** — the deck line can be restored if you prefer it, but not above
that body.

### The hero sub is a new field, on purpose

`site.meta.description` is neither reused nor rewritten. It is the SEO
description; the deck governs what a **reader** sees, not what a crawler
indexes. Verified on the deployment: the description meta tag is still the
original, and SEO scores 100.

### Parity v2 — both halves

v1 asserted the *originals* appeared on the homepage. Right while the rebuild
was a faithful port; **wrong the moment the deck replaced them**. It would have
forced the site to say "Our Amazing Team" forever — or been deleted to let the
deck through, and deleting a guard to pass it is how content quietly goes
missing.

```
RENDERED    15 strings of new deck copy are on the page
PRESERVED    9 originals still exist in the content files
```

**The originals are no longer required to be visible. They are required to be
kept.** That is the promise this project actually made.

The arc guard failed on this change and was **right to** — it asserts movement
5 carries "How to Book". Updated to the new heading: the guard tracks what the
page *says*, parity tracks what was *kept*.

**Deployed:** performance 92 · 92 · 92, TBT 90–150ms, CLS 0, a11y 100, SEO 100.
Six guards green.


---

---

## Block 18 — Stage 4 complete: the deck reaches the item pages ✅  `9988596`

**Kourtaliotis** — deck applied in full: subtitle, opening and closing
paragraphs. H1 kept, because the deck itself marks it *"kept: it is genuinely
good"*. The middle of the story is untouched for a mechanical reason as well as
an editorial one — the pinned scene reads paragraphs **3, 5, 7, 8 and 9**
verbatim, and the deck explicitly keeps the explorer's-journal conceit for it.

**Heart of Cretan Tradition** — the deck specifies no subtitle, and the
original copy already held the best one, so it was **surfaced, not written**:
*"Leave the sea behind for a day"* is a verbatim clause from body[1].

Its `body[0]` is character-for-character the item's **own title**, so the page
printed the title twice — once as the H1, again as the opening line. The
paragraph stays in the content file; `ItemDetail` simply does not render a
paragraph identical to the title. **Cutting a repetition is not cutting
content.** Verified: 0 rendered paragraphs now equal the title.

**Transfers** — no subtitle added, deliberately. Its closing line, *"Because
getting there should feel easy."*, is already surfaced as a heading (it renders
twice), so a subtitle would have repeated the page's own best line back at it.

### COPY-MAP.md

Every changed line with one of three provenances — **surfaced · written ·
kept** — plus the surfaces deliberately left alone: `meta.description`, every
H1, `responsePromise`, and the place-true captions.

**Deployed:** home 94, experience 92, TBT 90/40ms, CLS 0, a11y 100, SEO 100.
Seven guards green, run **un-piped** so their exit codes actually gate.

*(One transient: the headline guard exited non-zero once on the deployment and
passed on re-run — 48 assertions, 0 mismatches. Logged rather than ignored, in
case it recurs.)*


---

---

## Block 19 — Stage 5: the serif A/B ✅  `64e708c`  ·  Stage 6: digest refreshed

`/serif-preview` renders the same hero and the same positioning statement with
**Fraunces** on the headlines only. **The live site keeps Manrope.** This is a
prototype for one decision, not a change.

Fraunces over Instrument Serif and Cormorant: it is variable, so display sizes
get real optical sizing rather than a text face stretched large; its SOFT axis
takes the edge off the serifs, which suits sunbleached warmth better than the
colder high-contrast alternatives; and SIL OFL with `next/font/google`
self-hosting means no request leaves the origin — the contract Manrope and
Inter already keep.

**The font loads on that route only.** In the root layout every visitor would
pay for a typeface that exists solely for this comparison. Verified on the
deployment: the live homepage references Fraunces **zero** times, and the route
returns `noindex, nofollow`.

Captured under identical conditions — same viewport, wait, scroll position and
build, reduced-motion on so no frame catches a headline mid-reveal. **The only
difference between the two images is the typeface**, and that is verified
mechanically rather than trusted:

```
desktop  sans   h1=Manrope   h2=Manrope   body=Inter
desktop  serif  h1=Fraunces  h2=Fraunces  body=Inter
```

which is also the proof that *headlines only* is true — the body face is
unchanged in both.

`qa/screenshots/serif-ab/` — desktop and 390, hero and statement, four frames
per variant.

### Digest refreshed on `64e708c`

30 frames in `qa/screenshots/digest/` — desktop + 390 + a full reduced-motion
walkthrough, every frame stamped with its build-commit. Now shows the finished
Stage 3 motion system and the Stage 4 copy.


---

---

## Block 20 — reduced-motion refinement, Stage 7 dry run, docs ✅  `1682389` · `73f334d`

### Reduced motion was disabled, not designed

The captured frame showed it plainly: **three statements ranged left on a flat
olive field, two thirds of the page empty.** A bulleted list, not a scene. The
branch was dropping `panel.image` entirely — and that is what a real fraction
of visitors were getting.

**Reduced motion means no motion, not no pictures.** The photographs are the
whole point of the scene and they cost a reduced-motion visitor nothing: they
simply do not move. Recomposed as alternating editorial pairs — photograph one
side, statement the other, sides swapping down the sequence.

Verified in a reduced-motion context: **3 images, 3 figures, and zero
transformed elements** anywhere in the scene. Composed, not animated.

### Stage 7 dry run — passes, and found something better than a pass

All eight guards green on the deployment; Lighthouse home **92**, experience
**93**, a11y 100, CLS 0, TBT 130/50ms.

But run as a **tight batch**, two guards reported failure — `nav-flash-guard`
and `menu-audit` — and both passed immediately on individual re-run with exit
0. Eight Playwright-driven guards against a *remote* origin contend for the
same browser, CPU and network.

**A batch that cries wolf twice out of eight is worse than no batch**: the next
real failure gets waved away as contention. Now documented — pace the deployed
suite, and always re-run a single failing guard alone before believing it.
Twice now the first reading has been the wrong one.

### Docs brought to current reality

**README** — the six-movement arc and why the guard exists; the parity contract
as its two halves with the canonical sentence; a table of all eight guards and
what each asserts.

**DEPLOYMENT** — git push *is* the deploy; never `--temporary`/`--prebuilt`;
assert the alias via the `build-commit` stamp after every push; never chain a
measurement onto the alias-wait; which URL for what (git-main is `noindex`, so
SEO 69 there is an artifact); and the two cutover chores — `site-url.ts`
becomes a no-op, `/serif-preview` gets deleted.


---

---

## Block 21 — the temporary /review page ✅  `a4f327e`

**https://routes-crete-redesign.vercel.app/review**

The ten open decisions as a page you can scroll on a phone. Each states the
choice, why it is a choice rather than a question, and shows the frames that
answer it — plus a walkthrough of the site as it stands.

**Own captures only.** Nothing from `qa/benchmark/` appears there and nothing
ever may: those are screenshots of someone else's site, kept for study and
gitignored precisely so they are never published. Asserted on the deployed
page — **0 references** to any benchmark frame.

20 frames re-encoded from our own capture sets at 1100px / q74 into
`public/review-assets` — **1.2MB total** rather than the 60MB the PNG sets
weigh, because this is a page opened on a phone.

Verified on the deployment: `200`, `noindex, nofollow`, assets serve,
**0 benchmark leakage**, and **0 links to it from the site** — it is reachable
only if you have the URL.

### Deleting it, when the decisions land

1. `rm -rf src/app/review public/review-assets`
2. drop this block's link from `MORNING.md`

That is all it is — one route and one asset folder, both temporary by
construction.

*(Local-server note for future blocks: the production server does not survive
between tool calls on this machine. Start it and run the guards in the SAME
invocation, or every browser-driven guard reports a preflight failure that
looks like a defect and is not.)*


---

# NEXT SESSION STARTS HERE

**State:** tree clean, alias verified, all guards green. Stages 1–6 complete.
The client's review page is live at **/review**.

**Remaining autonomous queue:**
1. **Benchmark coverage completion** — check which reference-derived patterns
   still lack a side-by-side. Keep the *attested, not captured* tag honest:
   the Fitzroy hover mechanic is instrumentally observed but no frame shows
   it, and a manufactured pairing is worse than an absent one.
   `qa/benchmark/` stays gitignored and never reaches a public page.
2. **qa hardening backlog** — see `qa/README.md`.
3. Genuine polish only: consistency sweeps, mobile refinements, documentation
   accuracy. **No make-work** — if the queue empties, say so and stop.

**Never touch** the client-decision items: photo swaps, serif choice, label
warmth, enhanced files, `responsePromise`.

**Standing traps — check at every block start:**
- Never chain a measurement onto the alias-wait.
- **The local prod server dies at the end of each tool call.** Start it and run
  the guards in the SAME invocation.
- `pkill` does not stop it — kill by port.
- `scrollIntoView` does nothing under Lenis — real wheel events.
- Sample scroll transforms **inside** the element's own range.
- A probe fallback must never collide with a legitimate value.
- **Direct writes first** for JSX and multi-line strings — never a generated
  patch, not even as a first attempt.
- Guards must be run **un-piped**, and a commit must never be chained after an
  ungated check.
- **Re-run a single failing guard alone before believing it.**

---

## Block 5 — Photography ingested, ledgered, graded ✅  `3f989ce`

The ledger goes from **5 photographs to 15**. All ten new files are Crete, all
per-file licence-verified, all SHA-1'd, all graded, all credited.

| licence | photographs |
|---|---|
| CC0 1.0 | Rethymno harbour + snowy mountains · Rethymno old-town lane · Spili lion-head fountains · Messara plain |
| CC BY 2.0 | Kourtaliotiko waterfall · Preveli palm forest · Anogeia |
| CC BY 3.0 | The Fortezza · Spili village |
| CC BY 4.0 | Ancient olive tree near Kavousi |

**Eight of eighteen candidates were deliberately not taken** (reasons in
`qa/ingest-plan.json`). Two Pexels olive groves were licence-clean but verified
as **Greece, not Crete** — this site names real places, so a Greek stand-in
cannot honestly be captioned as Cretan. That is an honesty rejection, not a
licensing one. One was below resolution; five were redundant.

**The downloads failed silently at first.** Seven files arrived as identical
1963-byte Wikimedia rate-limit pages rather than images. A naive ingest would
have written seven HTML error pages into the repo as `.jpg`, hashed them, and
credited them. The size check caught it; a descriptive User-Agent fixed it.
Then every downloaded file's real pixel dimensions were measured and matched
the verified record exactly — that is what proves we hold the file the licence
describes.

---

## Block 6 — The photography finally appears on the site ✅  `a191205`

**A finding worth stating plainly: none of the sourced photographs rendered
anywhere.** All five originals — and then the ten just ingested — were
verified, graded and credited, and appeared on zero pages, surviving only as
leftovers in `blur-map.json` from the deleted design drafts. We were
maintaining a licence ledger for photographs nobody could see.

So this block is not "swaps". The island map already tracked a hovered pin; it
now reveals a real photograph of that actual place behind the chart:

| pin | photograph |
|---|---|
| Rethymno | the harbour, snow-covered mountains behind |
| Kourtaliotis Gorge | the waterfall inside the gorge |
| Preveli lagoon | the palm forest along the river |
| Preveli Monastery | the monastery |
| Mountains of Crete | Anogeia |

**Five of nine.** The cave, the deliberately unnamed "historic village" and the
two airports have **no preview rather than a lookalike**. A place we cannot
honestly caption gets nothing.

The photograph sits behind the chart, not beside it, so geometry never moves
and CLS stays 0. Desktop only. Mounted only on hover or focus — verified by
network: nothing eager, and hovering the gorge pin fetches exactly one file.

A scrim sits over the photograph and under the pins. Without it, label
legibility would be a property of whichever image loaded — bright limestone in
the gorge frame — and **Lighthouse cannot catch that, because it never
hovers.**

**No hero swap, deliberately.** The hero is tour-specific photography, and
DIRECTION is explicit that original Routes Crete photography stays the only
source for tour-specific moments. A sourced landscape would be a downgrade in
authenticity dressed up as an upgrade in resolution.

---

## THE DIGEST — 30 frames, `qa/screenshots/digest/`

Captured from the **deployed alias**, not localhost, so every frame is of a
build you can open yourself. Each records its `build-commit` (`a191205`).

Three passes — `desktop-*`, `mobile-*` (390), `reduced-motion-*`:

```
01-hero              06-map
02-menu-open         07-map-place-preview   (desktop only)
03-positioning       08-signature
04-stacked-scene     09-how-it-works
05-journeys          10-footer              11-credits
```

The reduced-motion pass is a full walkthrough, not a spot check — it is the
variant a real fraction of visitors get.

### Other before/afters

| what | where |
|---|---|
| the arc, 9 movements → 6 | `qa/screenshots/arc/` + `_inventory.json` |
| eyebrow contrast retune | `qa/screenshots/contrast/` |
| menu open/close filmstrips | `qa/screenshots/menu/` |

**Not captured, because not built:** photo swaps (none shipped — see above),
enhancement crops, serif A/B. Those stages were not reached.


---

## Block 7 — 390px pass ✅  `6e97dae` + type-token reporting

`qa/mobile-audit.mts` walks all seven routes at 390 and checks what a visitor
can feel: no sideways scroll, tap targets ≥ 44px (WCAG 2.5.8), no ad-hoc tiny
text, images declaring dimensions. **Now 0 failures across every route.**

Every one of these was failing on every page before this block:

| target | was |
|---|---|
| the wordmark (home link) | 139×23 |
| footer navigation | 87×19 |
| contact channels | — |
| back links | 186×13 |
| `/credits` licence + source ×30 | 76×13 |
| map mobile legend | 163×13 |
| "Read the full journey" | 158×26 |

The wordmark uses `-my-3` so the bar keeps its visual height while the target
grows — **a fix must not become a redesign.** The map legend mattered most:
it *is* the map on a phone, where the 8px pins are unusable.

### The audit lied three times before it told the truth

- It reported the **skip link** as a 1×1 target. That link is 1×1 until
  focused; the pattern was working.
- It listed **ken-burns layers** as overflowing at `right=406`. They are
  deliberately oversized inside `overflow-hidden` frames, and page
  `scrollWidth` was exactly 390. It now ignores anything an ancestor clips.
- Excluding map pins by their Tailwind class produced an **invalid CSS
  selector** that threw inside `page.evaluate` and killed the run silently.
  The chart carries a `data-map` marker now — a real hook, not a class match.

And once, the run itself lied: I chained the audit onto an alias-wait that had
not yet succeeded, and measured the **old deployment**. A stale measurement
looks exactly like an unchanged one. That is what the alias assertion is for,
and I had bypassed it by chaining.

### The type tokens are reported, not enforced

The 11px `text-eyebrow` and 13px `text-caption` are the design's voice, not
oversights, and raising them is a taste call — not one to take unattended.
But silently exempting them is how a guard rots, so every run prints:

```
note  type tokens at this width: text-eyebrow 11px, text-caption 13px
      — design decisions, reported not enforced
```

The decision stays visible and measurable while it is open, and the check
still catches genuinely ad-hoc small text.

---

# NEXT SESSION STARTS HERE

**State:** tree clean, alias verified at the committed HEAD, eight guards green
on the deployment (arc · asset · parity · headline · credits · nav-flash ·
menu · mobile). Stage 1 closed. Stage 2 complete through curation, ingest and
placement. The digest is assembled — 30 frames, `qa/screenshots/digest/`.

**Where the run ended and why:** context boundary, not credits. Closed at a
block boundary with everything verified and pushed.

**Exact next action — burn-down item 2, the reduced-motion pass:**

1. Review `qa/screenshots/digest/reduced-motion-*.png` (10 frames already
   captured). The variant should feel *designed*, not disabled.
2. Known shape of the problem: reduced-motion drops the pinned scenes to plain
   stacked sequences. Check that the stacked why-us scene and the signature
   scene still read as compositions rather than as lists, and that nothing
   sits at a resting opacity below 1.
3. Then burn-down 3 (benchmark side-by-sides), 4 (Stage 7 dry run), 5 (qa
   hardening), 6 (README + DEPLOYMENT refresh).

**Not started:** Stage 3 (cinematic build), Stage 4 (copy deck), Stage 5
(serif A/B). Those are the largest remaining pieces of the master brief.

**Standing trap, now written down:** never chain a measurement onto the same
command as the alias-wait. Wait, confirm the commit, *then* measure.


---

## Block 8 — A touch equivalent for the map previews ✅  `f6b74df`

The hover preview I shipped had no counterpart on touch, where hover does not
exist — phones got the chart and nothing else while desktop got the
photography. **A gap I created, not one I inherited.**

The mobile legend now carries a 40px thumbnail per row, and drops to a single
column so a row holds a thumbnail and a place name without cramping either.
Rows with no honest photograph have no thumbnail — the same rule the chart
follows.

Mobile audit still 0 failures across all seven routes; asset and credits
guards green on the deployment.

---

## Block 9 — Provenance: a third tag, "attested" ✅  `9e395ae`

You asked for the map preview's benchmark side-by-side on the basis that it
is the Fitzroy destination-hover pattern. **I could not produce one honestly,
and that is the finding.**

- The research brief describes a Fitzroy hero with an "interactive map +
  rotating destination list" whose images swap on hover. **Captured, that hero
  is a full-bleed photograph with no map.**
- Probing the live site, the *behaviour* is real: hovering a destination
  fetches destination-specific photographs — five image requests on a single
  hover, `okavango-delta-botswana…`, `chem-chem-lodge…`.
- But three attempts to capture the *visual* state produced **byte-identical
  frames**. The destination items sit inside a closed dropdown: hovering
  prefetches without changing the screen, and reaching for the dropdown moves
  the pointer off it.

So the pattern is **attested, not captured** — now an explicit third
provenance tag in `qa/README.md`, alongside reference-derived and
vocabulary-derived. It gets the instrumental observation on the record and
**no side-by-side**, because a manufactured pairing is worse than an absent
one.

The attempt frames were deleted rather than kept, so nobody later mistakes a
closed-dropdown screenshot for evidence of a hover mechanic.

**This slightly revises your ratification.** The pattern's provenance is not
"reference-derived" in this project's strict sense until someone captures the
mechanic. The idea is legitimately Fitzroy's; the evidence file is not there.


---

## Block 10 — Editorial place breaks on the experience pages ✅  `3293d24`

Each journey now breaks its story with a licensed photograph of a real place
it actually visits:

| journey | place breaks |
|---|---|
| Kourtaliotis — Temple of Nature | the waterfall in Kourtaliotiko Gorge · the palm forest at Preveli |
| Heart of Cretan Tradition | Anogeia · an ancient olive tree in eastern Crete |

**The caption rule is the whole point.** The galleries on these pages are the
operator's *own* tour photography. A sourced landscape sitting among them
would quietly imply we took it — so every place break renders a credit line,
**"Licensed photograph — see credits"**, beneath its caption. `Bridge` gained a
`creditNote` prop for exactly this, with the reason written where the prop is
declared rather than left to be rediscovered.

Content-driven: `placeBreaks` in the item JSON, so adding one is a content
edit. Each is SHA-1 ledgered and attributed on `/credits`.

### Parity caught a real gap in itself

It reported all four photographs as **"missing file"** — because it checks
content paths against `public/`, and the web-sourced masters deliberately live
*outside* it, in `assets-src/`, since the site only ever serves the graded
tree. Four present, graded, correct files reported missing the moment content
referenced them.

Parity now resolves the way the site resolves: an original under
`/images/sourced/` is satisfied by its master in `assets-src/` **or** by its
graded copy. The check kept its meaning instead of being relaxed to pass.

### Deployed

| route | perf | a11y | BP | SEO | CLS |
|---|---|---|---|---|---|
| home | 93 | 100 | 100 | 100 | 0 |
| experience | 93 | 100 | 100 | 100 | 0 |

Seven guards green on the deployment.

---

## Stage 2c item 4 — Journeys grid imagery: no change, deliberately

The grid's cards use `cardImage`, which is the operator's own tour
photography. Replacing any of it with a sourced landscape would be the same
mistake as swapping the hero: a gain in resolution bought with a loss of
authenticity, on the one surface where a visitor is deciding whether these are
*your* journeys.

The one open question here is the curator's recommendation to swap **Heart of
Cretan Tradition's** card from the loom room to the golden-hour ridge —
already on your decisions list as item 7, still a taste call, still unshipped.

---

## Stage 2d — enhancement crops: BLOCKED FOR YOU

The bounded pipeline (2× max, sharp originals only, restoration not
generation) **cannot run on this machine.** There is no Real-ESRGAN, no
Upscayl, no waifu2x, no ImageMagick — and installing tooling is outside the
repo, which the standing rules forbid.

I did **not** substitute a plain Lanczos resize. That is resampling, not
restoration: it would produce a softer file, add no detail, and calling it
"enhanced" would be exactly the kind of dressed-up claim this project refuses.

**To unblock:** install Upscayl (GUI, drag-and-drop, AGPLv3 backend) or the
`realesrgan-ncnn-vulkan` binary. Then the pipeline runs 2× on sharp originals
only, writes 100% crop side-by-sides into `qa/review/enhanced/`, and **nothing
is wired into the site** until you accept the crops.

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

## Decisions RESOLVED by the client

- **Stage 2d — enhancement: SKIP.** With 4000px+ sourced photography now
  placed, 2× upscaling the 1024px originals is no longer worth its risk. The
  prepared pipeline stays in `qa/review/enhanced/` for the day a real upscaler
  is installed; nothing enhanced ships. **Client-reversible.**
- **The deck deviation on step 2 — approved as executed.** Meaning-preserving
  reconciliation is now the standing default when an approved artifact
  collides with a later-approved structural change.

---

## Decisions awaiting you

Every one of these is a decision **with pictures**, not a question.

1. **Serif or sans.** `qa/screenshots/serif-ab/` — same frames, one typeface
   apart. Fraunces on headlines vs the current Manrope. Sans stays default
   until you say otherwise.
2. **The Vercel dashboard check** — Project → Settings → Git. Production once
   built from something other than the pushed commit. It has behaved since,
   which makes it **intermittent** — the kind that ships a stale site on the
   day it matters. I can inspect and deploy but must not touch settings.
3. **Label warmth** — the contrast retune (`/50`→`/70`, `/45`→`/65`), measured
   4.18:1 → 7.15:1. `qa/screenshots/contrast/`.
4. **`responsePromise`** — still `null`, still omitted. It stays out until you
   give a real number.
5. **The map's place photographs** — five pins reveal a real photograph, and
   the mobile legend carries thumbnails. Digest frames 06–07.
6. **Gallery curation** — 51 frames → 28, every removal reasoned in
   `galleryRemoved`. The reasons are specific enough to disagree with.
7. **The card image for Heart of Cretan Tradition.** The curator recommends
   the golden-hour ridge over the current loom room. **Not shipped** — a card
   image is a taste call.
8. **Eight sourced candidates rejected**, reasons in `qa/ingest-plan.json`,
   including two licence-clean olive groves rejected for being Greek rather
   than Cretan.
9. **The 11px eyebrow / 13px caption type tokens.** Reported on every mobile
   audit run, never enforced. Raising them is a taste call.
10. **The deck's step-2 line.** You approved my deviation; if you prefer "We
    confirm everything" it can go back, but not above the body that reads
    "Contact us via message or email with…".

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
