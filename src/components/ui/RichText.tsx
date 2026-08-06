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
              <strong key={i} className="font-semibold text-ink">
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
 * Long-form editorial body copy. Sets a comfortable reading measure and rhythm;
 * the first paragraph gets a slightly larger size as a standfirst.
 */
export function RichText({
  blocks,
  className,
  lead = true,
  tone = "dark",
}: {
  blocks: BodyBlock[];
  className?: string;
  /** Treat the first paragraph as a larger standfirst. */
  lead?: boolean;
  tone?: "dark" | "light";
}) {
  return (
    <div className={cn("flex flex-col gap-7", className)}>
      {blocks.map((block, i) => (
        <p
          key={i}
          className={cn(
            lead && i === 0 ? "text-body-lg" : "text-body",
            tone === "dark" ? "text-rock-600" : "text-sand-200/85",
            lead && i === 0 && tone === "dark" && "text-ink/80",
          )}
        >
          <InlineText text={block.text} />
        </p>
      ))}
    </div>
  );
}
