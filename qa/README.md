# QA harnesses

All of these expect the **production** server — dev-server numbers and timings are
meaningless for both performance and motion.

```bash
npm run build
npx next start -p 3009
```

| Script | Purpose |
|---|---|
| `node qa/visual-check.mts [filter ...]` | Screenshots of every route and motion pattern → `qa/screenshots/` |
| `node qa/benchmark-shots.mts [url]` | Reference captures → `qa/benchmark/`. Study material; nothing here ships |
| `node qa/lighthouse.mts [route ...]` | Lighthouse mobile → `qa/lighthouse/` |
| `node qa/parity.mts` | Content parity: originals preserved, rendered copy present |
| `node qa/asset-audit.mts` | No dangling image paths; everything photographic is graded |
| `powershell -File qa/grade.ps1 -Grade B` | Regrade the corpus |
| `powershell -File qa/grade-diff.ps1` | Gate any grade change against the approved reference |

## Environment constraints (learned the hard way)

**Start the server and capture inside the SAME shell invocation.** A server started
in one tool call does not survive into the next one in this environment — it reports
"Ready" and is gone by the time the next command runs. Two failed capture runs came
from exactly this. Either:

- start it in a *background* task and capture from a separate call, or
- start it and run the capture in one command.

`qa/preflight.mts` guards this: every capture set asserts the target responds before
capturing and refuses to produce an empty run. It also stamps `_BUILD.json` with the
commit, a **dirty-tree flag**, the base URL and a timestamp, so a stale build can
never masquerade as verification.

## Capture rules

- **Target sections by selector, never by page percentage.** Fixed percentages
  silently stopped pointing at their subject the moment a stacked scene added three
  viewports. `shotAt()` records a missing selector as a failure rather than
  photographing whatever happened to be there.
- **A failing group must not take the run down.** `/contact` embeds a third-party
  form whose iframe once aborted everything after it. Navigation waits for
  `domcontentloaded`, and `group()` isolates each set.

## Pattern provenance

When reporting a motion pattern, tag where it is judged from:

- **reference-derived** — has a counterpart in `qa/benchmark/`; ships with a
  side-by-side.
- **vocabulary-derived** — comes from the brief, not the reference; no side-by-side
  exists and none should be manufactured.

## Deploy failures: read the error, not the coincidence

A Vercel deploy failed while direction drafts (`/design/a`, `/design/b`) were
still in the tree. The first failure named `/design/a`, so the drafts were
deleted as the suspected cause. **They were innocent.** The next failure named
an ordinary production route, which is what finally identified the real cause:

> `vercel deploy --temporary` builds **locally** and uploads the prebuilt
> output. Vercel's builder mishandles Windows path separators in the prebuilt
> manifest for dynamic `[slug]` routes, so the first dynamic route it reaches
> fails — whichever one that happens to be.

Deploy through the Git integration (Vercel builds on Linux from the pushed
commit) rather than `--temporary` from this machine.

The lesson is the same one the rest of this directory is built on: the first
name in a stack trace is a *symptom's location*, not a diagnosis. Deleting the
thing the error happened to mention cost real work and fixed nothing.

## Web-sourced masters live outside `public/`

Originals are in `assets-src/sourced/` (78 MB), not `public/`. The site only
ever serves the graded tree, so shipping the masters in the deploy bundle paid
78 MB for files no request can reach. They stay in the repo — they are the
provenance behind the licence ledger — just not routable. `qa/grade.ps1` reads
both roots and grades them to the same destination paths as before.

## Two lessons from the spaceless headline

### A measuring state is production UI

`SplitLines` renders a measuring copy, measures the real line boxes, then
renders masked lines. It is tempting to think of the measuring copy as
scaffolding. It is not: **it is the only copy on screen until measurement
completes**, so it is the first thing every visitor sees, and on a cold cache
behind a webfont it is on screen for a noticeable beat.

The bug lived exclusively in that state — the space separating each word was
inside the `inline-block` word span, where CSS discards it as trailing
whitespace at the end of that box's own line. The finished, measured render was
always correct. Reviewing only the settled state would have found nothing.

> If a component measures then renders, its measuring state ships. Test the
> first paint, not just the final one. `qa/headline-guard.mts` asserts both
> phases for exactly this reason.

### A guard must measure what a sighted reader sees

`qa/headline-guard.mts` failed twice on its own instrument before it failed on
anything real. Both are worth knowing by name, because both produce output that
looks exactly like the bug being hunted:

1. **sr-only double-count.** Reading `innerText` off the headline counted the
   copy twice — the visible masked lines plus the `sr-only` string kept for
   assistive tech — reporting `"Explore the unknown Explore the unknown"`. The
   accessibility feature looked like a rendering fault.
2. **Block-line gluing.** Switching to `textContent` concatenated the measured
   lines with no separator, reporting `"Private TransferServices in"`. A correct
   line break looked identical to the missing-space bug.

Both were fixed by measuring the *visible* text properly: clone the subtree,
drop every hidden and `sr-only` node, and separate block-level elements before
reading. A guard that reads the DOM naively will fabricate the very defect it
was written to catch.

