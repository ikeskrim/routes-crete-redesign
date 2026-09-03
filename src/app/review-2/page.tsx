import type { Metadata } from "next";
import Image from "next/image";

/**
 * TEMPORARY review page for the beauty pass — delete once the client rules.
 *
 * The same two rules the first review page kept:
 *
 *   1. OWN CAPTURES ONLY. Nothing from `qa/benchmark/` may ever appear here —
 *      those are screenshots of someone else's site, kept for study and
 *      gitignored precisely so they are never published. Every frame below is
 *      either our own capture of our own deployment (`qa/review2-shots.mts`,
 *      shot from the production alias and stamped with its build-commit) or
 *      our own graded rendition of a photograph we hold a licence for.
 *   2. noindex, nofollow, and linked from nowhere public. This is a working
 *      page for one conversation, not part of the site.
 *
 * TO DELETE IT, exactly:
 *
 *     git rm -r src/app/review-2 public/review2-assets
 *     # then drop the /review-2 row from MORNING.md's decision list
 *
 * That is recorded in MORNING.md as well, so the instruction survives this
 * file being gone.
 */
export const metadata: Metadata = {
  title: "Review 2 — the beauty pass",
  robots: { index: false, follow: false },
};

const BUILD = "de0f19f";

function Frame({
  src,
  caption,
  tall,
}: {
  src: string;
  caption: string;
  tall?: boolean;
}) {
  return (
    <figure className="mt-6">
      <div className="overflow-hidden rounded-media border border-ink/10 bg-rock-200">
        <Image
          src={`/review2-assets/${src}.jpg`}
          alt={caption}
          width={tall ? 780 : 1440}
          height={tall ? 1688 : 900}
          sizes="(max-width: 900px) 100vw, 860px"
          className="h-auto w-full"
        />
      </div>
      <figcaption className="text-caption mt-2 text-ink/55">{caption}</figcaption>
    </figure>
  );
}

function Pair({
  a,
  b,
  aCaption,
  bCaption,
}: {
  a: string;
  b: string;
  aCaption: string;
  bCaption: string;
}) {
  return (
    <div className="mt-2 grid gap-4 sm:grid-cols-2">
      <Frame src={a} caption={aCaption} />
      <Frame src={b} caption={bCaption} />
    </div>
  );
}

