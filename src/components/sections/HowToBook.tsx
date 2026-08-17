import type { BookingStep } from "@/lib/types";
import { pad } from "@/lib/utils";
import { Reveal } from "@/components/ui/Reveal";
import { SplitLines } from "@/components/ui/SplitLines";

/**
 * The booking steps as an editorial timeline.
 *
 * The original site reused a single 160×160 image for every step, which is far
 * too small to show at any meaningful size — the numbering carries the sequence
 * instead. Step bodies are verbatim; step 3's heading is the client-supplied
 * correction of a copy-paste error on the live site (see CONTENT_INVENTORY.md).
 */
export function HowToBook({
  heading,
  subheading,
  steps,
  responsePromise,
}: {
  heading: string;
  subheading: string;
  steps: BookingStep[];
  /** Omitted entirely when null — we do not promise a time we were not given. */
  responsePromise?: string | null;
}) {
  return (
    <section
      id="how-to-book"
      aria-labelledby="how-to-book-heading"
      className="grain relative bg-ocean-950 py-section-lg text-sand-50"
    >
      <div aria-hidden className="grain-overlay" />

      <div className="relative mx-auto w-full max-w-[92rem] px-6 sm:px-8 lg:px-12">
        <div className="flex items-center gap-4">
          <span aria-hidden className="h-px w-10 bg-gold-400/70" />
          <p className="text-eyebrow uppercase text-sand-200/60">{subheading}</p>
        </div>

        <SplitLines
          as="h2"
          text={heading}
          className="text-display-lg mt-6 max-w-[16ch] text-sand-50"
        />

        <ol className="mt-16 lg:mt-24">
          {steps.map((step, i) => (
            <li key={step.key}>
              <Reveal delay={0.04 * i}>
                <div className="grid gap-4 border-t border-sand-100/15 py-8 lg:grid-cols-12 lg:gap-8 lg:py-10">
                  <p className="font-display text-eyebrow tabular-nums text-gold-400 lg:col-span-1">
                    {pad(step.number)}
                  </p>

                  <h3 className="text-heading-lg text-sand-50 lg:col-span-5">
                    {step.title}
                  </h3>

                  <div className="text-body text-sand-200/75 lg:col-span-6">
                    {step.bodyItems ? (
                      <>
                        <p>{step.bodyLead}</p>
                        <ul className="mt-4 flex flex-col gap-2">
                          {step.bodyItems.map((item) => (
                            <li key={item} className="flex gap-3">
                              <span aria-hidden className="text-gold-400">
                                •
                              </span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      step.body
                    )}
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
        <div aria-hidden className="h-px w-full bg-sand-100/15" />

        {/* Renders only if the client has supplied a real number. There is no
            fallback string on purpose: an invented reply time is exactly the
            kind of claim this project does not make. */}
        {responsePromise && (
          <Reveal delay={0.08}>
            <p className="text-body mt-10 max-w-[46ch] text-sand-200/75">
              {responsePromise}
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
