# HANDOFF — Routes Crete

**State as of 2026-10-12.** `main` = `origin/main` = `33f85ba`, tree clean, nothing
committed since 2026-09-19. Production serves `33f85ba` and answers 200. The site
is finished and live on its Vercel URL; the `routescrete.gr` cutover is fully
prepared and deliberately unexecuted.

This document is written for whoever picks the project up next. It summarises and
points; it does not replace the long records. Where it states a fact, the fact was
checked against the repository or the live site on 2026-10-12 — not copied from a
document.

---

## 0. Read this first

**Which document wins.** The project has seventeen root documents, this one included,
and they do not all agree, because several were written before decisions that
superseded them. In order of authority:

| For | Read | Note |
|---|---|---|
| The current state, newest first | `MORNING.md` | **Reverse-chronological — the newest chapter is at the TOP.** Older chapters are history, not instructions. |
| How to close out / verify / what the client owes | `CLOSING.md` | Current. Its "Parked" and "For the client" lists are the authoritative ones. |
| The domain cutover | `CUTOVER.md` | Current and executable. Where it and `DEPLOYMENT.md` differ, `CUTOVER.md` is current (`DEPLOYMENT.md:103` says so itself). |
| Photography rights | `PHOTOGRAPHERS.md`, `SHORTLIST.md`, `MONUMENT-LICENCE.md`, `TOURISM-LIBRARIES.md`, `content/photo-credits.json` | Current, marked final for the client. |
| Copy provenance | `COPY-MAP.md` | Current. |
| The build, routes, guards | `README.md`, `qa/README.md` | **Partly stale — see §7.** |
| Deferred product work | `BACKLOG.md` | **Stale — see §7.** Not reconciled since 2026-09-14. |
| Design direction | `DIRECTION.md` | **Superseded.** Still opens "Two candidates. Pick one" (`DIRECTION.md:3`). Only §1 (voice) and §4 (copy deck) are still live. |
| The autonomous-session protocol | `RUN-BRIEF.md` | **Stale in four places — see §7.** |
| Phase-1 content audit | `CONTENT_INVENTORY.md` | Historical. Still marked "awaiting your approval before Phase 2". |

**The 60-second state.** Next.js 16.3.5 / React 19.2.8 App Router site, TypeScript,
Tailwind v4, no CMS and no database — `content/*.json` is the whole source of truth.
Eight page surfaces. Design edition **C+ "Warm Editorial"**, locked 2026-09-17 after
the client saw it live and said *"much better now."* Last code commit `06e13d0`
(no-observer fallbacks); `33f85ba` on top of it is documents only, so **production's
code is the measured code**. Guard suite 13/13 green, Lighthouse 95/93/96/97/98 with
a11y 100 and CLS 0. Nothing is blocked on us; the critical path is the cutover, and
it waits on the client.

---

## 1. What has been done

### The site

- **Stack:** Next.js 16.3.5, React 19.2.8, TypeScript, Tailwind v4, Motion 13.2.0,
  GSAP + ScrollTrigger, Lenis, `next/image`, `next/font` (Fraunces display, Inter
  text, self-hosted, latin subset).
- **Eight surfaces:** `/`, `/experiences`, `/experiences/[slug]`, `/transfers`,
  `/transfers/[slug]`, `/contact`, `/credits`, and a prerendered 404. Unknown item
  slugs are served from the 404 page (`014b9e9`). `sitemap.ts` is generated from the
  content directory, so a new JSON file appears in it with no code edit; `robots.ts`
  reads only the canonical origin from `content/site.json`.
- **Content-driven, no CMS:** `content/site.json`, two experiences
  (`kourtaliotis-temple-of-nature`, `heart-of-cretan-tradition`), one transfer
  (`private-transfers-rethymno`), a 30-record photo ledger
  (`content/photo-credits.json`) and a generated `blur-map.json`. `/transfers`
  renders one service as an editorial spread and becomes a grid by itself once a
  second exists.
