import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Our type scale lives in a custom `--text-*` namespace, and tailwind-merge
 * can't tell `text-display-lg` (a font size) from `text-ink` (a colour) on its
 * own — it treats them as one conflict group and silently drops the size.
 * Declaring the scale here keeps size and colour independent.
 */
const FONT_SIZES = [
  "display-2xl",
  "display-xl",
  "display-lg",
  "display-md",
  "heading-lg",
  "heading-md",
  "heading-sm",
  "body-lg",
  "body",
  "body-sm",
  "caption",
  "eyebrow",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZES }],
    },
  },
});

/** Merge conditional class names, with later Tailwind utilities winning. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Zero-pad a section index for the editorial "01 / 02 / 03" device. */
export function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Render the tiny markup subset used in content files:
 *   **bold**  →  <strong>
 *   \n        →  <br>
 *
 * Returns plain data rather than HTML so callers stay in JSX and we never need
 * dangerouslySetInnerHTML. Anything that isn't `**` or `\n` is passed through
 * untouched, which keeps the copy byte-identical to the original site.
 */
export type InlineToken = { text: string; bold: boolean };

export function parseInline(text: string): InlineToken[][] {
  return text.split("\n").map((line) =>
    line
      .split(/(\*\*[^*]+\*\*)/g)
      .filter((part) => part !== "")
      .map((part) =>
        part.startsWith("**") && part.endsWith("**")
          ? { text: part.slice(2, -2), bold: true }
          : { text: part, bold: false },
      ),
  );
}

/** Strip the markup subset — for meta descriptions, alt text and JSON-LD. */
export function stripInline(text: string): string {
  return text.replace(/\*\*/g, "").replace(/\n/g, " ");
}
