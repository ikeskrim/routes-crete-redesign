/**
 * Assert that the production alias is serving a given commit.
 *
 *   node qa/alias-assert.mts <sha7> [url]
 *
 * Three outcomes, deliberately kept apart, because two of them once got
 * conflated and cost a session's verification:
 *
 *   LIVE      the alias serves the commit asked for.
 *   PENDING   the alias answers, but with a different commit — still building,
 *             or the push has not been picked up.
 *   BLOCKED   the edge refuses to answer this machine at all.
 *
 * BLOCKED is the one worth naming. Vercel challenges automated traffic when it
 * sees enough of it, and a full verification round is a lot of it. When that
 * trips, every request comes back 403 with `x-vercel-mitigated: challenge`,
 * which looks exactly like a dead deployment — and is nothing of the kind. The
 * build can be `● Ready` and a real browser completely unaffected. Reporting
 * that as "not deployed" is a false statement about the work, so this exits 2
 * with its own message rather than folding into the failure path.
 *
 * Exit codes: 0 live, 1 pending/mismatch, 2 blocked by mitigation.
 *
 * The code is set on `process.exitCode` and the script returns, rather than
 * calling `process.exit()`. Exiting hard while a keep-alive socket from the
 * probe was still open tripped a libuv assertion on Windows and the process
 * died with 127 — which would have made this gate unusable in exactly the
 * chains it exists to gate.
 */
const WANT = process.argv[2];
const BASE = process.argv[3] ?? "https://routes-crete-redesign.vercel.app";

if (!WANT) {
  console.error("usage: node qa/alias-assert.mts <sha7> [url]");
  process.exitCode = 1;
}

/** Poll gently. Fifteen-second polling is part of what trips the challenge. */
const INTERVAL_MS = 30_000;
const ATTEMPTS = 20;

for (let attempt = 1; attempt <= ATTEMPTS && process.exitCode === undefined; attempt++) {
  let res: Response;
  try {
    res = await fetch(BASE, { redirect: "manual" });
  } catch (error) {
    console.log(`  ${attempt}/${ATTEMPTS}  no response (${(error as Error).message})`);
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
    continue;
  }

  const mitigated = res.headers.get("x-vercel-mitigated");
  const token = res.headers.get("x-vercel-challenge-token");
  if (res.status === 403 && (mitigated === "challenge" || token)) {
    console.log("");
    console.log("VERIFICATION BLOCKED BY BOT MITIGATION — this is NOT 'not deployed'.");
    console.log(`  ${BASE} answered 403, x-vercel-mitigated: ${mitigated ?? "(token present)"}`);
    console.log("  The edge is challenging automated requests from this IP. The build may");
    console.log("  be healthy and a real browser unaffected; this result says nothing");
    console.log("  either way about whether the commit is live.");
    console.log("");
    console.log("  Read build state from the authenticated API instead:");
    console.log("    npx vercel inspect <deployment-url> --scope domisi | grep -i status");
    console.log("");
    console.log("  Then wait, and re-run this ONCE. Do not attempt to work around the");
    console.log("  challenge — it is there to be solved by a browser.");
    process.exitCode = 2;
    break;
  }

  const html = await res.text();
  const live = html.match(/name="build-commit" content="([^"]+)"/)?.[1] ?? "(none)";

  if (live === WANT) {
    console.log(`ALIAS LIVE — ${BASE} is serving ${WANT} (attempt ${attempt})`);
    process.exitCode = 0;
    break;
  }

  console.log(`  ${attempt}/${ATTEMPTS}  serving ${live}, waiting for ${WANT}`);
  await new Promise((r) => setTimeout(r, INTERVAL_MS));
}

if (process.exitCode === undefined) {
  console.log("");
  console.log(`ALIAS PENDING — ${BASE} never served ${WANT} within the polling window.`);
  console.log("  The alias answered normally throughout, so this is a build or push");
  console.log("  question, not bot mitigation. Check the deployment's status.");
  process.exitCode = 1;
}
