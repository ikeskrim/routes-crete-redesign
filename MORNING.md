# DESIGN RESET, AND THE RESEARCH BRIEF — 2026-09-11 to 2026-09-14

Two briefs, worked together. The **design reset** gets new colours, a new look and
new hero photography, legally. The client decides the direction from three live
drafts before anything is rolled out. The **research brief** (13 September)
arrived mid-reset and was folded in, not started over: its security and
performance foundation shipped, its design patterns went into the drafts, and
its 3D item stayed optional.

## The wall that did not move

No photograph entered without a verifiable right to use it.

Every licence was read on the photo's own page, never taken from a search
result. Every master is tied to its licence by SHA-1.

One consequence of the **public repository** was not obvious, and it shaped
the storage:

- **CC0, CC BY and public-domain masters** stay committed in
  `assets-src/sourced/`, because those licences permit redistribution.
- **Free-stock masters (Pexels, Unsplash)** and anything used by written
  permission are **not committed**. They are held in the gitignored
  `assets-src/stock-local/`, and only the graded image the site serves is
  published. Pexels forbids redistributing its files elsewhere, and a
  website permission does not reach a public repository handing out
  originals.
- **Pixabay frames are held entirely.** Its licence forbids distributing
  content on a standalone basis, and a colour grade leaves a photograph
  substantially the same.
- **Paid stock (iStock)** cannot enter while the repository is public. Its
  licence forbids any use that lets others download the file on its own, and
  even the graded copy sits in the repository. That is the client's
  precondition to settle first: a private repository, or a private asset
  store.

`qa/credits-guard.mts` enforces all of it:

- an explicit licence allowlist
- no free-stock or permission master inside the repository
- the Pixabay hold
- a stored confirmation behind any written permission

## Team — out

On the client's instruction the homepage is **five movements**.

- The names, roles and intro stay verbatim in `content/site.json → team`.
- The portraits moved to `assets-src/retired/team/`; no URL serves them.
- `grade.ps1` skips `retired/`, so a regrade cannot bring them back.
- `#team` now lands on `#positioning` ("A family runs this.").
- The guards were updated:
  - arc-guard asserts five movements and no `#team`;
  - parity asserts the team copy is no longer rendered **and** still preserved;
  - asset-audit asserts the retired photographs 404.

Shipped `392602f`; nine guards green on the deployment.

## The photo pool

Five hunters, one per source; an **independent verifier** per batch that
re-read every licence and place; then a curator. Two runs were needed: the
first stopped mid-way on a session limit, and was finished by a targeted
run rather than repeated.

| Source | Proposed | Passed, with master | Notes |
|---|---|---|---|
| Pexels | 11 | 5 | Cloudflare challenged automated page reads after the third request; licences were read via WebFetch, one re-checked in a browser |
| Pixabay | 19 | 0 | All failed verification — and Pixabay is held by policy anyway |
| Flickr | 19 | 13 | One beautiful frame refused: its owner demands permission on the page despite a CC BY setting |
| Unsplash | 15 | 12 | A bot challenge (Anubis) stopped curl; not bypassed, and licence lines were read via WebFetch |
| Commons | 12 | 6 | The API rate-limited (HTTP 429) all session; handled with backoff |

Nothing was bypassed at any point: no CAPTCHA, no bot challenge, no login.

**What shipped into the ledger** (now 29 photographs):

- five Pexels frames — Balos and the Gramvousa coast, a golden-hour mountain
  road, Preveli's palms from above;
- three hero-candidate frames from the first pass — a storm over the south
  coast and the Libyan Sea coast at dusk (both CC BY 2.0), and a cobalt south
  coast (Unsplash);
- two frames from the final pass — the sea-cave window at night and Preveli's
  palm forest running down to the sea (both Unsplash).

Every free-stock master is held outside the repository; the CC BY masters are
committed. Everything else verified stays in the local pool
(`.hunt/design-reset/`) with its verdict, ready for the rollout.

**Disclosed, not hidden:** six of the best night frames are one
astrophotographer's stacked-sky composites. The one that shipped says so in
its ledger note and on the `/design-3` index.

**The heroes, and where I differed from the curator:**

- **A — the sea-cave window at night.** The curator agreed: "the darkest frame
  in the pool", mean luminance 43/255.
- **B — Preveli's palm forest to the sea.** The curator preferred the
  anonymous cobalt coast, which is more purely Cycladic in palette. Preveli
  won on relevance: it is a place the tours go, and B's critic had asked why
  a nameless coast fronted a business selling gorges and villages.
- **C — the Libyan Sea coast at dusk.** The curator preferred the golden-hour
  mountain road, and C's critic also found the dusk coast cooler than "warm,
  golden imagery". C's revision had tuned its headline-over-plate overlap and
  contrast to this frame, and a portrait road forced into that plate loses
  either the road or the sky. **If the client picks C, the mountain road is
  the first frame to try in the rollout.**

## The three client lists

- **`TOURISM-LIBRARIES.md`** — no official library is usable today:
  - The Region of Crete needs a written application to the Regional Governor.
  - Rethymno publishes no terms, so all rights are reserved.
  - GNTO's image bank forbids commercial use.
  - Marketing Greece is the one worth asking, and the file says exactly what
    the written yes must cover.
- **`PHOTOGRAPHERS.md`** — 13 real, verified photographers:
  - Two of them are based in Rethymno.
  - It names specific frames for specific surfaces.
  - The permission message is in Greek and English. It is worded to cover the
    public repository, so a yes is given knowingly.
- **`SHORTLIST.md`** — iStock only; Adobe Stock and Shutterstock sent bot
  challenges, which were not bypassed:
  - 9 images per direction, from €85 on a one-month subscription.
  - The private-repository precondition is stated at the top.

**The CC BY-SA option** is a local-only contact sheet of the ten best frames, in
`.hunt/design-reset/by-sa/`. **Several of them are the most beautiful frames
anyone found:**

- Rethymno and the lit Fortezza at dusk from the air
- the lighthouse at blue hour with snow on Psiloritis
- the Libyan Sea at sunset
- the sea through a cave arch, a native portrait

Using any of them obliges publishing our graded version under CC BY-SA on
`/credits`. That is the client's decision, and it is the one most worth making.

## The research brief — what shipped, what was not mine to do

**Shipped:**

- **Next.js 16.3.0 → 16.3.5.**
  - 16.3.0 sat inside two advisories, including an unauthenticated RCE in the
    Image Optimization API when AVIF is served — which this site serves.
  - `sharp` went to 0.35.4, and `npm audit fix` cleared the rest.
  - **npm audit: 0 vulnerabilities.**
