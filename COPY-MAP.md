# Copy map — surfaced vs written, line by line

Every line the approved deck changed, and where it came from. Three
provenances, and the distinction is the point:

| tag | meaning |
|---|---|
| **surfaced** | already existed in the original copy; promoted to a place it can be seen |
| **written** | new, from the approved deck |
| **kept** | deliberately unchanged, because the original was already the best version |

Nothing here is invented about the business. Every written line restates a fact
the content already carried — private, family-run, twelve seats, booked by
conversation — in the approved voice.

**The originals are never overwritten.** Each lives beside its replacement under
a `*_original` key, and `qa/parity.mts` asserts they are still in the content
files. Originals are no longer required to be *visible*; they are required to
be *kept*.

---

## Homepage

| slot | provenance | before → after |
|---|---|---|
| hero eyebrow | written | Your Cretan adventure starts here → **Rethymno · Crete** |
| hero H1 | **kept** | Explore the unknown side of Crete |
| hero sub | written | *(previously the SEO description)* → Private, family-run journeys into the gorges, villages and olive country of Rethymno. Twelve seats. Booked by conversation, not by cart. |
| how-it-works heading | written | How to Book Your Cretan Experience → **Booking is a conversation** |
| step 1 | written | Explore Our Excursions → **Tell us the day** |
| step 2 | **written, deviates from deck** | Send Us Your Details → **Send us the details** |
| step 3 | written | Enjoy the Journey → **We confirm, then you travel** |
| team heading | written | Our Amazing Team → **The three people you'll actually meet** |
| transfers subheading | written | Our collection of transfers → **Airport to villa, and anywhere after** |
| positioning statement | written | *(new section)* A family runs this. That is the whole difference. |
| why-us panel titles | **kept** | Pick up & Travelling · Local Knowledge & Personal Approach · Comfort, Safety & Genuine Hospitality |

### The one deviation, and why

The deck assigns **"We confirm everything"** to step 2. The deck was written
against the **original five steps**; these are the three that survived the 5→3
collapse. Applied positionally, that line sat above a body reading:

> *"Contact us via message or email with: the excursion you selected, preferred
> date, number of participants…"*

— a title contradicting its own verbatim body. Step 2 takes **"Send us the
details"** instead, and step 3 merges the deck's lines 2 and 3 because its body
merged the original steps 4 and 5.

Ratified as the standing rule: when an approved artifact collides with a
later-approved structural change, **meaning-preserving reconciliation is the
default**, flagged rather than buried.

---

## Kourtaliotis — The Temple of Nature

| slot | provenance | note |
|---|---|---|
| H1 | **kept** | the deck marks it *"kept: it is genuinely good"* |
| subtitle | written | An Epic Journey into the Hidden Heart of Crete → A day in the gorge, the palm valley and the sea below Preveli |
| opening paragraph | written | → You follow a river the whole way down. It starts in a village of plane trees and spring water, and ends where it meets the Libyan Sea under a forest of palms. |
| closing paragraph | written | → Twelve seats, one day, and a gorge that most people only ever see from the road above. |
| middle of the story | **kept** | untouched |

The middle is untouched for a mechanical reason as well as an editorial one:
the pinned scene reads paragraphs **3, 5, 7, 8 and 9** verbatim, and the deck
explicitly keeps the explorer's-journal conceit for it.

---

## A Journey Into the Heart of Cretan Tradition

| slot | provenance | note |
|---|---|---|
| H1 | **kept** | — |
| subtitle | **surfaced** | **Leave the sea behind for a day** — a verbatim clause from body[1] |
| body | **kept** | unchanged |

The deck specifies no subtitle for this journey. The original copy already
contained the best one, so it was surfaced rather than written — *cut before
you write*.

**One redundancy removed from the page, not from the content.** `body[0]` is
character-for-character the item's own title, so the page printed the title
twice. The paragraph is still in the content file; `ItemDetail` simply does not
render a paragraph identical to the title. Cutting a repetition is not the same
as cutting content.

---

## Private Transfer Services in Rethymno

| slot | provenance | note |
|---|---|---|
| H1 | **kept** | carries the SEO terms — Rethymno, private transfer |
| subtitle | **none added** | — |
| body | **kept** | unchanged |

No subtitle was added. Its closing line — *"Because getting there should feel
easy."* — is already surfaced as a heading on the page (verified: it renders
twice), so adding a subtitle would have repeated the page's own best line back
at it.

---

## What was deliberately not touched

- **`site.meta.description`** — the SEO description. The deck governs what a
  reader sees, not what a crawler indexes. Verified after the change: the
  description meta tag is unchanged and SEO scores 100.
- **All H1s** — every one carries keyword weight (Crete, Rethymno, private
  transfers, Kourtaliotis) and every one was already good.
- **`responsePromise`** — **supplied by the client (D4) and now on the page**:
  "We reply within a few hours." That exact sentence and nothing more. It was
  held at `null` and omitted from the page for as long as it was unanswered,
  because it is a claim about how the business operates rather than a line of
  copy to write. It is *kept*, not *written* — nothing was added to it, and no
  "usually sooner" or "24/7" was invented around it. If the business changes
  how fast it replies, this line changes with it or comes out.
- **Place captions** — verbatim and place-true. A photograph may only stand for
  a place it actually shows.
