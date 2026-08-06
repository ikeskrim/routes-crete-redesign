# Routes Crete

A complete redesign and rebuild of [routescrete.gr](https://www.routescrete.gr/) — the original
one-pager becomes a content-driven multi-page site, keeping every word and every image.

## Running it

```bash
npm install
npm run dev
```

The dev server runs on **http://localhost:3003** (a dedicated port, so it never clashes with the
other projects on this machine).

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3003 (Turbopack) |
| `npm run build` | Production build + type-check |
| `npm start` | Serve the production build on port 3003 |
| `npm run lint` | ESLint |

## Stack

Next.js 16 (App Router, React Server Components) · TypeScript · Tailwind CSS v4 ·
Motion (Framer Motion) · GSAP · Lenis · `next/font` (self-hosted) · `next/image`.

## Folder structure

```
content/                     ← the single source of truth for all copy & media
  site.json                    nav, hero, why-us, booking steps, team, contact, footer, map pins
  experiences/*.json           one file per experience
  transfers/*.json             one file per transfer service
  blur-map.json                generated blur placeholders, keyed by image path

public/
  assets/files/entypo.pdf    ← the brochure, kept at its ORIGINAL url
  images/
    experiences/<slug>/        photos per experience
    transfers/<slug>/          photos per transfer
    team/  site/  brand/

src/
  app/                       ← routes, layout, metadata
  components/
    ui/                        Button, Card, Container, Section, SectionHeading,
                               RichText, Media, Reveal, SmoothScroll
    sections/                  composed page sections (Hero, …)
    layout/                    Nav, Footer
  lib/
    content.ts                 typed, cached loaders for everything in /content
    types.ts                   the content contract
    utils.ts                   cn(), inline-markup parser
```

## Adding a new experience

**One JSON file and its images. No code changes.**

1. Drop the photos in `public/images/experiences/<your-slug>/`.
2. Create `content/experiences/<your-slug>.json` matching the `ContentItem` shape in
   [`src/lib/types.ts`](src/lib/types.ts). Copy an existing file as a starting point.
3. Regenerate blur placeholders so the new images fade in properly (see below).

The new experience automatically appears in: the homepage grid, `/experiences`, its own
`/experiences/<your-slug>` page, the "related" section of other pages, and `sitemap.xml`.

### Required fields

`slug` · `order` (sort position) · `title` · `category` · `cardImage` · `heroImage` ·
`facts` · `body` (array of paragraphs) · `meta` · `gallery` (each entry needs `src`,
`width`, `height`).

### Content conventions

- **Body text is verbatim.** Paragraphs support a deliberately tiny markup subset —
  `**bold**` and `\n` for a line break. Nothing else is interpreted, which keeps the copy
  diff-able against the original site.
- **Unknown values stay `null`.** Never invent a price, duration or availability. The UI
  renders "Price on request" / "Request availability" when a field is null.
- **`oldUrl`** on a gallery image records where it lived on the old site; a redirect from
  that URL is generated automatically in `next.config.ts`.

### Regenerating blur placeholders

`content/blur-map.json` holds a tiny base64 preview for every image. It is generated, not
hand-written. See `CONTENT_INVENTORY.md` for how the current map was produced.

## Content parity

[`CONTENT_INVENTORY.md`](CONTENT_INVENTORY.md) is the line-by-line record of every text
block and image extracted from the original site, plus the open questions still awaiting
answers from the client.
