# Tether release review

Last updated 2026-09-28. Covers accessibility, lifecycle and memory, edge cases, and the path to a public GitHub release and a Vencord pull request.

## Health summary

- Strict TypeScript, ESLint clean, 18 unit tests on the pure engine, no runtime dependencies, no DOM manipulation, no hardcoded colors.
- Clean separation: `engine.ts` is pure, `state.ts` owns persistence, `dmTimes.ts` owns Discord reads, UI modules are thin.
- Timers and listeners are paired: every `setInterval`, `setTimeout`, and settings listener created in `start()` is cleared in `stop()`.
- The two known rough edges are documented below: accessible names on the friend rows, and runtime caches not being cleared on account switch.

## Memory and lifecycle audit

| Item | Where | Status |
| --- | --- | --- |
| `checkTimer`, `firstCheckTimer`, `onboardingTimer`, `backfillTimer` | index, backfill | cleared in `stop()`, verified |
| Settings prefix listener | index | added in `start()`, removed in `stop()`, verified |
| Plugin flux handler (`MESSAGE_CREATE`) | index | managed by Vencord, unsubscribed on plugin stop |
| `useEffect` in the modal | modal | re-runs on queue refresh only, no subscription leak |
| `useSettings()` in the friend manager | FriendManager | subscription cleaned by the hook |
| `pendingSave` promise chain | state | single chain, resolves and is replaced, no growth |
| `baseTimes` | dmTimes | per account, bounded by friend count |
| `channelUsers` | dmTimes | grows with observed conversations, not cleared on account switch (finding) |
| `protectedChannels` | dmTimes | grows with Tether-opened chats, not cleared on account switch (finding) |
| Notification and notice queues | Vencord | shared, bounded, we only push when the notice queue is empty |

Finding: `channelUsers` and `protectedChannels` are process-wide, while state and the timestamp cache are per account. Channel ids are globally unique so cross-account collisions are not realistic, but the intended behavior is to reset both when the active account changes. Recommended fix: export `resetRuntimeCaches()` from `dmTimes.ts` and call it from `ensureStateLoaded()` when the user id changes.

## Edge cases

| Scenario | Current behavior | Notes |
| --- | --- | --- |
| Account switch or logout | state and timestamp cache are keyed per account and reloaded | runtime caches should be reset, see finding above |
| Friend removed while Tether is off | stale state entry remains | harmless, grows slowly; optional pruning |
| Bot, ignored, or blocked friend | excluded from the list entirely | verified in `friends.ts` |
| Group DM or self DM | ignored for timestamps | type, owner, and recipient guards in `dmTimes.ts` |
| Closed DM outside the 128 window | backfill probes it, records, closes it | paced, retried six hours after a failure |
| Probe fails repeatedly | `attemptedAt` marker, queue moves on, retried later | fixed stall bug |
| Channel opened through Tether | protected from backfill close, kept in store via `getDMChannel` | protects the reading experience |
| Probe while a Tether channel is on screen | backfill pauses | avoids store churn while reading |
| Rate limit or 429 | Vencord's RestAPI retries; failures surface in the status line | no custom retry logic |
| Very large friend list (600+) | paged reads are O(friends) per render, measured fine | memoization is a possible optimization |
| Settings with zero or negative values | clamped where needed: interval minimum, startup delay minimum, backfill minimum | delay of 0 means immediate |
| Clock or timezone change | timestamps are epoch based, and updates are monotonic so older values cannot overwrite newer ones | `countNudgedToday` uses local midnight |
| Discord restart mid-save | saves are serialized snapshots; last write wins | no partial state observed |
| Notification permission denied | falls back to the in-app toast and notice | native path only used when allowed |
| Vesktop flatpak and native notifications | native may silently fail in the sandbox | the in-app notice is the dependable surface |
| Onboarding shown once | flag set at display time, per account | bump the key only for QA |

## Accessibility

What is already good:

