# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Picking Whitelist in onboarding now opens the friend picker right away, and friends can be switched on by clicking the row as well as the switch.
- The onboarding button now reads "Choose friends (Whitelist)", the picker asks for at least one friend and keeps Done disabled until one is chosen, and onboarding explains that untethering keeps the automatic modes from locking you into the whole list.

### Fixed

- The friend picker now updates the onboarding count when it is closed with the X or Esc, not only with Done, and onboarding explains when the whitelist is still empty.
- Onboarding and the whitelist picker no longer trap users who have no friends to choose from: the picker can always be closed, and onboarding explains that Tether stays quiet until friends are picked.

## [0.1.0-beta.4] - 2026-09-30

### Added

- Whitelist friend picker in onboarding, with search, Select all, and Clear. The start button waits until at least one friend is chosen.

### Fixed

- The top notice now disappears when its friend is untethered, switched off in settings, or forgotten.
- Runtime caches now reset when the active account changes.
- Friend list switches have accessible names, and the friend, picker, and untethered lists can be reached with the keyboard.

### Security

- The Windows installer now verifies the downloaded Node.js package against nodejs.org's published SHA256 checksums.

## [0.1.0-beta.3] - 2026-09-30

### Fixed

- The installer now waits for the Vencord download to finish before building, which was the real cause of the `ERR_PNPM_NO_LOCKFILE` stop.
- The downloaded Vencord source has no Git metadata, so the installer now supplies version information directly and the build no longer needs Git.

## [0.1.0-beta.2] - 2026-09-30

### Fixed

- The Windows installer extracted Vencord's source to the wrong folder and stopped with `ERR_PNPM_NO_LOCKFILE`.

## [0.1.0-beta.1] - 2026-09-30

### Added

- First beta. Check-ins nudge you about friends you have not talked to in a while, one friend at a time, with a daily cap and a cooldown between nudges.
- Check-in modal with Message, Delay Tether, Untether, Delay everyone, and Refresh Tethers, plus an untethered list with Retether and Forget.
- List modes: only friends you choose (whitelist), everyone except friends you switch off, recent friends only, and recent plus old friends.
- First-run onboarding, and a friend manager in settings with search, per-friend switches, and coverage and sync diagnostics.
- DM timestamp learning from Discord's DM list and live messages, plus a paced background fill for friends outside the recent window that closes the channels it opens.
- Manual checks from the knot button in the chat bar and the `/tether` command.
- Timestamps only, never message contents. Everything is stored locally, per account.
- Windows, macOS, and Linux installers, and a browser userscript.

[unreleased]: https://github.com/PipettingBeaver/Tether/compare/v0.1.0-beta.4...HEAD
[0.1.0-beta.4]: https://github.com/PipettingBeaver/Tether/compare/v0.1.0-beta.3...v0.1.0-beta.4
[0.1.0-beta.3]: https://github.com/PipettingBeaver/Tether/compare/v0.1.0-beta.2...v0.1.0-beta.3
[0.1.0-beta.2]: https://github.com/PipettingBeaver/Tether/compare/v0.1.0-beta.1...v0.1.0-beta.2
[0.1.0-beta.1]: https://github.com/PipettingBeaver/Tether/releases/tag/v0.1.0-beta.1
