# Closing record

The redesign is built, deployed and verified. This page is the front door: what
the project is now, where it lives, how to change the things most likely to
need changing, and what is deliberately still open.

Nothing here is waiting on more building.

---

## Where it lives

| | |
|---|---|
| **Live (this build)** | https://routes-crete-redesign.vercel.app |
| **The original site** | https://www.routescrete.gr/ — still live, untouched |
| **Repository** | https://github.com/ikeskrim/routes-crete-redesign |
| **Deploys from** | `main` → Vercel production alias, automatically |

Every page carries the commit it was built from, so "is my change live?" is one
command rather than an inference:

```bash
curl -s https://routes-crete-redesign.vercel.app/ | grep build-commit
```

The domain has **not** been cut over. `routescrete.gr` still serves the
original site, and moving it is a decision plus a DNS change — see
[`DEPLOYMENT.md`](DEPLOYMENT.md), which carries the runbook, the rollback and
the order of operations.

---

## What the site is

A content-driven multi-page site. **Every word and every photograph of the
original is preserved** — the copy that was rewritten is tracked line by line
in [`COPY-MAP.md`](COPY-MAP.md), marked *surfaced*, *written* or *kept*, and
every original value is still in the content files under a `_original` key.

Everything a visitor reads or sees comes from `content/`:

```
content/
  site.json                     nav, contact, footer, booking steps, team
  experiences/*.json            one file per experience
  transfers/*.json              one file per transfer
  photo-credits.json            every sourced photograph, its licence and source
```

There is no CMS and no database. A JSON file is the source of truth, and the
routes, sitemap, menu previews and index pages all read from it.

---

## Adding an experience or a transfer

1. **Drop a JSON file** into `content/experiences/` (or `content/transfers/`).
   The collection is read from the directory, so the file appearing is enough —
   nothing needs registering. Copy an existing file as the template; `slug`
   sets the URL and `order` sets its position.
2. **Put the photographs** under `public/images/experiences/<slug>/`.
3. **Grade them:** `pwsh qa/grade.ps1`. Content files always reference the
   *ungraded* path; the site resolves it through the current grade at render
   time (`src/lib/content.ts`). Changing the whole site's look is editing one
   constant — `GRADE` — not migrating every file.
4. **If a photograph is sourced rather than the client's**, add it to
   `content/photo-credits.json` with its licence and source. This is enforced:
   the credits guard fails the build if an attributed image is missing, and
   BY-SA and NC licences are refused outright.
5. **Run the guards** (below). They will tell you if you missed something.

**Swapping a card image** is one line: set `cardImage`, and keep the previous
value in `cardImage_original` with a note saying why. That convention is what
makes any of these decisions reversible.

---

## Verifying a change

The QA scripts expect a **production** build — dev-server numbers are
meaningless:

```bash
npm run build
npx next start -p 3009
```

Then, from another shell:

```bash
node qa/headline-guard.mts && node qa/arc-guard.mts && node qa/nav-flash-guard.mts && node qa/credits-guard.mts && node qa/menu-audit.mts && node qa/asset-audit.mts && node qa/parity.mts && node qa/mobile-audit.mts
```

Point any of them at the deployment instead with `QA_BASE_URL`.

**Run them un-piped.** `node qa/parity.mts | tail` always exits 0 no matter
what parity found, so a piped guard is a guard that cannot fail. This is a
standing rule in this repository and it was learned the hard way.

For performance:

```bash
QA_LH_RUNS=5 QA_BASE_URL=https://routes-crete-redesign.vercel.app node qa/lighthouse.mts / /experiences/kourtaliotis-temple-of-nature
```

It gates on the **median** of five interleaved runs, not a single run. A single
Lighthouse run against a deployment measures the network as much as the build:
the same commit scored anywhere from 87 to 99 on the same route here. The
budget it enforces — performance ≥ 89, a11y 100, CLS 0, TBT ≤ 250 ms — is the
one this project has been held to throughout. **Do not lower a floor to make a
red run green.**

Current, median of five on the deployment: `/` **94**, experience page **95**,
a11y 100, CLS 0 on both.

---

## Still open

None of it blocks anything, and none of it is mine to close.

- **The Vercel dashboard check.** Production once built from something other
  than the pushed commit. It has behaved since, which makes it intermittent
  rather than fixed. Every response now carries `build-commit` and the alias is
  asserted after every push, so a recurrence is *detectable*; confirming
  Project → Settings → Git is dashboard work, and project settings are not
  something this repository's automation touches.
- **Video.** `content/video-inbox/` is empty and the ambient system ships
  stills, which is what it was designed to do when no footage exists. The inbox
  and the transcode pipeline stay in place, unwired, for whenever footage
  arrives.
- **The enhancement pipeline.** Enhanced image files exist and are deliberately
  **not** wired into the site. That has been a hard wall from the start.
- **The `routescrete.gr` cutover.** A conversation, then a DNS change. See
  [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## The rest of the paperwork

| file | what it holds |
|---|---|
| [`README.md`](README.md) | stack, commands, architecture |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | cutover runbook, rollback, environment |
| [`COPY-MAP.md`](COPY-MAP.md) | every copy change, with provenance |
| [`MORNING.md`](MORNING.md) | the full build log and the ten client decisions |
| [`BACKLOG.md`](BACKLOG.md) | what was considered and not done, with reasons |
| [`qa/README.md`](qa/README.md) | what each guard checks and why it exists |
