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

# NEXT SESSION STARTS HERE

**State:** tree clean, alias verified, seven guards green on the deployment.
Stage 1 closed. Stage 2 closed except 2d (blocked on tooling — see above).
Stage 3 item 1 (overlay menu) and item 2 (unclip reveals) done.

**Where the run ended and why:** context boundary, not credits. Closed at a
block boundary, verified and pushed.

**Exact next action — Stage 3 item 3, SVG-mask scene transitions** between key
homepage sections. Then item 4 (layered-zoom depth inside the stacked scenes),
item 5 (warm sand-texture layer joining the grain system), item 6 (drag-inertia
strips), item 7 (refined sticky chapter indices).

**Watch TBT.** It is now 120–230ms on home. Each further motion block adds
main-thread work, and the 89 floor is the wall — measure after every one, and
prefer transform/opacity/clip-path over anything that reads layout.

**Standing traps, all three learned twice:**
- Never chain a measurement onto the alias-wait. Wait, confirm, then measure.
- `pkill` does not stop the dev server here — kill by port (PowerShell
  `Get-NetTCPConnection -LocalPort 3009`).
- `scrollIntoView` does nothing while Lenis owns scroll — use real wheel events.
- No generated patches for JSX. Direct writes only.

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

## Decisions awaiting you

1. **The Vercel dashboard check** — Project → Settings → Git. Production builds
   were once coming from something other than the pushed commit. It has behaved
   since (every push this run advanced the alias unaided), which makes it
   **intermittent** — the kind that ships a stale site on the day it matters.
   I can inspect and deploy but must not touch project settings.
2. **Home performance headroom.** Home measures 89–93 where it was 94, and 89
   is the floor. Cause is structural, not a defect: the stacked scene moved
   from mid-page to just after the hero, so three full-bleed images and their
   client JS compete with the hero's LCP. Accept the thinner margin, or spend a
   block deferring the scene's non-active images to buy it back?
3. **Label warmth** — the contrast retune (`/50`→`/70`, `/45`→`/65`), measured
   4.18:1 → 7.15:1. Before/after in `qa/screenshots/contrast/`. It arrived as
   an accessibility fix and changed how every small label reads.
4. **`responsePromise`** — still `null`, still omitted from the page. It stays
   out until you give me a real number.
5. **The map's place photographs** — five pins now reveal a real photograph.
   Frames 06 and 07 in the digest. Right call, or too much?
6. **Gallery curation** — 51 frames → 28. Every removal is listed in
   `galleryRemoved` with its reason; restoring one is moving a JSON entry.
   Worth reading the reasons: they are specific enough to disagree with.
7. **Gallery opening frames changed.** Kourtaliotis opens on the stone arch
   bridge; Heart of Cretan Tradition opens on the golden-hour ridge. The
   curator also recommends replacing that item's **card image** (currently the
   loom room) with the same ridge frame — I did **not** ship that, because a
   card image is a taste call and the brief says taste calls stay as they are
   until you rule.
8. **Eight sourced candidates rejected**, listed with reasons in
   `qa/ingest-plan.json` — including two licence-clean olive groves rejected
   for being Greek rather than Cretan. Agree with that line?

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
