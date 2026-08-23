import type { Metadata } from "next";
import Image from "next/image";

/**
 * TEMPORARY review page — delete once the decisions land.
 *
 * The ten open decisions, each with the pictures that answer it, in one page a
 * phone can scroll. MORNING.md carries the same list in prose; this exists so
 * the client can look rather than read.
 *
 * Two rules it must keep:
 *
 *   1. OWN CAPTURES ONLY. Nothing from `qa/benchmark/` may ever appear here —
 *      those are screenshots of someone else's site, kept for study and
 *      gitignored precisely so they are never published. The frames below are
 *      re-encoded from our own capture sets in `public/review-assets/`.
 *   2. noindex, nofollow, and linked from nowhere public. This is a working
 *      page for one conversation, not part of the site.
 *
 * Deleting it is: remove this route, remove `public/review-assets/`, and drop
 * the line from MORNING.md.
 */
export const metadata: Metadata = {
  title: "Review — open decisions",
  robots: { index: false, follow: false },
};

type Decision = {
  n: number;
  title: string;
  ask: string;
  detail?: string;
  images?: { src: string; caption: string }[];
  pairs?: { a: { src: string; caption: string }; b: { src: string; caption: string } };
};

const DECISIONS: Decision[] = [
  {
    n: 1,
    title: "Serif or sans on the headlines",
    ask: "Keep Manrope, or switch the headlines to Fraunces?",
    detail:
      "Identical frames, one typeface apart — same viewport, same wait, same build, motion off. The body text is unchanged in both; only h1 and h2 differ. Sans stays the default until you say otherwise.",
    pairs: {
      a: { src: "serif-sans-hero", caption: "Now — Manrope" },
      b: { src: "serif-serif-hero", caption: "Proposed — Fraunces" },
    },
    images: [
      { src: "serif-sans-statement", caption: "Now — the positioning statement" },
      { src: "serif-serif-statement", caption: "Proposed — the same statement" },
    ],
  },
  {
    n: 2,
    title: "The Vercel dashboard check",
    ask: "Open Project → Settings → Git and confirm the production branch and build settings.",
    detail:
      "Production once built from something other than the pushed commit, and has behaved since — which makes it intermittent, the kind that ships a stale site on the day it matters. Every response now carries the commit it was built from, so it is detectable, but not preventable from my side. I can inspect and deploy; I must not touch project settings.",
  },
  {
    n: 3,
    title: "Label warmth",
    ask: "Accept the warmer small labels, or tune them back?",
    detail:
      "This arrived as an accessibility fix, not a design change. The old labels measured 4.18:1 and 3.61:1 against a 4.5:1 floor — they were failing. The new ones measure 7.15:1 and 6.30:1. It does change how every small label on the site reads.",
    pairs: {
      a: { src: "contrast-before", caption: "Before — 4.18:1, failing" },
      b: { src: "contrast-after", caption: "After — 7.15:1" },
    },
  },
  {
    n: 4,
    title: "The response promise",
    ask: "Give me a real number, or it stays off the page.",
    detail:
      "A line like “we reply within a few hours” is a strong conversion lever, and it is a claim about how the business actually operates. The slot exists and renders nothing while it is empty. I will not invent a number.",
  },
  {
    n: 5,
    title: "The island map's photographs",
    ask: "Right call, or too much?",
    detail:
      "Five of the nine pins now reveal a real, licensed photograph of that actual place on hover, and the mobile legend carries thumbnails instead. The cave, the deliberately unnamed “historic village” and the two airports have no photograph rather than a lookalike — a place we cannot honestly caption gets nothing.",
    images: [
      { src: "map-rest", caption: "At rest" },
      { src: "map-preview", caption: "Hovering the Kourtaliotis Gorge pin" },
      { src: "map-mobile", caption: "On a phone — thumbnails, since hover does not exist" },
    ],
  },
  {
    n: 6,
    title: "Gallery curation — 51 frames down to 28",
    ask: "Read the removal reasons and restore anything you disagree with.",
    detail:
      "Every frame was looked at, not ranked by filename. Nothing was deleted: each removed frame is still in the repository, still graded, and listed in the content file with the reason it was cut and which kept frame it defers to. Restoring one is moving a JSON entry back. The reasons are deliberately specific enough to argue with — “third near-identical held-out-food frame on the same patch of gravel” rather than “weak”.",
    images: [{ src: "journeys", caption: "The journeys grid" }],
  },
  {
    n: 7,
    title: "The card image for Heart of Cretan Tradition",
    ask: "Swap the loom room for the golden-hour ridge?",
    detail:
      "The curator's recommendation, not shipped — a card image is a taste call and those stay as they are until you rule. Its reasoning: the ridge is the only frame in that set with real light, and it states the offer before a word of copy is read.",
    images: [{ src: "journeys", caption: "Current cards" }],
  },
  {
    n: 8,
    title: "Eight sourced photographs rejected",
    ask: "Agree with where the line was drawn?",
    detail:
      "Two were licence-clean but verified as Greece, not Crete — this site names real places, so a Greek stand-in cannot honestly be captioned as Cretan. One was below resolution. Five were redundant with photographs already in the ledger. Reasons per file are in qa/ingest-plan.json.",
  },
  {
    n: 9,
    title: "The small-label type sizes",
    ask: "Leave the 11px eyebrows and 13px captions, or raise them?",
    detail:
      "These are the design's voice rather than an oversight, so no guard forces them — but every mobile audit prints their exact sizes so the decision stays visible while it is open. On a phone they are small.",
    images: [{ src: "type-tokens-mobile", caption: "390px — the eyebrow above the statement" }],
  },
  {
    n: 10,
    title: "The booking step-2 line",
    ask: "Keep “Send us the details”, or restore the deck's “We confirm everything”?",
    detail:
      "The approved deck was written against the original five steps. Mapped onto the three that survived, its line for step 2 sat above a body reading “Contact us via message or email with: the excursion you selected, preferred date, number of participants” — a title contradicting its own text. It can go back, but not above that body.",
    images: [{ src: "how-it-works", caption: "How it works, as it stands" }],
  },
];

