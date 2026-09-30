# Tether roadmap

Status: working local plugin, not yet upstreamed. Last updated 2026-09-25.

## What works today

- Vencord plugin running via Vesktop with a custom Vencord build loaded from `~/PipettingBeaver_Github/Vencord/dist`.
- Friend manager in settings: search, per-friend toggle, status per friend, bot / ignored / blocked exclusions, coverage and sync diagnostics, "Sync with Discord" button.
- List modes, default Whitelist only:
    - Whitelist only: nobody is nudged unless switched on in the list.
    - Everyone except friends you switch off.
    - Recent friends only: messaged inside the recent window (default 21 days).
    - Recent and old friends: messaged inside the old friends window (default 1095 days, about 3 years).
- One-time onboarding modal on first run: explains the background checks and the chat window button, lets the user pick the list mode with slide toggles, and for Whitelist opens a friend picker on the spot, so the list can be chosen before leaving onboarding.
- Settings screen opens with an intro and the list mode choices (whitelist, everyone, recent, recent and old), then the friend list. Setting labels describe what they control.
- Message buttons navigate straight to the stored 1:1 channel and fall back to Discord's own create DM endpoint, instead of Vencord's `openPrivateChannel` wrapper, which created an empty group in the current client build.
- Startup delay (default 1 minute) before the first check, and settings changes reschedule checks instead of firing immediately, so nothing pops while you are in a menu.
- Manual checks from two places: the Tether icon in the chat bar next to the message box, and the /tether command. The friend list marks friends with no known history and offers an Open button to teach Tether their real timestamp with one click.
- Gradual backfill: friends with no known history are probed one at a time at a configurable rate (30 per hour by default). Each probe asks Discord for the conversation, records what it finds, marks empty conversations as checked so they are never re-probed, and closes the channel right after so the sidebar does not fill up. 0 turns it off.
- Check-in flow: one friend per notification, daily cap (default 3), notification cooldown (default 6 hours). The modal offers Message, Delay Tether (3 days by default), Untether, and Forget on untethered friends, plus Refresh Tethers to re-pull live data and Delay everyone. Acting on someone pulls the next waiting friend into view. The corner toast opens the named friend's chat with one click. Opening the list marks its entries as seen so the automatic check does not immediately repeat the same friends. Clicking a notification opens the modal pinned to the friend it named.
- DM timestamp learning: channel store overlay on every read, live updates from the message event, on-demand refresh when opening the list or messaging someone through the modal, cached DM list from Discord (6 hour TTL, forced refresh at most once a minute), and every observed channel is persisted locally. Only 1:1 DMs count; group DMs, channels with an owner, and channels whose recipient is the current user are ignored.
- Privacy: timestamps only, no message contents, no third party, state in local IndexedDB keyed per account.
- Tests: 17 unit tests for the engine. `pnpm testTsc` and ESLint clean.

## Known issues

1. Coverage limit. Discord exposes roughly the most recent 128 DM channels. Older conversations appear only after opening or searching them. This is a platform limitation, not a bug, but it means "No known messages" can be wrong for friends whose DM has not been loaded. Mitigations in place: persistent learning, sync status line. Complete fix would be a Discord data package importer.
2. REST sync unverified. The status line shows `Last sync returned N DM channels` and `Last error: ...`. Confirm whether the call works at all in Vesktop. If it always returns 0 or errors, investigate `RestAPI.get` usage, then either fix or delete the REST path and rely on the store plus learning.
3. Placeholder author. `index.tsx` uses `{ name: "tan", id: BigInt(0) }`. Needs a real Discord ID before any public release or PR.
4. Notification surfaces. A check produces an OS notification plus a top notice. The toast is deliberately not permanent: `permanent: true` blocks Vencord's notification queue until dismissed, which can silence every later notification. Consider consolidating to one surface.
5. Manual learning does not scale. Opening a DM one by one is fine for dozens, painful for hundreds. A per-row "Open DM" button in the friend manager would make learning one click instead of a search.
6. Build workflow footguns. Piping `pnpm build` through `tail` hides a nonzero exit and can leave a stale `dist` that Vesktop happily loads. Always capture the exit code. There is also a pnpm version warning (Vencord pins 11.9.0, local is 12.6.0); harmless but noisy.
7. Unverified fallbacks. `dmTimes.ts` has several channel-store fallbacks (`getSortedPrivateChannels`, `getDMUserIds` + `getDMChannelFromUserId`). Once the real method is confirmed, delete the dead paths.
8. Existing installs keep their stored list mode. Changing the default to Whitelist only affects fresh installs; pick Whitelist once by hand if needed.

## Future work

- Discord data package importer: user exports their data, Tether reads `messages.json` and `channel.json` to build a complete one-time timestamp map. Only complete solution to the coverage limit.
- Quiet hours: no notifications between set times.
- Group DMs support.
- Per-friend custom thresholds.
- "Open DM" button in the friend manager to teach Tether a conversation in one click.

## Upstream PR plan

Constraints from Vencord's CONTRIBUTING and plugin rules:

- Source lives in `src/plugins/tether/` in a fork. The external repo plus symlink layout exists only for local development.
- Delete `tsconfig.json` from the plugin; the alias hack is only needed because the plugin is outside the Vencord tree.
- Remove `update-vencord.sh`, README absolute paths, and other local-only tooling from the PR.
- Add the author to `Devs` in `src/utils/constants.ts` with a real Discord ID, and reference it in `authors`.
- Tests: Vencord has no test runner. Keep `tests/` out of the PR, or convert to a script that is not part of `pnpm test`. Decide before submitting.
- Rules check: no new dependencies (ok), React and components from Vencord (ok), no DOM manipulation (ok), no selfbot or API spam (the DM list call is one request every 6 hours, but be ready to justify it), no niche plugins (the main acceptance risk).
- AI policy: contributions must be majority human written, and the PR description and all communication must be human written. Plan for a rewrite and review pass before submitting.
- Add `searchTerms` and review all setting descriptions for clarity.

## Local commands

```sh
# rebuild after edits
pnpm -C ~/PipettingBeaver_Github/Vencord build

# tests
pnpm -C ~/PipettingBeaver_Github/Vencord exec tsx src/userplugins/tether/tests/engine.test.ts

# typecheck and lint
pnpm -C ~/PipettingBeaver_Github/Vencord testTsc
pnpm -C ~/PipettingBeaver_Github/Vencord exec eslint src/userplugins/tether

# update Vencord core (then restart Vesktop)
~/PipettingBeaver_Github/Tether/tools/update-vencord.sh
```

Vesktop must be fully restarted (tray quit) to load a new build.
