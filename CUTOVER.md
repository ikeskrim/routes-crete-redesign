# CUTOVER — moving routescrete.gr to the new site

**Status: prepared, not executed.** Nothing here has been done. No DNS record,
domain, Vercel setting or environment variable has been touched. This page is
the exact, ordered list for the day the client picks.

- **CLIENT** steps need the client's own accounts: the DNS panel, Vercel's
  project settings, and Google.
- **OURS** steps are ours: code, verification and the record.
- Run the steps in the order given. Do not start a step until the one before
  it is confirmed.

---

## What is settled

| | decision |
|---|---|
| **Primary host** | **`https://www.routescrete.gr`**, the canonical URL the site already declares (`brand.url` in `content/site.json`). |
| **Apex** | `routescrete.gr` redirects permanently (308) to `https://www.routescrete.gr`. |
| **Where the site runs** | Vercel project `domisi/routes-crete-redesign`, built from `main`. |
| **The origin switch** | One variable: `NEXT_PUBLIC_SITE_URL=https://www.routescrete.gr`. On the day it is set in a committed `.env.production`; today it is unset. See step 10. |
| **Rollback** | Put the DNS records back. The old hosting stays live and untouched until the client says otherwise. |

**What the switch changes** (`next.config.ts`, `src/lib/site-url.ts`):
- **Social images:** absolute image URLs (`og:image`, JSON-LD) resolve on
  `https://www.routescrete.gr` instead of the `vercel.app` alias.
- **HSTS:** becomes `max-age=63072000; includeSubDomains; preload` (today:
  `max-age=63072000`). Browsers apply `includeSubDomains` to the subdomains of
  the host that sent it. Sent from `www.routescrete.gr`, it does not reach
  `mail.routescrete.gr`. The `preload` token does nothing until someone submits
  the domain (step 17).
- **Pages:** every page's `<meta name="site-url">` says
  `https://www.routescrete.gr` (today: `unset`). `qa/security-headers.mts`
  checks HSTS against it.

What it does not change:
- **Canonical URLs, `sitemap.xml` and `robots.txt`:** already on
  `https://www.routescrete.gr`. On the real domain the canonical becomes
  self-referencing, and on the `vercel.app` alias it keeps pointing at
  routescrete.gr.
- **Invalid values:** any value other than the canonical origin fails the
  build (proven: `https://routescrete.gr` is refused).

### The domain today (read on 2026-09-17, read-only lookups)

| record | value |
|---|---|
| Nameservers | `ns17.aspx.gr`, `ns18.aspx.gr`: DNS is managed in the current host's (aspx.gr) panel |
| `routescrete.gr` A | `31.22.115.30` |
| `www.routescrete.gr` A | `31.22.115.30` |
| `mail.routescrete.gr` A | `31.22.115.30` (the mail server, same machine) |
| MX | `mail.routescrete.gr` (preference 10) |
| TXT (SPF) | `v=spf1 a mx -all` |
| **`*.routescrete.gr` (wildcard)** | **CNAME `routescrete.gr`.** Every name without its own record follows the apex: `smtp`, `imap`, `pop3`, `webmail`, `autodiscover`, `ftp`, any made-up name. |
| AAAA | none found |
| CAA | not checked (the resolver used could not query it) |
| TTL | 3600 seconds on every record read |

- **The old site:** it answers on HTTP and on HTTPS (valid certificate), sends
  no HSTS header, and runs on IIS.
- **`mail.routescrete.gr` on the web:** HTTPS did not answer. Plain HTTP
  answers with the host's generic "site not found" page (aspx.gr), so there
  is no webmail at that name.