- **It replaces the client's original one-page site while preserving every word and
  image of it.** Every superseded value survives under an `*_original` key;
  `qa/parity.mts` asserts they are still there. The original site is untouched and
  still serves `routescrete.gr`.
- **Homepage arc:** exactly five movements — cover, `#positioning`, `#experiences`,
  `#signature`, `#how-to-book`. The marquee strap and golden band are *bands*, not
  movements. The team movement came out on 2026-09-11; its names and roles stay in
  content and `#team` lands on `#positioning`.
- **Security and a11y foundations:** security headers on every route, CSP enforced at
  zero violations, the Monday.com booking form sandboxed and lazily mounted,
  `frame-src` scoped to `/contact`.

### What is live and measured

`06e13d0` is the last code commit and the one measured. On production:

| route | performance | spread | a11y | TBT | CLS |
|---|---|---|---|---|---|
| `/` | **95** | 93 93 95 95 96 | 100 | 38 ms | 0 |
| `/experiences/kourtaliotis-temple-of-nature` | **93** | 89 93 93 93 95 | 100 | 18 ms | 0 |
| `/transfers/private-transfers-rethymno` | **96** | 92 95 96 96 96 | 100 | 45 ms | 0 |
| `/transfers` | **97** | 96 97 97 99 99 | 100 | 14 ms | 0 |
| `/contact` | **98** | 96 97 98 99 99 | 100 | 11 ms | 0 |

Median of five interleaved runs per route, mobile, 2026-09-18. Also green:
full guard suite **13/13, `failures: 0`**, `CUTOVER SMOKE OK`,
`NO-OBSERVER PROBE OK` (0 failures).

**The last three briefs delivered,** in order: the C+ rollout plus the security and
a11y foundations; the C+ lock, the photo rulings, and the fully prepared cutover; and
the publication of the no-observer fallbacks. That last one mattered more than it
sounds: **without it, any browser lacking `IntersectionObserver` got a blank page** —
the reveal effect threw, React tore down the whole root, and every probed route
rendered no `<main>` and 70 characters of body text at both viewports. With it, 27
real probe failures became 0.

### The verification apparatus

Thirteen mechanical checks: eleven browser-driven guards (`headline-guard`,
`arc-guard`, `nav-flash-guard`, `credits-guard`, `menu-audit`, `asset-audit`,
`mobile-audit`, `text-contrast`, `security-headers`, `copy-subset`,
`visual-check`), `parity` — which reads the content files and fetches the HTML
rather than driving a browser — plus the file-only `preflight`. Two more sit
outside the suite:
`qa/cutover-smoke.mts` (cutover day, per host) and `qa/lighthouse.mts` (the only
budget that gates numbers). Every guard change ships with a paired seeded-fault proof
— a pass half on the reference build and a fail half on a patched tree.

---

## 2. What is pending

Nothing is blocked on us. The work splits four ways.

### 2a. The critical path — the cutover (waits on the client)

`CUTOVER.md` is one ordered 19-step plan — steps 1–18 each tagged CLIENT or OURS,
step 19 an untagged pointer to the held upgrades — plus a 4-step rollback.
**Nothing in it has been executed:** no DNS record, no domain added to Vercel, no
certificate, no environment variable. `www.routescrete.gr` is primary and the apex
308-redirects to it. The whole origin move is one build-time variable,
`NEXT_PUBLIC_SITE_URL`, which must be either `https://www.routescrete.gr` or unset
— any other value throws at build time.

What it waits on: **a date, DNS-panel access at aspx.gr, Vercel → Domains access,
and — highest risk — the list of mail names actually in use.** `*.routescrete.gr` is
a wildcard CNAME to the apex, so the moment the apex points at Vercel, every name
without its own A record (`smtp`, `imap`, `pop3`, `webmail`, …) follows it to Vercel,
where nothing answers for it. `mail.routescrete.gr` has its own record and is safe;
nobody has yet enumerated the rest. That was one of the adversarial review's two
highest-severity findings (`MORNING.md:570`); the other was the Ministry form's
printed declaration.