- **Secrets.** gitleaks 8.30.1, with its release checksum verified, scanned all
  107 commits of full history. **No leaks. Nothing to rotate.**
- **Security headers on every route:**
  - CSP, shipped report-only and then enforced;
  - HSTS for two years;
  - `X-Frame-Options: DENY`, nosniff, `strict-origin-when-cross-origin`;
  - a locked Permissions-Policy;
  - no `X-Powered-By`.

  `script-src 'unsafe-inline'` is a stated trade-off: nonces would force
  per-request rendering and give up static generation.

  The switch to enforcing was **earned**. `qa/security-headers.mts` — the
  **tenth guard** — loaded all nine routes of the live report-only deployment
  in Chromium and saw zero violations.
- **The Monday.com form is sandboxed.** A headless check confirmed it still
  renders the same 12 fields and 6 buttons as the unsandboxed page, with
  nothing blocked. Nothing was submitted.
- **Dependabot** version updates: weekly, with minor and patch grouped.
- **`next/image`**: `priority` becomes `preload` on the six `<Image>` elements.
  Next 16 deprecated it, and its source shows the two take the identical code
  path. AVIF/WebP, `deviceSizes`, blur placeholders and self-hosted
  `next/font` were already in place.
- **Vercel Web Interface Guidelines audit.**
  - Three reviewers, with an adversarial verifier per area.
  - **69 reported, 56 confirmed.**
  - **Fixed, high severity:**
    - the skip link now moves focus into `<main>`;
    - the overlay menu scrolls under a stopped Lenis, and a long menu overflows reachably;
    - the gallery lightbox traps focus, and restores it on close;
    - the stacked why-us panels and the signature chapters now reach screen readers.
  - **Fixed, medium severity:**
    - `aria-labelledby` ids now resolve;
    - the preloaded `/transfers` image no longer ships clipped until hydration;
    - `/experiences` has an `h2`;
    - the marquee has a 44 px pause control and wraps under reduced motion;
    - the nav bar no longer animates padding.
  - **Skipped on purpose:**
    - the clip-path reveal rewrites and a letter-spacing hover (approved motion);
    - `theme-color` (a design decision);
    - the empty trust badge (the two items are noted in place).
  - **`aria-modal` stays**, because menu-audit selects on it. A focus-revealed
    Close button inside the dialog fixes the same problem.
  - **Verified.** Shipped as `2b2d00d`:
    - all ten guards green on a clean build of that exact commit;
    - on the deployment, nine green at once;
    - menu-audit green three runs of three, after the race below.
- **Skills.** Anthropic's `frontend-design` and Vercel's
  `web-design-guidelines` were read in full before use. Both are instructions
  only, apart from a documented fetch of Vercel's rules. Their guidance went
  into the draft builders and the audit. Nothing was installed as persistent
  configuration.

**Not done here, on purpose — the owner's or the cutover's:**

- **Vercel Bot Protection, Deployment Protection, Trusted IPs.** These are
  project settings, and no project-settings action is taken from this
  repository.
- **HSTS `includeSubDomains` and `preload`.** They commit the whole
  `routescrete.gr` domain in browsers' built-in lists. That is a domain
  decision for the cutover.
- **Dependabot alerts and security updates.** These are repository settings;
  the committed file covers version updates only.
- **The 3D Crete map.** The brief makes it optional and budget-gated. The
  budget it must hold is already tight on the homepage, so it was not started.

## menu-audit, and a race that was not a regression

**What happened.** On the live `2b2d00d` deployment, menu-audit failed twice, in
different sections: first `coverage`, then `background hidden`. Both failed the
same way. The audit's single click on Menu, about 1.2 s after the HTML arrived,
opened nothing, and the 5 s wait timed out. The same commit passed all 37
assertions on a local production build, and menu-audit had passed on the
deployment at `36854c0` and `392602f`.

**What it was not.**

- **Not the CSP.** An interleaved A/B on the two immutable deployments opened
  the menu 16 times with violation and console listeners attached: zero CSP
  violations, zero errors. (qa/security-headers.mts never opens the menu, so
  this path had not been checked before.)
- **Not a regression.** Time from `domcontentloaded` until the menu actually
  opened:

  | Deployment | Median | Slower than the guard's ~1.2 s click | Never opened |
  |---|---|---|---|
  | `36854c0` | 275 ms | 0 of 8 | 0 |
  | `2b2d00d` | 298 ms | 1 of 8 (1,589 ms) | 0 |

  Eight a side is thin, so it ran again at 20 a side (standard medians):

  | Deployment | Median | Mean | 90th percentile | Slowest | Slower than 1.2 s |
  |---|---|---|---|---|---|
  | `36854c0` | 380 ms | 422 ms | 739 ms | 822 ms | 0 of 20 |
  | `2b2d00d` | 277 ms | 324 ms | 503 ms | 1,006 ms | 0 of 20 |

  If anything, the newer build opens the menu faster. The one 1,589 ms run in
  the first sample was load noise. Across all 56 opens there were no CSP
  violations, no console errors and no page errors.
- **Not more client JavaScript.** No component changed its `"use client"`
  status in `2b2d00d`; the Marquee was already a client component.

**What it was.** A click that lands before React has hydrated the header is
lost: the server-rendered button has no handler yet. The machine was under
heavy load at the time — three draft builders running Playwright and dev-server
compiles — so hydration occasionally landed after the audit's one click.

**The fix is to the audit, and it relaxes nothing.** `openMenu()` now waits
until React has attached its props to the trigger, then makes its single click.
A menu that does not open after that click still fails. Three consecutive runs
against the deployment: **37 of 37 assertions, three times out of three**, on the live `2b2d00d` deployment — the same deployment where the unfixed audit had failed twice.

**A real edge, recorded rather than explained away.** A visitor who taps Menu
in the first moments of a load, before hydration, gets no response and has to
tap again. This is on `36854c0` too, so it is not new. A future mitigation would
make the trigger work before hydration: a native `<dialog>` or `popover` opened
without React, or a no-JS fallback. It is noted in BACKLOG.md rather than
patched into an approved component tonight.

## /design-3 — three directions

Three live drafts of the homepage top, each with its own palette, its own type
and a new hero photograph, all rendering the same real content. Each went
through one builder, one independent critic and one revision. After that came
a director's pass, judged on my own look at the screenshots.

Two lessons from the process:

- **The critics agreed on the weak point:** the journeys cards. Those use
  the client's own tour photographs, several only 683×1024 and soft when
  enlarged. That is a content limit, not a design one, and it is why camera
  originals stay the largest improvement available.
