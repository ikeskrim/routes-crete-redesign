/**
 * Capture preflight.
 *
 * A dead or stale server once returned zero screenshots while the run still
 * "succeeded"; worse, a server left over from an older build could serve stale
 * pages that look like verification. Every capture set therefore asserts the
 * target is alive first, and is stamped with the commit it rendered.
 */
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

export interface BuildStamp {
  commit: string;
  dirty: boolean;
  base: string;
  capturedAt: string;
}

function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

/**
 * Throws if the target isn't serving. Never let a capture run report success
 * against a server that isn't there.
 */
export async function preflight(base: string, outDir: string): Promise<BuildStamp> {
  let res: Response;
  try {
    res = await fetch(base, { redirect: "manual" });
  } catch (err) {
    throw new Error(
      `PREFLIGHT FAILED: ${base} is not responding (${(err as Error).message}).\n` +
        `Start the production server first:  npx next start -p 3009`,
    );
  }
  if (res.status >= 500) {
    throw new Error(`PREFLIGHT FAILED: ${base} returned ${res.status}`);
  }

  const stamp: BuildStamp = {
    commit: git("rev-parse --short HEAD"),
    dirty: git("status --porcelain").length > 0,
    base,
    capturedAt: new Date().toISOString(),
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "_BUILD.json"),
    JSON.stringify(stamp, null, 2),
  );

  console.log(
    `preflight ok — ${base} live, rendering ${stamp.commit}${stamp.dirty ? " (working tree dirty)" : ""}`,
  );
  if (stamp.dirty) {
    console.log(
      "  ! working tree is dirty: these captures may not match any commit",
    );
  }
  return stamp;
}
