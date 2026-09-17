# Deployment

**Deployed on Vercel (Path A) from `main`; the domain has not been cut over.** Every push to
`main` builds on Vercel and promotes to https://routes-crete-redesign.vercel.app.
`routescrete.gr` still serves the original site, and nothing about DNS, the domain or the
project settings has been touched. Path B is documented below for completeness.

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

### Headers (shipped, and guarded)

Everything is set in `next.config.ts`, on every route, and checked by
`qa/security-headers.mts` against a production server:

- **`Cache-Control: public, max-age=31536000, immutable`** on `/images/*`.
- **`Content-Security-Policy`, enforcing.** It shipped report-only first, and was
  switched to enforcing only after the guard loaded all nine routes of the live
  deployment in Chromium and saw zero violations.
  - `frame-src` allows exactly one origin, the Monday.com form.
  - `script-src 'unsafe-inline'` is a stated trade-off: nonces would force every
    page to render per request and give up static generation.
- **`Strict-Transport-Security: max-age=63072000`**, deliberately **without**
  `includeSubDomains` or `preload`. See the cutover checklist.
- **`X-Frame-Options: DENY`**, **`X-Content-Type-Options: nosniff`**,
  **`Referrer-Policy: strict-origin-when-cross-origin`**, and a locked
  **`Permissions-Policy`**.
- **No `X-Powered-By`** (`poweredByHeader: false`).

**Before adding any new embed or third-party origin**, set `CSP_ENFORCE` to
`false` in `next.config.ts`. Then add the origin to the policy, deploy, and run
`qa/security-headers.mts` against the deployment. Enforce again only when it
reports zero violations. An enforcing policy that blocks something fails
silently for visitors.

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

**The executable version is [`CUTOVER.md`](CUTOVER.md)** (prepared 2026-09-17, not
executed). It has the ordered CLIENT and OURS steps, the domain as it is today, the origin
switch (`NEXT_PUBLIC_SITE_URL`), the rollback, and `qa/cutover-smoke.mts`, which runs most of
the boxes below as one command. Where the two differ, `CUTOVER.md` is current.

Run top to bottom. Do not start until the pre-launch smoke list passes on a staging URL.

### Before DNS

- [ ] `npm ci && npm run build` — clean, zero TypeScript errors.
- [ ] `npx next start -p 3009`, then:
  - [ ] **All ten guards, un-piped, one after another** (the command is in
        `CLOSING.md`). Each must report OK. That includes `qa/security-headers.mts`:
        every header present, zero CSP violations.
  - [ ] `node qa/parity.mts` — must report **PARITY OK — no deltas**.
  - [ ] `QA_LH_RUNS=5 node qa/lighthouse.mts` — all three gated routes, median of five; record the numbers.
  - [ ] `node qa/visual-check.mts` — review `qa/screenshots/`.
- [ ] Deploy to a staging URL on the chosen path and repeat the smoke list there.

### Content and URL preservation

- [ ] **`/assets/files/entypo.pdf` returns 200 and is byte-exact — 1,120,049 bytes.**
      Printed material points at this path; it must not move or be re-compressed.
- [ ] Legacy image URLs 308-redirect, e.g. `/media/sp1-152.jpg` →
      `/images/experiences/heart-of-cretan-tradition/sp1-152.jpg`, including the two
      with Greek file names (`/media/spΤΥΡΟΚΟΜ.jpg`), whose sources are written
      percent-encoded (`qa/cutover-smoke.mts` S2).
- [ ] Old one-pager anchors resolve to the new sections. These are handled **client-side**
      (a server never receives the fragment) by `SmoothScroll` via `legacyAnchorMap`:
      `#portfolio` → Experiences, `#portfolio1` → Transfers, `#services` → Why Us,
      `#about` → How to Book, `#team` → the positioning statement ("A family runs
      this" — the team section was removed on 2026-09-11), `#contact` → the `/contact`
      page (until 2026-09-17 it pointed at an id the homepage does not have).
      `qa/cutover-smoke.mts` S3 checks all six. The three legacy team-photo URLs
      (`/media/team2.jpg`, `/media/team3.jpg`, `/media/stavros.jpg`) no longer
      redirect: the photographs are retired and are deliberately not served.
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
- [ ] **Decide the HSTS scope with the client — do not just add it.** Until the cutover
      the site sends `max-age=63072000` only. The origin switch adds
      `includeSubDomains; preload` (decided 2026-09-17, `CUTOVER.md`). Sent from
      `www.routescrete.gr`, that covers only the subdomains of `www`. The two points
      below apply to the apex and to a preload submission, which stay a later, separate
      decision (`CUTOVER.md` step 17).
  - `includeSubDomains` would commit **every** subdomain of `routescrete.gr` to
    HTTPS, including mail or any other service. Add it only once each one
    serves HTTPS.
  - `preload` puts the domain into browsers' built-in lists, and removal takes
    months. Treat it as a separate, later decision.
- [ ] **Vercel protection is the owner's setting, not this repository's.** Bot
      Protection (start in log mode) and Deployment Protection for previews are
      project settings. Decide them with the client; nothing here changes them.
- [ ] **Keep the old hosting live and unchanged until the new site is verified in production**,
      so rollback is a DNS revert rather than a restore.

### After cutover

- [ ] Re-run the smoke list against the live domain.
- [ ] Submit `sitemap.xml` in Search Console; watch coverage for the legacy `/media/*` URLs.
- [ ] Re-run Lighthouse against production — real CDN numbers will differ from local.
- [ ] Re-run `qa/security-headers.mts` against the live domain: the headers must
      survive the move, and the CSP must still see zero violations.

---

## How deploys actually work here (updated)

**Git push is the deploy.** Pushing to `main` builds on Vercel's Linux and
promotes to production. Do **not** use `vercel deploy --temporary` or
`--prebuilt`: those build locally and Vercel's builder mishandles Windows path
separators on `[slug]` routes. That cost a misdiagnosis once — see
`qa/README.md`.

### Assert the alias after every push

Every response carries the commit it was built from, and one script checks it:

```bash
node qa/alias-assert.mts $(git rev-parse --short=7 HEAD)
```

It answers in one of three ways, and the difference matters: **LIVE** (exit 0), **PENDING**
(exit 1 — the alias answers but with an older commit), or **BLOCKED** (exit 2 — Vercel's bot
mitigation is challenging automated requests from this machine; the build may be fine and a
real browser unaffected, so this is never reported as "not deployed"). On BLOCKED, read
build state from `npx vercel inspect <deployment-url> --scope domisi`, wait, and re-run once.

A push is not done until the probe reads LIVE. This is not
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

**No temporary route is live.** `/design-3` held the three drafts of the
homepage top, the C+ draft and their captures while the client chose a
direction. It was deleted at the C+ close, together with
`public/design3-assets`, `qa/design3-shots.mts` and the draft block in
`src/app/globals.css`. The captures remain in git history at `e5b1059`.

The `data-site-chrome` attributes on the masthead and the footer **stay**. The
draft block no longer needs them, but the guards (nav-flash-guard,
credits-guard) and the masthead's night-surface reader find the site chrome
by them.

Four earlier temporary routes existed, each for one conversation, and each was
deleted once that conversation closed:
- `/design-3` (the three directions, then C beside C+)
- `/serif-preview` (the typeface A/B)
- `/review` (the first ten decisions as a page)
- `/review-2` (the beauty, interaction and photo-hunt passes, nine items plus the trust line)

Their assets and capture scripts went with them. After `/design-3` is gone,
every route that ships is a route a visitor is meant to find.
