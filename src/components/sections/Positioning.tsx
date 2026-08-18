import { Reveal } from "@/components/ui/Reveal";
import { SplitLines } from "@/components/ui/SplitLines";

/**
 * The positioning statement — section 2 of the six.
 *
 * The old homepage said who we are three separate times: a cinematic bridge, a
 * standalone "Why Us" trio, and again in the team block. This is that argument
 * made once, early, in the brand voice, so everything after it is evidence
 * rather than persuasion.
 *
 * Deliberately short and deliberately quiet: it sits between a full-bleed hero
 * and a photographic grid, and its job is to slow the reader down for four
 * lines, not to compete with either.
 */
export function Positioning({
  eyebrow,
  statement,
  body,
  attributes,
  children,
}: {
  eyebrow: string;
  statement: string;
  body: string;
  attributes: string[];
  /**
   * The stacked why-us scene renders here, inside this section rather than
   * after it. The positioning statement and the three value panels are one
   * argument — stating it, then evidencing it — so they are one movement of
   * the page, not two. Rendered full-bleed: the padding lives on the intro
   * container, never on the section.
   */
  children?: React.ReactNode;
}) {
  return (
    <section
      id="positioning"
      aria-labelledby="positioning-heading"
      className="bg-shell text-ink"
    >
      <div className="mx-auto w-full max-w-[92rem] px-6 py-section-lg sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-4">
              <span aria-hidden className="h-px w-10 bg-gold-600/60" />
              <p className="text-eyebrow uppercase text-rock-500">{eyebrow}</p>
            </div>

            <SplitLines
              as="h2"
              text={statement}
              className="text-display-lg mt-6 max-w-[22ch] text-ink"
            />
          </div>

          <div className="lg:col-span-5 lg:pt-24">
            <Reveal delay={0.1}>
              <p className="text-body-lg max-w-[46ch] text-ink/70">{body}</p>
            </Reveal>

            {/* Four attributes, each one literally true and evidenced
                elsewhere in the content. No counts, no ratings, no awards. */}
            <Reveal delay={0.18}>
              <ul className="mt-10 flex flex-col gap-3 border-t border-ink/10 pt-8">
                {attributes.map((attribute) => (
                  <li
                    key={attribute}
                    className="flex items-baseline gap-4 text-eyebrow uppercase text-ink/60"
                  >
                    <span aria-hidden className="h-px w-6 shrink-0 bg-gold-600/60" />
                    {attribute}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </div>

      {children}
    </section>
  );
}