- **The brief to the builders missed one tell.** Anthropic's frontend-design
  guidance names a single word accented in italic colour as the commonest
  sign of a generated page. It was not in the builder brief; C's critic
  caught it anyway.

**Under the real CSP.** The security-headers guard does not load the
temporary routes, so they were checked separately on a local production
build. The index and all three drafts, at 1440 and 390, served the enforcing
CSP with no violations, no console or page errors, and no failed requests.
Each draft's phone menu opened and closed on Escape.

### B — Cycladic Light

- **The look:** white ground, navy Outfit headlines, blue pill buttons,
  turquoise hairlines, and the hero photograph held in a tall Cycladic arch.
- **Critique, 6/10.** It was right about:
  - the phone's first screen had no button (the first one sat at y=984 on an 844px screen);
  - a nested `<main>`;
  - a menu that let the page scroll 1,616 px behind it and let Tab escape;
  - the hero image over-requested;
  - headings breaking badly;
  - Inter loaded twice.
- **Revision** fixed all of them. The primary button now ends at y=484 on
  390×844 and inside the first screen at every tested size, and the menu
  holds the page at 0 px.
- **Director's pass:** the hero moved from an anonymous coast to **Preveli's
  palm forest running down to the Libyan Sea** (Dimitris Kiriakakis,
  Unsplash). Preveli is an actual tour stop, which answers the critic's
  question of why a nameless coast fronted a business selling gorges and
  villages. Re-shot: no overflow and no console errors.

### A — Deep Aegean

- **The look:** a near-black ground, deep sea blue, gold hairlines and labels;
  Cormorant Garamond at a light weight for the headline, Jost for labels and
  body; a full-bleed night photograph under a fixed bar.
- **Critique, 6/10.** It was right about:
  - the phone crop, which landed on the flat middle of a cloud mass — in the
    critic's words, "a dark template with a cloud texture";
  - one crop for every screen, which on desktop also cut off the surf and the
    beach and darkened the headland almost to black;
  - the menu's Tab handling, and the smooth scroller running behind it.
- **Revision:** the menu became a native `<dialog>`, the crop was set per
  geometry, and the journey cards and the bar were reworked.
- **Director's pass — the hero.** The storm gave way to **the sea-cave window
  at night** (Evgeni Tcherkasski, Unsplash):
  - the darkest frame in the pool, and a native portrait, so the phone hero
    is a straight fit;
  - a processed astrophotograph, which its ledger note and the `/design-3`
    index both say;
  - captioned "The Cretan coast at night", never as the cave on the Tradition
    tour, which is inland;
  - the storm stays in the pool as the alternate.
- **Headline contrast — measured, failed, fixed.** On a wide screen the frame
  is width-limited, so no crop could move the Milky Way out from behind
  "unknown" and "Crete". A contrast map found 1.75% of the letters' pixels
  under 3:1, the worst at 1.27:1.

  The fix is a flat, low darkening band under the headline only; the sky in
  the cave mouth above it keeps its light. The worst pixel under a letter,
  after:

  | Width | 390 | 1024 | 1280 | 1440 | 1920 |
  |---|---|---|---|---|---|
  | Worst letter pixel | 7.11:1 | 5.42:1 | 4.47:1 | 4.52:1 | 6.15:1 |

  390 and 1440 were measured on the production build, the other three
  widths on the dev server; at 1440 the two agreed within 0.05.

  **Recorded, not hidden:** a few star pixels in the gaps between letters
  still fall under 3:1 — 17 at 390, 6 at 1280 and 3 at 1920. None of them
  sits under a letter.
- **Re-shot:** no overflow and no console errors. The primary button ends at
  y=796 of 900 on desktop, and y=803 of 844 on a phone.

### C — Warm Editorial

- **The look:** cream paper, ink, terracotta and olive; Instrument Serif for
  the cover line and plate titles, Instrument Sans for everything else. The
  photograph is set like a magazine plate, and the headline's last line is
  printed on it.
- **Critique, 6/10.** It was right about:
  - the single word "Crete" in terracotta italic — in the critic's words, the
    most recognisable generated-landing-page trope;
  - the phone's first screen had no button (the first one sat at y=892 on an
    844px screen);
  - the menu let Tab escape;
  - the plate requested an image sized for a full-bleed hero;
  - the plate's top edge cut through letters at every width, and a 0.86
    line-height made glyphs collide.
- **Revision** fixed all of them:
  - the headline is set in one voice;
  - the primary button ends at y=730 on 390×844;
  - Tab is trapped inside the menu;
  - the plate passes its own `sizes`;
  - the last line carries its own band of sky, so the plate's edge falls
    between lines, and the line-height is 0.92;
  - the plate's credit is read from the photo ledger, not typed in.
- **Director's pass:**
  - The menu now stops the smooth scroller while it is open. The critique had
    missed it, and B's critic had measured the same pattern letting the page
    scroll 1,616 px behind a menu.
  - The type-check caught the address being passed where it can be empty. The
    menu now renders no address rather than an empty one.
- **Headline contrast, measured.** On the production build, Instrument Serif's
  letters clear 7.48:1 at their worst pixel on desktop, and 7.65:1 on a phone. The text-contrast
  method reports a worst pixel of 1.00:1 on desktop. Mapping the failing
  pixels showed why: the headline's box spans the side column, and every one
  of them is that column's own dark body text and button, on cream paper.
  None is on the photograph.
- **Re-shot:** no overflow and no console errors. The primary button ends at
  y=468 of 900 on desktop, and y=730 of 844 on a phone.

## Final audit on the deployment

Shipped as `d6d4dbc`: the three drafts and their index, the two new ledger
entries, A's headline band, the menu-audit fix and the paperwork. The
captures of the drafts followed in a commit of their own.

**Before the push**, on a local production build of the same tree: all ten
guards green, and the `/design-3` routes clean under the enforcing CSP.

**On the deployment**, alias LIVE on `d6d4dbc`, run one after another:

| Guard | Result on the deployment |
|---|---|
| headline-guard | 46 assertions, 0 mismatches |
| arc-guard | five movements in order, no `#team`, the cut sections' content intact |
| nav-flash-guard | the bar is right before JavaScript and never flips |
| credits-guard | every master recorded (21 in the repository, 8 held locally); every one attributed and linked on `/credits` |
| menu-audit | 37 assertions, 0 failures — first run |
| asset-audit | 42 paths, 0 dangling; the retired team photographs all 404 |
| parity | no deltas: body text 25 of 25 paragraphs, 4 removed team strings absent, 18 originals preserved |
| mobile-audit | 390 px holds on every route |
| text-contrast | worst pixel: home headline 4.84:1, home subcopy 7.50:1, experience 7.11:1, transfer 12.22:1 |
| security-headers | every route served all six headers; CSP enforcing, zero violations; the booking form sandboxed |

