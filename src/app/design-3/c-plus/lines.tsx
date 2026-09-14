import { Fragment, type ReactNode } from "react";

import styles from "./c-plus.module.css";

/**
 * DraftLines — the draft-local equivalent of SplitLines' `lines` mode
 * (C+ spec §0.1, §C.2). Server-rendered, one visible copy, no sr-only
 * duplicate, no aria-hidden, no motion: the draft shows lines set, as the
 * reduced-motion still does.
 *
 * - with `lines`: one `span.edLine[data-line]` per line, a literal space
 *   between spans, so the accessible name and innerText stay one sentence;
 * - without `lines`: one `span.edLine` holding the whole text, wrapping.
 *
 * The emphasis word (whole word, first match, case-sensitive) goes in
 * `em.edEm`; no match renders no <em> (fails closed if content changes).
 */

type Tag = "h1" | "h2" | "h3" | "p";

function wholeWord(word: string): RegExp {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, "u");
}

export function DraftLines({
  as: Tag = "p",
  text,
  lines,
  emphasis,
  id,
  className,
  lineClassName,
  onPhotoLine,
}: {
  as?: Tag;
  text: string;
  lines?: string[];
  emphasis?: string;
  id?: string;
  className?: string;
  /** Extra class per line index. */
  lineClassName?: (string | undefined)[];
  /** The line index printed over a photograph (carries data-on-photo). */
  onPhotoLine?: number;
}) {
  if (lines && lines.join(" ") !== text) {
    throw new Error(`DraftLines: lines ${JSON.stringify(lines)} do not join to ${JSON.stringify(text)}`);
  }

  let emphasised = false;
  const renderEm = (segment: string): ReactNode => {
    if (!emphasis || emphasised) return segment;
    const match = wholeWord(emphasis).exec(segment);
    if (!match) return segment;
    emphasised = true;
    return (
      <>
        {segment.slice(0, match.index)}
        <em className={styles.edEm}>{match[0]}</em>
        {segment.slice(match.index + match[0].length)}
      </>
    );
  };

  const parts = lines ?? [text];

  return (
    <Tag
      id={id}
      className={[lines && lines.length > 1 ? styles.edLines : undefined, className].filter(Boolean).join(" ")}
      data-split-source={text}
      data-lines-ready=""
    >
      {parts.map((line, i) => (
        <Fragment key={i}>
          <span
            className={[styles.edLine, lineClassName?.[i]].filter(Boolean).join(" ")}
            data-line={lines ? i : undefined}
            data-on-photo={lines && onPhotoLine === i ? "" : undefined}
          >
            {renderEm(line)}
          </span>
          {i < parts.length - 1 ? " " : null}
        </Fragment>
      ))}
    </Tag>
  );
}
