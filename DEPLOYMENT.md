# Deployment

**Nothing here has been deployed.** No accounts, DNS or uploads have been touched. This
documents both viable paths so the choice can be made deliberately.

Every route is prerendered static (`next build` reports `○ Static` / `● SSG` for all seven),
which is what makes Path B possible at all.

---

## Path A — Node hosting (Vercel or equivalent)

The default, and what the project is currently built for.

### What's needed

| | |
|---|---|
| Node | ≥ 20.9 (Next 16 minimum) |
| Build | `npm ci && npm run build` |
| Start | `npm start` (binds port 3003; most platforms override with `$PORT`) |
| Env vars | **None.** No API keys, no database, no secrets. |

On Vercel the framework preset is detected and no configuration is required.

### What works as-is

- **`next/image` optimisation.** AVIF/WebP conversion, responsive `srcset`, and the 1-year
  `minimumCacheTTL` all run on the platform. This matters more than it looks: the hero is the
  LCP-adjacent asset and on-demand optimisation is why a cold first request is slower than a
  warm one. A CDN in front makes that a one-time cost per variant.
- **Redirects.** `next.config.ts` generates one 308 per legacy image URL from the `oldUrl`
  field in the content files, plus `/index.html → /`. These are served by Next.
- **`/assets/files/entypo.pdf`** is a static file in `public/`, served byte-exact.
- **`sitemap.xml` / `robots.txt`** are generated routes.

### Recommended headers

`/images/*` already ships `Cache-Control: public, max-age=31536000, immutable` via
`next.config.ts`. Nothing else is required.

---

## Path B — Full static export

Viable because no route is dynamic, but it costs real features. Take this path only if the
hosting is a plain bucket/CDN with no Node runtime.

### What changes

1. **`next.config.ts`** — add `output: "export"`.

2. **Image optimisation must be replaced.** `next/image`'s optimiser needs a server. Options:
   - `images: { unoptimized: true }` — simplest, but ships the original JPEGs with no
     AVIF/WebP and no responsive `srcset`. **This would materially hurt performance**, since
     the galleries are 52 images.
   - A custom `loader` pointing at an image CDN (Cloudinary, imgix, Cloudflare Images). Keeps
     responsive AVIF/WebP. **This is the recommended option for Path B.**
   - Pre-generate every variant at build time and rewrite `src` paths. Most control, most work.

3. **Redirects move to host config.** `async redirects()` is not honoured by `output: "export"`.
   The legacy `/media/*` 308s and `/index.html → /` must be reimplemented as
   `_redirects` (Netlify), `_headers`/Rules (Cloudflare), or S3/CloudFront rules. The list is
   derivable — it's the same `oldUrl` → `src` mapping the config already computes.

4. **`robots.ts` / `sitemap.ts`** still emit static files under export; verify after building.

### What this path costs

Image optimisation (unless an image CDN is wired in), Next-served redirects, and any future
server feature (route handlers, ISR, server actions). The site as built today needs none of
those beyond images and redirects.

---

## Cutover checklist — replacing the current routescrete.gr

Run top to bottom. Do not start until the pre-launch smoke list passes on a staging URL.

### Before DNS

- [ ] `npm ci && npm run build` — clean, zero TypeScript errors.
- [ ] `npx next start -p 3009`, then:
  - [ ] `node qa/parity.mts` — must report **PARITY OK — no deltas**.
  - [ ] `node qa/lighthouse.mts` — both routes; record the numbers.
  - [ ] `node qa/visual-check.mts` — review `qa/screenshots/`.
- [ ] Deploy to a staging URL on the chosen path and repeat the smoke list there.

### Content and URL preservation

- [ ] **`/assets/files/entypo.pdf` returns 200 and is byte-exact — 1,120,049 bytes.**
      Printed material points at this path; it must not move or be re-compressed.