export default function ReviewTwoPage() {
  return (
    <div className="bg-shell text-ink">
      <div className="mx-auto w-full max-w-[54rem] px-6 pt-32 pb-section sm:px-8">
        <p className="text-eyebrow uppercase text-gold-600">
          Temporary — delete after review
        </p>
        <h1 className="text-display-lg mt-5 max-w-[20ch]">
          The beauty pass, in pictures
        </h1>
        <p className="text-body-lg mt-6 max-w-[52ch] text-ink/70">
          Three rounds of work, in one place. First: the photographs did not
          delight you — brighter and more vivid — and the route was just a
          line. Then a second round on the menu, the journeys, the hero and a
          film grain over the whole site. Then a third hunt for photographs,
          against a shot list. All of it is live. This page is so you can see
          it rather than read about it.
        </p>
        <p className="text-caption mt-4 max-w-[52ch] text-ink/50">
          Every frame is our own capture of the live site (build {BUILD}) or our
          own graded version of a photograph we hold a licence for. Not indexed,
          linked from nowhere, deleted once you have ruled.
        </p>

        {/* 1 — the grade */}
        <section className="mt-20 border-t border-ink/10 pt-10">
          <div className="flex items-baseline gap-4">
            <span className="font-display text-eyebrow tabular-nums text-gold-600">
              01
            </span>
            <h2 className="text-heading-lg max-w-[24ch]">
              The grade — every photograph, one constant
            </h2>
          </div>
          <p className="text-body mt-5 max-w-[52ch] text-ink/65">
            You were right about the cause. The old grade was actively
            <em> desaturating</em> every image — saturation at 0.66 — over
            blacks lifted to a matte veil. The river whose own credit line calls
            it “crystal clear waters” was rendering grey. The new grade brightens
            the midtones, sits the blacks back down, deepens contrast, and lifts
            saturation with the turquoise of water and the gold of low sun
            picked out specifically. Stone, skin and foliage are deliberately
            held back so it never tips into that over-cooked HDR look.
          </p>
          <p className="text-caption mt-4 max-w-[52ch] text-ink/50">
            Left is what shipped before. Right is live now. Same photograph,
            same crop — only the grade differs. It is one constant in one file:
            going back is a single edit, and both versions are kept.
          </p>

          <Pair a="grade-river-b" b="grade-river-c" aCaption="Before — Kourtaliotis river" bCaption="Now — the water reads turquoise" />
          <Pair a="grade-hero-b" b="grade-hero-c" aCaption="Before — the hero photograph" bCaption="Now" />
          <Pair a="grade-gorge-aerial-b" b="grade-gorge-aerial-c" aCaption="Before — the gorge" bCaption="Now" />
          <Pair a="grade-card-kourtaliotis-b" b="grade-card-kourtaliotis-c" aCaption="Before — Kourtaliotis card" bCaption="Now" />
          <Pair a="grade-card-heart-b" b="grade-card-heart-c" aCaption="Before — Tradition card" bCaption="Now" />
        </section>

        {/* 2 — new photographs */}
        <section className="mt-24 border-t border-ink/10 pt-10">
          <div className="flex items-baseline gap-4">
            <span className="font-display text-eyebrow tabular-nums text-gold-600">
              02
            </span>
            <h2 className="text-heading-lg max-w-[24ch]">
              Three photographs found, chosen for spectacle
            </h2>
          </div>
          <p className="text-body mt-5 max-w-[52ch] text-ink/65">
            Fourteen searches over the places this site actually names produced
            59 licence-clean candidates. Balos, Elafonisi, Chania and Kedrodasos
            are all gorgeous and all licence-clean, and every one was dropped:
            we name the places we show, and we do not go to any of them. Of the
            seventeen that <em>are</em> our places, three earned a spot.
          </p>

          <Frame src="new-preveli-river-mouth" caption="New — where the river reaches the sea at Preveli. Now a full-width band on the Kourtaliotis page." />
          <Frame src="new-river-flow" caption="New — the river running over rock in the gorge, oleander in flower." />
          <Pair
            a="swap-preveli-old"
            b="new-preveli-palm-coast"
            aCaption="Before — the Preveli waypoint photograph"
            bCaption="Now — the same place, with the reason to go to it visible"
          />

          <p className="text-caption mt-6 max-w-[52ch] text-ink/50">
            All three are CC BY 2.0, one photographer, each licence read on its
            own file page rather than trusted from a cache, each download
            checksum-matched to the source before it entered the ledger. Two of
            their titles are geographically wrong — they place Preveli beach
            “in Kourtaliotiko Gorge”, which it is not — so our captions say what
            we can verify and name nothing we cannot.
          </p>
        </section>

        {/* 3 — the route */}
        <section className="mt-24 border-t border-ink/10 pt-10">
          <div className="flex items-baseline gap-4">
            <span className="font-display text-eyebrow tabular-nums text-gold-600">
              03
            </span>
            <h2 className="text-heading-lg max-w-[24ch]">
              The route is a journey now
            </h2>
          </div>
          <p className="text-body mt-5 max-w-[52ch] text-ink/65">
            It was a dashed line through the stops, sorted west to east, that
            did nothing. It now draws itself as you scroll, in the order of the
            day, with a marker travelling it and each stop lighting as the line
            reaches it. Every stop carries the real photograph of that real
            place; a place we cannot honestly photograph gets a marker and its
            name and nothing else.
          </p>

          <Frame src="route-section" caption="The whole section — chart on the left, the day as numbered chapters on the right" />

          <p className="text-body mt-8 max-w-[52ch] text-ink/65">
            The line arriving, as you scroll:
          </p>
          <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Frame key={i} src={`route-film-${i}`} caption={`${i * 25}%`} tall />
            ))}
          </div>

          <p className="text-caption mt-6 max-w-[52ch] text-ink/50">
            The chart shows the route’s <em>true</em> shape — both axes scaled
            by the same factor, longitude corrected — so this day genuinely does
            run nearly due south. The old chart stretched the map to fill its
            box, which pushed every route into the same diagonal and put
            Preveli’s lagoon and monastery, a kilometre apart in life, on top of
            each other. The scale bar is computed from the real coordinates.
          </p>

          <Frame src="route-reduced-motion" caption="With reduced motion switched on: the path renders fully drawn, every stop present. Designed, not disabled." tall />
        </section>

        {/* 4 — the site as it stands */}
        <section className="mt-24 border-t border-ink/10 pt-10">
          <div className="flex items-baseline gap-4">
            <span className="font-display text-eyebrow tabular-nums text-gold-600">
              04
            </span>
            <h2 className="text-heading-lg max-w-[24ch]">
              What a visitor meets now
            </h2>
          </div>
          <p className="text-body mt-5 max-w-[52ch] text-ink/65">
            One more change worth pointing at: the dark wash over the hero was
            running at 42–58% across the <em>top</em> of the frame, where no
            text ever goes. It was hiding the new grade in the one place a
            visitor looks first. It has come down to 22–34% there and is
            untouched where the words are — measured, not eyeballed: the
            headline still clears AAA contrast at its single worst pixel.
          </p>

          <Frame src="site-hero" caption="The hero — the olive grove reads as a sunlit hillside now" />
          <Frame src="site-cards" caption="The journey cards" />
          <Frame src="band-2" caption="The new Preveli band, full width" />

          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <Frame src="mobile-hero" caption="390px — the hero" tall />
            <Frame src="mobile-route" caption="390px — the route, chapters below the chart" tall />
          </div>
        </section>

        {/* 05 — the menu */}
        <section className="mt-24 border-t border-ink/10 pt-10">
          <div className="flex items-baseline gap-4">
            <span className="font-display text-eyebrow tabular-nums text-gold-600">
              05
            </span>
            <h2 className="text-heading-lg max-w-[24ch]">
              The menu opens like a curtain
            </h2>
          </div>
          <p className="text-body mt-5 max-w-[52ch] text-ink/65">
            Each link now rises out of its own clipped row rather than fading
            in, one after another, and a real photograph of Crete drifts slowly
            behind the panel the whole time it is open. The links, the numbers
            and the photograph that appears when you hover one were already
            there — what changed is the way it all arrives.
          </p>

          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <Frame src="menu-reveal-0" caption="Opening — the first row clearing its mask" />
            <Frame src="menu-reveal-1" caption="Transfers half out, Why Us just cresting" />
            <Frame src="menu-reveal-2" caption="The stagger, further along" />
            <Frame src="menu-reveal-3" caption="Settled" />
          </div>
          <Frame
            src="menu-hovered"
            caption="A link hovered — the drifting photograph behind, its preview in front"
          />
        </section>

        {/* 06 — horizontal journeys */}
        <section className="mt-24 border-t border-ink/10 pt-10">
          <div className="flex items-baseline gap-4">
            <span className="font-display text-eyebrow tabular-nums text-gold-600">
              06
            </span>
            <h2 className="text-heading-lg max-w-[24ch]">
              The journeys pan sideways
            </h2>
          </div>
          <p className="text-body mt-5 max-w-[52ch] text-ink/65">
            On a desktop the page holds still while the cards travel across it,
            and carries on when they run out. A hairline underneath fills as
            they go, so it reads as a section with a length rather than a page
            that has jammed.
          </p>

          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <Frame src="journeys-pan-0" caption="Held — the pan about to begin" />
            <Frame src="journeys-pan-1" caption="Travelling" />
            <Frame src="journeys-pan-2" caption="Travelling" />
            <Frame src="journeys-pan-3" caption="The end of the track; the page releases" />
          </div>

          <Frame
            src="journeys-mobile"
            caption="On a phone it stays an ordinary column — a pinned sideways pan fights your own scrolling thumb"
            tall
          />

          <p className="text-caption mt-6 max-w-[52ch] text-ink/50">
            The pan is as long as the catalogue. With three journeys it is
            short; every experience you add lengthens it on its own, with no
            new work.
          </p>
        </section>

        {/* 07 — kinetic hero */}
        <section className="mt-24 border-t border-ink/10 pt-10">
          <div className="flex items-baseline gap-4">
            <span className="font-display text-eyebrow tabular-nums text-gold-600">
              07
            </span>
            <h2 className="text-heading-lg max-w-[24ch]">
              The hero answers the cursor
            </h2>
          </div>
          <p className="text-body mt-5 max-w-[52ch] text-ink/65">
            Move the mouse across the hero and the words lean very slightly one
            way while the photograph leans the other. It is meant to be felt
            rather than watched: measured on the live site, the type moves about{" "}
            <strong className="font-semibold text-ink">7px</strong> either side
            of centre. Text that chases the cursor is text you cannot read.
          </p>

          <Pair
            a="hero-kinetic-left"
            b="hero-kinetic-right"
            aCaption="Pointer top-left — the type drifts right and down"
            bCaption="Pointer bottom-right — the type drifts left and up"
          />

          <p className="text-caption mt-6 max-w-[52ch] text-ink/50">
            Nothing happens on a phone, where there is no cursor to answer, and
            nothing happens for a visitor whose device asks for reduced motion.
          </p>
        </section>

        {/* 08 — grain */}
        <section className="mt-24 border-t border-ink/10 pt-10">
          <div className="flex items-baseline gap-4">
            <span className="font-display text-eyebrow tabular-nums text-gold-600">
              08
            </span>
            <h2 className="text-heading-lg max-w-[24ch]">
              A film grain over everything
            </h2>
          </div>
          <p className="text-body mt-5 max-w-[52ch] text-ink/65">
            One very faint layer of photographic grain now sits over the whole
            site rather than only over the dark sections. It is what stops large
            flat areas reading as flat colour, and what makes the photography
            feel like film rather than like a screen.
          </p>

          <figure className="mt-6">
            <div className="overflow-hidden rounded-media border border-ink/10 bg-rock-200">
              <Image
                src="/review2-assets/grain-detail.png"
                alt="A magnified crop of the grain layer"
                width={900}
                height={570}
                sizes="(max-width: 900px) 100vw, 860px"
                className="h-auto w-full"
              />
            </div>
            <figcaption className="text-caption mt-2 text-ink/55">
              Magnified three times and saved losslessly so it survives the
              screenshot. At actual size the layer runs under 3% opacity — you
              are meant to feel it rather than see it, and an ordinary
              compressed capture would throw it away entirely.
            </figcaption>
          </figure>
        </section>

        {/* 09 — the photo hunt */}
        <section className="mt-24 border-t border-ink/10 pt-10">
          <div className="flex items-baseline gap-4">
            <span className="font-display text-eyebrow tabular-nums text-gold-600">
              09
            </span>
            <h2 className="text-heading-lg max-w-[24ch]">
              The photo hunt — third pass
            </h2>
          </div>
          <p className="text-body mt-5 max-w-[52ch] text-ink/65">
            You asked for more beautiful photographs, so this pass hunted
            against a shot list rather than a wish: warm low light, the
            Tradition day, Rethymno itself, more water, a dusk frame. Twenty-three
            searches, 562 results, 123 licence-clean at 2000px or better, 243
            refused on licence alone. Of what survived, one photograph earned its
            place, two frames we already owned found theirs, and on every other
            surface the honest answer is that what ships already wins.
          </p>

          <h3 className="text-heading-md mt-12">Shipped — the transfers page</h3>
          <p className="text-body mt-4 max-w-[52ch] text-ink/65">
            This page carried a single photograph of the van as its hero, its
            card and its entire gallery, and nothing else. Every transfer starts
            or ends in Rethymno, so it now has three full-width Rethymno bands
            in the order a day ends: the Fortezza in daylight, a lane in the old
            town, the harbour after dark. Two of them were already licensed,
            graded and credited but placed nowhere. The harbour is the hunt’s
            one find.
          </p>
          <Pair
            a="hunt-transfers-story-before"
            b="hunt-transfers-band-0"
            aCaption="Before — the story with nothing between the paragraphs"
            bCaption="Now — the Venetian Fortezza above Rethymno"
          />
          <Frame src="hunt-transfers-band-1" caption="A lane in the old town of Rethymno" />
          <Frame src="hunt-transfers-band-2" caption="The old Venetian harbour of Rethymno, at night — the only warm-light frame the whole hunt produced of a place this site names" />
          <Frame src="hunt-transfers-mobile" caption="390px" tall />

          <h3 className="text-heading-md mt-12">A taste call — the transfers hero</h3>
          <p className="text-body mt-4 max-w-[52ch] text-ink/65">
            The strongest place for the harbour frame is arguably the top of
            the transfers page. Against it: the van is the product, and a
            transfers page that opens on the vehicle is telling the truth about
            what is being bought. Both are shown; the van stays shipped until
            you rule.
          </p>
          <Pair
            a="hunt-transfers-hero-current"
            b="hunt-transfers-hero-proposed"
            aCaption="Shipped — the van"
            bCaption="Proposed — the harbour at night (the image swapped in on the live page to show the composition; not a separate build)"
          />

          <h3 className="text-heading-md mt-12">Current frame wins</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {[
              [
                "The Tradition day",
                "This is the surface that needed the hunt most — its photographs are all 1024px or under — and it is also the one where a licensed stock frame would cost the most, because those are your own photographs and their authenticity is the point. The only new candidates of a place it truly visits were of Anogeia’s streets: honest, and unbeautiful — parked cars, bollards, a skip. Your frames stay.",
              ],
              [
                "Warm light and dusk",
                "The two targets at the top of the list. Six licence-clean golden-hour frames came back and not one was of a place this site names; the dusk searches returned nothing usable at all. The harbour at night is the single warm-light frame that cleared every rule, and it is placed above. Nothing was substituted to fill the gap.",
              ],
              [
                "Water",
                "Thirteen licence-clean candidates, every one a variant of the frames chosen in the last pass. The river reaching the sea, the palm coast and the gorge river already ship; a fourth band on that page was tried last time and reads as a wall.",
              ],
              [
                "Three frames we own that fit nowhere honestly",
                "Two of Spili and one of the Messara plain are licensed, graded and credited — and stay unplaced. Spili is almost certainly the unnamed “historic village” of the Kourtaliotis day, but you have never named it and this site does not put a name in your mouth. The Messara is the plain below the mountains the Tradition day describes, and on the Heraklion side. All three are held.",
              ],
            ].map(([k, v]) => (
              <li key={k} className="border-t border-ink/10 pt-3">
                <span className="text-body block text-ink">{k}</span>
                <span className="text-caption mt-1 block text-ink/55">{v}</span>
              </li>
            ))}
          </ul>

          <p className="text-caption mt-8 max-w-[52ch] text-ink/50">
            Every new file: licence read on its own page, download checksummed
            against the source before it entered the ledger, credited on
            /credits, graded with everything else. Openverse, one of the three
            veins asked for, was returning gateway errors for the whole session
            and was not mined; Flickr was mined through the Commons mirror of
            the same photographers.
          </p>
        </section>

        {/* Trust */}
        <section className="mt-24 border-t border-ink/10 pt-10">
          <h2 className="text-heading-lg">Trust</h2>
          <p className="text-body mt-5 max-w-[52ch] text-ink">
            Badge built, empty: awaiting verifiable reviews.
          </p>
          <p className="text-caption mt-4 max-w-[52ch] text-ink/50">
            A spinning “5-star rated on Tripadvisor” badge was asked for. There
            is no rating, review count or award anywhere in this site or the
            original one, and nothing findable to check one against — so the
            badge is built and left switched off rather than filled with a
            number nobody can verify. Send a real rating and the listing it can
            be checked against, and it appears on the next deploy with that link
            on it.
          </p>
        </section>

        {/* the numbers */}
        <section className="mt-24 border-t border-ink/10 pt-10">
          <h2 className="text-heading-lg">Nothing was traded for it</h2>
          <p className="text-body mt-4 max-w-[52ch] text-ink/65">
            All of the above is measured on the live site, not on my machine.
            Every budget this project has been held to since the start still
            holds with the vivid grade and the new route live.
          </p>
          <ul className="mt-6 flex flex-col">
            {[
              ["Performance", "median of five runs, floor 89"],
              ["Accessibility", "100"],
              ["Layout shift (CLS)", "0 — a hard wall"],
              ["Blocking time", "under the 250 ms ceiling"],
              ["Nine guards", "all green on the deployment"],
            ].map(([k, v]) => (
              <li
                key={k}
                className="flex items-baseline justify-between gap-6 border-b border-ink/10 py-3"
              >
                <span className="text-body text-ink">{k}</span>
                <span className="text-caption text-ink/55">{v}</span>
              </li>
            ))}
          </ul>
          <p className="text-caption mt-6 max-w-[52ch] text-ink/50">
            The exact figures are in MORNING.md. If any of this is not to your
            taste, the grade is one constant and every replaced photograph is
            still in the repository — nothing here is a one-way door.
          </p>
        </section>
      </div>
    </div>
  );
}