**The captures** (`qa/design3-shots.mts`, from the alias): all three drafts
answered 200 on `d6d4dbc`, noindex and marked; 12 frames, no horizontal
overflow. I looked at every first-screen frame before committing them.

**Lighthouse**, on the deployment once the alias was LIVE on the captures
commit `7ae6276`: mobile, five interleaved runs per route, gated on the
median. Both builder workflows had finished and my servers were stopped, so
the machine was quiet.

| Route | Median | Spread | a11y | TBT | CLS |
|---|---|---|---|---|---|
| `/` | **92** | 79 90 92 92 93 | 100 | 187 ms | 0 |
| `/experiences/kourtaliotis-temple-of-nature` | **92** | 88 89 92 93 93 | 100 | 95 ms | 0 |
| `/transfers/private-transfers-rethymno` | **94** | 86 94 94 94 95 | 100 | 61 ms | 0 |

**Budget OK:** performance ≥ 89, a11y 100, CLS 0, TBT ≤ 250 ms, every floor
unchanged. The home route's spread includes one run at 79. A single run
against a deployment measures the network as much as the build, which is
exactly why the gate is the median.

## Where this stops

The design reset's stop condition is met:

- Team is out, and live.
- The photo pool and the three client lists exist.
- The BY-SA contact sheet is ready, locally.
- The three drafts are live on `/design-3`, with their captures, for the
  client's pick.

Nothing cutover-related was touched. **Next is the client's:** pick A, B or C,
and the decisions listed at the top of [`CLOSING.md`](CLOSING.md).

# CLOSING RECORD — Routes Crete, closed 2026-09-11

The project is closed. The client delegated the ten rulings on `/review-2` and
they are final; the one content change they asked for has shipped, the review
page is gone, and the final audit on the deployment is below. **The queue is
empty by design.** For the project as it stands, read [`CLOSING.md`](CLOSING.md).
Everything under this record is the build log, newest first, kept as written.

## The rulings — verbatim, 2026-09-11

The client delegated the ten rulings. They are final.

* **R1** — Grade C: approved as shipped. No further tuning.
* **R2** — Second-pass photographs (Preveli river mouth, river flow, Preveli waypoint swap): approved.
* **R3** — The route as a journey: approved.
* **R4** — Hero scrim lightened: approved.
* **R5** — Full-screen overlay menu: approved.
* **R6** — Horizontal journeys: approved. The short pan is accepted; it grows with the catalogue.
* **R7** — Kinetic hero: approved.
* **R8** — Film grain layer: approved.
* **R9** — Photo hunt III: the harbour at night takes the top of the transfers page; the van stays in its card and gallery below. The three Rethymno bands: approved. Spili and Messara remain held out, unnamed places stay unnamed. "Current frame wins" verdicts everywhere else: accepted with the search log.
* **R10** — Trust badge: stays empty, closed as "not yet." No verified reviews exist; the mechanism remains, and it renders only from verified data with the link visible.

## Outcomes

| # | ruling | outcome |
|---|---|---|
| **R1** | Grade C, approved as shipped | kept · no tuning |
| **R2** | Second-pass photographs | kept |
| **R3** | The route as a journey | kept |
| **R4** | Hero scrim lightened | kept |
| **R5** | Full-screen overlay menu | kept |
| **R6** | Horizontal journeys, short pan accepted | kept · it lengthens with the catalogue |
| **R7** | Kinetic hero | kept |
| **R8** | Film grain | kept |
| **R9** | Harbour at night to the top of the transfers page | **shipped `9fc5b17`** · van kept in card, menu preview and gallery · bands, holds and verdicts as ruled |
| **R10** | Trust badge, closed as "not yet" | **mechanism kept, and now enforces the ruling in code** — it renders only with `text`, `href` and `verifiedOn` all present, and only as a link |

### R9, and one reading of it worth stating

The ruling puts the harbour at the top of the page and also approves "the three
Rethymno bands" — of which the harbour was the third. Keeping it in both places
would show one photograph twice on one page, three screens apart. So it
**moved**: the hero is the harbour, the Fortezza and old-town lane bands stand,
and the three-band set as reviewed is preserved in `placeBreaks_original`. One
constant each; `heroImage_original` holds the van.

Verified on the new frame: the transfer headline clears **12.22:1 at its worst
pixel** — the most legible hero on the site — the blur placeholder is in the
server HTML, and the hero renders with `alt=""` so no caption can go false.

**A defect the swap exposed, fixed.** The 390 capture was soft and blocky. A
landscape photograph `object-cover`ed into the tall item hero is scaled to the
hero's *height*: on a 390×844 phone the picture is about 1,174 CSS px wide
inside a 427px box, and `sizes="100vw"` had been asking for a viewport-width
file — 420w at 1x, 1280w at 3x, upscaled ~2.7×. (My first reading compared the
served file with the `<img>` box and called it fine; the box is not what
`object-cover` fills.) The hero now reads each photograph's real dimensions from
its JPEG header at build and asks portrait screens for 89vh × aspect — only for
landscape heroes, so the experience pages pay nothing. Served/needed on phones
went from 0.36 to 1.07–1.28; desktop unchanged. The van hero had carried the
same flaw, hidden by a smaller frame.

LCP on the transfers route, five cold loads per viewport, unthrottled:

| | before — van, `ca46ecd` | after — harbour, `9fc5b17` |
|---|---|---|
| desktop min / median | 376 / 424 ms | 400 / 432 ms |
| mobile min / median | 356 / 372 ms | 344 / 400 ms |

Movement inside the noise, with a heavier photograph and a full-width file now
served to phones. The throttled picture is in the Lighthouse table below.

## The close

**`/review-2` deleted** with the recorded command — `src/app/review-2`,
`public/review2-assets` and the capture script `qa/review2-shots.mts`. Confirmed
**404** on the deployment for the page, its assets and any sub-path.

**Nine guards, green individually, on the deployment:** headline · arc ·
nav-flash · credits · menu · asset (now including blur placeholders) · parity ·
mobile · text-contrast.

