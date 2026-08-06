# CONTENT INVENTORY — routescrete.gr → routes-crete

**Phase 1 deliverable.** Extracted from a live fetch of `https://www.routescrete.gr/` (HTTP 200, 55,864 bytes).
Every text block and every image on the current site is accounted for below.

**Status: awaiting your approval before Phase 2 (design system) begins.**

---

## 1. Summary

| | Count |
|---|---|
| Text blocks extracted | 79 |
| Body paragraphs (verbatim, long-form) | 25 |
| Images referenced by the live site | 58 |
| Images now stored locally & byte-verified | 58 / 58 |
| Images that were missing from the earlier partial download | 6 |
| Images that were corrupt/truncated and re-fetched | 1 |
| Other assets (PDF, favicon, close icon) | 3 |
| Content items (2 experiences + 1 transfer) | 3 |
| Open questions needing your input | 13 |

**Nothing was invented.** No testimonials, statistics, prices, durations, ratings or reviews have been created. Every field the current site does not provide is `null` in the content files and flagged below.

---

## 2. Site metadata (preserved exactly)

| Field | Value | New location |
|---|---|---|
| `<title>` | `VIP Transfers & Private Tours in Crete \| Routes Crete` | `content/site.json` → `meta.title` |
| `description` | `Premium VIP transfers and private excursions in Crete. Enjoy comfortable pick-up from your villa, personalized routes, and authentic local experiences with Routes Crete.` | `meta.description` |
| `keywords` | `Crete transfers, VIP transfer Crete, private driver Crete, airport transfer Crete, Crete excursions, private tours Crete, luxury transport Crete, Rethymno transfers` | `meta.keywords` |
| `author` | `Routes Crete` | `meta.author` |
| Γ.Ε.ΜΗ. | `191661450000` | `brand.gemiNumber` |

The current site has **no** `robots.txt` and **no** `sitemap.xml` (both return 404). Both will be generated in Phase 7.

---

## 3. Navigation & legacy anchors

The old one-pager becomes a multi-page site. Every old anchor keeps working.

| Old label | Old anchor | New destination | Homepage section id |
|---|---|---|---|
| Experiences | `#portfolio` | `/experiences` | `#experiences` |
| Transfers | `#portfolio1` | `/transfers` | `#transfers` |
| Why Us | `#services` | `/#why-us` | `#why-us` |
| Book Guide | `#about` | `/#how-to-book` | `#how-to-book` |
| Team | `#team` | `/#team` | `#team` |
| Contact | `#contact` | `/contact` | `#contact` |
| Brochure | `/assets/files/entypo.pdf` | unchanged — same path | — |

Mapping stored in `content/site.json` → `legacyAnchorMap`. A client-side redirect will translate a legacy hash on arrival; the brochure PDF stays at its exact original path.

**Label typo fixed:** `Expieriences` → `Experiences` (category label on the Kourtaliotis card and modal). Original preserved in `categoryOriginal`.

---

## 4. Homepage text blocks

### 4.1 Hero (masthead)

| Block | Text | Status |
|---|---|---|
| Eyebrow | `Your Cretan adventure starts here` | verbatim |
| Heading | `Routes Crete` | verbatim |
| Subheading | `Explore the unknown side of Crete` | verbatim |
| CTA | `Tell me more` → `#services` | preserved as `hero.originalCta`; new design adds *Explore Experiences* / *Book Now* per brief §6.1 |
| Background | `/media/sp1-17.jpg` | see Q9 |

### 4.2 Section headings

| Section | Heading | Subheading |
|---|---|---|
| Experiences | `Experiences` | *(empty on live site)* |
| Transfers | `Transfers` | `Our collection of transfers` |
| Why Us | `Why us` | *(empty on live site)* |
| How to Book | `How to Book Your Cretan Experience` | `Step by Step Guide` |
| Team | `Our Amazing Team` | `Where professional excellence meets world-class hospitality.` |
| Contact | `Contact Form` | `We’d love to hear from you` |

### 4.3 Why Us — 3 value blocks (verbatim)

1. **Pick up & Travelling** — "Pickup from your villa with our VIP van. Every vehicle is equipped with a TV and A/C to make your trip comfortable." *(two lines in source, line break preserved)*
2. **Local Knowledge & Personal Approach** — "We know the roads, the stories, the people. Every route is designed with care, adapted to your pace, your interests, and your curiosity."
3. **Comfort, Safety & Genuine Hospitality** — "Exploring should feel relaxed. We make sure you travel comfortably, safely, and with the warm Cretan hospitality that makes every journey memorable."

