import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";

/**
 * TEMPORARY — the /design-3 index: three directions, one page, for the client
 * to choose from on his phone. Deleted with the drafts after the pick (see
 * ./layout.tsx for the exact command).
 *
 * Deliberately styled in none of the three directions — plain paper and ink —
 * so the page presenting the choice does not lean on it.
 *
 * Every frame is our own capture of our own deployment, made by
 * qa/design3-shots.mts from the production alias; the build it shows is read
 * from the manifest the script writes beside the frames.
 */

type Manifest = {
  base: string;
  commit: string;
  capturedAt: string;
  frames: { draft: string; viewport: string; kind: string; file: string }[];
  /** C+ draft beside the rolled-out homepage (`QA_PAIRS=1`), from its own build. */
  pairs?: {
    base: string;
    commit: string;
    capturedAt: string;
    frames: { page: string; viewport: string; motion: string; kind: string; file: string }[];
  };
};

/* The pair columns: the frozen draft, then the site as rolled out. */
const PAIR_PAGES = [
  { key: "draft", name: "C+ draft" },
  { key: "site", name: "Rolled-out site" },
] as const;

const PAIR_ROWS = [
  { viewport: "desktop", motion: "motion", label: "Desktop · motion", width: 1440, height: 900 },
  { viewport: "desktop", motion: "reduced", label: "Desktop · reduced motion", width: 1440, height: 900 },
  { viewport: "mobile", motion: "motion", label: "Phone · motion", width: 780, height: 1688 },
  { viewport: "mobile", motion: "reduced", label: "Phone · reduced motion", width: 780, height: 1688 },
] as const;

function readManifest(): Manifest | null {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "public", "design3-assets", "manifest.json"), "utf8"),
    ) as Manifest;
  } catch {
    return null;
  }
}

/** Pixel size of a committed capture, from its own JPEG header; null when unreadable. */
function captureSize(file: string): { width: number; height: number } | null {
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "public", "design3-assets", file));
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  } catch {
    /* a missing frame renders as pending */
  }
  return null;
}

const DIRECTIONS = [
  {
    key: "a",
    name: "Deep Aegean",
    rationale:
      "Night on the water: near-black and deep sea blue, gold at the edges, and a light serif that leaves the drama to the photograph.",
  },
  {
    key: "b",
    name: "Cycladic Light",
    rationale:
      "Noon on a whitewashed terrace: white, strong Aegean blue and turquoise, the photograph held in an arch, everything crisp and bright.",
  },
  {
    key: "c",
    name: "Warm Editorial",
    rationale:
      "A travel feature in print: cream paper, terracotta and olive, big serif type, and the photograph set like a magazine plate.",
  },
] as const;

/* C beside C+, from one capture run. */
const COMPARED = [
  { key: "c", name: "C" },
  { key: "c-plus", name: "C+" },
] as const;

/**
 * What changed from C to C+ and why: C+ spec §J.3, verbatim and in order.
 * Line 14 has two spec wordings; the one shown follows the back-cover frame
 * the draft actually renders (the duotone once it exists, else the colour
 * storm-cloud frame), checked at build exactly as the draft checks it.
 */