The first sequential run of the guards and Lighthouse on `2345b01` was cut off
twice on this machine: menu-audit and Lighthouse each stopped mid-run with no
failure line anywhere in their logs — the process-death quirk logged before, not
a verdict. Eight guards had already completed green. menu-audit was re-run once
and completed: 37 assertions, 0 failures. (Its verdict line never reached the
re-run's verdicts file: in a batch file, `EXIT=0>>` makes cmd read the `0` as a
handle number and redirect stdin, so the echo went nowhere. The guard's own log
is the record.)

Lighthouse was cut off again in that re-run, during its third run. An orphaned
browser holding its fixed debugging port 9222 was the obvious suspect and was
ruled out — nothing was listening. What failed was running it backgrounded or
detached on this machine, so the method changed rather than the same run being
looped: it was run in the foreground, **one route per invocation, five runs
each**, and completed. The medians below are per route; they are not
interleaved across routes the way the script's default run is, so each route's
first run is a cold one, which is what taking the median absorbs.

**Lighthouse, production alias, median of five runs per route, all three gated
routes, measured one route at a time:**

| route | performance | spread | a11y | TBT | CLS |
|---|---|---|---|---|---|
| `/` | **90** | 88 89 90 91 94 | 100 | 248 ms | 0 |
| `/experiences/kourtaliotis-temple-of-nature` | **93** | 88 91 93 93 95 | 100 | 88 ms | 0 |
| `/transfers/private-transfers-rethymno` | **94** | 87 93 94 94 94 | 100 | 57 ms | 0 |

Measured on commit `2345b01`, the last commit that changed what the site
renders; the closing commit after it changes only documentation. Every floor
and ceiling holds: performance ≥ 89, a11y 100, CLS 0, TBT ≤ 250 ms.

**The alias probe read LIVE** at every sign-off check — never PENDING or BLOCKED.
Twice the probe's own process died mid-poll — once as a 127, once as an exit 1
with no verdict printed. The probe always prints its verdict; a bare exit code
with no message is the process dying, not an answer. Both times it was re-run
once and read LIVE.

## The photo hunt, in one paragraph

Three sourcing passes. The third hunted against a shot list: 23 Commons queries
over the places this site names, 562 results, 123 licence-clean at 2000px or
better, 243 refused on licence, 41 dropped as beautiful and somewhere we do not
go, 12 already in the ledger, 43 real candidates. Openverse returned 504 for the
whole session and was not mined. One photograph shipped — Rethymno's harbour at
night — and two frames already owned found their place. Spili and the Messara
stay held: unnamed places stay unnamed. Everywhere else the current frame won,
and the client accepted that with the log.

## Parked

- **Verified reviews for the trust badge.** None exist for this business.
- **The client's own golden-hour photography, or camera originals** — the
  largest improvement still available, especially for the Tradition day.
- **Video footage.** Inbox and transcode pipeline intact and unwired.
- **The enhancement pipeline.** Unwired, by the hard wall that has always
  governed it.
- **The Vercel dashboard check (D2).** Still the client's; detectable, not
  preventable, from here.

**Not parked, and not mine:** the `routescrete.gr` cutover happens with the
client, step by step, in its own conversation. No DNS, no domain, no
project-settings action was taken, at any point.

---


---

# PHOTO HUNT III — shipped `aa45e96` · `cd7cc19`

The client's instruction was direct: search again, find more beautiful
photographs. Third pass, so it opened new veins and hunted against a shot list
rather than re-walking the same searches.

| target | result |
|---|---|
| **1 · warm low light** | six licence-clean golden-hour frames came back; **none of a place this site names**. Nothing substituted. |
| **2 · the Tradition day** | **current frames win.** The surface that needed it most (all 1024px or under) and the one where stock would cost the most — those are the client's own photographs. The only new candidates of a place it truly visits were Anogeia's streets: parked cars, bollards, a skip. |
| **3 · Rethymno** | **shipped.** The transfers page had one 930×620 van as hero, card and entire gallery and no bands; it now has three Rethymno bands in the order a day ends — Fortezza in daylight, a lane in the old town, the harbour after dark. |
| **4 · water** | **current frames win.** Thirteen candidates, all variants of last pass's picks. |
| **5 · dusk** | **one find** — Rethymno's old Venetian harbour at night, Jerzy Strzelecki, own work, May 2009. The only warm-light frame the whole hunt produced that cleared every rule, and the operator's home base. |

**The search log.** Twenty-three Commons queries over the places this site
names: 562 results, 123 licence-clean at 2000px or better, 243 refused on
licence, 41 dropped for being gorgeous and somewhere we do not go, 12 already in
the ledger, 43 real candidates. **Openverse returned 504 for the entire session
and was not mined** — recorded rather than pretended; Flickr's proven
photographers were mined through the Commons mirror.

**The frames we already owned.** Five were licensed, graded and credited but
placed nowhere. Two found their place (the Fortezza and the old-town lane, on
transfers). Three are held, and item 09 says so: Spili ×2 is almost certainly
the unnamed "historic village" of the Kourtaliotis day, and this site does not
put a name in the client's mouth; the Messara is the Heraklion-side plain, not
the mountains the Tradition day describes.

**The taste call.** The harbour frame's strongest placement is arguably the top
of the transfers page. Against it: the van is the product. Both are on
`/review-2`, the van stays shipped, the client rules.

**Licence, checksum, ledger.** CC BY 3.0 + GFDL 1.2 dual-licensed on the file
page; this site takes the CC BY 3.0 grant and the ledger says so. No SA, NC or
ND term anywhere on the page. Original checksum-matched to Commons before it
entered the ledger. Ledger at 19.

## Found on the way — two regressions, both mine, both now loud

**Every image on the site had shipped without a blur placeholder since Grade C.**
`content/blur-map.json` was keyed under `/images/graded/b/`. When the grade
flipped, every `getBlur()` lookup missed, the placeholder became `undefined`,
and the whole site — the LCP hero included — went out with none from `419bdf5`
on. Nothing failed and no guard noticed. Found by reading the live HTML with a
correct grep after a first grep read only what followed `src=`.
`qa/blur-map.ps1` now generates the map for whichever grade is live (76 for C,
the B keys kept), and asset-audit fails on any rendered graded image without
one.

**The transfers page was at a11y 96 through three rounds that all said 100.**
One line in the route journey — *"No photograph we can honestly caption as
this place"* — at `text-sand-200/45`, rendering only when a stop has no
photograph. Every stop on both experience pages has one; the transfers page's
two airports do not, by design. So it rendered there, failed contrast, and was
never seen because that route was never in Lighthouse's default set. Fixed the
way the eyebrows were in D3 (/45 → /70), the unreached waypoint numbers raised
/40 → /55 alongside, and **Lighthouse now gates three routes by default.** A
budget only covers the routes it is pointed at.

