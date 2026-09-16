import { Fragment } from "react";
import { cn, parseInline } from "@/lib/utils";
import type { BodyBlock } from "@/lib/types";

/**
 * Renders one content string, honouring the `**bold**` / `\n` subset used in
 * the content files. No HTML is injected — the text is rendered as React nodes,
 * so what ships is exactly what the JSON says.
 */
export function InlineText({ text }: { text: string }) {
  const lines = parseInline(text);

  return (
    <>
      {lines.map((tokens, lineIndex) => (
        <Fragment key={lineIndex}>
          {lineIndex > 0 && <br />}
          {tokens.map((token, i) =>
            token.bold ? (
              // The weight marks it; the colour is the paragraph's, so bold
              // reads on night as well as on paper.
              <strong key={i} className="font-semibold">
                {token.text}
              </strong>
            ) : (
              <Fragment key={i}>{token.text}</Fragment>
            ),
          )}
        </Fragment>
      ))}
    </>
  );
}

/**
 * Long-form editorial body copy (C+ SPEC §C.11): Inter `body`, the first
 * paragraph optionally a `body-lg` standfirst; paragraph spacing 1em (1.2em
 * after the standfirst). Ink on paper and bone; paper on night. `dropcap`
 * sets the first letter of the first paragraph as the terracotta three-line
 * drop cap (§C.10; CSS only, the text is untouched).
 */
export function RichText({
  blocks,
  className,
  lead = true,
  tone = "dark",
  dropcap = false,
}: {
  blocks: BodyBlock[];
  className?: string;
  /** Treat the first paragraph as a larger standfirst. */
  lead?: boolean;
  /** `dark` = ink text on a light ground. `light` = paper text on night. */
  tone?: "dark" | "light";
  dropcap?: boolean;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {blocks.map((block, i) => (
        <p
          key={i}
          className={cn(
            lead && i === 0 ? "text-body-lg" : "text-body",
            i > 0 && (lead && i === 1 ? "mt-[1.2em]" : "mt-[1em]"),
            tone === "dark" ? "text-ink" : "text-on-night",
            dropcap && i === 0 && "ed-dropcap",
          )}
        >
          <InlineText text={block.text} />
        </p>
      ))}
    </div>
  );
}
