# Phase 8 — Direction checkpoint

Two candidates. Pick one, then it rolls across the site. Nothing site-wide has been changed.

---

## 1. Brand voice

**Routes Crete is a family-run, licensed Cretan operator that takes small groups to places
most visitors never reach.** That is the whole truth of the business, and it is enough — the
voice's job is to stop underselling it.

### The voice is

| | |
|---|---|
| **Private** | Written to one traveller, never to "guests" or "clients". Second person, singular. |
| **Intimate** | Specific over grand. "A chapel cut into the rock" beats "breathtaking scenery". |
| **Unhurried** | Short sentences with room around them. The pace of the writing is the pace of the day. |
| **Genuinely local** | We name things: Kourtaliotis, Preveli, Sfedoni, the Paraschakis mill. Names are proof. |

### The voice is not

Exclamation marks · "unforgettable", "breathtaking", "hidden gem", "bucket list", "paradise
found" · tour-operator plural ("we offer a range of…") · superlatives we can't evidence ·
urgency or scarcity theatre.

### What we may claim, because it is literally true

Private tours · small groups (a 12-seat van) · family-run · licensed (Γ.Ε.ΜΗ. 191661450000) ·
by-request booking · a direct line to the people who drive you · places named in our own copy.

### What we will never claim

Years of experience · travellers served · awards · ratings, reviews or stars · "featured in" ·
prices · availability. **None of these exist. The parity scan fails the build if they appear.**

---

## 2. Proposed homepage arc

Current homepage runs eight sections and repeats itself. Proposed arc — **promise → proof →
journeys → how → who → invitation** — is six:

| # | Section | Change |
|---|---|---|
| 1 | **Hero** — one promise, one CTA | Rewritten. Second CTA demoted to a text link. |
| 2 | **Proof** — full-bleed graded imagery, minimal words | New. Replaces the old "bridge". |
| 3 | **The journeys** — two experiences + transfers as a third card | **Merged.** Experiences and Transfers were two near-identical grids; they become one. |
| 4 | **The signature journey** — pinned scene | Kept. It is the best thing on the site. |
| 5 | **How it works** — 3 steps, not 5 | **Cut from 5.** Steps 1–2 ("browse", "pick a date") are not steps, they are the website. Keeps: tell us / we confirm / you travel. |
| 6 | **Who we are + invitation** — family, licence, WhatsApp, brochure | **Merged** Team + Contact. Trust and the ask in one place. |

**Cut entirely:** the standalone "Why Us" trio (absorbed into 2 and 6), and the 52-image gallery
(→ ~14 curated frames, moved to the experience pages where someone actually wants them).

That is 8 sections → 6, and roughly a third less scrolling.

---

## 3. Headlines — three options per candidate

Each keeps the H1 keyword role (Crete / private / Rethymno).

### Candidate A — *Nocturne*

1. **"The Crete that doesn't appear on the schedule."**
   *Private, small-group journeys into the gorges and mountain villages of Rethymno.*
   → `Plan your day`
2. **"Some places you drive past. These you walk into."**
   *Private tours of Kourtaliotis, Preveli and the Cretan interior — twelve seats, no more.*
   → `See the journeys`
3. **"Inland, where the island keeps to itself."**
   *Family-run private tours and VIP transfers across Crete, from Rethymno.*
   → `Begin`

### Candidate B — *Sunbleached*

1. **"A slower way to see Crete."**
   *Private, family-run journeys through Rethymno's gorges, villages and olive country.*
   → `Plan your day`
2. **"Leave the coast before the day gets warm."**
   *Small-group private tours into the mountains and gorges of Crete.*
   → `See the journeys`
3. **"The island, at the pace it was meant to be seen."**
   *Private tours and transfers in Crete. Twelve seats. One family. No schedule but yours.*
   → `Begin`

---

## 4. Copy deck — homepage, before → after

| Slot | Before (live site) | After (proposed) |
|---|---|---|
| Hero eyebrow | Your Cretan adventure starts here | Rethymno · Crete |
| Hero H1 | Explore the unknown side of Crete | *see headline options above* |
| Hero sub | Premium VIP transfers and private excursions in Crete. Enjoy comfortable pick-up from your villa, personalized routes, and authentic local experiences with Routes Crete. | Private, family-run journeys into the gorges, villages and olive country of Rethymno. Twelve seats. Booked by conversation, not by cart. |
| Journeys | Experiences | Two journeys. Both take a day. Neither takes a crowd. |
| Why (→ absorbed) | We know the roads, the stories, the people. | *(kept as a pull-quote over the proof image)* |
| How | How to Book Your Cretan Experience / Step by Step Guide | Booking is a conversation |
| How step 1 | Explore Our Excursions | Tell us the day |
| How step 2 | Choose Your Preferred Date | We confirm everything |
| How step 3 | Send Us Your Details | You travel |
| Team | Our Amazing Team | The three people you'll actually meet |
| Contact | Contact Form / We'd love to hear from you | Tell us when you're on the island |
| Transfers | Our collection of transfers | Airport to villa, and anywhere after |