## The handled state

`x-vercel-mitigated: challenge` is now its own outcome, by name, in two
places: `qa/preflight.mts` (every guard) and `qa/alias-assert.mts` (exit 0
LIVE / 1 PENDING / 2 BLOCKED). It is never reported as "not deployed". The
probe polls at 30s rather than 15s and sets `process.exitCode` instead of
calling `process.exit()` — a hard exit over a keep-alive socket tripped a libuv
assertion on Windows and died with 127, which would have made the gate
unusable in the chains it exists to gate.

## Measured on the deployment

Nine guards green on `aa45e96`. Lighthouse, production alias, median of five
interleaved runs:

| route | performance | spread | a11y | TBT | CLS |
|---|---|---|---|---|---|
| `/` | **94** | 75 94 94 94 95 | 100 | 54 ms | 0 |
| `/experiences/kourtaliotis-temple-of-nature` | **94** | 91 92 94 94 94 | 100 | 28 ms | 0 |
| `/transfers/private-transfers-rethymno` (after the fix, `cd7cc19`, 3 runs) | **96** | 84 96 96 | **100** | 18 ms | 0 |

Every floor and ceiling holds with the new bands live.

## `/review-2` — nine items plus the trust line

Item 09 appended: the transfers page before and after (the "before" captured
from the previous deployment *before* the push, so the pair is two real
deployments), the three bands, 390, the hero taste call both ways from the same
build with the substitution labelled as one, and the "current frame wins"
verdicts with the search log. Every earlier frame re-captured against
`aa45e96`; the page's byline says so. Verified live: 47 images, 0 broken, 0
references to `qa/benchmark/`, `noindex, nofollow`, 0 inbound links, 0 sitemap
entries, no overflow at 1440 or 390. Deletion unchanged:

```
git rm -r src/app/review-2 public/review2-assets
```

Stopped for the client's single combined ruling on all nine items plus the
trust-badge question.

---

# THE INTERACTION PASS — shipped `de0f19f`

Five interaction features on top of the beauty pass. Three of them extended
machinery this site already had; one shipped deliberately empty.

| # | feature | outcome |
|---|---|---|
| **I1** | Full-screen overlay menu, staggered reveal, drifting photograph | **shipped** · the overlay, hamburger, focus trap, scroll lock, Escape and per-item previews already existed and are untouched — the reveal is now a mask, and a real photograph of Crete drifts behind on a 44s CSS transform |
| **I2** | Horizontal journeys | **shipped** · vertical scroll drives horizontal travel, verified panning to exactly −633.6px (−44vw) |
| **I3** | Kinetic hero + image parallax | **shipped** · pointer drives ±7px on the type, ±16px on the photograph; the scroll parallax already existed |
| **I4** | Site-wide film grain | **shipped** · one fixed, server-rendered, zero-JavaScript layer |
| **I5** | Spinning social-proof badge | **built, empty — awaiting verifiable reviews** |

## The standing rule this pass established

> **Social proof renders from verified data or not at all.**

The badge was specified as "★ 5-STAR RATED ON TRIPADVISOR ★". No rating,
review count or award exists anywhere in this project or on the original site —
`site.json` says so in its own note and the organisation JSON-LD omits
`aggregateRating` for the same reason — and nothing findable online changes
that. Writing the sentence would have been inventing a review claim about a
real business on its live site, and in the EU a fabricated review claim is a
legal exposure for the operator rather than a matter of taste.

So the component is built exactly as asked — SVG `textPath` around a circle,
one CSS rotation, fixed to the corner, desktop only so it never sits on the
mobile booking bar — and it reads its words from `content/site.json →
socialProof`, which is `null`. It renders nothing at all until there is
something true to put in it. **If real data arrives it ships only with the
link visible**, so any reader can check it.

## Four things that had to be got right

**A pin-spacer would have broken the CLS wall.** ScrollTrigger pinning injects
height into the document after hydration; the budget here is a hard zero. The
section's height is derived from the card count and rendered by the server, so
the document is its final height on the first paint. Measured against the
previous build: CLS byte-identical, 0.0057 desktop and 0.0064 mobile on both.

**Two elements would have carried `id="transfers"`.** The obvious build renders
a grid for small screens and a separate track for large ones, which puts every
card in the DOM twice — and `legacyAnchorMap` points the old `#portfolio1` at
that id. There is one list; the layout switches in CSS.

**`grain fixed` would have silently become `position: relative`.** The `grain`
utility is emitted after `.fixed` at equal specificity — the exact trap that
once shipped a "fullscreen" overlay menu as an in-flow block, and which
`qa/preflight.mts` now fails the build on. The site-wide layer is its own
utility with its own `position: fixed`.

**`y` and `translateY` are the same property in motion.** Setting the hero's
scroll parallax and its kinetic offset on one element silently dropped one of
them. They are separate layers now, as the image parallax and the Ken Burns
push already were.

## Measured on the deployment

Nine guards green. Lighthouse median of five: `/` **93** `[79 92 93 96 98]`,
experience **92** `[81 89 92 97 99]`, a11y 100, TBT 71/48 ms, CLS 0.

Local Lighthouse fails the floor at 88/86 — so the features were stashed and
the previous build measured on the same machine with the same harness: **85/86**.
Localhost runs about ten points under the deployment here, and the deployment
stays the only gate. That method is now the way any local/deployed discrepancy
gets settled.

## `/review-2` covers all eight items

Re-captured against `de0f19f` — the earlier frames were of `00655f2` and had
gone stale. Items 01–04 are the beauty pass, 05–08 the interaction pass, plus a
Trust heading carrying one line: *"Badge built, empty: awaiting verifiable
reviews."*

Still `noindex, nofollow`, still linked from nowhere, still own captures only
with zero references to `qa/benchmark/`. Delete it when the ruling lands:

```
git rm -r src/app/review-2 public/review2-assets
```

---

# QUEUE — THE BEAUTY PASS

**The project is reopened.** The client reviewed the finished site and ruled:
the photographs still do not delight him — find more beautiful ones and make
them all brighter and more vivid; "the route" is just a line — make it
beautiful and interactive. **Beauty is the primary criterion**, and the
photographs and animations together should make a visitor want to book.

This file is the queue again. `CLOSING.md` gets re-finalized at the end.
No approval stops. Conservative defaults logged as they are taken. Every
standing guard, budget and hard wall applies throughout — the beauty pass does
not get an exemption from the floor, from CLS 0, from per-file licensing, or
from geographic truth.