function changeLines(): string[] {
  const duotone = fs.existsSync(
    path.join(process.cwd(), "public", "images", "graded", "d", "duotone", "sourced", "south-coast-storm-cloud.jpg"),
  );
  return [
    "The display face is now Fraunces at its display optical size: lighter and sharper at cover size than C's condensed serif, with Inter for reading text and the Greek of the registration line.",
    `One word per headline is set in italic ("unknown" on the cover), in the same colour, so the stress comes from the letterform; the italic appears on four pages only, never in the header or footer.`,
    "Labels are letter-spaced capitals sized to the body text; the fonts carry no true small caps, so none are faked.",
    "The 2 px rules are now 1 px hairlines, and Roman numerals I–IV number the four sections after the cover.",
    "The cover photograph runs off the right edge on desktop, with its caption and credit hung in the margin like a photo credit.",
    "The paper moves toward bone, the ink from brown toward charcoal and the terracotta text toward burnt sienna; every pairing was measured for contrast.",
    "Gold appears only on buttons: the terracotta button is now a gold pill with a charcoal label, the only rounded button, and the header’s “Book Now” is an underlined link so two gold buttons never share the first screen.",
    "The CSS sepia filter and colour overlay on photographs are removed; the warmth now comes from the new photo grade alone.",
    "A warm paper grain is printed into the paper sections, never over a photograph, and tuned so every text stays legible on its darkest speck.",
    "The journeys are an index of titles: pointing at one shows its photograph; phones show every photograph in the list.",
    "Added: the three “why us” statements, set large as pull quotes that hold still beside photographs bleeding alternately left and right.",
    "Added: the signature journey, as a photo essay whose chapter text holds still while its photographs scroll.",
    "Added: a golden band after the signature journey, “A mountain road in Crete”, cropped so no vehicle is in frame.",
    duotone
      ? "The header is a serif wordmark over a hairline; the footer becomes a back cover with a terracotta duotone photograph and the wordmark set large."
      : "The header is a serif wordmark over a hairline; the footer becomes a back cover with a photograph of storm clouds and the wordmark set large.",
    "The plate is no longer uncovered by a wipe on load; it pushes in slowly, and with reduced motion the page is a finished still.",
  ];
}