- [ ] Legacy image URLs 308-redirect, e.g. `/media/sp1-103.jpg` →
      `/images/experiences/heart-of-cretan-tradition/sp1-103.jpg`.
- [ ] Old one-pager anchors resolve to the new sections. These are handled **client-side**
      (a server never receives the fragment) by `SmoothScroll` via `legacyAnchorMap`:
      `#portfolio` → Experiences, `#portfolio1` → Transfers, `#services` → Why Us,
      `#about` → How to Book, `#team` → Team, `#contact` → Contact.
      Check each of the six by hand.
- [ ] `/sitemap.xml` lists all 7 URLs; `/robots.txt` points at it.
- [ ] `brand.url` in `content/site.json` matches the production origin — canonicals, OG URLs,
      sitemap and JSON-LD all derive from it.

### Functional smoke list

- [ ] Monday.com form loads and submits on `/contact`.
- [ ] `wa.me` links open with the message pre-filled, including the experience name, from:
      the sticky desktop panel, the mobile bottom bar, and `/contact`.
- [ ] Both phone numbers dial: `+30 697 406 9475`, `+30 211 444 5757`.
- [ ] Brochure downloads from the nav, the footer and `/contact`.
- [ ] 404 page renders for an unknown URL.
- [ ] Gallery lightbox opens, arrows and Escape work, focus is not lost.
- [ ] Test with `prefers-reduced-motion: reduce`: the pinned scene unpins into a stacked
      sequence and nothing is left invisible.

### DNS

- [ ] Lower the TTL on the existing records ~24h beforehand.
- [ ] Point `routescrete.gr` and `www.routescrete.gr` at the new host; keep one canonical host
      and 301 the other.
- [ ] Issue/verify TLS before cutover; confirm HTTPS and the HTTP → HTTPS redirect.
- [ ] **Keep the old hosting live and unchanged until the new site is verified in production**,
      so rollback is a DNS revert rather than a restore.

### After cutover

- [ ] Re-run the smoke list against the live domain.
- [ ] Submit `sitemap.xml` in Search Console; watch coverage for the legacy `/media/*` URLs.
- [ ] Re-run Lighthouse against production — real CDN numbers will differ from local.

---

## How deploys actually work here (updated)

**Git push is the deploy.** Pushing to `main` builds on Vercel's Linux and
promotes to production. Do **not** use `vercel deploy --temporary` or
`--prebuilt`: those build locally and Vercel's builder mishandles Windows path
separators on `[slug]` routes. That cost a misdiagnosis once — see
`qa/README.md`.

### Assert the alias after every push

Every response carries the commit it was built from:

```bash
curl -s https://routes-crete-redesign.vercel.app/ | grep build-commit
```

A push is not done until that matches `git rev-parse --short HEAD`. This is not
ceremony: production once served a homepage that did not match `origin/main`
for over an hour, and `vercel inspect` prints no commit, so there was no way to
see it. The stamp closed that blind spot.

**Never chain a measurement onto the alias-wait** — measuring the old build
returns results identical to "nothing changed".

If the alias has not advanced within ~3 minutes, `npx vercel deploy --prod`
(remote build) and log the fallback in `MORNING.md`.

### Which URL to use

| URL | for |
|---|---|
| `<project>-<hash>-<team>.vercel.app` | proving what one deployment contains |
| `<project>-git-main-<team>.vercel.app` | content verification — bypasses the alias cache |
| `<project>.vercel.app` | **Lighthouse and sharing** |

The git-main alias carries `X-Robots-Tag: noindex`, so Lighthouse reports
**SEO 69** there. That is an artifact of the URL, never a regression.

### Before cutover

`src/lib/site-url.ts` sends canonical URLs to `routescrete.gr` while social
images resolve on whatever origin is actually serving. After DNS cutover the
two converge and the file becomes a no-op — no change required.

`/serif-preview` is a prototype route carrying `noindex, nofollow`. Delete it
once the typeface decision is made.
