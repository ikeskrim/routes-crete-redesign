# Tourism-board photo libraries — what Routes Crete may use

Checked 2026-09-11. Each body's terms were read on its own pages. Nothing was
registered, downloaded, submitted or requested — every step below is the
client's to take.

## The short answer

**None of the official libraries can be used today.** Each one either forbids
commercial use outright or reserves every right until it grants written
permission. None publishes a Creative Commons or public-domain licence. No
photograph from any of them has entered the site.

| Library | Owner | Verdict | What it would take |
|---|---|---|---|
| [Incredible Crete](https://www.incrediblecrete.gr/en/photos/) — site, media library, Flickr | Region of Crete | **Written permission** | An application to the Regional Governor of Crete |
| [rethymno.gr](https://www.rethymno.gr/city/photo-gallery) / [dreth.gr](https://www.dreth.gr/en/) | Municipality of Rethymno | **No terms published → all rights reserved** | Written permission; little to ask for |
| [Visit Greece Image Bank](https://www.visitgreece.gr/en/media-library/image-bank) | Greek National Tourism Organisation (EOT) | **Not usable** | Its terms ban commercial use |
| [Marketing Greece Content Library](https://www.marketinggreece.com/content-library) | Marketing Greece S.A. (founded by SETE) | **Needs written confirmation** — the most promising | A written yes for our specific use |
| chaniatourism.gr, visitheraklion.eu | Municipalities of Chania, Heraklion | Not relevant | Outside the area the tours cover |

## Each library

### Incredible Crete — Region of Crete

- **What it holds:** a public gallery by theme on incrediblecrete.gr; a media
  library at media.incrediblecrete.gr that needs an account (registering grants
  no rights); an official Flickr account whose photographs are all "All rights
  reserved".
- **The terms:** the copyright clause sits only in the *Greek* version of the
  site's privacy-policy page. It reserves all content to the Region. It allows
  copying or commercial use only after a specific written permission from the
  Regional Governor, following an application.
- **A catch:** the site's credits page says many photographs were *donated* by
  other bodies and individuals. A permission would have to name each frame and
  confirm the Region actually holds its rights.
- **How to ask:** write an application (αίτηση) to the **Περιφερειάρχης Κρήτης**.
  List the photographs (link and title) and the use. Send it to:
  - Region of Crete, Πλατεία Ελευθερίας, 71201 Ηράκλειο, **info@crete.gov.gr**
  - or the Regional Unit of Rethymno, **proto.ret@crete.gov.gr**
  - or through the [Incredible Crete contact form](https://www.incrediblecrete.gr/en/contact/)

  Contact details are from [crete.gov.gr/contact-us](https://www.crete.gov.gr/contact-us/).

### Municipality of Rethymno

- **What it holds:** rethymno.gr's photo page is mostly videos. Its three photo
  album headings (the municipality, historic sites, beaches) contain no images.
  dreth.gr has no gallery.
- **The terms:** none are published. Under Greek copyright law (Ν. 2121/1993)
  that means all rights are reserved.
- **How to ask:** the [rethymno.gr contact form](https://www.rethymno.gr/contact.html)
  or the Press Office (Γραφείο Τύπου). Honestly, there is little here worth
  requesting.

### Visit Greece / GNTO Image Bank

- **What it holds:** downloadable archives by region, including a 75 MB Crete
  archive. Its contents were not opened.
- **The terms:** free for promoting Greece as a destination, with the
  photographer and GNTO credited. But "The commercial use of the above material
  is strictly forbidden." A private tour operator's site sells a service, so it
  is commercial use. The site-wide terms and the historic Archive Collections
  are all rights reserved too.
- **Verdict:** not usable. The terms offer no licensing route.

### Marketing Greece Content Library

- **What it holds:** a professional photo and video library with a Crete
  filter. Viewing it requires giving a name and email and accepting the terms,
  which was not done.
- **The terms:** free for non-commercial use. Yet the same terms allow use that
  supports the promotional goals of tourism businesses, and they exempt Greek
  tourism businesses from the credit line — which implies businesses like
  Routes Crete are expected users. That is ambiguous for a commercial tour
  site.
- **How to ask:** write through [marketinggreece.com/en/contact](https://www.marketinggreece.com/en/contact).
  Ask whether a Greek private tour operator may use named frames on its
  commercial website. The [terms are here](https://www.marketinggreece.com/en/content-library-terms-of-use-copyright).

## If the client asks any of them — what the written yes must say

A reply saying only "yes, with credit" is too vague to rely on. The grant
should name:

1. the specific photographs (link, title, photographer)
2. use on the commercial website of Routes Crete, a private tour operator (and
   social media, if wanted)
3. that the images may be cropped, resized and colour-graded
4. the credit wording they want
5. that it is perpetual and worldwide, and non-exclusive
6. that the body holds the rights to each named frame

7. **that the site's code is public** — on GitHub, and deployed from there —
   so the graded image the site shows also sits in that public repository,
   as it does on any site that publishes it.

On that last point: the *original* file and the written permission are never
put in the repository. They are kept privately, and their fingerprint (SHA-1)
is recorded in the credits ledger. The credits guard enforces this. Only the
graded image is public, which is why the grant must say so.

## How a written yes enters the site

The written confirmation is the licence. Save it — the email or the signed
letter, as a PDF — in `assets-src/stock-local/permissions/` (private, not in
the repository), and give it to us. It then enters `content/photo-credits.json`
as a `Written permission` entry, pointing at that file. The photographer or
body is credited on `/credits`, and the credits guard checks the permission is
on file before the photograph can ship.
