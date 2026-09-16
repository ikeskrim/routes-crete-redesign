import type { ReactNode } from "react";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { SplitLines } from "@/components/ui/SplitLines";
import { cn } from "@/lib/utils";

import styles from "./Positioning.module.css";

/**
 * Movement I, the positioning spread (C+ SPEC §D.4). Server component.
 *
 * Folio I and its department name, the statement set in two sentences (the
 * second indented, so the page's left edge carries the argument), the body
 * with a terracotta drop cap on a narrow measure, and the four attributes as
 * a hairline list beside it. Columns 1–2 beside the body stay air.
 *
 * The why-us rows (`children`, the `StackedPanels` evidence) render INSIDE
 * this section: stating the case and evidencing it are one movement, so the
 * homepage keeps exactly five top-level sections.
 *
 * The statement is split at its sentence ends (`lines` mode: one visible copy,
 * set at server render) and rises once on first sight; with JavaScript off the
 * root layout's noscript rule sets it in place.
 */

/** The statement's sentences, so each starts its own line; the text is untouched. */
function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/);
}

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
  /** The why-us rows, nested in this movement (full bleed on the grid). */
  children?: ReactNode;
}) {
  const lines = sentences(statement);

  return (
    <section
      id="positioning"
      aria-labelledby="positioning-heading"
      className={cn("ed-grid paper-stock", styles.section)}
    >
      <div aria-hidden="true" className="paper-stock-layer" />

      <Eyebrow folio="I" className={styles.folio}>
        {eyebrow}
      </Eyebrow>

      <SplitLines
        as="h2"
        id="positioning-heading"
        text={statement}
        lines={lines.length > 1 ? lines : undefined}
        className={cn("text-statement", styles.statement)}
        lineClassName={[undefined, styles.indent]}
      />

      <p className={cn("text-body-lg ed-dropcap", styles.body)}>{body}</p>

      {/* Four attributes, each literally true and evidenced elsewhere in the
          content. No counts, no ratings, no awards. */}
      <ul className={styles.attributes}>
        {attributes.map((attribute) => (
          <li key={attribute} className="text-deck">
            {attribute}
          </li>
        ))}
      </ul>

      {children}
    </section>
  );
}