**One loose end nobody closed:** the CAA record for `routescrete.gr` was never
checked — the resolver used could not query it (`CUTOVER.md:57`). A restrictive CAA
would make Vercel's certificate issuance fail at step 8 with nothing in the plan
predicting it. A read-only lookup against the authoritative nameserver closes it in
a minute, and should be done before the day.

### 2b. Awaiting the client

Six are listed in `CLOSING.md:38-81`; three are recorded elsewhere — the HSTS
preload submission at `CLOSING.md:79-81`, SPF at `CUTOVER.md:258-264`, and the D2
dashboard check at `CLOSING.md:342-346`. **This repository takes none of them on the
client's behalf — nothing has been contacted, sent, bought, submitted, paid or
switched on.**

1. **The monument licence application.** Prepared in full in `MONUMENT-LICENCE.md`:
   legal basis (ν. 4858/2021 art. 46), the Greek letter with an English translation,
   Annex A of four live photographs, and the fee band — **€250 + VAT (€310 at 24%)**
   for 1–20 photographs over up to five years. The client must submit it to the
   Ephorate of Antiquities of Rethymno, pay ODAP, and write separately to Preveli
   Monastery (`webmaster@preveli.org`) for photograph 4. **Four monument frames are
   live while it is pending — the client's own recorded decision, so the exposure is
   his**; the law wants the licence before publication and a lawyer's opinion is
   recommended. Three desk tasks come first: fill Annex A's two bracketed columns,
   confirm the four "on a page since" dates, and get the lawyer's view before signing
   the printed declaration (three of its sentences are untrue in this case).
2. **The client's own photographs** — a Google Drive link, never supplied. Still the
   single largest improvement available: three sourcing passes could not find a
   licence-clean warm-light frame of the places this site names, apart from the
   Rethymno harbour at night (now the transfer page hero), and the Tradition day's
   own photographs are all 1024 px or under. (One Kourtaliotis original,
   `ku1574-dsc06647.jpg`, is 4000×6000 — the exception, not the rule.)
3. **The photographer permission messages** — two drafts, each in Greek and English
   (the shortlist message and an optional confirmation to Rolf Dietrich Brecher),
   against a tier-ranked shortlist of thirteen photographers. One photograph per
   message. Nothing sent.
4. **Any stock purchase** — gated first on the repository question (below).
5. **The cutover** (§2a).
6. **Vercel Bot Protection** (log mode first, then challenge) and a Deployment
   Protection decision for previews.
7. **HSTS preload submission** — deliberately separate and later; three preconditions
   are unmet and removal from browsers' preload lists takes months.
8. **SPF**, with the host, after the day: `v=spf1 a mx -all`'s `a` term will
   authorise Vercel's address once the apex moves; it should become
   `ip4:31.22.115.30`.
9. **The D2 Vercel dashboard check** — production once built from something other
   than the pushed commit; intermittent rather than fixed.

**The repository question gates two of these.** iStock's licence forbids any use that
lets others download the image standalone, and this site deploys from a *public*
GitHub repository where the graded file is exactly that. So no paid stock can be
bought and Pixabay stays held entirely until either the repository goes private or a
private asset store is stood up.

### 2c. Ready to do, unblocked

- **A tap on "Menu" before hydration does nothing** (`BACKLOG.md:98-118`,
  `src/components/layout/Nav.tsx:468-471`). The overlay trigger is a server-rendered
  `<button>` whose handler arrives with hydration; the menu was measured usable a
  median of ~300 ms after `domcontentloaded`. **This is the only genuinely open,
  unblocked, visitor-facing defect left.** Deferred, not blocked.
- **Header contrast during the menu crossfade** collapses to ~1.02:1 for 70–130 ms
  (`BACKLOG.md:36-63`). Deferred for design risk — and the evidence predates C+, so
  **re-measure before touching any nav code**; the measurements are expressed in
  colour tokens that no longer exist.
- **Annex A's desk tasks** and the **CAA lookup** (both above).
- **The documentation drift in §7.**

### 2d. Parked by decision — do not reopen without the client

Each is parked for a reason that still holds. `CLOSING.md:322-346` covers the first
three; the rest are recorded elsewhere, as cited.

