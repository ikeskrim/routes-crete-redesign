import type { WhyUsBlock } from "@/lib/types";
import { pad } from "@/lib/utils";
import { InlineText } from "@/components/ui/RichText";
import { Reveal } from "@/components/ui/Reveal";
import { SplitLines } from "@/components/ui/SplitLines";

/**
 * The three value blocks, verbatim. Presented as an editorial index rather
 * than icon cards — the numbering carries the meaning, so the old Font Awesome
 * icons are no longer needed.
 */
export function WhyUs({
  heading,
  blocks,
}: {
  heading: string;
  blocks: WhyUsBlock[];
}) {
  return (
    <section
      id="why-us"
      aria-labelledby="why-us-heading"
      className="bg-sand-50 py-section-lg text-ink"
    >
      <div className="mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
        <div className="flex items-center gap-4">
          <span aria-hidden className="h-px w-10 bg-gold-600/60" />
          <p className="text-eyebrow uppercase text-rock-500">Why Routes Crete</p>
        </div>

        <SplitLines
          as="h2"
          text={heading}
          className="text-display-lg mt-6 max-w-[16ch] text-ink"
        />

        <ul className="mt-16 grid gap-x-10 gap-y-14 lg:mt-24 lg:grid-cols-3">
          {blocks.map((block, i) => (
            <li key={block.key}>
              <Reveal delay={i * 0.1}>
                <div className="h-px w-full bg-ink/15" />
                <p className="mt-6 font-display text-eyebrow tabular-nums text-gold-600">
                  {pad(i + 1)}
                </p>
                <h3 className="text-heading-lg mt-4 text-ink">{block.title}</h3>
                <p className="text-body mt-5 text-rock-600">
                  <InlineText text={block.text} />
                </p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