### On the record: the prime suspect was wrong

The defect note named the orphan fix's word-span trimming as the likely cause.
It was a reasonable suspect — that code had recently changed and it handles
exactly this text. It was not the cause. The cause was CSS whitespace collapse
inside an `inline-block`, which no amount of reasoning about the trimming would
have reached.

This is the same shape as the Vercel `--temporary` misdiagnosis above, and the
same shape as the LCP investigation that found the hero *text* rather than the
hero image. Three times now, the plausible story and the true cause have been
different things, and instrumenting past the framing is what closed the gap
each time. It is the standard for this project.

## A harness that tests behaviour will not notice an absent element

`qa/menu-audit.mts` passed 19 assertions on a build where the overlay menu was
not an overlay.

`@utility grain { position: relative }` is emitted into the same utilities
layer as Tailwind's position utilities, at equal specificity, and **after**
them:

```
.absolute{position:absolute}.fixed{position:fixed}.grain,.relative{position:relative}
```

So `className="grain fixed inset-0"` computed to `position: relative`. The
"fullscreen" panel was an in-flow block: it added its own height to the
document, covered only the top 601px of an 844px phone screen, and threw away
the reader's scroll position when it took focus. (`.sticky` is emitted *after*
`.grain`, which is why the two pinned scenes were unaffected — the bug was
real but narrower than it first looked.)

Every one of those 19 assertions was about what the menu **did**: focus moved
correctly, Escape closed it, the tones inverted, the previews were lazy, the
tap targets were large enough. Not one asked whether the panel was **there**.
A mid-transition capture even showed the page visible below the panel's bottom
edge, and it was read as the panel still fading up.

> Assert existence and extent before behaviour. `position`, bounding box
> against the viewport, hit-testing the corners, document height, scroll
> position. A component can do everything right and still not be on screen.

The clash is now a build-time failure in `qa/preflight.mts` rather than a
comment, because nothing about the class list looks wrong when you read it.
That guard promptly failed on the comment *explaining* it — prose quoting both
the emitted CSS and the offending pairing — so it blanks comments before
scanning. Fourth instance of the same rule: **a guard must measure the thing,
not text that resembles the thing.**

## Never trust the first Lighthouse run after a deploy

Measured on the same commit, minutes apart, against the same URL:

| | performance | LCP | TBT | SI |
|---|---|---|---|---|
| first run after deploy | **79** | 3.8 s | 190 ms | 7.8 s |
| after two warming fetches | **96** | 2.7 s | 60 ms | 2.5 s |

Nothing changed but the cache. A fresh deployment has no generated
`/_next/image` variants, so the first visitor pays for every derivative of
every image on the page at once — which lands almost entirely on Speed Index.

A 17-point swing is more than enough to fake a regression, and the temptation
is to go hunting for what "broke". Warm the edge first (`curl` the route a
couple of times), then measure. Report which one you ran.

The same effect is why the deployed numbers beat the local baseline (home
91 → 96, experience 89 → 99) despite LCP being *slower* in absolute time: the
CDN and the image optimizer improve everything except the round trip.

## Don't parse colours — make the browser composite them

`qa/contrast-shots.mts` first measured contrast by regexing the numbers out of
`getComputedStyle().color` and feeding them to an sRGB luminance formula. But
Tailwind v4 authors these colours in **oklab**, so the computed value is
`oklab(0.898 0.004 0.032 / 0.7)`. The regex happily read those three oklab
components as if they were 0–255 channels and reported:

```
before  text-sand-200/50   1.12:1
after   text-sand-200/70   1.12:1
```

A real fix, reported as literally no change. Worse than a wrong number: a
number that says "nothing happened".

The browser already knows how to composite alpha and resolve any colour space
to sRGB pixels. So the ratio is now computed in-page — paint the background on
a canvas, paint the semi-transparent foreground over it, read the pixel back:

```
before  /50 → rgb(118,120,113) = 4.18:1 FAIL   /45 → 3.61:1 FAIL
after   /70 → rgb(164,160,147) = 7.15:1 pass   /65 → 6.30:1 pass
```

Which matched the by-hand sRGB estimate that justified the fix (4.18 and 6.29)
to two decimal places — the arithmetic was never the problem, the colour space
was.

> Fifth instance of the same rule in this directory: **a guard must measure the
> thing, not a representation of the thing.** Here the representation was a
> colour space the formula didn't speak.

### Capturing an honest "before"

The before/after stills do not reconstruct the old styling by editing CSS back.
They are captured from the last **real deployment** that still carries the old
values, using the per-deployment Vercel URL. Two shipped builds, not one build
and a guess — and it doubles as proof the two deployments genuinely differ.

## Which Vercel URL to measure, and why it matters

Three URLs point at the same production deployment, and they are not
interchangeable:

| URL | use it for | why not the others |
|---|---|---|
| `<project>-<hash>-<team>.vercel.app` | proving what a deployment contains | per-deployment, immune to alias caching |
| `<project>-git-main-<team>.vercel.app` | content verification | **carries `X-Robots-Tag: noindex`** |
| `<project>.vercel.app` | Lighthouse, sharing | can serve a stale cached copy at some edges |