- **The rotating trust badge.** Built, renders nothing. It was specified as "5-STAR
  RATED ON TRIPADVISOR" and **no rating, review count or award exists for this
  business anywhere.** Closed by the client as "not yet". Filling all three of
  `text`, `href` and `verifiedOn` ships it with no code change — which is exactly why
  nobody may fill them casually.
- **Ambient video.** `content/video-inbox/` holds only its README. Stock and
  generated footage are prohibited substitutes: the slot waits for the real thing or
  the slot goes away.
- **The enhancement pipeline** stays unwired. A hard wall from the start.
- **The plain-C revert** is closed (`CLOSING.md:29-30`); `editions/plain-c.css` was
  *deleted* from the tree rather than unlinked, because a drop-in kept in the tree is
  an active path whatever the documents say. Git keeps it one command away at
  `e5b1059`.
- **True small caps** for the display face (`MORNING.md:884-903`) — Fraunces does not
  deliver them; left open for the client.
- **Veil page transitions** (`BACKLOG.md:69-73`) — optional, demoted by client
  decision; nobody has judged the test.

### 2e. Open pull requests (verified live, 2026-10-12)

Dependabot has recreated two of its three major-bump branches since the last session,
so the documents' **`#4` (eslint) and `#2` (@types/node) are stale — they are now #9
and #8. `#3` (typescript) is still the live number.** Live set:

| PR | What | Policy |
|---|---|---|
| **#10** | minor-and-patch group, 9 updates — incl. `next` 16.3.5→16.3.6, `react`/`react-dom` 19.2.8→19.3.0, `motion` 13.2.0→13.4.0 | Mergeable. Merge **one at a time after the full guard suite**. A React minor touches the hydration surface, so re-run the no-observer probe too. |
| **#9** | `eslint` 9.39.5 → 10.9.0 (major) | Held |
| **#8** | `@types/node` 20.19.43 → 26.2.0 (major) | Held |
| **#3** | `typescript` 5.9.3 → 7.0.2 (major) | Held |

The three majors are parked on branch **`maint/post-cutover-majors`** (`7670382`),
which carries its own `MAINTENANCE.md` with the merge steps. On that branch install,
types and build pass but **lint cannot even start** (typescript-eslint does not
support TypeScript 7). Deliberately held until after the cutover week; neither the
suite nor Lighthouse has ever been run there.

---

## 3. Design decisions, and why

These are closed. The rationale is recorded so nobody reopens them by accident.

### The edition

- **C+ "Warm Editorial"** over plain C. The client's instruction when picking C was
  *"it can become even more beautiful"*, so C was refined rather than shipped; after
  seeing C+ live the client said *"much better now."*
- **Direction C** over A "Deep Aegean" and B "Cycladic Light" — the client's pick on
  2026-09-14 from three live drafts, each built, critiqued and revised.
- **The whole edition is two files:** `src/app/edition.css` (colour, type, texture
  tokens) and `src/lib/edition.ts` (`GRADE`, `THEME_COLOR`, `DUOTONE`,
  `ITALIC_EMPHASIS`), plus the font preload literals in `src/app/fonts.ts`.
  Preflight's P9–P13 fail if any such value is declared anywhere else — but
  **preflight is a manual guard (`node qa/preflight.mts`), not a build step**: there
  is no `prebuild` hook and no CI workflow, so `next build` alone will not catch a
  stray token. **Any future token change goes in those two files and nowhere else.**
- **The palette** is paper-first: cream `#f6f0e4` and bone `#ece3d2` ground, ink
  `#28231f` text, burnt sienna `#b4532e` accent, olive `#58623a` labels and bands,
  night `#221d19` for rare dark surfaces, kept rare by intent. **Gold is quarantined
  to the CTA pill**, which is the only rounded
  control on the site; preflight fails a gold CTA utility or a rounded shape outside
  `Button.tsx`.
- **Type:** Fraunces at display optical size (`opsz 144` only) for display, Inter for
  text. Shipping Fraunces' SOFT axis as well once cost 118 KB for one face and
  dropped a route under the floor.