| # | task | outcome |
|---|---|---|
| **B1** | **Grade C (Vivid)** — corpus-wide, one constant | **shipped** `419bdf5` · all 72 frames · A and B still reproduce byte-for-byte |
| **B2** | **Second sourcing pass, biased to spectacle** | **shipped** `212221a` · 3 new photographs from 59 licence-clean candidates · ledger at 18 |
| **B3** | **The route becomes a journey** | **shipped** `3781729` · draws on scroll, marker travels, stops light in the order of the day |
| **B4** | **The desire pass** | **shipped** `00655f2` · the hero scrim was hiding the grade; that is the finding |
| **B5** | **`/review-2`, then stop** | **shipped** `0f0925e` · live, noindex, unlinked · **awaiting the client's ruling** |

## What each one actually did

**B1 — the client was right about the cause.** Grade B ran at saturation 0.66,
*desaturating* every photograph, over blacks lifted to 0.055 matte with
contrast at 0.94. The Kourtaliotis river, whose own credit line calls it
"crystal clear waters", was rendering grey. C brightens the midtones, sits the
blacks down to 0.014, deepens contrast to 1.10, and takes saturation to 1.02 —
with three shaped terms a flat multiplier cannot express: vibrance weighted
toward pixels that have little colour already, a cyan boost on hue 190 for the
water, and a gold boost on 48 (deliberately *not* the ~25 where skin sits).

A fourth term came from looking at the first result rather than shipping it.
Vibrance lifts grass hardest of anything in frame — broad, mid-chroma, and it
fills the hero — and the olive grove came back electric. `greenTemper` takes
hues near 105 back down, so foliage reads natural while the water keeps
everything it gained.

Proofs: grade-diff against the approved reference, mean delta **0.000/255,
max 0** — A and B reproduce byte-for-byte, so the new terms cost the old
grades nothing. `grade-diff -From b -To c`: **all 72 files differ**, smallest
delta 6.99, mean 16.29 — nothing was silently skipped. QR code and wordmark
still excluded at the pipeline level.

**B2 — spectacle, with the geography kept honest.** Fourteen searches over the
places this site *names* gave 59 licence-clean candidates at 2000px or better.
Balos, Elafonisi, Kedrodasos, Chania, Ammoudi, Damnoni and Klisidi are all
real, all licence-clean and all gorgeous — every one dropped, because this site
names the places it shows and goes to none of them. One result was not even
Crete. Three of the seventeen survivors ship: the river reaching the sea at
Preveli, the palm forest and lagoon behind the beach, and the gorge river over
rock with oleander in flower.

Each licence read on its own file page that day rather than trusted from the
API's cache; each original checksum-matched to Commons *before* it entered the
ledger. Two captions had to be written **against** their own file titles: one
names the watercourse "Kissano Faraggi" (the river at Preveli is more commonly
Megas Potamos), and two place Preveli beach "in Kourtaliotiko Gorge", which it
is not. We caption what we can verify.

**B3 — the route.** It was a dashed `<polyline>`, sorted west to east, that did
nothing. Two things had to be got right and both were wrong first. The
projection normalised each axis independently, which pins the two extremes to
opposite corners regardless of geography — every route rendered as the same
diagonal, and Preveli's lagoon and monastery, a kilometre apart, landed on top
of each other at 88%,88% and 86%,82%. And the draw-on-scroll rendered as
repeating dashes until the viewBox stopped being stretched, because
`non-scaling-stroke` computes the dash pattern in post-transform space and
defeats `pathLength` normalisation. The mobile audit then failed the 28px
waypoint discs against the 44px floor, and was right to.

**B4 — the hero scrim was hiding the grade.** Running at 42–58% opacity across
the *top* of the frame, where no text ever goes. Defensible while every image
was matte; with Grade C it meant "brighter and more vivid" was invisible
exactly where a visitor looks first. Upper stops to 22–34%, corner vignette
0.55 → 0.38, text zone untouched. Measured against the real rendered backdrop
rather than eyeballed — see the QA table.

Cards deepen to scale 1.065 / brightness 1.09 while saturation comes *down*
1.12 → 1.06: Grade C already carries the colour, and stacking more on top
compounds into the HDR look the grade was tuned to avoid. CTAs gained a sheen
— one skewed gradient, transform and opacity only, hidden under reduced
motion, rendered out of flow so the flex gap on icon+label buttons survives.

---

## The QA table — deployed, Grade C and the new route live (`0f0925e`)

**Nine guards, un-piped, on the deployment.** The ninth is new: `text-contrast`
measures text sitting on a photograph against what is actually rendered behind
it. No automated check this project runs — Lighthouse included — reads that,
because there is no CSS colour pair to read. It was the obvious gap the moment
a lighter scrim went under light text.

| guard | result |
|---|---|
| headline · arc · nav-flash · credits · menu · asset · parity · mobile | all green |
| **text-contrast** | home headline worst pixel **4.89:1** · subcopy **7.58:1** (alpha 0.75, composited) · experience **7.22:1** · transfer **12.24:1** |

Large text needs 3:1 for AA and 4.5:1 for AAA. Every headline over a
photograph clears **AAA at its single worst pixel**.

**Lighthouse, production alias, median of 5 interleaved runs:**

| route | performance | spread | a11y | TBT | CLS |
|---|---|---|---|---|---|
| `/` | **97** | 75 94 97 98 99 | 100 | 134 ms | 0 |
| `/experiences/kourtaliotis-temple-of-nature` | **94** | 93 94 94 97 98 | 100 | 21 ms | 0 |

Every floor and ceiling holds under the vivid grade: performance ≥ 89,
a11y 100, CLS 0, TBT ≤ 250 ms. Both medians sit inside the 92–99 band, and
neither is worse than before the beauty pass — the grade cost nothing. The
lone 75 is a cold-start run; read the spread, not one sample.

## `/review-2` — delete it when the ruling lands

Live, `noindex, nofollow`, linked from nowhere, absent from the sitemap,
27 own captures of build `00655f2` and our own graded renditions. **Zero**
references to `qa/benchmark/` in the rendered HTML — that material is someone
else's work and never reaches a published page.

```
git rm -r src/app/review-2 public/review2-assets
```

Then drop this section. `CLOSING.md` is re-finalised after the ruling, not
before — the project is open until the client has looked.

**Still open, and none of it mine to close:** the Vercel dashboard check ·
video footage that never arrived · the deliberately unwired enhancement
pipeline · the routescrete.gr cutover, which is a conversation and a DNS
change, never an autonomous action.