**Every original string is preserved** in the content files under `*_original` keys — nothing
is overwritten, and `qa/parity.mts` v2 will assert both halves.

### Experience page — Kourtaliotis, before → after

| Slot | Before | After |
|---|---|---|
| H1 | Kourtaliotis – The Temple of Nature | Kourtaliotis — The Temple of Nature *(kept: it is genuinely good)* |
| Subtitle | An Epic Journey into the Hidden Heart of Crete | A day in the gorge, the palm valley and the sea below Preveli |
| Opening | In today's travel experience, people are no longer just looking for places to visit… | You follow a river the whole way down. It starts in a village of plane trees and spring water, and ends where it meets the Libyan Sea under a forest of palms. |
| Closing | A story where they become explorers themselves… | Twelve seats, one day, and a gorge that most people only ever see from the road above. |

The explorer's-journal conceit is kept for the pinned scene — it is the strongest idea in the
original copy — but tightened.

---

## 5. Photography

### Verified sourced photographs

Five from Wikimedia Commons, **each opened and checked against the place it claims to be**,
not trusted by caption:

| File | Location check | License | Author |
|---|---|---|---|
| `gorge-saint-nicholas-aerial` | Gorge walls with the small white chapel + cross at the base — the chapel of Saint Nicholas our own story names | **CC BY 2.0** | dronepicr |
| `kourtaliotis-gorge-aerial` | Same gorge, chapel visible from another angle | **CC BY 2.0** | dronepicr |
| `kourtaliotis-river` | River pool, canyon walls, plane tree | **CC BY 2.0** | dronepicr |
| `preveli-monastery` | Whitewashed church, red tile roof, stone monastery buildings | **CC0** | Benoît Prieur |
| `preveli-palm-beach-aerial` | Turquoise water, headland, palm-lined river mouth | **CC BY 2.0** | dronepicr |

**Licensing note.** I deliberately avoided CC BY-SA files — several excellent Preveli shots are
BY-SA, but applying our grade creates a derivative, which under share-alike would oblige us to
license the graded result under BY-SA too. CC BY 2.0 and CC0 carry no such obligation.
Attribution for the BY files is required and will render in a `/credits` note linked from the
footer.

**Original Routes Crete photography stays the only source for tour-specific moments** — the
shepherd's house, the olive mill, the cave, guests on the journey. A stock "Cretan shepherd"
would be a fake photograph of our own experience.

### The grade

`qa/grade.ps1` — one repeatable pass over every image, sourced and original alike, so the
library reads as a single shoot. Tone curve per channel, desaturation toward Rec.709 luma,
radial vignette. Documented, re-runnable, no hand-tweaks.

```bash
powershell -File qa/grade.ps1 -Grade A     # or -Grade B
```

**Constraint worth knowing before you pick:** all five sourced photographs are shot in harsh
midday sun under blue sky. Grade A can cool and deepen them, but it cannot manufacture
golden hour — a genuinely nocturnal look needs dusk source material, or your own camera files.
Grade B is the better fit for what this library actually is.

---

## 6. The two candidates

| | **A — Nocturne** | **B — Sunbleached** |
|---|---|---|
| Mood | Editorial cinema. Night-blue, deep, vignetted. | Quiet luxury. Warm, matte, dusty, calm. |
| Ground | `ocean-950` near-black throughout; light sections are rare and feel like a cut | `shell`/`sand` warm paper throughout; dark sections are rare and feel like a held breath |
| Grade | Cool shadows, sat 0.72, contrast 1.14, vignette 0.34 | Lifted matte blacks, warm gain, sat 0.66, contrast 0.94, vignette 0.12 |
| Type | Manrope tight and huge, near-white on black | Manrope lighter weight, ink on sand, wider tracking |
| Accent | Sunset gold, used sparingly as a cut line | Olive + gold, used as hairlines and indices |
| Risk | Fights the midday source photography | Less immediately "wow" in a screenshot |
