import type { ReactNode } from "react";

import { ITALIC_EMPHASIS } from "@/lib/edition";

/**
 * The one emphasis word of a headline (C+ SPEC §C.2, §C.13, contract C5).
 *
 * The word is matched whole and verbatim: the first occurrence of `word` with
 * no letter directly before or after it (`(?<!\p{L})word(?!\p{L})`),
 * case-sensitive. It is wrapped in `<em className="ed-em">`, whose look is
 * the edition's call (`--ed-em-style` / `--ed-em-family`: roman in R1, italic
 * only after the §K.4 budget gate). No match, or `ITALIC_EMPHASIS` off,
 * renders the text unchanged, so a content edit that removes the word fails
 * closed. The text itself (textContent, innerText, the accessible name) never
 * changes.
 *
 * Choosing the word is typography, not copy: `word` must be a word already in
 * `text` (preflight P13 checks every `emphasis="…"` against its text).
 */

type EmphasisTag = "h1" | "h2" | "h3" | "p" | "span";

const PATTERNS = new Map<string, RegExp>();

/** The whole-word matcher for `word` (cached). */
function wholeWord(word: string): RegExp {
  let pattern = PATTERNS.get(word);
  if (!pattern) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    pattern = new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, "u");
    PATTERNS.set(word, pattern);
  }
  return pattern;
}

/**
 * Where the emphasis word sits in `text`, or `null` when there is nothing to
 * emphasise (no word, no whole-word match, or the edition switch is off).
 */
export function findEmphasis(
  text: string,
  word: string | undefined,
): { index: number; length: number } | null {
  if (!ITALIC_EMPHASIS || !word || !word.trim()) return null;
  const match = wholeWord(word).exec(text);
  return match ? { index: match.index, length: match[0].length } : null;
}

/**
 * `text` as React nodes with its emphasis word in `em.ed-em` (or `text`
 * unchanged). Callers that render one text in several segments (SplitLines'
 * lines and word spans) emphasise only the first segment that matches.
 */
export function renderEmphasis(text: string, word: string | undefined): ReactNode {
  const at = findEmphasis(text, word);
  if (!at) return text;
  return (
    <>
      {text.slice(0, at.index)}
      <em className="ed-em">{text.slice(at.index, at.index + at.length)}</em>
      {text.slice(at.index + at.length)}
    </>
  );
}

/**
 * A headline that is not a `SplitLines` (the 404 h1), with its emphasis word:
 *
 *     <Emphasis as="h1" text="This path doesn’t lead anywhere" word="anywhere" />
 *
 * Server component. Above the fold, pick a word that is line-final or alone
 * on its line (§C.2 rule 6).
 */
export function Emphasis({
  text,
  word,
  as: Tag = "span",
  className,
  id,
}: {
  text: string;
  word?: string;
  as?: EmphasisTag;
  className?: string;
  /** Lands on the tag, so a section's aria-labelledby resolves. */
  id?: string;
}) {
  return (
    <Tag id={id} className={className}>
      {renderEmphasis(text, word)}
    </Tag>
  );
}
