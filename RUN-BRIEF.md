# RUN-BRIEF — STANDING AUTONOMOUS PROTOCOL (HEADLESS CHAIN)

This brief is executed repeatedly by fresh headless sessions launched by
`run-until-credits.ps1`, until the autonomous queue empties or the credits end.
Read it fully at every session start.

## 0. Every session, before any work
1. Ground truth: tree clean, HEAD == origin/main, production alias serves
   build-commit == HEAD. Fix drift first.
2. Read the standing-traps list and MORNING.md — it is the queue; resume at its
   "NEXT SESSION STARTS HERE" handoff.
3. Inbox check (content/video-inbox/).
4. If the autonomous queue is EMPTY — only client-decision items remain — write
   RUN-COMPLETE.flag at the repo root with a one-line summary and timestamp,
   update MORNING.md, and stop. That flag ends the chain.

## 1. Ratifications of the latest session — all accepted, now standing
- Stage 4 experience-page judgment approved in full: the surfaced-not-written
  subtitle, declining a subtitle that would repeat the transfers page's own
  best line, and suppressing the paragraph identical to its own title —
  cutting a repetition is not cutting content; the paragraph stays preserved.
- Reduced-motion recomposition is a standing rule: reduced motion means no
  motion, not no pictures. Alternating editorial pairs are the pattern.
- The serif A/B isolation is exactly right: route-only font load,
  noindex,nofollow, per-frame face labels proving "headlines only".
- Batch contention is a standing trap: a batch that cries wolf is worse than
  no batch — browser-driven guards run individually against remote origins.

## 2. The queue (then whatever MORNING.md adds)
1. Temporary /review route, FIRST: render MORNING.md's decision list as a page
   with its images inline — OWN captures only; nothing from qa/benchmark/ may
   ever appear there (third-party material). noindex,nofollow, clearly marked
   temporary, linked from nowhere public, deleted after the decisions land.
   Purpose: the client reviews the ten decisions with pictures from his phone.
2. Remaining burn-down: benchmark coverage completion (attested-not-captured
   caveat intact, qa/benchmark/ stays gitignored), qa hardening backlog,
   leftovers surfaced by the polish passes.
3. Genuine polish only after that: consistency sweeps, mobile refinements,
   documentation accuracy.

NO MAKE-WORK. If an item adds no visitor or maintainer value, it does not run —
an empty queue ends the chain honestly via RUN-COMPLETE.flag. Never touch the
client-decision items: photo-swap confirmations, serif choice, label warmth,
enhanced files, responsePromise.

## 3. Hard walls — absolute in every session
Nothing invented; licensing per-file with BY-SA/NC forbidden; no AI scenery;
enhanced files stay unwired; performance floor 89 / CLS 0 hard wall /
TBT <= 250 ms ceiling / a11y 100 on the deployment; brochure path and legacy
anchors intact; no project-settings changes; alias assertion after every push
(--prod only on a measured failure, logged); context economy throughout; and
before context runs out, close the block clean and write the MORNING.md
handoff so the next chained session resumes seamlessly.
