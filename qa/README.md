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
