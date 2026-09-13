# Closing record

The redesign was built, deployed, verified and closed on 2026-09-11. **It is
open again for one decision.** After the close, the client asked for a design
reset — new colours, a new look, new hero photographs — and three directions
now wait for his pick. This page is the front door: what the project is, where
it lives, how to change the things most likely to need changing, and what is
deliberately parked.

The full history — every decision and every thing that went wrong before it
went right — is in [`MORNING.md`](MORNING.md), newest first.

---

## Open: the design reset

**Waiting on the client: pick A, B or C.** Everything else the reset asked
for is done.

| | state |
|---|---|
| **Team section** | Out of the homepage, live since `392602f`. The names, roles and intro stay in `content/site.json → team`; the portraits are retired and no URL serves them; `#team` lands on `#positioning`. |
| **Three directions** | Live drafts: `/design-3` (the index), `/design-3/a` Deep Aegean, `/design-3/b` Cycladic Light, `/design-3/c` Warm Editorial. The same real homepage content, each with its own palette, type and hero photograph. Noindex, linked from nowhere, and deleted after the pick — the command is in `src/app/design-3/layout.tsx` and in [`DEPLOYMENT.md`](DEPLOYMENT.md). |
| **The photo pool** | Ten new frames in `content/photo-credits.json` (29 photographs in all). The rest of the verified pool, with each verdict, is in the gitignored `.hunt/design-reset/`. |
| **The client lists** | [`PHOTOGRAPHERS.md`](PHOTOGRAPHERS.md), [`TOURISM-LIBRARIES.md`](TOURISM-LIBRARIES.md), [`SHORTLIST.md`](SHORTLIST.md). |
| **CC BY-SA contact sheet** | Local only: `.hunt/design-reset/by-sa/contact-sheet.html`. |

The direction he picks is then rolled out across the whole site.

**The client's decisions.** This repository takes none of them for him:

1. **The direction** — A, B or C.
2. **CC BY-SA.** Several of the most beautiful frames found are BY-SA. Using
   any of them obliges publishing our graded version under BY-SA on
   `/credits`.
3. **Photographer permissions.** `PHOTOGRAPHERS.md` names the frames and gives
   the message in Greek and English, and he sends it. A written yes is stored
   under `assets-src/stock-local/permissions/` before its frame ships; the
   credits guard fails without it.
4. **Paid stock.** `SHORTLIST.md` prices it, and buying is his. It needs a
   private repository or a private asset store first: iStock's licence
   forbids letting others download the file, and this repository is public.
5. **Camera originals.** Still the largest improvement available. Two of the
   draft critics rated the journeys cards the weakest part of the page, and
   those cards use the client's own tour photographs, several only 683×1024.
6. **HSTS `includeSubDomains` and `preload`, and Vercel Bot and Deployment
   Protection.** These are domain and project-settings decisions for the
   cutover, not for this repository's automation.

---

## Where it lives

| | |
|---|---|
| **Live** | https://routes-crete-redesign.vercel.app |
| **The original site** | https://www.routescrete.gr/ — still live, untouched |
| **Repository** | https://github.com/ikeskrim/routes-crete-redesign |
| **Deploys from** | `main` → Vercel production alias, automatically |

**The domain has not been cut over.** `routescrete.gr` still serves the original
site. Moving it is a decision and a DNS change, taken with the client, step by
step, in its own conversation — see [`DEPLOYMENT.md`](DEPLOYMENT.md) for the
runbook, the rollback and the order of operations. Nothing in this repository's
automation touches DNS, the domain, or the Vercel project settings.

### Is my change live?

Every page carries the commit it was built from. One script reads it and
answers in one of three ways:

```bash
node qa/alias-assert.mts $(git rev-parse --short=7 HEAD)
```

| answer | exit | meaning |
|---|---|---|
| **LIVE** | 0 | the alias is serving that commit |
| **PENDING** | 1 | the alias answers, but with an older commit — still building, or not picked up |
| **BLOCKED** | 2 | Vercel's bot mitigation is challenging automated requests from this machine |

BLOCKED is never "not deployed". The build can be healthy and a real browser
unaffected; the edge is simply declining to answer a robot. Read build state
from `npx vercel inspect <deployment-url> --scope domisi`, wait, and run the
probe once more. Do not try to work around the challenge.

