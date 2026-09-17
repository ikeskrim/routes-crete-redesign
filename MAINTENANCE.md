# Held: the major dependency bumps (not before the cutover)

This branch, `maint/post-cutover-majors`, holds the three major-version bumps
that Dependabot proposed. They stay off `main` until the `routescrete.gr`
cutover is done and verified. Once live on the real domain, the site should
not change toolchains in the same week.

| PR | Bump | On this branch |
|---|---|---|
| #3 | `typescript` ^5 → ^7 (7.0.2) | applied |
| #4 | `eslint` ^9 → ^10 (10.10.0) | applied |
| #2 | `@types/node` ^20 → ^26 (26.6.1) | applied |

The minor-and-patch group (#5: motion 13.2.0, playwright 1.63.0,
@types/react-dom) was merged into `main` on 2026-09-17, after the full guard
suite passed on it.

## What was checked here (2026-09-17, on `main` at `4db5387` plus the three bumps)

- `npm install` resolves, with 11 peer-dependency overrides (`ERESOLVE
  overriding peer dependency`). `npm ci` installs.
- **Types:** `npx next typegen && npx tsc --noEmit` passes with TypeScript
  7.0.2. Without `typegen`, `PageProps` and `LayoutProps` are missing, as on
  `main`.
- **Build:** `npx next build` passes: 18 static and SSG routes, TypeScript
  step included.
- **Lint: broken.** `npx eslint src qa` stops at start-up with "typescript-eslint
  does not support TS 7.0". That is `eslint-config-next`'s bundled
  typescript-eslint (tracking issue: typescript-eslint/typescript-eslint#10940).
  This alone keeps the branch off `main`: lint is part of the verification
  path.
- **Not run:** the guard suite and Lighthouse. Run them before merging.

## To merge, after the cutover

1. Wait for a typescript-eslint (and `eslint-config-next`) release that
   supports TypeScript 7. Or keep TypeScript on 6 through the "run side by
   side with TypeScript 6.0" route in the TypeScript 7 announcement, and take
   only ESLint 10.
2. Rebase this branch on `main`, then `npm install` and `npm ci`.
3. Run `npx next typegen && npx tsc --noEmit`, then `npx eslint src qa` (no
   new errors), then `npx next build`.
4. Serve with `npx next start -p 3009` and run the full guard suite, one guard
   at a time (the command is in `CLOSING.md`). Then run Lighthouse against the
   deployment, 5 runs, and check the floors.
5. **`@types/node` should match the Node major that Vercel builds with.** That
   is a project setting (Settings → Build and Deployment → Node.js Version).
   If Vercel builds on an older Node, keep `@types/node` at that major instead
   of 26.