### 4.4 How to Book — 5 steps (verbatim)

| # | Heading | Body |
|---|---|---|
| 1 | Explore Our Excursions | Browse our available routes and experiences. Each excursion includes detailed information about locations, duration, and what's included — so you can choose the one that fits your interests best. |
| 2 | Choose Your Preferred Date | Select the date that works for you and check availability. |
| 3 | ⚠️ *We'll respond promptly with availability, final details, and booking confirmation.* | Contact us via message or email with: • The excursion you selected • Preferred date • Number of participants • Your accommodation location |
| 4 | Confirmation & Details | We'll respond promptly with availability, final details, and booking confirmation. |
| 5 | Enjoy the Journey | Relax — we take care of the rest. Your Cretan adventure begins. |

⚠️ **Step 3's heading is wrong on the live site** — it is a copy of step 4's body and does not describe step 3 at all. See **Q1**.

### 4.5 Team (verbatim)

| Name | Role | Photo (old → new) |
|---|---|---|
| Antonios Tzagkarakis | Manager | `/media/team3.jpg` → `/images/team/antonios-tzagkarakis.jpg` |
| Stavros Kapetanakis | CEO | `/media/stavros.jpg` → `/images/team/stavros-kapetanakis.jpg` |
| Daria | Assistance | `/media/team2.jpg` → `/images/team/daria.jpg` |

Intro text: "Our team consists of **highly trained, professional chauffeurs** dedicated to providing a seamless and secure travel experience for every passenger." *(bold preserved from source)*

### 4.6 Contact

Embedded Monday.com form — `https://forms.monday.com/forms/embed/ec9deceb669815b3635612d83fe446fc?r=use1`
This is the **only** contact channel present on the current site. No email, phone, WhatsApp or address appears anywhere. See **Q2–Q5**.

### 4.7 Footer

`© 2026 routescrete.gr` · `Γ.Ε.ΜΗ.:191661450000` · `Brochure` → `/assets/files/entypo.pdf`
The social-icons block exists in the markup but is **empty**. See **Q6**.

---

## 5. Experience 1 — "A Journey Into the Heart of Cretan Tradition"

`content/experiences/heart-of-cretan-tradition.json` → `/experiences/heart-of-cretan-tradition`

- Category: `Experiences`
- Body: **6 paragraphs**, verbatim. Source line-wrapping normalised to spaces; the `<br>` in paragraph 2 preserved as a line break.
- Two empty `<p>` elements at the end of the source (Word-paste artefacts containing only `&nbsp;`) were dropped — they carry no content.
- Paragraph 1 is a duplicate of the H2 title. See **Q11**.
- Gallery: **29 images**.
- QR code image present (`qrimage.png`) — see **Q14**.
- Facts available: region only (`Central Crete`, inferred from the copy "the mountains of central Crete"). Duration, price, group size, availability: **not stated anywhere** → `null`, UI shows *Price on request* / *Request availability*.

Highlights shown on the page are **verbatim fragments** of the body, not new claims:
"A remarkable cave shaped over thousands of years" · "The life of a traditional Cretan shepherd" · "The story of olive oil, from old manual methods to modern techniques"

## 6. Experience 2 — "Kourtaliotis – The Temple of Nature"

`content/experiences/kourtaliotis-temple-of-nature.json` → `/experiences/kourtaliotis-temple-of-nature`

- Category: `Experiences` (was `Expieriences`)
- Subtitle: `An Epic Journey into the Hidden Heart of Crete`
- Body: **14 paragraphs**, verbatim. Bold runs preserved (`**Kourtaliotis – The Temple of Nature**`, `**"Heart of Paradise."**`, `**Heart of Paradise**`).
- ~40 empty `<p>` elements after the last paragraph (Word-paste artefacts) dropped.
- Gallery: **22 images**.
- This is the **signature journey** for the homepage scroll-storytelling section (brief §6.3), marked `"signature": true`.
- Title uses an en-dash `–` in the modal H1 but a hyphen `-` on the card. En-dash treated as canonical; card variant recorded in `titleVariantOnCard`.
- Facts: region `Rethymno, Southern Crete`. Duration/price/group size/availability **not stated** → `null`.