- **Legacy image URLs:** the old site still serves them, including the two with
  Greek file names (`/media/spΤΥΡΟΚΟΜ.jpg`, `/media/spΚΑΛΙΤΣ.2.jpg`). The new
  site redirects all 29 from `content/`, plus `/index.html` (see "Found while
  preparing").

**Mail, and the wildcard:**
- **Incoming mail does not move.** `mail.routescrete.gr` has its own A
  record, and MX points at it.
- **Everything the wildcard serves *does* move.** Every other name (`smtp`,
  `imap`, `pop3`, `webmail`, `autodiscover`, ...) follows the apex, so it
  goes to Vercel at step 7, where nothing answers for it. A mail client set
  up with `smtp.routescrete.gr` or `imap.routescrete.gr` would stop working.
  Step 1 settles this before the day.
- **Leave `mail`, `MX`, the SPF `TXT`, the wildcard and every other record
  exactly as they are,** apart from what step 1 adds.

---

## Before the day

1. **CLIENT: access, a date, and the mail names.**
   - Confirm login access to the DNS panel at aspx.gr, and to the Vercel
     project (Settings → Domains).
   - Pick the cutover day: a weekday morning, with someone reachable.
   - **With the host (aspx.gr), confirm which names the mail clients,
     phones, webmail and any FTP actually use.**
     - Only `mail.routescrete.gr` is safe as it stands.
     - For every other name in use (for example `smtp`, `imap`, `pop3`,
       `webmail`, `autodiscover`), add its own A record pointing at
       `31.22.115.30` before the day. Otherwise move those clients to
       `mail.routescrete.gr`.
     - The wildcard itself stays.
2. **CLIENT: export the DNS zone.** Save a copy (a screenshot or an export) of
   every record as it is now. This is the rollback.
3. **CLIENT: lower the TTL** on the `routescrete.gr` and `www` A records to
   300 seconds, **at least 24 hours before** the day.
4. **OURS: a clean baseline.**
   - `main` = `origin/main`, and the working tree is clean.
   - `node qa/alias-assert.mts $(git rev-parse --short=7 HEAD)` reads LIVE.
   - The full guard suite and Lighthouse (the commands in step 11) pass, each
     run with `QA_BASE_URL=https://routes-crete-redesign.vercel.app`.
   - `QA_BASE_URL=https://routes-crete-redesign.vercel.app node qa/cutover-smoke.mts`
     passes too. Without `QA_BASE_URL` it tests the local server on 3009
     instead.
   - Record the numbers in `MORNING.md`.
5. **CLIENT (recommended): Vercel protection.**
   - Turn on Bot Protection in **log** mode (Security → Bot Protection) a few
     days before, to see what it would block.
   - Decide on Deployment Protection for preview deployments.

## The day

6. **CLIENT: add the domains in Vercel** (Project → Settings → Domains).
   1. Add `www.routescrete.gr` and assign it to **Production**.
   2. Add `routescrete.gr`, and choose **redirect to
      `www.routescrete.gr`** (308).
   3. Vercel then shows the DNS records each domain needs.
7. **CLIENT: set the DNS records exactly as Vercel displays them**, in the
   aspx.gr panel.
   - Change only the `routescrete.gr` (apex) and `www` records. **Do not
     touch** `mail`, `MX`, the SPF `TXT`, the wildcard or anything else.
   - **Give the new apex and `www` records a TTL of 300 seconds.** A `www`
     CNAME is a new record and would otherwise get the panel's default
     (3600 today), and the rollback is only as fast as this TTL. Raise it
     after the +7-day check (step 15).
   - If Vercel asks for a verification `TXT` record, add it too.
   - **Do not change the old hosting:** no files, no account changes.
8. **CLIENT: wait for Vercel.** Both domains should read "Valid
   Configuration", with certificates issued. This usually takes minutes; with
   the lowered TTL, it should not take longer than an hour.
9. **OURS: check the new site answers on the domain,** before any switch:

   ```bash
   curl -sI http://routescrete.gr/        # expect 308 → https://routescrete.gr/ or https://www.routescrete.gr/
   curl -sI https://routescrete.gr/       # expect 308 → https://www.routescrete.gr/
   curl -sI https://www.routescrete.gr/   # expect 200, server: Vercel
   node qa/alias-assert.mts $(git rev-parse --short=7 HEAD) https://www.routescrete.gr
   ```

10. **OURS: flip the origin switch.** One file, one commit, one push:

    ```bash
    printf 'NEXT_PUBLIC_SITE_URL=https://www.routescrete.gr\n' > .env.production
    git add -f .env.production     # .env* is ignored by default; this file holds no secret
    git commit -F <message-file>   # "Cutover: the site is live on www.routescrete.gr"
    git push origin main
    node qa/alias-assert.mts $(git rev-parse --short=7 HEAD) https://www.routescrete.gr
    ```

    - `.env.production` must hold that one line and nothing else (a `#`
      comment line is allowed). Preflight rule P14 (`node qa/preflight.mts`)
      reads the git index and the working tree, and fails if:
      - any other `.env*` file is committed, at any depth;
      - `.env.production` holds another variable (it prints names, never
        values);
      - the switch has any value other than the canonical origin.
    - *Alternative, if the client prefers:* set the same variable in Vercel →
      Settings → Environment Variables (Production), then redeploy. A Vercel
      variable overrides the file.
11. **OURS: verify on the real domain.**
    1. **Switch and headers:**

       ```bash
       curl -s https://www.routescrete.gr/ | grep -o 'name="site-url" content="[^"]*"'   # the canonical origin
       curl -sI https://www.routescrete.gr/ | grep -i strict-transport                   # includeSubDomains; preload
       curl -s https://www.routescrete.gr/ | grep -o '<link rel="canonical"[^>]*>'       # https://www.routescrete.gr
       curl -s https://www.routescrete.gr/robots.txt
       curl -s https://www.routescrete.gr/sitemap.xml | grep -c '<loc>https://www.routescrete.gr'   # 7
       ```

    2. **The smoke check:**
       `QA_BASE_URL=https://www.routescrete.gr node qa/cutover-smoke.mts`
       covers:
       - **S1:** the brochure, byte-exact (1,120,049 B, the same SHA-256 as
         `public/assets/files/entypo.pdf`);
       - **S2:** `/index.html` and the 29 legacy `/media/*` URLs answer 308 to
         their new path on the same host, Greek file names included; the
         three retired team photographs answer 404;
       - **S3:** the six legacy one-pager anchors. `#portfolio`,
         `#portfolio1`, `#services`, `#about` and `#team` land on their
         homepage section; `#contact` opens `/contact`;
       - **S4:** `/credits` links every ledgered photograph's licence and
         source;
       - **S5:** the WhatsApp links carry their pre-filled text (a tour page's
         names the tour), and `/contact` dials both numbers;
       - **S6:** the Monday.com form mounts on `/contact` after a real scroll,
         sandboxed;
       - **S7:** unknown URLs answer 404 with the masthead;
       - **S8:** sitemap and robots on the canonical origin, and a
         self-referencing canonical. On the domain only, it also checks that
         the apex redirects with the path kept, that plain HTTP redirects to
         HTTPS on both hosts, and it prints the HSTS header the apex sends.
    3. **The full guard suite**, one guard at a time, un-piped, each with
       `QA_BASE_URL=https://www.routescrete.gr`: the ten guards, then
       `copy-subset` and `visual-check` (the commands are in `CLOSING.md`).
    4. **Lighthouse:**
       `QA_LH_RUNS=5 QA_BASE_URL=https://www.routescrete.gr node qa/lighthouse.mts`,
       then the same with `/transfers /contact`. The floors are unchanged:
       performance ≥ 89, CLS 0, TBT ≤ 250 ms, a11y 100.
    5. **The `vercel.app` alias still works** and still points its canonical
       URLs at www:

       ```bash
       node qa/alias-assert.mts <sha7>                    # LIVE (no URL: the alias)
       curl -s https://routes-crete-redesign.vercel.app/ | grep -o '<link rel="canonical"[^>]*>'   # https://www.routescrete.gr
       ```

       `QA_BASE_URL=https://routes-crete-redesign.vercel.app node qa/cutover-smoke.mts`
       checks the same, and more, in S8.
12. **CLIENT: the two real-world flows,** on a phone:
    - **Booking form:** send one test request through the form on
      `https://www.routescrete.gr/contact` and confirm it arrives in Monday.com.
      We only check that the form loads; a submission is the client's to make.
    - **WhatsApp:** tap WhatsApp on a tour page and on `/contact`, and confirm
      the message opens pre-filled.
13. **OURS: record** the numbers and the time in `MORNING.md`, and push.

## After the day

14. **CLIENT: Google Search Console** (the client's Google account).
    1. **Add a *Domain* property** for `routescrete.gr`: Search Console shows
       a `TXT` record; add it in the aspx.gr panel, then press Verify. A
       URL-prefix property for `https://www.routescrete.gr/` also works, and
       can be verified the same way.
    2. **Submit the sitemap:** Sitemaps → enter `sitemap.xml` →
       `https://www.routescrete.gr/sitemap.xml`.
    3. **Request indexing:** URL Inspection → `https://www.routescrete.gr/` →
       Request indexing. Repeat for `/experiences` and `/transfers`.
    4. **Watch** Pages → "Page with redirect" over the next weeks. The legacy
       `/media/*` URLs should move there; that is expected.
    - *Not needed:* the Change of Address tool, because the domain does not
      change.
15. **OURS: re-check at +1 day and +7 days.** Run the smoke check,
    `security-headers` and Lighthouse against the domain, and record the
    numbers.
16. **CLIENT: Bot Protection** moves from log mode to **challenge** once the
    log shows no real visitors being caught.
17. **CLIENT (later, separate decision): HSTS preload submission.**
    - **The header is ready, but submission is not.** Do not submit
      `routescrete.gr` at hstspreload.org until:
      - every subdomain serves HTTPS, or is confirmed to serve no web at all.
        On 2026-09-17, `mail.routescrete.gr` did not answer HTTPS, and on
        plain HTTP it served only the host's "site not found" page.
        (HSTS affects web traffic only; mail protocols are unaffected, but
        any web page on a subdomain over plain HTTP would break.)
      - the wildcard `*.routescrete.gr` is removed, or points at a host that
        serves HTTPS for every name. Today it sends every unlisted name to
        the apex's host.
      - the apex itself answers HTTPS with an HSTS header carrying
        `includeSubDomains` and `preload`. The apex serves Vercel's redirect,
        which may not carry the site's headers: check it with
        `curl -sI https://routescrete.gr/`.
    - **Why this is separate:** removal from the preload list takes months.
18. **CLIENT (with the host): SPF.**
    - **What changes:** once the apex points at Vercel, the SPF term `a`
      authorises Vercel's address instead of the mail server's.
    - **Why mail keeps working:** mail sent from `mail.routescrete.gr` still
      passes through the `mx` term.
    - **Worth tightening:** the host can replace `a` with
      `ip4:31.22.115.30`, so SPF names the real mail server.
19. **Later: the held dependency upgrades** (`maint/post-cutover-majors`,
    see `MAINTENANCE.md` on that branch). Not in the cutover week.

## Rollback

**If the new site misbehaves on the domain:**
**The items below are the rollback's own steps 1–4, not the numbered steps
of the day.**

1. **CLIENT:** put the saved `routescrete.gr` and `www` records back in the
   aspx.gr panel. The old site answers again once the TTL of the Vercel
   records expires: minutes if step 7 on the day set them to 300, up to an
   hour at the panel default of 3600.
2. **CLIENT: remove both domains from Vercel** (Settings → Domains) once the
   restored records have taken effect — about 5 minutes at TTL 300, up to an
   hour at 3600 — and in any case **before rollback step 3**.
   - **Not before that:** a host that is no longer attached to the project
     gets Vercel's DEPLOYMENT_NOT_FOUND. While resolvers still send visitors
     to Vercel, removing the domain turns a misbehaving site into no site.
   - **Why it must happen before step 3:** while a custom domain is
     attached, Vercel points `VERCEL_PROJECT_PRODUCTION_URL` at it. The
     reverted build would then put its social images on `routescrete.gr`,
     which by then serves the old site again.
3. **OURS: turn the switch off.**
   - **If it was set in `.env.production`:** `git revert` the switch commit
     and push.
   - **If it was set as a Vercel variable instead:** delete it (Settings →
     Environment Variables, Production) and redeploy production.
   - **Then check:**

   ```bash
   node qa/alias-assert.mts $(git rev-parse --short=7 HEAD)
   curl -s https://routes-crete-redesign.vercel.app/ | grep -o 'name="site-url" content="[^"]*"'      # unset
   curl -sI https://routes-crete-redesign.vercel.app/ | grep -i strict-transport                        # max-age only
   curl -s https://routes-crete-redesign.vercel.app/ | grep -o 'og:image" content="[^"]*"'            # on routes-crete-redesign.vercel.app
   ```
4. **Why the rollback is safe:**
   - **HSTS:** visitors who reached the new site keep HSTS for
     `www.routescrete.gr` (and its own subdomains). The old site serves HTTPS
     with a valid certificate, so they still reach it. The domain was never
     submitted to the preload list, so there is nothing to withdraw.
   - **Mail:** `mail` and `MX` are untouched throughout. Names served by the
     wildcard follow the apex back when rollback step 1 restores it.

## Found while preparing (fixed before the day)

The first run of `qa/cutover-smoke.mts` against production (4db5387, 17
September) failed 2 checks. Both would have broken on the real domain, and
both are fixed:
- **Two legacy image URLs returned 404.** `next.config.ts` dropped every
  non-ASCII redirect source. A browser sends `/media/spΤΥΡΟΚΟΜ.jpg`
  percent-encoded, so those sources are now written encoded. The old site
  serves both files today, so they may be indexed or bookmarked.
- **`/#contact` went nowhere.** It was mapped to `#contact`, an id that exists
  only on `/contact`. It now opens `/contact`, where the nav's Contact item
  goes.

A third problem was in a guard, not in the site. `copy-subset` never judged
the transfer page's printed preview, "No photograph we can honestly caption as
this place — so it gets none." That preview is what the page shows on load,
because its first stop has no photograph. The guard only saw it when its
scrolling pointer happened to end on a stop without a photograph, and a run on
17 September did. The sentence is now a listed template, with proofs.

Two more came out of the dry run and a review of this plan:
- **The wildcard DNS record** (`*.routescrete.gr` → the apex) was missing
  from the first version of this plan. It is what makes step 1's mail-names
  check necessary.
- **`qa/asset-audit.mts` assumed the switch was off.** It required social
  images on the serving origin, and so it failed the switch-on preview,
  whose images are correctly on `www.routescrete.gr`. It now reads the
  switch:
  - **switch off:** unchanged;
  - **switch on:** the image must be on the canonical origin, and its path
    must be served by the deployment under test. Before DNS moves, the
    canonical host still serves the old site.

## Verified in advance (dry runs)

- **Local build with the switch on** (2026-09-17). Fetched as
  `www.routescrete.gr`, `routescrete.gr` and the `vercel.app` alias:
  - canonical: self-referencing on www; the alias and the apex point at www;
  - `og:url`, `og:image`, sitemap and robots: on
    `https://www.routescrete.gr`;
  - HSTS: `max-age=63072000; includeSubDomains; preload`.

  `qa/security-headers.mts` passes on that build. Its previous version fails
  it, which is why the guard now reads the switch.
- **A `vercel.app` preview with the switch on** (branch `cutover-dry-run`,
  `bed5d7b` plus `.env.production`, never merged, deleted after).
  - **What Vercel built:**
    - `site-url` = `https://www.routescrete.gr`;
    - HSTS `max-age=63072000; includeSubDomains; preload`;
    - `og:image` and the canonical on www.
  - **The full guard suite:** 10 of 13 passed first time, and so did the
    smoke check. The three that failed:
    - **`asset-audit`:** the rule above, now fixed and passing on that
      preview.
    - **`security-headers` and `visual-check`:** both failed only because
      the CSP blocks Vercel's preview toolbar script
      (`vercel.live/_next-live/feedback/feedback.js`), which previews load
      and production does not. A switch-off preview fails the same way, so
      it is a preview artifact, not the switch.
  - **Nothing else depends on the origin.** The record is in `MORNING.md`.