---

## What the site is

A content-driven multi-page site. **Every word and every photograph of the
original is preserved** — the copy that was rewritten is tracked line by line in
[`COPY-MAP.md`](COPY-MAP.md), marked *surfaced*, *written* or *kept*, and every
original value is still in the content files under an `_original` key.

Everything a visitor reads or sees comes from `content/`:

```
content/
  site.json                     nav, contact, footer, booking steps, team, socialProof
  experiences/*.json            one file per experience
  transfers/*.json              one file per transfer
  photo-credits.json            every sourced photograph: licence, source, SHA-1
  blur-map.json                 generated blur placeholders, keyed by graded path
```

There is no CMS and no database. A JSON file is the source of truth, and the
routes, sitemap, menu previews and index pages all read from it.

What ships, as the client approved it: every photograph through **Grade C
"vivid"** (one constant, `GRADE` in `src/lib/content.ts`); **Fraunces** on the
headlines; the full-screen overlay menu with its mask reveal and drifting
photograph; the journeys panning sideways on desktop; the hero answering the
cursor; the route as a journey that draws itself; a film grain over the whole
site; and on the transfers page, Rethymno's harbour at night at the top, with
the van in its card and gallery.

---

## Adding an experience or a transfer

1. **Drop a JSON file** into `content/experiences/` (or `content/transfers/`).
   The collection is read from the directory, so the file appearing is enough —
   nothing needs registering. Copy an existing file as the template; `slug` sets
   the URL and `order` sets its position.
2. **Put the photographs** under `public/images/experiences/<slug>/` (or
   `public/images/transfers/<slug>/`). Content files always reference the
   *ungraded* path; the site resolves it through the live grade at render time.
3. **Grade them, then generate their blur placeholders:**
   ```bash
   powershell -File qa/grade.ps1 -Grade C
   powershell -File qa/blur-map.ps1
   ```
   Name the grade. The script's own default is Grade A, not the live grade, and
   an ungraded-looking photograph among the vivid ones is the result of
   forgetting. Asset-audit fails on any rendered photograph with no blur
   placeholder — that is how the whole site once shipped without them.
4. **If a photograph is sourced rather than the client's**, add it to
   `content/photo-credits.json` with its licence, source and SHA-1, having read
   the licence on the photograph's own page. Where the original goes depends on
   the licence, because this repository is public:
   - **PD, CC0, CC BY:** the original is committed in `assets-src/sourced/`.
   - **Unsplash, Pexels, or a written permission:** the original is held in the
     gitignored `assets-src/stock-local/`, and only the graded image ships. A
     written permission is stored under `assets-src/stock-local/permissions/`.
   - **Pixabay:** held entirely; nothing graded ships.
   - **BY-SA, NC, ND:** refused.

   The credits guard fails on any of these, and on a checksum that no longer
   matches the file. On **itinerary** surfaces — cards, waypoints, galleries,
   route stops — photograph only places this site names. On **mood** surfaces —
   the hero, section bands, the closing scene, dark backgrounds — a photograph
   of Crete broadly is allowed. Either way, caption only what the frame
   verifiably shows.
5. **Run the guards** (below). They will tell you if you missed something.

**Swapping a hero or card image** is one line: set `heroImage` or `cardImage`,
and keep the previous value in `heroImage_original` / `cardImage_original` with a
note saying why. That convention is what makes every one of these decisions
reversible. A landscape hero needs nothing extra — the hero reads the
photograph's real dimensions and asks phones for the width `object-cover`
actually shows.

---

## Verifying a change

The QA scripts expect a **production** build — dev-server numbers are
meaningless:

```bash
npm run build
npx next start -p 3009
```

Then, from another shell, **the ten guards**:

```bash
node qa/headline-guard.mts && node qa/arc-guard.mts && node qa/nav-flash-guard.mts && node qa/credits-guard.mts && node qa/menu-audit.mts && node qa/asset-audit.mts && node qa/parity.mts && node qa/mobile-audit.mts && node qa/text-contrast.mts && node qa/security-headers.mts
```