## 7. Transfer — "Private Transfer Services in Rethymno, Crete"

`content/transfers/private-transfers-rethymno.json` → `/transfers`

- Category: `Transfers`
- Body: **5 paragraphs**, verbatim.
- Gallery: **1 image** (the Mercedes).
- Availability: `Available upon request` — this *is* stated in the copy, so it is used verbatim.
- Price/duration: not stated → `null`.
- "Mercedes V-Class" appears only in the **image filename**, never in the copy. Recorded but flagged — see **Q12**.

---

## 8. Image manifest — old URL → new path

All 58 images were verified byte-for-byte against the live server (`Content-Length` match). **58/58 OK.**

### 8.1 Repaired / newly downloaded

These were absent or damaged in the earlier partial download and have now been fetched correctly:

| Old URL | New path | Issue found | Bytes |
|---|---|---|---|
| `/media/spIMG_7582.JPG` | `/images/experiences/heart-of-cretan-tradition/spimg_7582.jpg` | **truncated** — 196,608 B locally vs 316,269 B on server | 316,269 |
| `/media/spIMG_7611.JPG` | `/images/experiences/heart-of-cretan-tradition/spimg_7611.jpg` | missing | 239,499 |
| `/media/spΚΑΛΙΤΣ.2.jpg` | `/images/experiences/heart-of-cretan-tradition/sp-kalits-2.jpg` | missing (Greek filename) | 71,327 |
| `/media/spΤΥΡΟΚΟΜ.jpg` | `/images/experiences/heart-of-cretan-tradition/sp-tyrokom.jpg` | missing (Greek filename) | 61,891 |
| `/media/team3.jpg` | `/images/team/antonios-tzagkarakis.jpg` | missing | 57,725 |
| `/media/stavros.jpg` | `/images/team/stavros-kapetanakis.jpg` | missing | 10,146 |
| `/media/team2.jpg` | `/images/team/daria.jpg` | missing | 61,067 |

The two Greek filenames were URL-encoded for download, then renamed to ASCII slugs. Both old names are recorded in the `oldUrl` field of every gallery entry, so the mapping is never lost.

### 8.2 Experience 1 — Cretan Tradition (29 images)

`/media/{name}` → `/images/experiences/heart-of-cretan-tradition/{name lowercased}`

`sp1-103.jpg` (1024×629) · `sp1-152.jpg` (683×1024) · `sp1-148.jpg` (683×1024) · `sp1-142.jpg` (705×1024) · `sp1-14.jpg` (1024×668) · `sp1-128.jpg` (1024×553) · `sp1-12.jpg` (684×1024) · `sp1-110.jpg` (1024×650) · `sp1-157.jpg` (1024×570) · `sp1-25.jpg` (1024×742) · `sp1-22.jpg` (1024×683) · `sp1-17.jpg` (1024×724) · `sp1-45.jpg` (1024×637) · `sp1-5.jpg` (768×972) · `sp1-50.jpg` (706×1024) · `sp1-56.jpg` (683×1024) · `sp1-6.jpg` (752×1024) · `sp1-63.jpg` (683×1024) · `sp1-71.jpg` (1024×731) · `sp1-8.jpg` (1024×653) · `sp1-81.jpg` (1024×683) · `sp1-86.jpg` (1024×588) · `sp1-9.jpg` (1024×683) · `sp1-90.jpg` (768×1017) · `sp1-97.jpg` (1024×683) · `spimg_7582.jpg` (1024×575) · `spimg_7611.jpg` (1024×575) · `sp-kalits-2.jpg` (960×640) · `sp-tyrokom.jpg` (640×960)

Card image: `sp1-103.jpg`. Also used as the homepage hero: `sp1-17.jpg`.

### 8.3 Experience 2 — Kourtaliotis (22 images)

`/media/{name}` → `/images/experiences/kourtaliotis-temple-of-nature/{name lowercased}`