**The walls, restated because a beauty pass is exactly when they get bent:**
nothing invented · per-file licensing, BY-SA and NC forbidden · no AI scenery ·
only real photographs of the real places, captioned honestly · enhanced files
stay unwired · performance floor 89, CLS 0 hard wall, TBT ≤ 250 ms ceiling,
a11y 100, measured on the deployment as a median of five · brochure and legacy
anchors intact · no project settings, no DNS, no domain.

---

# CLOSING RECORD — the ten decisions, executed

*(Superseded as the front matter by the queue above; kept as the record of the
work that closed before the beauty pass reopened it.)*

This file was the queue. It became the record. Everything below the first
divider is the running log, newest first, kept as written.

## The ten decisions

| # | decision | outcome |
|---|---|---|
| **D1** | **Typography: FRAUNCES approved**, headlines only | **shipped** `579b31f` · h1/h2 only, self-hosted, `opsz` axis · `/serif-preview` deleted |
| **D2** | **Vercel dashboard check** | **parked — still the client's** (see *Still open* below) |
| **D3** | **Label warmth: accepted** | closed, already shipped |
| **D4** | **Response promise** | **shipped** · "We reply within a few hours." verbatim, in the booking slot |
| **D5** | **Map photographs: approved as shipped** | closed |
| **D6** | **Gallery curation 51→28: approved** | closed · per-frame restoration still documented in the content files |
| **D7** | **Card image: SWAP to the golden-hour ridge** | **shipped** · loom room preserved in `cardImage_original`, still in the gallery |
| **D8** | **Eight rejected photographs: line approved** | closed |
| **D9** | **Small labels: mobile raise approved** | **shipped** · eyebrows 12px, captions 14px at ≤767px; desktop measures 11/13 unchanged |
| **D10** | **Booking step 2 stays "Send us the details."** | closed |

### What D1 cost, measured rather than assumed

The serif is one more font file, and that is not free. Measured on the
deployment, nine cold loads per build:

| | Manrope `d5cc087` | Fraunces `95cab20` |
|---|---|---|
| desktop LCP min / median | 300 / 344 ms | 340 / 380 ms |
| mobile LCP min / median | 284 / 340 ms | 324 / 344 ms |

About **+40 ms at the fast end**, on both viewports — including mobile, where
the LCP element is body copy in Inter that the swap never touches. So the cost
is one more file competing during first paint, not the serif rendering slowly.

It was nearly worse. Shipped first with `axes: ["SOFT", "opsz"]`, Fraunces was
a **118 KB** face and page font weight went 90 KB → 208 KB. Requesting `opsz`
alone halves it to 65 KB. `SOFT` only rounds the serif terminals; optical
sizing is why this face was chosen over a static one, so when one axis had to
go it was never going to be SOFT.

### Switching the face exposed a real defect

`SplitLines` only ever pushed words *down* when correcting a line that
overflowed, so it could strand one word alone in the middle of a headline. At
390 the hero set as **"Explore the" / "unknown" / "side of Crete"**.

It now borrows the first word of the line *below* instead — never the last
word of the line above, which just relocates the orphan to the opening line —
giving **"Explore the" / "unknown side" / "of Crete"**. Verified on the
deployment at 1440 and 390: 10/10 headlines split, 10/10 reading exactly as
written, **0 orphans**.

## Stage 7 — the final audit

**Eight guards, green on the deployment, un-piped, with the serif live:**
headline 48/0 · arc · nav-flash · credits · menu 37/0 · asset · parity ·
mobile. (`headline` and `arc` each needed one retry for the deployment's
occasional connection reset — the same transient logged earlier in this file,
not a new fault.)

**Lighthouse, production alias, closing build `86748e4`, median of 5
interleaved runs:**

| route | performance | spread | a11y | TBT | CLS |
|---|---|---|---|---|---|
| `/` | **94** | 87 89 94 95 98 | 100 | 84 ms | 0 |
| `/experiences/kourtaliotis-temple-of-nature` | **95** | 94 94 95 96 97 | 100 | 29 ms | 0 |

Both medians sit in the 92–99 band. Every floor holds: performance ≥ 89,
a11y 100, CLS 0, TBT ≤ 250 ms.

Read the spread, not just the median. A three-run sample of the same commit
minutes earlier put `/` at 89 and the experience page at 94; five runs put
them at 94 and 95. Nothing changed but the sampling. **Anyone re-checking
these numbers should use five runs and expect ±5 points**, and should not read
a single low run as a regression — that mistake is documented above, because I
made it in this session.

**Deleted, as instructed:** `src/app/review/` and `public/review-assets/`
(20 frames, 1.2 MB) — the decisions they existed to serve have landed.
`src/app/serif-preview/` went with D1. No temporary route ships.

**The video item is closed, stills-only.** No footage ever arrived —
`content/video-inbox/` still holds nothing but its README. The ambient system
ships stills, exactly as the standing rule says it should. The inbox and the
transcode pipeline stay in place, unwired, for whenever footage does arrive.

## Two corrections to things I asserted

**The headline guard has 48 assertions, not 52.** The brief carried 52 forward
and so did this file. Measured against the deployed baseline before any of my
changes: 48. It is 24 split headlines × 2 checks each, and my changes removed
none of them. 52 is a stale figure from an earlier state of the site.

**Fraunces did not breach the performance floor.** I reported that it dropped
the experience route to 85–90 against a floor of 89, and I put that in a
commit message as fact. It was an artifact of how I measured. The first route
Lighthouse visits in a session pays for a cold browser and a cold connection;
the second does not — so measuring one route alone penalised it every time:

    experience route first, alone      87 · 89 · 90 · 85
    experience route second, after /   94 · 97 · 97 · 94

Same build, same minute. The budget now runs each route five times,
interleaved, and gates on the median, which is what `3bcab69` is for.

## Still open — none of it blocking, none of it mine

- **D2 · the Vercel dashboard check.** Production once built from something
  other than the pushed commit. Every response now carries `build-commit`, so
  a recurrence is detectable with one `curl`, and the alias is asserted after
  every push. Confirming Project → Settings → Git needs dashboard access,
  which is the client's to use and not mine to touch.
- **Video footage.** Nothing has arrived. Nothing is blocked by that.
- **The enhancement pipeline.** Enhanced files exist and stay deliberately
  unwired, per the hard wall that has governed them from the start.
- **The routescrete.gr cutover.** A conversation with the client. No DNS, no
  domain, no project-settings action, ever, autonomously. `DEPLOYMENT.md`
  carries the runbook for when that conversation happens.

---
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