The git-main alias is the right way to confirm a push actually landed — it
bypasses the production alias's edge cache, which is what made a shipped build
look missing. But measuring Lighthouse there reports **SEO 69**, because Vercel
marks branch aliases `noindex` and the `is-crawlable` audit fails. That looks
exactly like a catastrophic SEO regression in your own code. It isn't; the
production alias returns no such header and scores 100.

> Verify content on the git-main alias. Measure Lighthouse on the production
> alias. Say which one a number came from.

## Performance posture — the CDN paid for the design

Stage 0 and Stage 1 both measured better deployed than locally:

| | local | deployed |
|---|---|---|
| home | 91 → 88 | 97 → **94** |
| experience | 89 → 88 | 91 → **99** |

The edge and the image optimizer delivered the transfer-bound points we
explicitly refused to buy by cutting the design. Absolute LCP is *slower*
deployed (a real network round trip), yet the scores are higher. This is the
evidence behind the accepted 89–95 band: the local numbers are a pessimistic
floor, not the visitor's experience.

## Read the type before rewriting the data it describes

Collapsing the five booking steps to three, I rewrote `howToBook.steps` with
fields of my own invention (`title`, `text`, `absorbed`) and **destroyed the
original bodies** — including the documented client correction on step 3
(`titleOriginal` + `titleFlag` citing `CONTENT_INVENTORY.md §4.4 / Q1`). The
real shape was `key` / `number` / `title` / `body`.

Nothing was lost, and it is worth being precise about why — three independent
mechanisms caught it in sequence:

1. **`parity.mts` constrained the change before it started.** Its required-string
   list meant the collapse *had* to keep three specific titles on the homepage,
   which is what forced a careful design instead of a free rewrite.
2. **The TypeScript interface exposed the invented fields** the moment I went to
   render them.
3. **`git checkout -- content/site.json` restored the destroyed originals**,
   because the loss had not yet been committed.

> Before rewriting a content file, read the interface that consumes it. A JSON
> file has a schema whether or not it is written down here — and in this project
> it is written down, in `src/lib/types.ts`.

## "Which commit is live?" must never be an inference

Two separate incidents, one root cause: no way to see what a deployment was
built from. A shipped build looked missing (stale alias cache), and later the
production alias served a homepage that did not match `origin/main` while
`vercel inspect` printed no commit at all.

Every response now carries the answer:

```bash
curl -s https://<url>/ | grep build-commit
```

`build-commit` and `build-ref` come from `VERCEL_GIT_COMMIT_SHA` /
`VERCEL_GIT_COMMIT_REF`, falling back to `BUILD_COMMIT` for local builds and
`local` otherwise. Check it *first* whenever deployed behaviour disagrees with
the repo — before reading code, before re-running a guard, before believing a
regression is real.


## Provenance: attested is not the same as captured

The project tags every motion pattern as **reference-derived** (has a
counterpart in `qa/benchmark/`, ships with a side-by-side) or
**vocabulary-derived** (no counterpart exists, and none should be
manufactured). The map's hover photo-preview sat awkwardly between the two,
and it is worth writing down why.

The research brief describes Fitzroy's homepage as an "interactive map +
rotating destination list" where "large photographic country images swap on
hover". Captured, the hero is a full-bleed photograph with **no map**, and the
map-ish section below it had not rendered its content at capture time.

Probing the live site directly, the *behaviour* is real: hovering a
destination item fetches destination-specific photographs
(`okavango-delta-botswana…`, `chem-chem-lodge…`) — five image requests on a
single hover. So the mechanic exists.

But three attempts to capture the **visual** state produced byte-identical
frames: the destination items live inside a closed dropdown, so hovering them
prefetches without changing anything on screen, and reaching for the dropdown
moved the pointer off it.

**So this pattern is attested, not captured.** The honest tag is a third one:

> **attested** — the behaviour was observed instrumentally (network, DOM), but
> no benchmark frame shows it. It gets the observation on the record and
> **no side-by-side**, because a manufactured pairing is worse than an absent
> one.

The frames from those attempts were deleted rather than kept, precisely so
nobody later mistakes a closed-dropdown screenshot for evidence of a hover
mechanic.

## Do not run the deployed suite as a tight batch

The Stage 7 dry run executed all eight guards back-to-back against the
deployment. Two reported failure — `nav-flash-guard` and `menu-audit`. Both
passed immediately on individual re-run, with `0 failure(s)` and exit 0.

Eight Playwright-driven guards launched in sequence against a *remote* origin
contend for the same browser, CPU and network. The failures were timeouts, not
defects, and a batch that cries wolf twice out of eight is worse than no batch:
the next real failure gets waved away as "probably contention".

> Run the deployed suite with a pause between guards, or run the slow
> browser-driven ones (`menu-audit`, `nav-flash-guard`, `mobile-audit`)
> individually. Locally the batch is fine — the contention is with the network,
> not the machine.

And always re-run a single failing guard on its own **before** believing it.
Twice now the first reading has been the wrong one.