- **Exactly one italic emphasis word per headline**, never recoloured, matched
  verbatim against the content, never a place or brand name. The reason is specific:
  a single word accented in italic *colour* is a known tell of a generated page, and
  direction C's own critic called the terracotta-italic "Crete" the most recognisable
  generated-looking element on it.

### Imagery

- **All photographic warmth comes from the grade pipeline. No CSS filter, blend or
  overlay on any photograph, ever** — preflight enforces it. C's peach sky came from
  a CSS overlay; C+ removed it. When a critic asked for a warmer cover sky, the ruling
  was that the sky stays as grade D renders it.
- **Grade D "amber soft"** chosen by eye from five prototypes over ten frames (D1
  veiled the blacks, D2 gave milky skies, D3 read yellow, D5 was one step too far).
  One repeatable documented pass over every image, sourced and original alike, so the
  library reads as a single shoot despite five sources.
- **If a golden-hour look is ever wanted again, source dusk material — do not
  re-grade.** Measured twice: the sourced frames are harsh midday sun under blue sky
  and a grade "cannot manufacture golden hour".
- **Itinerary surfaces** (cards, galleries, waypoints, route stops, item heroes) show
  **only places the tours actually visit**. **Mood surfaces** (hero, bands, closing
  scene, menu backdrop) may show any verifiable Crete, captioned honestly and
  generically. A photograph may only stand for a place it actually shows.
- **No AI-generated scenery, people or experience imagery. Ever.**

### Photography rights

The governing rule: **no photograph enters the site without a verifiable right to use
it** — not from Instagram, not from Google Images, not "just for now". Every licence
is read on the photograph's own page, never from a search result, and every master is
tied to its licence by SHA-1 so a swapped file cannot inherit another photograph's
licence.

- **30 ledger records:** CC BY 2.0 ×12, CC0 ×5, CC BY 3.0 ×3, CC BY 4.0 ×1,
  CC BY-SA 4.0 ×1, Pexels ×5, Unsplash ×3.
- **Masters are stored by licence, because the repository is public.** CC/CC0 masters
  are committed in `assets-src/sourced/` (22 files); free-stock and
  written-permission masters stay in gitignored `assets-src/stock-local/` and are
  never committed — only the graded derivative ships.
- **CC BY-SA 4.0 — that version only — is admitted as *an obligation met*, not as a
  free licence.** Grading makes a derivative, and share-alike obliges the graded
  result to carry the same licence. So the one such frame's graded file is itself
  published under CC BY-SA 4.0 with a download link on `/credits`. `credits-guard`
  C16 mechanises all of it. Every other BY-SA version stays forbidden.
- **No Public Domain Mark frame enters the site.** Of 106 PDM-labelled items read at
  source, 59 were excluded — mostly labels personal accounts applied to their own
  photographs with no waiver (Greek law 2121/1993 art. 29 still protects them), plus
  unsourced re-uploads and off-topic results; the 47 verifiable at an institution are
  all off-subject. **Pixabay is held entirely.**
- **No official tourism-board library may be used today** — each either forbids
  commercial use outright or reserves every right pending specific written
  permission.
- **Attribution is a licence condition, not a courtesy.** A `/credits` link sits
  inside a `contentinfo` landmark on all nine routes including the 404, and
  `/credits` states that the images were modified.

### Copy and content

- **Three provenances only — surfaced, written, kept.** "Surfaced" means the original
  copy already held the best version and it was promoted rather than rewritten.
- **Parity means preserved, not visible.** v1 of the parity guard asserted the
  originals appeared *on the page*, which was right for a faithful port and wrong the
  moment the approved deck replaced them — it would have forced the site to say "Our
  Amazing Team" forever. **Deleting a guard to pass it is how content quietly goes
  missing.**
- **Nothing is invented about the business.** No awards, years in business, traveller
  counts, reviews, ratings or prices. Unknown values stay `null` and the UI renders
  "On request". No public email address exists and it stays `null`. The "Cretan
  Routes" Facebook page is an unrelated business and must never be linked.
