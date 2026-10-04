# AGENTS.md

Tether is a Vencord userplugin. This repo contains **only the plugin source** (`src/`), installer, build tooling, and docs. There is no root `package.json`, lockfile, or test runner here — do not run `npm`/`pnpm install` in this directory.

## Dev setup (critical)

- The plugin is loaded into a separate Vencord checkout. The expected layout is a sibling clone at `~/PipettingBeaver_Github/Vencord`, with `Vencord/src/userplugins/tether` symlinked to this repo's `src/`:
  `Vencord/src/userplugins/tether -> /home/tan/PipettingBeaver_Github/Tether/src`
- Edits in `src/` are picked up by Vencord via that symlink. `src/tsconfig.json` aliases (`@api/*`, `@webpack/*`, etc.) resolve two levels up to `../Vencord/src`, so typecheck/build only work when the symlink and sibling checkout exist.
- Never commit build output into this repo. `tools/*.mjs` default to a sibling `../Tether-Testing/`. If a generated `.user.js` or bundle lands inside the repo, Vencord's typecheck/lint scan the minified file and fail.

## Commands

Run from the Vencord checkout (adjust the path):

```sh
# build and typecheck/lint
pnpm -C ~/PipettingBeaver_Github/Vencord build
pnpm -C ~/PipettingBeaver_Github/Vencord testTsc
pnpm -C ~/PipettingBeaver_Github/Vencord exec eslint src/userplugins/tether

# unit tests (node:test + node:assert/strict, no test runner in Tether itself)
pnpm -C ~/PipettingBeaver_Github/Vencord exec tsx src/userplugins/tether/tests/engine.test.ts

# update Vencord core, then fully restart Vesktop (tray quit)
tools/update-vencord.sh

# release artifacts (also write outside the repo by default)
node tools/build-testing.mjs
node tools/build-browser.mjs
```

- Capture the `pnpm build` exit code. Piping it through `tail` hides failures and can leave a stale `dist/` that Vesktop loads anyway.
- `tools/build-browser.mjs` finds the checkout via `--vencord=/path` or `VENCORD_DIR` (default `~/PipettingBeaver_Github/Vencord`), runs `pnpm buildWeb --skip-extension`, then rewrites the userscript metadata from `dist/Vencord.user.js`.

## Architecture invariants (do not break)

- `src/engine.ts` is pure and imports **nothing** — keep rules testable there.
- `src/dmTimes.ts` must **never** import `state.ts`. That keeps `state.ts`/`index.tsx` free to reset dmTimes caches without a cycle.
- No module imports `index.tsx`. It is the lifecycle/entry module (`definePlugin`, timers, flux handlers, command, chat button).
- Every `setInterval`/`setTimeout`/settings listener created in `start()` must be cleared in `stop()`.
- Risky Discord-facing action signatures stay isolated in `dmTimes.ts`; UI modules stay thin.

## Conventions and gotchas

- No new runtime dependencies. Use Vencord components (`@components/*`), Discord CSS variables only (no hardcoded colors), no DOM manipulation.
- Onboarding happens once per account. Persisted keys are versioned (`tether-state-<userId>`, `tether-dm-times-v3-<userId>`, `tether-onboarded-v5-<userId>`); bump the suffix when changing shape, e.g. to re-show onboarding during QA.
- `index.tsx` still uses the placeholder author `{ name: "tan", id: BigInt(0) }`; a real Discord ID is required before any public release or Vencord PR.
- Backfill probes one conversation at a time and closes what it opens; it pauses while a Tether-opened chat is on screen. Do not make it burst requests.
- Versioning is Keep a Changelog / SemVer; add an `## [Unreleased]` entry under `CHANGELOG.md`.

## Documentation

`README.md` (user-facing install) and `docs/ARCHITECTURE.md` (module map, data flow, storage keys), `docs/ROADMAP.md` (local commands, known issues, upstream PR plan), `docs/TESTING.md` (artifact testing), `docs/REVIEW.md` (audit). Prefer these over guessing, and keep them in sync when behavior changes.

## Definition of done
- `tsx src/userplugins/tether/tests/engine.test.ts` passes (18 tests), and `testTsc` + eslint pass for `src/userplugins/tether`.
- New rules/logic live in `src/engine.ts` with tests; every timer/listener added in `start()` is cleared in `stop()`.
- `CHANGELOG.md` gets an `## [Unreleased]` entry for user-visible changes.
- Generated artifacts stay outside the repo; releases publish to `PipettingBeaver/Tether` only, via explicit `-R` (never another repo's page).
- Follow the global `code-standards` skill (hardcoding ladder, two hats, small changes).
