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
