import { getPhotoCredits } from "@/lib/content";

/**
 * TEMPORARY — /design-3/c. The hero photograph's caption and credit, read from
 * content/photo-credits.json (the same record /credits renders), so neither
 * string lives in the page. The caption is the record's `subject`, verbatim;
 * the credit is its author and licence in the draft brief's credit form, with
 * "(colour-graded)" only when the record says the file was modified.
 *
 * This belongs in ../_lib/draft-content.ts for all three drafts; that file is
 * shared, so it is kept here until the orchestrator moves it.
 */
export function photoCredit(file: string): { caption: string; credit: string } | null {
  const record = getPhotoCredits().photographs.find((p) => p.file === file);
  if (!record) return null;
  return {
    caption: record.subject,
    credit: `Photograph: ${record.author}, ${record.licence}${record.modified ? " (colour-graded)" : ""}`,
  };
}