- **Social proof renders from verified data or not at all** — and only as a link a
  reader can check.

### Performance and motion

- **The cinematic layer is not to be removed to buy Lighthouse points.** Decided
  explicitly with the tradeoff on the table: the last few synthetic points cost
  exactly the things the project exists to deliver, while real users already get
  ~1 s LCP and CLS of exactly 0. The standing "reduce unused JavaScript" opportunity
  **is** the motion layer and is not a regression.
- **Never wrap the largest text block in an entrance animation.** The hero photograph
  is not the LCP element and never was — Chrome does not treat a full-viewport image
  as an LCP candidate. LCP here is hero *text*; an opacity-gated subheading cost
  3420 ms against 992 ms once ungated.
- **The route-level loading screen was removed**: it wrapped every page in Suspense,
  so first paint in all five runs was the paper fallback.
- **`content-visibility: auto` was tried and cut** — it bought nothing measurable and
  blinded the guards (text in a skipped block reads as empty through `innerText`).
- **The 3D terrain relief was not built** — on budget (a WebGL runtime cannot fit in
  one point of headroom) and on design grounds.

---

## 4. Hard rules

Break none of these without an explicit client decision.

**Measurement**
1. **Do not lower a floor to make a red run green.** Performance ≥ 89, a11y 100,
   CLS 0 (hard wall), TBT ≤ 250 ms, gated on the **median** of five interleaved runs.
2. **Judge Lighthouse on production only.** Localhost runs ~10 points under; branch
   previews ~3 points under on item routes, and a branch alias is `noindex` so it
   reports SEO 69 — which looks exactly like a catastrophic regression in your own
   code.
3. **Run guards un-piped, one at a time.** `node qa/parity.mts | tail` exits 0
   whatever it found, so a piped guard is a guard that cannot fail. A parallel batch
   contends for the machine and trips Vercel's bot challenge.
4. **A guard's instrument may be replaced; its property is never loosened.** Every
   instrument change needs a pass half and a seeded-fault fail half.
5. **A guard must measure the thing, not a representation of the thing** — recorded
   five times over. Assert existence and extent before behaviour.
6. **"Which commit is live?" is never an inference** — every page carries its build
   stamp; read it with `qa/alias-assert.mts`.
7. **Do not work around Vercel's bot mitigation.** `BLOCKED` is never "not deployed".

**Content and rights**

8. No photograph without a verifiable right to use it; every master SHA-1-tied to its
   ledger row.
9. Only the exact allowlisted licences ship. CC BY-SA at 4.0 only, with the full
   obligation met.
10. Masters stored by licence; free-stock and permission masters never committed;
    Pixabay never shipped in any graded form.
11. A photographer's permission covers the photograph, **not the monument in it** — a
    Fortezza, harbour/lighthouse or Preveli frame must also go into the Ministry
    application.
12. Originals are never overwritten; a later swap gets its own key.
13. Nothing invented; social proof from verified data or not at all.
14. No AI-generated imagery; itinerary surfaces show only places the tours visit.

**Operations**

15. **`NEXT_PUBLIC_SITE_URL` may only ever be `https://www.routescrete.gr` or
    unset.** Any other value throws at build time by design — do not relax it.
16. **Only `.env.production` may ever be committed**, holding only that one line.
    Preflight P14 reads the git index *and* the working tree, and prints variable
    names only — never values, with one deliberate exception: the cutover switch's
    own origin, which is not a secret and is shown so a wrong-origin failure is
    diagnosable.
17. **Nothing in this repository's automation touches DNS, the domain, or Vercel
    project settings.** Nothing is sent, bought, submitted or switched on the
    client's behalf.
18. **`git push` is the deploy.** Never `vercel deploy --prebuilt`/`--temporary`:
    Vercel's builder mishandles Windows path separators on `[slug]` routes.
19. **`/assets/files/entypo.pdf` stays byte-exact** — 1,120,049 bytes, SHA-256
    `5b6df68ae2413907602b5627aacabf013438ba32486a59160f82d917d7cf6ac8`. Printed
    material points at it.
