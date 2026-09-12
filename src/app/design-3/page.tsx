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
};

function readManifest(): Manifest | null {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "public", "design3-assets", "manifest.json"), "utf8"),
    ) as Manifest;
  } catch {
    return null;
  }
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

export default function DesignThreeIndex() {
  const manifest = readManifest();
  const frame = (draft: string, viewport: string, kind: string) =>
    manifest?.frames.find((f) => f.draft === draft && f.viewport === viewport && f.kind === kind);

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
        {manifest ? (
          <p className="mt-3 text-[0.8125rem] text-[#5a5d61]">
            Frames captured from the live site, build <code>{manifest.commit}</code>.
          </p>
        ) : (
          <p className="mt-3 text-[0.8125rem] text-[#5a5d61]">Captures pending.</p>
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