- Avatars use empty `alt`, so they are correctly treated as decorative.
- The chat bar button uses Vencord's `ChatBarButton` with a tooltip, and the icon has `role="img"` plus an `aria-label`.
- All actions in the modal are real buttons with text labels, and Discord's modal supplies focus handling and escape behavior.
- Colors come exclusively from Discord CSS variables (`--text-muted`, `--text-link`, `--background-modifier-accent`), so themes and contrast settings apply automatically.
- No custom animation, so no reduced motion concerns.

What to fix before release:

1. Friend rows: the toggle is a bare checkbox with no accessible name because the row is no longer a `FormSwitch` label. Add `aria-label={friend.name}` to the `Switch`, or wrap the row text and switch in a `label`.
2. Toast actions: the three actions are `span role="button" tabIndex={0}` with mouse handlers only. Add `onKeyDown` for Enter and Space, and keep the visible text as the label.
3. Scroll regions: the friend list and the untethered list are scrollable `div`s. Add an `aria-label` and `tabIndex={0}` so keyboard users can scroll them.
4. Status lines: they are long sentences read as a block. Acceptable, but consider splitting the two status paragraphs into a list for screen readers if you want to go further.

## Theme and visual consistency

- No hardcoded colors found by search; only CSS variables.
- Sizes and spacing are inline styles; the untethered list uses a fixed 128px window, which approximates three rows but does not scale with the user's font size. If that bothers you, cap by rendered row count instead.
- The plugin uses Vencord's Button, Switch, Modal, TextInput, and Paragraph throughout, so it looks native in both light and dark themes.

## Code practice notes

- Good: no `any`, no non-null assertions, small files, one responsibility per module, failure paths toast or log rather than failing silently, and the risky Discord action signatures are isolated in `dmTimes.ts`.
- Possible cleanups: memoize `getFriends()` per render in the modal (it is called three times), consider pruning state for ex-friends, and consider moving the diagnostics block behind a collapsed section before wide release.

## Before posting on GitHub

1. `git init` and an initial commit. The folder is not a repository yet.
2. Add a `LICENSE` file. Every source file already carries GPL-3.0-or-later headers, but the repository needs the license text.
3. Add a `.gitignore`. Done.
4. README: add screenshots, a short feature list, and all three install paths (installer for friends, Vesktop custom build by hand, and eventually upstream).
5. Local-only tooling lives in `tools/` now (`build-testing.mjs`, `build-browser.mjs`, `update-vencord.sh`), which keeps the repository root clean for visitors.
6. Tag a version and keep a short changelog.
7. Note in the README that the installer writes Vesktop's Vencord location, so quitting Vesktop first is required.

## Before a Vencord pull request

1. Read the current CONTRIBUTING guide again. Open a feature request first, since they reject niche plugins and this could be judged as one.
2. Move the source to `src/plugins/tether/` in a fork. Delete the plugin `tsconfig.json` and the local scripts from the PR.
3. Decide what to do with `tests/`: Vencord has no test runner, so either drop them from the PR or reduce them to a dev script.
4. Add yourself to `Devs` in `src/utils/constants.ts` with a real Discord ID and use it in `authors`. Add `searchTerms`.
5. Their rules: no new dependencies, components from Vencord, no DOM manipulation, no selfbot or API spam. The backfill makes one request every two minutes at the default rate and closes what it opens; be ready to justify it, and consider making the default 0 for upstream.
6. Their AI policy: contributions must be majority human written, and the PR description and all communication must be human written. The practical path is a full read-through and rewrite in your own structure, plus a written explanation of every module, before submitting. This document and the architecture diagram exist to make that review pass easier.

## Prioritized fixes

1. Clear runtime caches on account switch (`dmTimes`).
2. Accessible names and keyboard activation for friend rows and toast actions.
3. `aria-label` and keyboard focus for the two scroll regions.
4. Exclude local dev tooling from the public repo or document it.
5. Decide the upstream backfill default (0 versus 30 per hour).
