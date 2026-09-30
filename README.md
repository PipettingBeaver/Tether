# Tether

> **The current version is for testing only! Please reach out to me (Tan) for support if you're trying it!**

Tether is a small Discord add-on for people who are bad at keeping in touch. It notices when you haven't talked to a friend in a while and gives you a gentle nudge. From there you can message them, delay the reminder for a few days, or untether them so Tether stops asking.

It only looks at when you last exchanged a message with each friend. It never reads what you said, and nothing about your friends leaves your computer.

## Install

These are beta builds. Expect rough edges, and please tell me what breaks.

### Windows

1. Download `Tether-Testing-Windows.zip` from the [Releases page](https://github.com/PipettingBeaver/Tether/releases).
2. Quit Discord or Vesktop completely, including the icon near the clock.
3. Extract the zip, then double click "Windows - Start Here.bat". If Windows shows a blue warning, choose More info, then Run anyway.
4. Follow the prompts. When it finishes, Tether is already turned on.

### macOS

1. Download `Tether-Testing-macOS.tar.gz` from the Releases page.
2. Quit Discord or Vesktop completely.
3. Extract it, then double click "Mac - Start Here.command". If macOS blocks it, right click the file, choose Open, then Open again.
4. Node.js 20 or newer is required. The launcher points you to it if it is missing.

### Linux

1. Download `Tether-Testing-Linux.tar.gz` from the Releases page.
2. Quit Vesktop or Discord completely.
3. Extract it, then run `bash "Linux - Start Here.sh"`, or right click the file and choose Run in Terminal.

### Browser

1. Install ViolentMonkey on Chrome, Edge, Opera, or Safari. On Firefox use Tampermonkey, since ViolentMonkey needs its newer "Bypass CSP in Firefox" option there and that combination is less tested.
2. If you already use Vencord in your browser, remove or disable it first. Two copies will fight.
3. Install the userscript from this link, or paste the link into your manager's install-from-URL feature:

https://github.com/PipettingBeaver/Tether/releases/latest/download/Vencord-with-Tether.user.js

4. Reload the Discord tab. Tether is on by default.

That link always points at the newest beta, and the userscript tells your manager to check for updates, so you only install it once.

After a big Discord update, rerun the launcher (or reinstall the userscript) if something stops working. Discord ships new code often and the add-on has to be rebuilt against it.

## Using it

- When someone drifts past your threshold, a notification appears in the corner. Click it to open their chat.
- The knot icon in the chat bar opens the list at any time.
- `/tether` does the same thing.
- **Delay Tether** silences someone for a few days. **Untether** stops asking about them. **Forget** hides them from the untethered list as well.
- The first time you run it, a short welcome screen lets you choose who Tether watches.

## Filling in your history

Discord only shares your most recent conversations with any app. Tether fills in the rest gradually, a few friends at a time in the background, and remembers everyone it has checked. With hundreds of friends it can take a day before everyone is covered.

## Questions

**Is this safe?** Tether reads your friend list and when each conversation was last active. It never reads message contents. Its notes and settings stay on your computer.

**Why does it install Vencord?** Tether is a plugin for Vencord, a client mod, so it ships inside a Vencord build. You do not need to install Vencord yourself.

**Is it official?** No. This is an unofficial Vencord build made for Tether, and it is not supported by the Vencord team.

**How do I undo it?** Run the same launcher and choose uninstall, or remove the userscript from your manager.

**Where is the source?** Everything is in this repository, under GPL-3.0-or-later.

## For developers

Architecture, review notes, roadmap, and the testing guide are in `ARCHITECTURE.md`, `REVIEW.md`, `ROADMAP.md`, and `TestingVersion/README-TESTING.md`.
