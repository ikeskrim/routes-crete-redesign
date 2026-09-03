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
 * `@utility grain { position: relative }` is emitted into the same utilities
 * layer as Tailwind's position utilities, at equal specificity — and AFTER
 * `.absolute` and `.fixed`:
 *
 *     .absolute{position:absolute}.fixed{position:fixed}.grain,.relative{position:relative}
 *
 * so `grain fixed` silently resolves to position: relative. That shipped: the
 * "fullscreen" overlay menu was an in-flow block that added its own height to
 * the document, left 243px of the page visible below it at 390x844, and threw
 * away the reader's scroll position whenever it took focus. Nothing about the
 * class list looks wrong, which is why this is a build-time guard rather than
 * a comment. `.sticky` is emitted after `.grain` and is therefore safe.
 */
async function assertNoGrainPositionClash(): Promise<void> {
  const roots = ["src"];
  const offenders: string[] = [];

  const walk = async (dir: string): Promise<void> => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (/\.(tsx|ts)$/.test(entry.name)) {
        const source = await fs.readFile(full, "utf8");
        /* Blank out comments before scanning, preserving newlines so line
           numbers still point at the real thing. Without this the guard fires
           on the comment *explaining* the guard — prose that quotes both the
           emitted CSS and the offending pairing. */
        const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) =>
          m.replace(/[^\n]/g, " "),
        );
        code.split("\n").forEach((line, i) => {
          for (const [, classes] of line.matchAll(/["'`]([^"'`]*\bgrain\b[^"'`]*)["'`]/g)) {
            if (/\bgrain\b/.test(classes) && /\b(fixed|absolute)\b/.test(classes)) {
              offenders.push(`${full}:${i + 1}  ${classes.trim()}`);
            }
          }
        });
      }
    }
  };

  await Promise.all(roots.map(walk));

  if (offenders.length) {
    throw new Error(
      `PREFLIGHT FAILED: \`grain\` combined with \`fixed\`/\`absolute\`.\n` +
        `\`.grain\` sets position: relative and wins over both, so the element ` +
        `will NOT be positioned as written.\n` +
        `Put the grain on an inner element instead (grain-overlay paints it):\n` +
        offenders.map((o) => `  ${o}`).join("\n"),
    );
  }
}

/**
 * Throws if the target isn't serving. Never let a capture run report success
 * against a server that isn't there.
 */
export async function preflight(base: string, outDir: string): Promise<BuildStamp> {
  await assertNoGrainPositionClash();

  let res: Response;
  try {
    res = await fetch(base, { redirect: "manual" });
  } catch (err) {
    throw new Error(
      `PREFLIGHT FAILED: ${base} is not responding (${(err as Error).message}).\n` +
        `Start the production server first:  npx next start -p 3009`,
    );
  }
  /* Bot mitigation is its own outcome, not a deployment failure.
   *
   * Vercel challenges automated traffic when it sees enough of it, and a full
   * verification round is a lot: nine guards, a five-run Lighthouse pass over
   * two routes, a capture run, and an alias poll every fifteen seconds. Run a
   * few rounds back to back and every request starts coming back 403 with
   * `X-Vercel-Mitigated: challenge`.
   *
   * That looked exactly like a dead deployment once, and cost a session's
   * verification: the build was `● Ready` and a real browser was unaffected
   * while every headless request was refused. So the two states are told
   * apart here, by name, and the message says which one this is. A challenge
   * is the edge declining to answer a robot — it says nothing whatsoever
   * about whether the build is good, and it must never be reported as
   * "not deployed". */
  const mitigated = res.headers.get("x-vercel-mitigated");
  const challengeToken = res.headers.get("x-vercel-challenge-token");
  if (res.status === 403 && (mitigated === "challenge" || challengeToken)) {
    throw new Error(
      `VERIFICATION BLOCKED BY BOT MITIGATION — not a deployment failure.\n` +
        `  ${base} answered 403 with x-vercel-mitigated: ${mitigated ?? "(token present)"}.\n` +
        `  The edge is challenging automated requests from this IP. The build may be\n` +
        `  perfectly healthy and a real browser unaffected — this says nothing about it.\n` +
        `\n` +
        `  Check build state through the authenticated API, which is not challenged:\n` +
        `    npx vercel inspect <deployment-url> --scope domisi | grep -i status\n` +
        `\n` +
        `  Then wait it out and re-run ONCE rather than in a loop. Do not try to work\n` +
        `  around the challenge: it exists to be solved by a browser.`,
    );
  }

  if (res.status >= 500) {
    throw new Error(`PREFLIGHT FAILED: ${base} returned ${res.status}`);
  }

  /* The stylesheet must actually load.
   *
   * A server left running across a rebuild serves HTML that references the
   * PREVIOUS build's CSS chunk, which no longer exists — it 500s, the page
   * renders completely unstyled, and every content-based guard still passes
   * because the words are all there. What it looked like downstream: the
   * headline guard reporting exact doubling on every headline, because
   * `invisible` was not applying to the measuring copy so both copies were
   * "visible". Twenty minutes chasing a SplitLines bug that did not exist.
   *
   * Any capture taken in that state is worthless, so no run should start in
   * it. */
  const html = await res.clone().text();
  const cssHref = html.match(/\/_next\/static\/[^"']+\.css/)?.[0];
  if (cssHref) {
    const cssRes = await fetch(new URL(cssHref, base)).catch(() => null);
    if (!cssRes || cssRes.status >= 400) {
      throw new Error(
        `PREFLIGHT FAILED: the stylesheet ${cssHref} returned ` +
          `${cssRes?.status ?? "no response"}.
` +
          `The page will render UNSTYLED and every capture will be worthless, ` +
          `while content guards still pass.
` +
          `Usually a server left running across a rebuild: restart it.`,
      );
    }
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