Point any of them at the deployment with `QA_BASE_URL=https://routes-crete-redesign.vercel.app`.

**Run them un-piped.** `node qa/parity.mts | tail` always exits 0 no matter what
parity found, so a piped guard is a guard that cannot fail. Run them one after
another, not as a tight parallel batch: they contend for the machine, and enough
automated traffic trips Vercel's bot challenge.

For performance:

```bash
QA_LH_RUNS=5 QA_BASE_URL=https://routes-crete-redesign.vercel.app node qa/lighthouse.mts
```

Three routes by default — home, an experience, the transfer — each measured five
times, interleaved, gated on the **median**. A single run against a deployment
measures the network as much as the build. The budget is the one this project
has been held to throughout: performance ≥ 89, a11y 100, CLS 0, TBT ≤ 250 ms.
**Do not lower a floor to make a red run green.** Localhost on this machine runs
about ten points under the deployment; the deployment is the only gate.

Measured at close, on the deployment, median of five runs per route. At close
the routes were measured one at a time: the interleaved run kept being cut off
on this machine, and [`MORNING.md`](MORNING.md) records why.

| route | performance | spread | a11y | TBT | CLS |
|---|---|---|---|---|---|
| `/` | **90** | 88 89 90 91 94 | 100 | 248 ms | 0 |
| `/experiences/kourtaliotis-temple-of-nature` | **93** | 88 91 93 93 95 | 100 | 88 ms | 0 |
| `/transfers/private-transfers-rethymno` | **94** | 87 93 94 94 94 | 100 | 57 ms | 0 |

Measured on commit `2345b01` — the last commit that changed what the site renders.

---

## Parked

None of it blocks anything, and none of it is work waiting to be done here.

- **Verified reviews for the trust badge.** The rotating badge is built and
  empty, closed by the client as "not yet". No rating, review count or award
  exists for this business. It renders only when `content/site.json →
  socialProof` carries all three of `text`, `href` and `verifiedOn`, and then
  only as a link to the listing a reader can check. Social proof renders from
  verified data or not at all.
- **The client's own golden-hour photography, or camera originals.** Three
  sourcing passes could not find a licence-clean warm-light frame of the places
  this site names, apart from the Rethymno harbour at night. The Tradition day's
  own photographs are all 1024px or under; originals from the client's camera
  would be the single largest improvement still available.
- **Video footage.** `content/video-inbox/` is empty and the ambient system
  ships stills, as designed. The inbox and the transcode pipeline stay in place,
  unwired, for whenever footage arrives.
- **The enhancement pipeline.** Enhanced image files exist and are deliberately
  not wired into the site. That has been a hard wall from the start.
- **The Vercel dashboard check (D2).** Production once built from something other
  than the pushed commit. It has behaved since, which makes it intermittent
  rather than fixed. The build stamp and the alias probe make a recurrence
  detectable; confirming Project → Settings → Git is dashboard work for the
  client, not something this repository's automation touches.

And two things that are not parked but next, in this order:

1. **The client's pick on `/design-3`**, then that direction rolled out across
   the site and the drafts deleted.
2. **The `routescrete.gr` cutover**, with the client, in its own conversation.
   See [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## The rest of the paperwork

| file | what it holds |
|---|---|
| [`README.md`](README.md) | stack, commands, architecture, the guards in detail |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | the cutover runbook, rollback, how deploys actually work here |
| [`COPY-MAP.md`](COPY-MAP.md) | every copy change, with provenance |
| [`MORNING.md`](MORNING.md) | the full build log, every client decision, and the closing record |
| [`BACKLOG.md`](BACKLOG.md) | what was considered and not done, with reasons |
| [`qa/README.md`](qa/README.md) | what each guard checks, and the failure that made it necessary |
| [`PHOTOGRAPHERS.md`](PHOTOGRAPHERS.md) | photographers to ask, the frames per surface, and the permission message in Greek and English |
| [`TOURISM-LIBRARIES.md`](TOURISM-LIBRARIES.md) | the official Cretan and Greek image libraries: their terms, and what a request must cover |
| [`SHORTLIST.md`](SHORTLIST.md) | paid stock per direction and surface, with cost, and the private-repository precondition |