`ku516-dsc03742.jpg` (1024×683) · `ku1170-dsc06272.jpg` (1024×683) · `kudsc03814.jpg` (1024×683) · `kudsc03813.jpg` (1024×683) · `ku953-dsc05531.jpg` (1024×683) · `ku335-dsc03721.jpg` (1024×683) · `ku312-dsc03718.jpg` (1024×683) · **`ku1574-dsc06647.jpg` (4000×6000, 5.4 MB)** · `ku1558-dsc06631.jpg` (1024×683) · `kudsc03815.jpg` (1024×683) · `kudsc03817.jpg` (1024×683) · `kudsc05568.jpg` (1024×683) · `kudsc06390.jpg` (1024×683) · `kudsc06394.jpg` (683×1024) · `kudsc06427.jpg` (683×1024) · `kudsc06440.jpg` (683×1024) · `kuimg_8141.jpg` (768×1024) · `kuimg_9015.jpg` (768×1024) · `kuimg_9028.jpg` (768×1024) · `kuimg_9438.jpg` (768×1024) · `kuimg_9446.jpg` (768×1024) · `kuimg_9462.jpg` (768×1024)

Card image: `ku516-dsc03742.jpg`. `ku1574-dsc06647.jpg` is the only genuinely high-resolution photo on the entire site and is the natural hero for this experience.

### 8.4 Transfers, team, site, brand

| Old URL | New path | Size |
|---|---|---|
| `/media/MERCEDES-V300-930x620-1.jpg` | `/images/transfers/private-transfers-rethymno/mercedes-v300.jpg` | 930×620 |
| `/media/team3.jpg` | `/images/team/antonios-tzagkarakis.jpg` | 500×500 |
| `/media/stavros.jpg` | `/images/team/stavros-kapetanakis.jpg` | 200×199 |
| `/media/team2.jpg` | `/images/team/daria.jpg` | 500×500 |
| `/media/about1.jpg` | `/images/site/booking-step.jpg` | 160×160 |
| `/media/qrimage.png` | `/images/site/qr-code.png` | 180×180 |
| `/assets/img/logo.png` | `/images/brand/logo.png` *(also kept at original path)* | 53,739 B |

### 8.5 Non-image assets

| Asset | Path | Status |
|---|---|---|
| Brochure PDF | `/assets/files/entypo.pdf` | **unchanged path**, 1,120,049 B, byte-verified |
| Favicon | `/assets/favicon.ico` | unchanged, 23,462 B |
| Close icon | `/assets/img/close-icon.svg` | retained, 333 B (modals become pages; may become unused) |

### 8.6 Deliberately excluded

- `assets/img/header-bg.jpg`, `assets/img/map-image.png` — referenced only by the old Bootstrap "Agency" theme stylesheet, never rendered on the live page (the masthead sets its background inline). Not site content.
- `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` — `create-next-app` scaffolding placeholders, deleted.

---

## 9. Image quality constraints (honest assessment)

These are real limits of the source material that affect how premium the result can look. Flagging now, before design starts:

| Issue | Detail | Impact |
|---|---|---|
| Low hero resolution | `sp1-17.jpg` is **1024×724** | A fullscreen cinematic hero on a 2560px display will upscale ~2.5×. See **Q9**. |
| Gallery ceiling | 55 of 58 photos are capped at 1024px on the long edge | Fine for cards and masonry; limits full-bleed use. |
| Only one high-res photo | `ku1574-dsc06647.jpg` at 4000×6000 | The only image that can carry a true full-bleed hero. |
| Booking-step image | `about1.jpg` is **160×160**, reused for all 5 steps | Unusable at any real size. See **Q10**. |
| CEO portrait | `stavros.jpg` is **200×199** vs 500×500 for the others | Visibly softer in a team row. See **Q10**. |

---

## 10. Open questions — I need your input

I have not guessed at any of these. Items marked **blocking** affect what gets built; the rest can be filled in later without rework.