const WALKTHROUGH = [
  { src: "walk-hero", caption: "The hero" },
  { src: "walk-menu", caption: "The menu, open" },
  { src: "walk-scene", caption: "The stacked scene" },
  { src: "walk-signature", caption: "The signature journey" },
  { src: "walk-footer", caption: "The footer as a destination" },
  { src: "walk-credits", caption: "Photography credits — every sourced image, its licence and source" },
  { src: "reduced-scene", caption: "Reduced motion — composed, not disabled" },
  { src: "walk-hero-mobile", caption: "390px" },
];

function Frame({ src, caption }: { src: string; caption: string }) {
  return (
    <figure className="mt-6">
      <div className="overflow-hidden rounded-media border border-ink/10 bg-rock-200">
        <Image
          src={`/review-assets/${src}.jpg`}
          alt={caption}
          width={1100}
          height={688}
          sizes="(max-width: 900px) 100vw, 860px"
          className="h-auto w-full"
        />
      </div>
      <figcaption className="text-caption mt-2 text-ink/55">{caption}</figcaption>
    </figure>
  );
}

export default function ReviewPage() {
  return (
    <div className="bg-shell text-ink">
      <div className="mx-auto w-full max-w-[54rem] px-6 pt-32 pb-section sm:px-8">
        <p className="text-eyebrow uppercase text-gold-600">Temporary — delete after review</p>
        <h1 className="text-display-lg mt-5 max-w-[18ch]">Ten decisions, with pictures</h1>
        <p className="text-body-lg mt-6 max-w-[52ch] text-ink/70">
          Everything below is a decision rather than a question — the work is
          done and shipped, and each of these is a choice only you can make.
          Nothing here is waiting on more building.
        </p>
        <p className="text-caption mt-4 max-w-[52ch] text-ink/50">
          This page is not indexed and is linked from nowhere. It gets deleted
          once these land.
        </p>

        <ol className="mt-16 flex flex-col gap-20">
          {DECISIONS.map((d) => (
            <li key={d.n} className="border-t border-ink/10 pt-8">
              <div className="flex items-baseline gap-4">
                <span className="font-display text-eyebrow tabular-nums text-gold-600">
                  {String(d.n).padStart(2, "0")}
                </span>
                <h2 className="text-heading-lg max-w-[24ch]">{d.title}</h2>
              </div>

              <p className="text-body-lg mt-5 max-w-[46ch] font-display text-ink">
                {d.ask}
              </p>
              {d.detail && (
                <p className="text-body mt-4 max-w-[52ch] text-ink/65">{d.detail}</p>
              )}

              {d.pairs && (
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  <Frame {...d.pairs.a} />
                  <Frame {...d.pairs.b} />
                </div>
              )}
              {d.images?.map((img) => (
                <Frame key={img.src + img.caption} {...img} />
              ))}
            </li>
          ))}
        </ol>

        <div className="mt-24 border-t border-ink/10 pt-10">
          <h2 className="text-heading-lg">The site as it stands</h2>
          <p className="text-body mt-4 max-w-[52ch] text-ink/65">
            A walkthrough of what is live now, in the order a visitor meets it.
            Captured from the deployed build, not from a local one.
          </p>
          {WALKTHROUGH.map((img) => (
            <Frame key={img.src} {...img} />
          ))}
        </div>
      </div>
    </div>
  );
}
