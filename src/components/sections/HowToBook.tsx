import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";
import { SplitLines } from "@/components/ui/SplitLines";
import type { BookingStep } from "@/lib/types";
import { cn } from "@/lib/utils";

import styles from "./HowToBook.module.css";

/**
 * A step body as blocks, markup only: the content's blank lines separate
 * paragraphs, and consecutive paragraphs that open with a bullet ("• ") form
 * one list. A list item keeps the words after the bullet; the bullet itself
 * is drawn beside it from the content's own character (`data-marker`), so no
 * character of the body is dropped or added.
 */
type StepBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: { marker: string; text: string }[] };

const BULLET = /^(•)\s+/u;

function stepBlocks(body: string): StepBlock[] {
  const blocks: StepBlock[] = [];
  for (const para of body.split(/\n\s*\n/)) {
    const text = para.trim();
    if (!text) continue;
    const bullet = BULLET.exec(text);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      const item = { marker: bullet[1], text: text.slice(bullet[0].length) };
      if (last?.kind === "ul") last.items.push(item);
      else blocks.push({ kind: "ul", items: [item] });
    } else {
      blocks.push({ kind: "p", text });
    }
  }
  return blocks;
}

/**
 * Movement IV, how to book (C+ SPEC §D.4, as built in the frozen draft):
 * bone stock, folio IV, "Booking is a *conversation*", three hairline-ruled
 * steps and the response promise set as a pull quote. Server component.
 *
 * Each step: its number in the `numeral-step` cut (burnt sienna,
 * `aria-hidden`; the order is carried by the `ol`), its title, and its body
 * with the content's own paragraphs and bullets. Columns 11–12 stay air.
 * Phones: numeral and title on one baseline, the body under them.
 *
 * No photograph in this movement: the page breathes before the back cover.
 * The response promise renders only when the client has supplied one; there
 * is no fallback string, because an invented reply time is exactly the kind
 * of claim this project does not make.
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
  /** Omitted entirely when null: we do not promise a time we were not given. */
  responsePromise?: string | null;
}) {
  return (
    <section
      id="how-to-book"
      aria-labelledby="how-to-book-heading"
      className={cn("ed-grid bone-stock", styles.section)}
    >
      <div aria-hidden="true" className="bone-stock-layer" />

      <Eyebrow folio="IV" className={styles.folio}>
        {subheading}
      </Eyebrow>

      <SplitLines
        as="h2"
        id="how-to-book-heading"
        text={heading}
        emphasis="conversation"
        className={cn("text-section", styles.heading)}
      />

      <ol className={styles.steps}>
        {steps.map((step) => (
          <li key={step.key} className={styles.stepItem}>
            <Reveal className={styles.step}>
              <span aria-hidden="true" className={cn("text-numeral-step", styles.numeral)}>
                {step.number}
              </span>
              <h3 className={cn("text-title", styles.title)}>{step.title}</h3>
              <div className={cn("text-body", styles.body)}>
                {stepBlocks(step.body).map((block, b) =>
                  block.kind === "p" ? (
                    <p key={b}>{block.text}</p>
                  ) : (
                    <ul key={b} className={styles.list}>
                      {block.items.map((item) => (
                        <li key={item.text} data-marker={item.marker}>
                          {item.text}
                        </li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            </Reveal>
          </li>
        ))}
      </ol>

      {responsePromise && (
        <Reveal className={styles.promise}>
          <span aria-hidden="true" className={styles.quoteRule} />
          <p className={cn("text-pullquote", styles.promiseText)}>{responsePromise}</p>
        </Reveal>
      )}
    </section>
  );
}