20. **Before adding any third-party origin,** set `CSP_ENFORCE` false, deploy, add
    the origin, run `qa/security-headers.mts`, and enforce again only at zero
    violations.
21. Legacy redirect sources are harvested from the `oldUrl` fields in
    `content/**/*.json` and **percent-encoded automatically** by `next.config.ts:55`
    (`encodeURI`). Do not remove that branch: before it existed, two Greek
    `/media/*` URLs were silently dropped and would have 404'd at cutover.
22. The `data-site-chrome` attributes on masthead and footer stay — four checks find
    the site chrome by them.

---

## 5. Next steps

**In order, if the project resumes.**

1. **Fix the two documentation traps in §7 first** — `qa/README.md:24` and
   `content/video-inbox/README.md:14`, both naming the wrong photo grade. They are
   cheap and they are the ones that cause silent damage. (The third trap, the suite
   runner's hardcoded paths, lives in the gitignored `.hunt/` tree and can only be
   fixed by whoever still holds it.)
2. **Reconcile `BACKLOG.md` and `RUN-BRIEF.md` with the tree**, or mark them
   superseded. A successor reading them today would redo work finished on 2026-08-18
   and act on contrast measurements expressed in colour tokens that no longer exist.
3. **Close the CAA lookup** before the cutover day — a read-only query against the
   authoritative nameserver.
4. **Hand the client the six actions in `CLOSING.md` "For the client"**
   (`CLOSING.md:43-77`) and get a cutover date. Then work `CUTOVER.md` steps 1–3:
   access, the saved DNS zone, the
   TTL lowered 24 hours ahead, and **above all the list of mail names needing their
   own records.**
5. **Execute `CUTOVER.md` in its written order** on the day. Step 4 establishes the
   green baseline; step 10 is the switch (one force-added `.env.production`, one
   commit, one push); step 11 is the verification gate that decides whether the
   cutover stands or rolls back.
6. **After the cutover week**, merge PR #10 one update at a time behind the full
   suite, then take the held majors from `maint/post-cutover-majors` following its
   `MAINTENANCE.md` — and run the suite and Lighthouse there, which has never been
   done.
7. **If further product work is funded**, take the Menu-before-hydration defect
   properly — with its own menu audit and a TBT measurement against the 250 ms
   ceiling, not as a patch.
8. **Do not reopen the parked items without the client** (§2d). Specifically: do not
   write a rating into `socialProof`, do not wire an enhanced file, do not restore
   `editions/plain-c.css`, and do not fill a video slot with stock.

---

## 6. Running it

```bash
npm install
npm run build
npx next start -p 3009
```

**Use `npx next start -p 3009`, not `npm start`.** `package.json`'s `start` binds
**3003**, while every guard defaults to `http://localhost:3009` — so `npm start` plus
a guard measures nothing. Dev-server numbers are meaningless for performance and
motion, and dev serves no CSP at all.

Then, from the repo root, one guard at a time and un-piped:

```bash
node qa/preflight.mts
node qa/headline-guard.mts
node qa/credits-guard.mts
```

Performance, against production and after warming the route:

```bash
QA_LH_RUNS=5 QA_BASE_URL=https://routes-crete-redesign.vercel.app node qa/lighthouse.mts
```

Which commit is live:

```bash
node qa/alias-assert.mts $(git rev-parse --short=7 HEAD)
```