export default function DesignThreeIndex() {
  const manifest = readManifest();
  const frame = (draft: string, viewport: string, kind: string) =>
    manifest?.frames.find((f) => f.draft === draft && f.viewport === viewport && f.kind === kind);

  const pending = <p className="mt-2 text-[0.875rem] text-[#5a5d61]">Captures pending.</p>;

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#16181b]">
      <div className="mx-auto w-full max-w-[76rem] px-5 pt-14 pb-24 sm:px-8 lg:pt-20">
        <p className="text-[0.75rem] font-medium uppercase tracking-[0.2em] text-[#5a5d61]">
          Routes Crete · for the client&rsquo;s choice
        </p>
        <h1 className="mt-4 max-w-[20ch] font-sans text-[clamp(2rem,6vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
          Three directions for the new look
        </h1>
        <p className="mt-5 max-w-[56ch] text-[1.0625rem] leading-relaxed text-[#3d4044]">
          The same homepage top — hero, menu, the statement and the journeys — built three ways,
          each with its own colours, its own typefaces and a new photograph. Open each one on this
          phone, then pick one. The one you choose is rolled out across the whole site.
        </p>
        <p className="mt-3 max-w-[56ch] text-[0.9375rem] leading-relaxed text-[#3d4044]">
          The three photographs are licensed pictures of Crete, each chosen for the light its
          direction needs, and each is captioned only as what it shows. B&rsquo;s is Preveli, one of
          the places the tours go. A&rsquo;s night sky is a processed astrophotograph — beautiful,
          but brighter than the eye sees it.
        </p>
        {manifest ? (
          <p className="mt-3 text-[0.8125rem] text-[#5a5d61]">
            Frames captured from the live site, build <code>{manifest.commit}</code>.
          </p>
        ) : (
          <p className="mt-3 text-[0.8125rem] text-[#5a5d61]">Captures pending.</p>
        )}

        {/* ------------------------------------------------ C beside C+ */}
        <section aria-labelledby="c-plus-compare" className="mt-14 border-t border-[#16181b]/15 pt-10">
          <h2
            id="c-plus-compare"
            className="text-[clamp(1.5rem,4vw,2.25rem)] font-semibold tracking-[-0.015em]"
          >
            <span className="mr-3 tabular-nums text-[#5a5d61]">C · C+</span>
            Warm Editorial
          </h2>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6">
            {COMPARED.map((d) => (
              <div key={d.key} className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <h3 className="text-[1.25rem] font-semibold tabular-nums">{d.name}</h3>
                <Link
                  href={`/design-3/${d.key}`}
                  className="inline-flex min-h-11 items-center rounded-full bg-[#16181b] px-4 text-[0.875rem] font-medium text-white sm:px-6"
                >
                  Open the live draft
                </Link>
              </div>
            ))}
          </div>

          {(
            [
              { viewport: "desktop", label: "Desktop ·", width: 1440, height: 900 },
              { viewport: "mobile", label: "Phone ·", width: 780, height: 1688 },
            ] as const
          ).map((vp) => (
            <div
              key={vp.viewport}
              className={`mt-6 grid grid-cols-2 items-start gap-3 sm:gap-6 ${vp.viewport === "mobile" ? "sm:max-w-[34rem]" : ""}`}
            >
              {COMPARED.map((d) => {
                const fold = frame(d.key, vp.viewport, "fold");
                const full = frame(d.key, vp.viewport, "full");
                return (
                  <figure key={d.key} className="min-w-0">
                    {fold ? (
                      <Image
                        src={`/design3-assets/${fold.file}`}
                        alt={`${d.name} · ${vp.label} first screen`}
                        width={vp.width}
                        height={vp.height}
                        sizes={vp.viewport === "mobile" ? "(max-width: 640px) 45vw, 260px" : "(max-width: 1216px) 48vw, 580px"}
                        className={`h-auto w-full border border-[#16181b]/10 ${vp.viewport === "mobile" ? "rounded-[14px]" : "rounded-[6px]"}`}
                      />
                    ) : (
                      pending
                    )}
                    <figcaption className="mt-2 text-[0.875rem] text-[#5a5d61]">
                      {d.name} · {vp.label}{" "}
                      {full && (
                        <a
                          className="inline-flex min-h-11 items-center underline underline-offset-4"
                          href={`/design3-assets/${full.file}`}
                        >
                          whole draft
                        </a>
                      )}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          ))}

          {/* The whole drafts, top to bottom, from the same run and commit, so
              the change lines about content below the fold can be seen. */}
          {(["desktop", "mobile"] as const).map((viewport) => (
            <div key={`${viewport}-full`} className="mt-8 grid grid-cols-2 items-start gap-3 sm:gap-6">
              {COMPARED.map((d) => {
                const full = frame(d.key, viewport, "full");
                const size = full ? captureSize(full.file) : null;
                return (
                  <figure key={d.key} className="min-w-0">
                    {full && size ? (
                      <div
                        tabIndex={0}
                        role="region"
                        aria-label={`${d.name} · ${viewport === "desktop" ? "Desktop ·" : "Phone ·"} whole draft`}
                        className="max-h-[42rem] overflow-y-auto rounded-[6px] border border-[#16181b]/10"
                      >
                        <Image
                          src={`/design3-assets/${full.file}`}
                          alt={`${d.name} · ${viewport === "desktop" ? "Desktop ·" : "Phone ·"} whole draft`}
                          width={size.width}
                          height={size.height}
                          loading="lazy"
                          sizes="(max-width: 1216px) 48vw, 580px"
                          className="h-auto w-full"
                        />
                      </div>
                    ) : (
                      pending
                    )}
                    <figcaption className="mt-2 text-[0.875rem] text-[#5a5d61]">
                      {d.name} · {viewport === "desktop" ? "Desktop ·" : "Phone ·"}{" "}
                      {full && (
                        <a
                          className="inline-flex min-h-11 items-center underline underline-offset-4"
                          href={`/design3-assets/${full.file}`}
                        >
                          whole draft
                        </a>
                      )}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          ))}

          <ol className="mt-10 max-w-[68ch] list-decimal space-y-3 pl-6 text-[0.9375rem] leading-relaxed text-[#3d4044] marker:text-[#5a5d61]">
            {changeLines().map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </section>

        {/* ------------------------- C+ draft beside the rolled-out site */}
        {manifest?.pairs && (
          <section aria-labelledby="c-plus-rollout" className="mt-14 border-t border-[#16181b]/15 pt-10">
            <h2
              id="c-plus-rollout"
              className="text-[clamp(1.5rem,4vw,2.25rem)] font-semibold tracking-[-0.015em]"
            >
              C+ draft and the rolled-out site
            </h2>
            <p className="mt-3 max-w-[56ch] text-[0.9375rem] leading-relaxed text-[#3d4044]">
              The draft beside the live homepage, from the same build{" "}
              <code>{manifest.pairs.commit}</code>: with motion (the first screen 2.5 seconds after
              loading) and with reduced motion.
            </p>

            {PAIR_ROWS.map((row) => (
              <div
                key={`${row.viewport}-${row.motion}`}
                className={`mt-6 grid grid-cols-2 items-start gap-3 sm:gap-6 ${row.viewport === "mobile" ? "sm:max-w-[34rem]" : ""}`}
              >
                {PAIR_PAGES.map((p) => {
                  const find = (kind: string) =>
                    manifest.pairs?.frames.find(
                      (f) => f.page === p.key && f.viewport === row.viewport && f.motion === row.motion && f.kind === kind,
                    );
                  const fold = find("fold");
                  const full = find("full");
                  return (
                    <figure key={p.key} className="min-w-0">
                      {fold ? (
                        <Image
                          src={`/design3-assets/${fold.file}`}
                          alt={`${p.name} · ${row.label} · first screen`}
                          width={row.width}
                          height={row.height}
                          loading="lazy"
                          sizes={row.viewport === "mobile" ? "(max-width: 640px) 45vw, 260px" : "(max-width: 1216px) 48vw, 580px"}
                          className={`h-auto w-full border border-[#16181b]/10 ${row.viewport === "mobile" ? "rounded-[14px]" : "rounded-[6px]"}`}
                        />
                      ) : (
                        pending
                      )}
                      <figcaption className="mt-2 text-[0.875rem] text-[#5a5d61]">
                        {p.name} · {row.label}{" "}
                        {full && (
                          <a
                            className="inline-flex min-h-11 items-center underline underline-offset-4"
                            href={`/design3-assets/${full.file}`}
                          >
                            whole page
                          </a>
                        )}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            ))}
          </section>
        )}

        <ol className="mt-14 flex flex-col gap-20">
          {DIRECTIONS.map((d, i) => {
            const mobile = frame(d.key, "mobile", "fold");
            const desktop = frame(d.key, "desktop", "fold");
            const mobileFull = frame(d.key, "mobile", "full");
            const desktopFull = frame(d.key, "desktop", "full");
            return (
              <li key={d.key} className="border-t border-[#16181b]/15 pt-10">
                <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
                  <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-semibold tracking-[-0.015em]">
                    <span className="mr-3 tabular-nums text-[#5a5d61]">{String.fromCharCode(65 + i)}</span>
                    {d.name}
                  </h2>
                  <Link
                    href={`/design-3/${d.key}`}
                    className="inline-flex min-h-12 items-center rounded-full bg-[#16181b] px-7 text-[0.875rem] font-medium text-white"
                  >
                    Open the live draft
                  </Link>
                </div>
                <p className="mt-4 max-w-[60ch] text-[1.0625rem] leading-relaxed text-[#3d4044]">
                  {d.rationale}
                </p>

                {mobile && desktop && (
                  <div className="mt-8 grid items-start gap-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
                    <figure>
                      <Image
                        src={`/design3-assets/${mobile.file}`}
                        alt={`${d.name} on a phone, first screen`}
                        width={780}
                        height={1688}
                        sizes="(max-width: 768px) 70vw, 240px"
                        className="h-auto w-full max-w-[18rem] rounded-[18px] border border-[#16181b]/10"
                      />
                      <figcaption className="mt-2 text-[0.8125rem] text-[#5a5d61]">
                        Phone ·{" "}
                        {mobileFull && (
                          <a className="underline underline-offset-4" href={`/design3-assets/${mobileFull.file}`}>
                            whole draft
                          </a>
                        )}
                      </figcaption>
                    </figure>
                    <figure>
                      <Image
                        src={`/design3-assets/${desktop.file}`}
                        alt={`${d.name} on a desktop screen, first screen`}
                        width={1440}
                        height={900}
                        sizes="(max-width: 768px) 100vw, 900px"
                        className="h-auto w-full rounded-[6px] border border-[#16181b]/10"
                      />
                      <figcaption className="mt-2 text-[0.8125rem] text-[#5a5d61]">
                        Desktop ·{" "}
                        {desktopFull && (
                          <a className="underline underline-offset-4" href={`/design3-assets/${desktopFull.file}`}>
                            whole draft
                          </a>
                        )}
                      </figcaption>
                    </figure>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
