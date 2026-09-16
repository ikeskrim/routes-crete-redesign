import fs from "node:fs";
import path from "node:path";

import { getPhotoCredits, graded } from "./content";
import { DUOTONE, GRADE } from "./edition";
import type { PhotoCredit } from "./types";

/**
 * Photo credits and the duotone path (C+ SPEC §0.4 C6, §C.9, §E.3).
 *
 * Server-only through `./content` (it reads content/photo-credits.json and
 * the public tree).
 */

/** The ledger file name of an image path: its basename. */
function ledgerName(file: string): string {
  return file.split(/[\\/]/).pop() ?? file;
}

/**
 * The ledger record for a photograph, by file name or by any path that ends
 * in it (`/images/sourced/x.jpg`, `/images/graded/d/sourced/x.jpg`). The
 * pipeline writes every derivative as `.jpg`, so a master named `.jpeg`,
 * `.png` or `.JPG` is also looked up under `.jpg`. No match → `undefined`.
 */
export function photoRecord(file: string): PhotoCredit | undefined {
  const name = ledgerName(file);
  const asJpg = name.replace(/\.(jpe?g|png)$/i, ".jpg");
  const photographs = getPhotoCredits().photographs;
  return (
    photographs.find((p) => p.file === name) ??
    (asJpg !== name ? photographs.find((p) => p.file === asJpg) : undefined)
  );
}

/**
 * The tier-2 credit line of a ledger record: `Photograph: {author},
 * {licence}`, plus ` (colour-graded)` when the record says the file was
 * modified. The live pattern of `src/app/design-3/c/credit.ts:18`.
 */
export function creditLine(record: Pick<PhotoCredit, "author" | "licence" | "modified">): string {
  return `Photograph: ${record.author}, ${record.licence}${record.modified ? " (colour-graded)" : ""}`;
}

/**
 * A photograph's caption and credit, read from content/photo-credits.json
 * (the same record /credits renders), so neither string lives in a page.
 * `caption` is the record's `subject`, verbatim; `credit` is `creditLine()`.
 * Moved unchanged from `src/app/design-3/c/credit.ts` (§C.9): no ledger
 * record → `null`, and a caller renders nothing (fail closed).
 */
export function photoCredit(file: string): { caption: string; credit: string } | null {
  const record = photoRecord(file);
  if (!record) return null;
  return { caption: record.subject, credit: creditLine(record) };
}

/* Existence of a file under public/, read once per path per server process
   (the duotone derivative is written by qa/duotone.ps1, never at runtime). */
const publicFileExists = new Map<string, boolean>();

function existsInPublic(src: string): boolean {
  let found = publicFileExists.get(src);
  if (found === undefined) {
    found = fs.existsSync(path.join(process.cwd(), "public", src));
    publicFileExists.set(src, found);
  }
  return found;
}

/**
 * The terracotta duotone derivative of a mood frame (§E.3, contract C6):
 * `/images/graded/${GRADE}/duotone/<dir>/<file>.jpg` when `DUOTONE` is on and
 * that file exists, else `graded(src)`, the colour frame of the live grade in
 * the same slot (the caption does not change).
 *
 * `src` is a content-style path (`/images/sourced/south-coast-storm-cloud.jpg`);
 * a graded path of any letter (`/images/graded/c/sourced/…`) resolves the
 * same way.
 */
export function duotonePath(src: string): string {
  const fallback = graded(src);
  if (!DUOTONE || typeof src !== "string" || !src.startsWith("/images/")) return fallback;

  const relative = src
    .replace(/^\/images\/graded\/[^/]+\//, "")
    .replace(/^\/images\//, "")
    .replace(/^duotone\//, "")
    .replace(/\.(jpe?g|png)$/i, ".jpg");
  if (!relative || relative.startsWith("/")) return fallback;

  const candidate = `/images/graded/${GRADE}/duotone/${relative}`;
  return existsInPublic(candidate) ? candidate : fallback;
}