| # | Question | Why it matters | Blocking? |
|---|---|---|---|
| **Q1** | **Step 3 of "How to Book" has the wrong heading** on the live site — it repeats step 4's body ("We'll respond promptly with availability…") instead of describing "contact us with your details". What should the real heading be? *(e.g. "Contact Us")* | It reads as a bug in the redesigned timeline | Yes |
| **Q2** | **WhatsApp number?** | Brief §8 requires a WhatsApp deep link with the booking request pre-filled. Without it I'll ship the Monday.com route only. | Yes |
| **Q3** | **Public email address?** | Footer, contact page, `LocalBusiness` schema | Yes |
| **Q4** | **Public phone number?** | Footer, contact page, schema | Yes |
| **Q5** | **Business address & opening hours?** | `TravelAgency`/`LocalBusiness` schema needs them to be valid | No |
| **Q6** | **Social media handles?** The footer has an empty placeholder block. | Brief §6.10 asks for socials. I'll omit the block entirely if there are none. | No |
| **Q7** | **Newsletter — is there a real destination for the emails?** | Brief §6.10: omitted unless confirmed. Currently omitted. | No |
| **Q8** | **OG / social share image?** None exists. Shall I use `ku1574-dsc06647.jpg` (the 4000×6000 Preveli shot)? | Every page needs one for link previews | No |
| **Q9** | **Higher-resolution hero photo?** The current masthead image is only 1024×724. Do you have originals? | Directly caps how cinematic the hero can look | No |
| **Q10** | **Better booking-step and CEO photos?** `about1.jpg` is 160×160; `stavros.jpg` is 200×199. | Otherwise I'll design the timeline without photos and crop the CEO portrait conservatively | No |
| **Q11** | Experience 1's first body paragraph is an exact duplicate of its title. Drop it, or keep it as a standfirst? | Reads as a glitch if rendered twice | No |
| **Q12** | The transfer vehicle is called **"Mercedes V-Class"** only in a filename, never in the copy. May I state it as a spec on the page? | Otherwise the vehicle stays unnamed in text | No |
| **Q13** | **The cave, the mountain village, and the "historic village of Rethymno" are never named** in the copy. Can you name them? | Brief §6.5 asks for a map pinning the real route locations. Named places (Rethymno, Kourtaliotis Gorge, Preveli, Preveli Monastery, both airports) have real coordinates; these three cannot be pinned without a name. | No |
| **Q14** | **What does the QR code point to?** It's the same 180×180 image in both experience modals. | So I can label it meaningfully instead of an unexplained square | No |
| **Q15** | **Real numbers for stats?** (years operating, travellers served) | Brief §6.4 — no counters will be shown unless you provide real figures | No |

---

## 11. What is deliberately *not* on the new site

Per brief §2 and §8 — recording these so the omissions are visible rather than silent:

- **No testimonials.** None exist. The component will be built but renders nothing until content is added.
- **No statistics or animated counters.** No real figures available (Q15).
- **No prices.** Never stated → "Price on request".
- **No durations.** Never stated → "On request".
- **No availability calendar.** No backend → "Request availability".
- **No payments.** Booking is a request flow to Monday.com + WhatsApp, exactly as the business already works.
- **No ratings or review counts.**
- **No language selector.** Content is keyed for a future Greek version; English-only for now.

---

## 12. Project state

```
routes-crete/
├── content/
│   ├── site.json
│   ├── experiences/
│   │   ├── heart-of-cretan-tradition.json
│   │   └── kourtaliotis-temple-of-nature.json
│   └── transfers/
│       └── private-transfers-rethymno.json
├── public/
│   ├── assets/
│   │   ├── favicon.ico
│   │   ├── files/entypo.pdf          ← original path preserved
│   │   └── img/{logo.png, close-icon.svg}
│   └── images/
│       ├── brand/logo.png
│       ├── experiences/heart-of-cretan-tradition/       (29)
│       ├── experiences/kourtaliotis-temple-of-nature/   (22)
│       ├── transfers/private-transfers-rethymno/        (1)
│       ├── team/                                        (3)
│       └── site/{booking-step.jpg, qr-code.png}
└── src/app/   ← still create-next-app default; rebuilt in Phase 2+
```

- Dev server port: **3003** (`npm run dev`) — 3003 was free, no conflict with the other projects.
- Stack installed: Next.js 16.3 · React 19.2 · TypeScript · Tailwind v4 · `motion` v13 (Framer Motion) · GSAP 3.15 · Lenis 1.3.
- Nothing outside `routes-crete/` was read, modified or created.

---

## 13. Verification method

- Live HTML fetched once and parsed in full; every `<img src>`, `<a href>` and background-image URL enumerated.
- The old theme stylesheet was also scanned for `url()` references to catch images not present in the HTML.
- Each of the 61 assets was checked with an HTTP `HEAD` and its `Content-Length` compared to the local file; mismatches and absences were re-downloaded and re-checked. Final result: **61/61 byte-identical to the live server**.
- Every file was opened and decoded to confirm it is a valid image and to record its true pixel dimensions — this is how the truncated `spIMG_7582.JPG` was caught.
