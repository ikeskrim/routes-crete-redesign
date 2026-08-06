# Routes Crete

A complete redesign and rebuild of [routescrete.gr](https://www.routescrete.gr/). The original
one-page site becomes a content-driven multi-page experience, keeping **every word and every
image** of the original.

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

| Script | Purpose |
|---|---|
| `node qa/visual-check.mts` | ~70 screenshots: every route, desktop + 390px mobile, nav states, lightbox, sticky CTA, a wheel-driven filmstrip through the pinned scene, and a reduced-motion pass. Accepts filters: `node qa/visual-check.mts mobile hero`. |
| `node qa/lighthouse.mts` | Lighthouse mobile on `/` and an experience page → `qa/lighthouse/`. |
| `node qa/parity.mts` | Content parity: every image present, every verbatim paragraph reaching the rendered HTML. |

> Lighthouse is driven through a Playwright-launched Chromium because the bundled binary will
> not spawn via `chrome-launcher` on this machine.

## Stack

Next.js 16 (App Router, React Server Components) · TypeScript · Tailwind CSS v4 ·
Motion (Framer Motion) · GSAP + ScrollTrigger · Lenis · `next/font` (self-hosted, latin subset) ·
`next/image`.

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

## Things that are deliberately absent

No testimonials, statistics, counters, prices, durations, ratings, availability calendar,
payments, email address, social links or newsletter. **None of these exist for this business**,
and inventing them was out of scope by instruction. Each is tracked in
[`CONTENT_INVENTORY.md`](CONTENT_INVENTORY.md).

## Content parity

[`CONTENT_INVENTORY.md`](CONTENT_INVENTORY.md) is the line-by-line record of every text block
and image extracted from the original site, the two intentional corrections of live-site errors,
and the open questions. `node qa/parity.mts` checks it mechanically.