**On a preview, expect exactly three reds and do not chase them:** `asset-audit`
(og:image "WRONG ORIGIN"), `security-headers` and `visual-check` (CSP violations from
Vercel's injected `vercel.live` toolbar script). All three were reproduced on commits
predating the code under test, and all three pass on production.

**The suite runner is not in the repository.** `.hunt/` is gitignored, and it holds
`run-suite.sh`, `run-guard.mjs`, the no-observer probe, the 485 seeded-fault proof
artifacts, and the S0 baseline `text-nodes.json` that `qa/copy-subset.mts` hard-requires.
A fresh clone has the twelve guards but cannot run the suite as recorded. Everything
needed to build and serve the site **is** committed (239 graded images under
`public/`); only the free-stock masters and this evidence tree are local.

---

## 7. Known documentation drift

Verified against the tree on 2026-10-12. The first three are operational traps; the
rest mislead but do not break anything.

**Traps**

1. **`.hunt/lock/suite/run-suite.sh` hardcodes two machine-specific paths** — the repo
   path at line 5 and, at line 6, a Node binary inside *one session's* scratchpad
   (`.../b41bd28b-.../scratchpad/domi-node.exe`). It exists today, but a different
   session makes the runner unrunnable with no useful error. Note that `.hunt/` is
   gitignored, so this one is only fixable by whoever still holds that tree.
2. **`qa/README.md:24` says "the live grade is C". The live grade is D**
   (`src/lib/edition.ts:18`). That line sits on the very command whose documented trap
   is forgetting to name the grade — and `qa/grade.ps1` defaults to **A**.
3. **`content/video-inbox/README.md:14` says to grade arriving footage "to direction
   B". The production grade is D.** That README is the procedure that fires the moment
   client footage arrives, under time pressure.

**Stale facts**

4. `README.md:189-196`'s performance table (`/` 92–95, item route 89) predates the
   shipped build; `CLOSING.md` has the current numbers.
5. `README.md:79-80` names **Manrope** in the type stack; `src/app/fonts.ts:16` says
   "Manrope is gone; nothing references it".
6. `README.md:115-121`'s folder listing omits four `src/lib` files that carry the
   edition tokens and the whole canonical/serving origin split.
7. `src/app/fonts.ts:8` still describes the plain-C revert in the present tense as a
   live path; it was closed on 2026-09-17.
8. `DIRECTION.md` has no superseded banner and still reads as an open A/B decision.
9. `BACKLOG.md:12-34` lists "Server-side hero flag" as deferred; it shipped on
   2026-08-18 (`3ae8c0b`). Its `increment 2/3/4` scheme is orphaned — no live plan
   defines them.
10. `RUN-BRIEF.md` is stale in four ways, including a first queue item (the temporary
    `/review` route) that was built and then deleted, and a resume pointer to a
    "NEXT SESSION STARTS HERE" heading that no longer sits at the top of `MORNING.md`.
11. `CLOSING.md:340` says "Enhanced image files exist and are deliberately not
    wired". **Nothing matching "enhanc" is tracked, on disk, or in history as a
    deleted path**, and the pipeline is recorded as never having run. The hard wall
    stands either way; the sentence should say so accurately.
12. The documents' Dependabot PR numbers for `@types/node` (#2) and ESLint (#4) are
    stale — they are now #8 and #9. TypeScript is still #3, in both the documents and
    the live set. See §2e.
13. `qa/_BUILD.json` on disk records commit `d6d4dbc`, `dirty: true`, captured
    2026-09-13. It is a stamp nothing reads back; do not mistake it for the verified
    state.
14. Guard count reads inconsistently: `README.md:42` and `CLOSING.md:252` say "the ten
    guards", `CUTOVER.md:197-199` implies twelve runs, and the records say 13/13. The
    thirteenth is `preflight`; the thirteen are enumerated only in the gitignored
    runner.
15. `git log` order here is **not** chronological: `06e13d0` carries an earlier author
    date than the commits beneath it, because the rebase replayed another session's
    commit on top. Read `MORNING.md`, not the log order, for history.
16. Two monument exclusions — `rethymno-old-town-lane.jpg` and the chapel inside
    Kourtaliotiko Gorge — are **our own unconfirmed reading**, not settled law. Both
    sit inside declared areas. If certainty is wanted, both questions go into the same
    letter before any such frame goes on a page.
17. The `Written permission` and `Pixabay` paths are fully wired through
    `credits-guard` but **have no subject**: no such ledger record exists and
    `assets-src/stock-local/permissions/` is not present. That machinery is untested
    against a real record.

---

*Written 2026-10-12 against `33f85ba`. Facts checked against the repository and the
live site; where a document is the only source, it is cited so the next reader can
judge it.*
