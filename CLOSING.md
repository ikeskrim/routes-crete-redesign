# Closing record

The redesign was built, deployed, verified and closed on 2026-09-11. It was
reopened for a design reset: new colours, a new look and new hero
photographs. **It closed again on 2026-09-17.**
- **The design:** the client picked direction C, "Warm Editorial". It was
  refined into **C+** and rolled out across the whole site, and the drafts
  were deleted.
- **The lock:** the same day the client saw it live and said "much better
  now". **C+ is locked.**
- **The photo rulings** were carried out.
- **The `routescrete.gr` cutover is prepared, not executed:** see
  [`CUTOVER.md`](CUTOVER.md).

This page is the front door: what the project is, where it lives, how to
change the things most likely to need changing, and what the client still
has to do.

The full history, including every decision and everything that went wrong
before it went right, is in [`MORNING.md`](MORNING.md), newest first.

---

## State

| | state |
|---|---|
| **The look** | C+ "Warm Editorial": cream and bone paper, burnt sienna, olive, ink charcoal, and one warm gold kept for buttons. Fraunces at display size with one italic emphasis word; Inter for text. Photographs are graded "D, amber soft". Live since `014b9e9` (R1), with the italic since `b019985` (R2). |
| **The drafts** | Deleted at the close (`524cada`). The captures, C beside C+ and the C+ draft beside the rolled-out site, are in git history at `e5b1059`. |
| **Design status** | **C+ is the production design, locked on 2026-09-17.** The client saw the live site and said: "much better now". The plain-C revert is no longer an active path; its values are kept in the record (`MORNING.md`). |
| **Team section** | Out of the homepage since `392602f`. The names, roles and intro stay in `content/site.json → team`. |
| **The photo rulings (2026-09-17)** | **CC BY-SA 4.0:** allowed, as an obligation met. The graded file is shared under the same licence on `/credits`, with a download link, and credits-guard C16 checks it. One such frame is the transfer page hero. **Public Domain Mark:** only where verifiable at source; none qualified. **Monument frames:** live, with the licence application pending ([`MONUMENT-LICENCE.md`](MONUMENT-LICENCE.md)). **A title naming a place the tours don't visit:** shown verbatim on `/credits`, marked "(title as published)". |
| **The cutover** | Prepared, not executed ([`CUTOVER.md`](CUTOVER.md)). `www` is primary and the apex redirects to it. The origin switch `NEXT_PUBLIC_SITE_URL` is unset, and setting it is one committed line on the day. |
| **Dependencies** | The minor and patch bumps are merged (`4db5387`). The major bumps (TypeScript 7, ESLint 10, @types/node 26) are held on `maint/post-cutover-majors`, with its `MAINTENANCE.md`, until after the cutover. |
| **The photo pool** | The verified pool, each record with its verdict, is in the gitignored `.hunt/cplus/pool/`. The CC BY-SA re-evaluation and the monument research are in `.hunt/lock/`. |
| **The client lists** | [`PHOTOGRAPHERS.md`](PHOTOGRAPHERS.md), [`SHORTLIST.md`](SHORTLIST.md) (both final for the client's action), [`TOURISM-LIBRARIES.md`](TOURISM-LIBRARIES.md), [`MONUMENT-LICENCE.md`](MONUMENT-LICENCE.md). |

## For the client

This repository takes none of these steps on the client's behalf. Nothing
has been sent, bought, submitted or switched.

1. **Vercel Bot Protection and Deployment Protection** (both are project
   settings).
   - **Bot Protection:** turn it on in log mode, then move it to challenge
     once the log shows no real visitors caught.
   - **Deployment Protection:** decide it for preview deployments.
2. **The Google Drive link** for the client's own photographs. They will be
   graded, ledgered as "client-supplied, rights held by client", and placed.
   Camera originals of the tours are still the largest improvement
   available.
3. **Submit the monument licence application and pay the fee.**
   - [`MONUMENT-LICENCE.md`](MONUMENT-LICENCE.md) has the letter in Greek
     (with an English translation), Annex A and the steps.
   - The fee is €250 plus VAT to ODAP, once the Ephorate decides.
   - Also write to Preveli Monastery, and get a lawyer's view on the frames
     already online.
4. **Send the photographer messages.**
   [`PHOTOGRAPHERS.md`](PHOTOGRAPHERS.md) names the frames and gives the
   messages in Greek and English, including an optional confirmation to Rolf
   Dietrich Brecher. A written yes is stored under
   `assets-src/stock-local/permissions/` before its frame ships; the credits
   guard fails without it.
5. **Any stock purchases.** [`SHORTLIST.md`](SHORTLIST.md) prices them.
   First decide how to meet iStock's condition: a private repository or a
   private asset store. Monument frames also need adding to the licence
   application.
6. **Registrar access and a cutover date.** [`CUTOVER.md`](CUTOVER.md) steps
   1–3 cover this:
   - access to the aspx.gr DNS panel and to Vercel → Domains;
   - a weekday date;
   - a saved copy of the DNS zone;
   - the TTL lowered 24 hours before.

**Later, separately:** submitting the domain to the HSTS preload list (the
preconditions are in `CUTOVER.md` step 17). The held dependency upgrades go
in after the cutover week.

---

## Where it lives

| | |
|---|---|
| **Live** | https://routes-crete-redesign.vercel.app |
| **The original site** | https://www.routescrete.gr/ — still live, untouched |
| **Repository** | https://github.com/ikeskrim/routes-crete-redesign |
| **Deploys from** | `main` → Vercel production alias, automatically |

**The domain has not been cut over.** `routescrete.gr` still serves the
original site. Moving it is a decision and a DNS change, taken with the
client, step by step.
- **The plan:** [`CUTOVER.md`](CUTOVER.md) is the ordered plan, with the
  domain facts, the CLIENT and OURS steps, the verification commands and the
  rollback.
- **The background:** [`DEPLOYMENT.md`](DEPLOYMENT.md).
- **What automation touches:** nothing in this repository's automation
  touches DNS, the domain, or the Vercel project settings.

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

What ships is C+, a travel feature in print:
- **The cover:** a paper cover whose headline is printed across a dusk-coast
  plate, with a slow Ken Burns push and the caption set as a photo credit.
- **The homepage:**
  - a positioning spread with a drop cap;
  - the why-us statements set as pull quotes beside photographs that bleed
    alternately left and right;
  - an olive strap;
  - the journeys as an index of titles (pointing at one shows its
    photograph; phones show them inline);
  - a map of the places;
  - the signature journey as a night photo essay;
  - a golden band;
  - how-to-book on bone;
  - the footer as a back cover with a terracotta duotone and the wordmark set
    large.
- **The masthead:** a serif wordmark over a hairline, which turns night over
  night surfaces. The menu is a paper panel with operator-photograph
  previews.
- **Every photograph** goes through grade **D "amber soft"**, set by one
  constant, `GRADE` in `src/lib/edition.ts`.
- **Every colour, font and texture value** is read from `src/app/edition.css`
  and `src/lib/edition.ts`; preflight enforces it.

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
   powershell -File qa/grade.ps1 -Grade D
   powershell -File qa/blur-map.ps1 -Grade D
   ```
   Name the grade. The script's own default is Grade A, not the live grade
   (`GRADE` in `src/lib/edition.ts`), and an off-colour photograph among the
   warm ones is the result of forgetting. Asset-audit fails on any rendered photograph with no blur
   placeholder — that is how the whole site once shipped without them.
4. **If a photograph is sourced rather than the client's**, add it to
   `content/photo-credits.json` with its licence, source and SHA-1, having read
   the licence on the photograph's own page. Where the original goes depends on
   the licence, because this repository is public:
   - **PD, CC0, CC BY:** the original is committed in `assets-src/sourced/`.
   - **CC BY-SA 4.0:** the original is committed too. The record needs a
     `shareAlike` block naming the served graded file
     (`/images/graded/d/sourced/<file>`); `/credits` then states the licence
     and links that file for download.
   - **Unsplash, Pexels, or a written permission:** the original is held in the
     gitignored `assets-src/stock-local/`, and only the graded image ships. A
     written permission is stored under `assets-src/stock-local/permissions/`.
   - **Pixabay:** held entirely; nothing graded ships.
   - **Other BY-SA versions, NC, ND, and a Public Domain Mark that can't be
     verified at its source:** refused.
   - **A photograph of the Fortezza, the Venetian harbour or lighthouse, or
     Preveli Monastery** also goes into the Ministry licence application
     ([`MONUMENT-LICENCE.md`](MONUMENT-LICENCE.md)), and its record gets a
     `monument` mark.
   - **A title that names a place the tours don't visit,** where the
     licence requires the title: set `titleAsPublished`.

   The credits guard fails on any of these, and on a checksum that no longer
   matches the file. On **itinerary** surfaces — cards, waypoints, galleries,
   route stops — photograph only places this site names. On **mood** surfaces —
   the hero, section bands, the closing scene, dark backgrounds — a photograph
   of Crete broadly is allowed. Either way, caption only what the frame
   verifiably shows.
5. **Run the guards** (below). They will tell you if you missed something.

**Swapping a hero or card image** is one line: set `heroImage` or `cardImage`,
and keep the previous value in `heroImage_original` / `cardImage_original` with a
note saying why. The `_original` key is never overwritten: a later swap
keeps its intermediate value under its own key (the transfer page's
`heroImage_r9`). That convention is what makes every one of these decisions
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

Then, one at a time:
- `node qa/copy-subset.mts`: nothing invented; every rendered string traces
  to content or code;
- `node qa/visual-check.mts`;
- `node qa/preflight.mts`: the source rules P1–P14, source only;
- for the cutover, `node qa/cutover-smoke.mts`: the brochure, legacy URLs
  and anchors, credits, contact links, the form, the 404 page and the
  origin.

`.hunt/lock/suite/run-suite.sh <label> [base]` runs the first twelve and
preflight in that order, each into its own log.

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

Measured on the deployment on 2026-09-17, five interleaved runs per route, on
the close commit `524cada` (C+ with the italic, drafts deleted):

| route | performance | spread | a11y | TBT | CLS |
|---|---|---|---|---|---|
| `/` | **90** | 89 89 90 93 93 | 100 | 63 ms | 0 |
| `/experiences/kourtaliotis-temple-of-nature` | **90** | 90 90 90 90 91 | 100 | 43 ms | 0 |
| `/transfers/private-transfers-rethymno` | **93** | 92 92 93 94 95 | 100 | 50 ms | 0 |
| `/transfers` | **94** | 92 94 94 94 96 | 100 | 24 ms | 0 |
| `/contact` | **97** | 94 96 97 99 99 | 100 | 16 ms | 0 |

**Branch previews read about 3 points lower on the item routes.** Every
preview build loads Vercel's comment-toolbar script from `vercel.live`, and
Lighthouse charges a new connection for it. Production loads it only behind a
cookie. Judge budgets on production. The previous close, on `7ae6276`,
measured 92 / 92 / 94 on the first three routes.

---|---|---|---|---|---|
| `/` | **92** | 79 90 92 92 93 | 100 | 187 ms | 0 |
| `/experiences/kourtaliotis-temple-of-nature` | **92** | 88 89 92 93 93 | 100 | 95 ms | 0 |
| `/transfers/private-transfers-rethymno` | **94** | 86 94 94 94 95 | 100 | 61 ms | 0 |

The home route's one run at 79 is the reason the gate is the median. The
previous close, on `2345b01`, measured 90 / 93 / 94.

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

And one thing that is not parked but next: **the `routescrete.gr` cutover**.
It is prepared in [`CUTOVER.md`](CUTOVER.md); the date and the DNS access
are the client's.

---

## The rest of the paperwork

| file | what it holds |
|---|---|
| [`README.md`](README.md) | stack, commands, architecture, the guards in detail |
| [`CUTOVER.md`](CUTOVER.md) | the `routescrete.gr` cutover as ordered CLIENT and OURS steps: the switch, verification, rollback |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | the deployment paths, the original cutover checklist, how deploys actually work here |
| [`MONUMENT-LICENCE.md`](MONUMENT-LICENCE.md) | the Greek licence application for photographs of monuments, for the client to submit and pay |
| [`COPY-MAP.md`](COPY-MAP.md) | every copy change, with provenance |
| [`MORNING.md`](MORNING.md) | the full build log, every client decision, and the closing record |
| [`BACKLOG.md`](BACKLOG.md) | what was considered and not done, with reasons |
| [`qa/README.md`](qa/README.md) | what each guard checks, and the failure that made it necessary |
| [`PHOTOGRAPHERS.md`](PHOTOGRAPHERS.md) | photographers to ask, the frames per surface, and the permission message in Greek and English |
| [`TOURISM-LIBRARIES.md`](TOURISM-LIBRARIES.md) | the official Cretan and Greek image libraries: their terms, and what a request must cover |
| [`SHORTLIST.md`](SHORTLIST.md) | paid stock per direction and surface, with cost, and the private-repository precondition |