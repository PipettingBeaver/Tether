# Testing guide

> **Testing only. Reach out to Tan for support if you are trying this.**

Every path here produces an unofficial Vencord build made for Tether. It is not affiliated with or supported by the Vencord team.

Four artifacts are built for testers. Attach them to a GitHub release rather than committing them, and the release page becomes the download link to share.

- `Tether-Testing/Tether-Testing-Windows.zip`
- `Tether-Testing/Tether-Testing-Linux.tar.gz`
- `Tether-Testing/Tether-Testing-macOS.tar.gz`
- `Tether-Testing/Vencord-with-Tether.user.js`

Rebuild the desktop packages after changes with:

```sh
node TestingVersion/build-testing.mjs
```

Rebuild the browser userscript with:

```sh
node TestingVersion/build-browser.mjs
```

Keep the generated files outside the repository. When they are inside it, Vencord's typecheck and linter scan the minified userscript and fail.

Each desktop package contains the Tether source, the installer, a `READ ME FIRST.txt`, and a one-click launcher.

## What the tester sees

1. Desktop: they open the package, quit Discord or Vesktop, and double click the launcher.
2. The installer prints what it detected, explains what it will change, and asks to continue.
3. It downloads Vencord, builds it with Tether inside, and installs it, which takes a few minutes.
4. They open the app and find Tether already enabled under Settings, Vencord, Plugins.

## Testing on Windows

A real Windows machine is the only meaningful test for the injection path. Options:

- A friend willing to test. This is the highest value because it also tests the SmartScreen and Node bootstrap experience.
- A VM (GNOME Boxes, Quickemu, or Hyper-V) with a throwaway Windows install.

Checklist for the tester:

- Does SmartScreen appear, and does More info, then Run anyway work?
- Does the portable Node download succeed without any manual install?
- Does the consent screen show the right detected app and a clear list of changes?
- Does the build finish, and does Vencord appear in Discord afterwards?
- Is Tether enabled by default under Settings, Vencord, Plugins, and can it be toggled off and on?
- Do the chat bar knot button and the `/tether` command open the list?
- After a Discord update, does `--update` restore Vencord?

## Testing on Linux

Do not test in your own user account first, since the installer repoints Vesktop's Vencord location, which would disturb your development setup. Use one of these instead:

- A second local user account. Vesktop stores its state per user and the Flatpak override is per user, so everything is isolated.
- A VM with a fresh Fedora or Ubuntu.

Useful safe run for a partial test without touching Vesktop's settings:

```sh
node install/index.mjs --target=vesktop --data-dir=/tmp/tether-test --yes
```

That builds everything under `/tmp/tether-test`, though it still writes the Vencord location into Vesktop's state. Undo with:

```sh
node install/index.mjs --uninstall
```

## Testing in the browser

Use `Tether-Testing/Vencord-with-Tether.user.js`. Tether is enabled by default, so a fresh install is active on the first page load.

1. Install ViolentMonkey on Chrome, Edge, Opera, or Safari, or Tampermonkey on Firefox. On Firefox, ViolentMonkey needs its newer "Bypass CSP in Firefox" option; Tampermonkey is the tested path.
2. Remove or disable any existing official Vencord userscript or extension first. Two Vencords will fight.
3. Open the file to install it, then open `https://discord.com/app`.

Checklist:

- Does the knot button appear in the chat bar, and does `/tether` open the list?
- Do browser notifications work, and does clicking the toast open the person's chat?
- Does the backfill progress number climb over time?
- Does the untethered list, the onboarding modal, and the settings page all look right?

Caveats to pass along: browser storage is separate from the desktop app, there is no auto updater, so reinstalling after each rebuild is required, and if Tether is toggled off and back on, the tab may need a reload before the chat button reappears.

## Testing on macOS

Use `Tether-Testing-macOS.tar.gz`. It needs Node.js 20 or newer, so the launcher prints a link if it is missing.

- Double click "Mac - Start Here.command". If macOS blocks it, right click, choose Open, then Open again.
- Everything else matches the Windows and Linux flow.

## What to collect from testers

- Operating system and version.
- Which app: Discord stable, PTB, canary, or Vesktop.
- Screenshots of any error text in the installer window.
- Console output from Ctrl+Shift+I in the app, specifically lines starting with `Tether`.
- Whether the backfill progress number in Tether's settings goes up over time.
- Whether a chat opened through Tether's Message button stays open while scrolling.

## Known gaps

- macOS support is new and untested.
- The backfill still pauses while a Tether-opened chat is on screen.
- The Windows Node bootstrap depends on nodejs.org being reachable.
