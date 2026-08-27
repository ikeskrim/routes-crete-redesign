# Routes Crete

A complete redesign and rebuild of [routescrete.gr](https://www.routescrete.gr/). The original
one-page site becomes a content-driven multi-page experience, keeping **every word and every
image** of the original.

> **Built, deployed and verified.** Live at
> **https://routes-crete-redesign.vercel.app** — the domain has not been cut over.
>
> **Start with [`CLOSING.md`](CLOSING.md)**: the state of the project, how to add an
> experience or a transfer, what is still open, and where the cutover runbook is.
> This README is the technical detail underneath it.

## Running it

```bash
npm install
npm run dev
```

Dev server: **http://localhost:3003** — a dedicated port, so it never clashes with the other
projects on this machine.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3003 (Turbopack) |
| `npm run build` | Production build + type-check |
| `npm start` | Serve the production build on port 3003 |
| `npm run lint` | ESLint |
| `npm run qa` | Playwright screenshots of every route → `qa/screenshots/` |

### Verification tooling

The QA scripts expect a **production** server (`next start`), since dev-server numbers are
meaningless for performance:

```bash
npm run build
npx next start -p 3009
```

**The eight guards.** Each one exists because something broke that way once;
`qa/README.md` records which. Run them **un-piped** — `node qa/parity.mts | tail`
exits 0 no matter what parity found, so a piped guard cannot fail.

| Guard | What it refuses to let through |
|---|---|
| `qa/headline-guard.mts` | A split headline that does not read exactly as written — 48 assertions. Written after the hero shipped reading `Exploretheunknown`. |
| `qa/arc-guard.mts` | The homepage's six movements out of order, or a section lost to a restructure. |
| `qa/nav-flash-guard.mts` | The nav bar rendering in the wrong state before JavaScript runs, or flipping after it. |
| `qa/credits-guard.mts` | A sourced photograph that is not attributed as its licence requires. |
| `qa/menu-audit.mts` | The overlay menu breaking any of its 37 promises (focus trap, scroll lock, escape, previews). |
| `qa/asset-audit.mts` | A reference that does not resolve, or a photograph that is not graded. |
| `qa/parity.mts` | A word or an image of the original that stopped reaching the page. |
| `qa/mobile-audit.mts` | Horizontal overflow, sub-44px tap targets, or body text under 14px at 390. |

| Script | Purpose |
|---|---|
| `node qa/visual-check.mts` | ~110 screenshots: every route, desktop + 390px mobile, nav states, lightbox, sticky CTA, a wheel-driven filmstrip through the pinned scene, and a reduced-motion pass. Accepts filters: `node qa/visual-check.mts mobile hero`. |
| `node qa/lighthouse.mts` | Lighthouse mobile → `qa/lighthouse/`. Gates on performance ≥ 89, a11y 100, CLS 0, TBT ≤ 250 ms. Set `QA_LH_RUNS=5` to measure each route five times, interleaved, and gate on the **median** — a single run against a deployment measures the network as much as the build. |
| `node qa/digest-shots.mts` | The client walkthrough, from the deployed alias, at desktop + 390 + reduced-motion. |

Point any of them at a deployment with `QA_BASE_URL=https://…`.

> Lighthouse is driven through a Playwright-launched Chromium because the bundled binary will
> not spawn via `chrome-launcher` on this machine.

## Stack

Next.js 16 (App Router, React Server Components) · TypeScript · Tailwind CSS v4 ·
Motion (Framer Motion) · GSAP + ScrollTrigger · Lenis · `next/image` ·
`next/font` (self-hosted, latin subset): **Fraunces** on h1/h2, **Manrope** on
everything else display, **Inter** for body.

## Folder structure

```
content/                     ← the single source of truth for all copy & media
  site.json                    nav, hero, why-us, booking steps, team, contact, footer, map pins
  experiences/*.json           one file per experience
  transfers/*.json             one file per transfer service
  blur-map.json                generated blur placeholders, keyed by image path

public/
  assets/files/entypo.pdf    ← the brochure, at its ORIGINAL url
  images/
    experiences/<slug>/        photos per experience
    transfers/<slug>/          photos per transfer
    team/  site/  brand/

qa/                          ← verification harnesses (dev-only, not shipped)

src/
  app/                         routes, layout, metadata, sitemap.ts, robots.ts
  components/
    ui/                        Button, Card, Container, Section, SectionHeading, RichText,
                               Media, Reveal, SplitLines, Cinematic, EmptyState, SmoothScroll
    sections/                  composed page sections (Hero, SignatureScene, ItemDetail, …)
    layout/                    Nav, Footer
    seo/                       JSON-LD
  lib/
    content.ts                 typed, cached loaders for everything in /content
    types.ts                   the content contract
    utils.ts                   cn(), inline-markup parser
    use-reduced-motion.ts      hydration-safe prefers-reduced-motion
    use-reveal-trigger.ts      "seen or scrolled past" one-shot reveal trigger
```

---

## Adding a new experience

**One JSON file and its images. No code changes.**

1. Put the photos in `public/images/experiences/<your-slug>/`.
2. Create `content/experiences/<your-slug>.json` matching the `ContentItem` type in
   [`src/lib/types.ts`](src/lib/types.ts) — copy an existing file as a starting point.
3. Regenerate blur placeholders (below).

It then appears automatically in: the homepage grid, `/experiences`, its own
`/experiences/<your-slug>` page, the "related" section of the other pages, `sitemap.xml`, and
the route map (for any location keys it lists).

### Adding a transfer

Identical, under `content/transfers/` and `public/images/transfers/<your-slug>/`. `/transfers`
renders a single service as an editorial spread and **switches to a grid by itself** once a
second one exists.

### Minimum fields

```jsonc
{
  "slug": "your-slug",
  "order": 3,                       // sort position
  "title": "…",
  "category": "Experiences",
  "cardImage": "/images/experiences/your-slug/cover.jpg",
  "heroImage": "/images/experiences/your-slug/hero.jpg",
  "facts": { "region": "…", "duration": null, "price": null, "availability": null },
  "locations": ["kourtaliotis-gorge"],   // keys from site.json → locations
  "body": [{ "type": "paragraph", "text": "…" }],
  "meta": { "title": "…", "description": "…", "ogImage": "/images/…" },
  "gallery": [{ "src": "/images/…", "width": 1024, "height": 683 }]
}
```

Optional: `subtitle`, `highlights`, `pullQuote`, `included` (brochure facts), `signature`
(makes it the homepage storytelling centrepiece), `scenes` (chapters for that scene).

### Content conventions

- **Body text is verbatim.** Paragraphs support a deliberately tiny markup subset — `**bold**`
  and `\n` for a line break. Nothing else is interpreted, which keeps the copy diff-able
  against the original site.
- **Unknown values stay `null`.** Never invent a price, duration or availability. The UI renders
  "On request" / "Request availability" instead.
- **`oldUrl`** on a gallery image records where it lived on the old site; a redirect from that
  URL is generated automatically in `next.config.ts`.
- **`scenes`** reference body paragraphs *by index* rather than restating them, so the
  storytelling scene can never drift from the source text.

### Regenerating blur placeholders

`content/blur-map.json` holds a ~600-byte base64 preview per image and is generated, not
hand-written. Any image without an entry simply renders without a blur-up — nothing breaks.

---

## Performance posture — read before "optimising" this site

**Final Lighthouse (mobile, production build, Lighthouse's simulated Slow-4G + 4× CPU):**

| Route | Perf | A11y | Best practices | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| `/` | 92–95 | 100 | 100 | 100 | 3.0–3.4 s | 20–30 ms | **0** |
| `/experiences/[slug]` | 89 | 100 | 100 | 100 | 3.8 s | 10 ms | **0** |

Performance on `/` straddles 95 — it measured 95, 92 and 93 on **identical code**. Treat any
single run as ±3.

**Real-device measurement.** A `PerformanceObserver` probe (`largest-contentful-paint`,
buffered) under mobile emulation at 412×823 / DPR 2.625 with 4× CPU throttling and a normal
network measures **LCP ≈ 992 ms** on `/`. Method is in git history; re-create it with Playwright
plus `Emulation.setCPUThrottlingRate`.

**Where the remaining synthetic gap lives.** It is transfer time on a simulated 1.6 Mbps link,
not execution. TBT of 10–30 ms and CLS of exactly 0 across every page say the motion layer —
GSAP, ScrollTrigger, Lenis, Motion, the pinned scrubbed scene, line-mask reveals — costs users
essentially nothing at runtime. The only opportunity Lighthouse still reports is "reduce unused
JavaScript" (220–510 ms), which **is** that motion layer.

Two things worth knowing before touching this:

1. **The hero photograph is not the LCP element and never was.** Chrome does not treat a
   full-viewport image as an LCP candidate — it never appears in the candidate list at all,
   even though it is by far the largest element. LCP here is *hero text*. Two separate bugs
   came from this: an opacity-gated subheading paragraph in `Hero` (3420 ms → 992 ms once
   ungated) and the identical pattern in `ItemHero`. **Never wrap the largest text block in an
   entrance animation.**
2. **Deferring the scene chunk was tried and bought nothing.** `SignatureScene` is loaded via
   `next/dynamic` so GSAP leaves the initial bundle. It is kept because a smaller initial
   bundle is a genuine benefit to real users, but it moved the Lighthouse score by less than
   the run-to-run noise. `ssr` stays **on**: the scene renders verbatim story paragraphs, and
   dropping them from the server HTML would cost content parity and SEO to buy a synthetic
   score.

### The decision

**The cinematic layer is not to be removed to buy Lighthouse points.** This was decided
explicitly, with the tradeoff on the table: the last few synthetic points cost the pinned
scrubbed scene, Lenis smooth scroll, or the line-mask reveals — the things this project exists
to deliver — while real users already get a ~1 s LCP and a 0 CLS. If a future audit flags
"unused JavaScript" here, that is the finding being re-reported, not a regression.

Legitimate wins that do **not** touch the design: a CDN in front of `next/image` (see
[`DEPLOYMENT.md`](DEPLOYMENT.md)), and higher-resolution source photography, which would let the
hero carry more detail at the same byte weight.

## Things that are deliberately absent

No testimonials, statistics, counters, prices, durations, ratings, availability calendar,
payments, email address, social links or newsletter. **None of these exist for this business**,
and inventing them was out of scope by instruction. Each is tracked in
[`CONTENT_INVENTORY.md`](CONTENT_INVENTORY.md).

## The homepage arc

Six movements, in this order, and nothing else:

```
1 Hero
2 Positioning      — the statement, evidenced by the stacked why-us scene
3 The Journeys     — experiences + transfers in one grid, with the island map
4 The signature journey
5 How it works
6 The team, handing over to the footer-as-destination
```

The marquee and the cinematic bridge are **bands between movements**, not
movements — they carry no heading and make no argument. `qa/arc-guard.mts`
asserts the list by id, in order, and that the content of every cut section
survived somewhere. It exists because a restructure was once *reported* as six
sections and *shipped* as nine.

## Content parity — the contract

[`CONTENT_INVENTORY.md`](CONTENT_INVENTORY.md) is the line-by-line record of every text block
and image extracted from the original site, the two intentional corrections of live-site errors,
and the open questions. [`COPY-MAP.md`](COPY-MAP.md) records every line the approved copy deck
changed, tagged **surfaced · written · kept**.

`node qa/parity.mts` checks both halves of the contract:

| half | assertion |
|---|---|
| **RENDERED** | the approved deck copy is actually on the page |
| **PRESERVED** | every original still exists in the content files, under a `*_original` key |

> **The originals are no longer required to be visible. They are required to be kept.**

That distinction is the whole content contract. v1 of this guard asserted the
originals appeared *on the page*, which was right for a faithful port and wrong
the moment the deck replaced them — it would have forced the site to say "Our
Amazing Team" forever, or been deleted to let the deck through. Deleting a
guard to pass it is how content quietly goes missing.

## The guards

Every one runs against a live server — `QA_BASE_URL` targets the deployment,
otherwise `localhost:3009`.

| guard | asserts |
|---|---|
| `arc-guard` | six movements by id, in order; cut sections' content survived |
| `parity` | rendered deck copy **and** preserved originals |
| `asset-audit` | every image reference resolves; anchors appear exactly once; social images absolute and 200 on the serving origin |
| `headline-guard` | every split headline reads exactly as written, before and after measurement |
| `credits-guard` | every sourced photograph is attributed as its licence requires; checksums still match |
| `nav-flash-guard` | the bar is correct in the server HTML with JS **disabled**, and never flips under a 6× CPU throttle |
| `menu-audit` | the overlay menu keeps every promise — focus trap, scroll lock, lazy previews, coverage |
| `mobile-audit` | 390px: no sideways scroll, 44px tap targets, no ad-hoc tiny text |

**Do not run these as a tight batch against the deployment** — eight
browser-driven guards contend and produce false failures. See `qa/README.md`.

## What was deferred

[`BACKLOG.md`](BACKLOG.md) tracks everything consciously postponed — what it is, which increment
it is scheduled into, and why it was deferred rather than dropped. Deferred means scheduled, not
forgotten; items leave that file by being done or by being cancelled, never by going quiet. It
also carries the standing constraints that are easy to erode (no invented facts, no AI-generated
imagery, benchmark captures never published, secrets only in environment variables).
