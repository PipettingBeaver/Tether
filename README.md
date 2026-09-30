# Tether - Discord plugin for Staying in Touch

> **The current version is for testing only! Please reach out to me (Tan) for support if you're trying it!**

Tether is a small Discord add-on to help keep in touch. It notices when you haven't talked to a friend in a while and gives you a gentle nudge, with options to message them, delay the reminder, or untether them.

<img width="500" alt="Tether friend check-in UI" src="https://github.com/user-attachments/assets/f5ddf87e-3671-46bc-b65f-ca161b195aeb" />

## Install

These are beta builds. Expect rough edges, and please tell me what breaks.
Works for Vencord and Vesktop. Does NOT currently work for BetterDiscord.
In the plugin list for Vencord, this is how Tether appears:

<img width="300" alt="Tether enable plugin UI" src="https://github.com/user-attachments/assets/5c911e27-5a8b-44c1-a4ee-956ff00ac626" />

## a) Windows

1. Download `Tether-Testing-Windows.zip` from the [Releases page](https://github.com/PipettingBeaver/Tether/releases).
2. Quit Discord, Vencord, or Vesktop completely, including the icon near the clock.
3. Extract the zip, then double click "Windows - Start Here.bat". If Windows shows a blue warning, choose More info, then Run anyway.
4. Follow the prompts. When it finishes, Tether is already turned on.

## b) macOS

1. Download `Tether-Testing-macOS.tar.gz` from the [Releases page](https://github.com/PipettingBeaver/Tether/releases).
2. Quit Discord, Vencord, or Vesktop completely.
3. Extract it, then double click "Mac - Start Here.command". If macOS blocks it, right click the file, choose Open, then Open again.
4. Node.js 20 or newer is required. The launcher points you to it if it is missing.

## c) Linux

1. Download `Tether-Testing-Linux.tar.gz` from the [Releases page](https://github.com/PipettingBeaver/Tether/releases).
2. Quit Discord, Vencord, or Vesktop completely.
3. Extract it, then run `bash "Linux - Start Here.sh"`, or right click the file and choose Run in Terminal.

## d) Browser (Web-based Discord)

1. Install a userscript manager (Such as ViolentMonkey on [Chrome](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag) or [Firefox](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/)).
   - if using ViolentMonkey for Firefox, in Settings enable "Bypass CSP in Firefox" since Tether does not work without it.
2. If you already use Vencord in your browser, remove or disable it first (Tether currently comes with a bundled unofficial Vencord, as Vencord is required as a framework). 
3. Install the userscript from [this link](https://github.com/PipettingBeaver/Tether/releases/latest/download/Vencord-with-Tether.user.js), or paste the link into your manager's install-from-URL feature:
4. Reload the Discord tab. Tether is on by default.

After a big Discord update, rerun the launcher (or reinstall the userscript) if something stops working. Discord ships new code often and the add-on may have to be rebuilt against it.

## Using Tether

- As someone drifts (e.g., haven't spoken to in over 14 days), a notification for Tether appears as a floating and top bar button.
- The knot icon in the chat bar also opens the list at any time as a manual option.
<img width="300" alt="Screenshot_20260926_042845" src="https://github.com/user-attachments/assets/196f5e7a-e25e-4b18-8e94-3c705229c539" />

- `/tether` written in chat does the same thing as the manual chat button.
- **Delay Tether** silences someone for a few days. **Untether** stops asking about them. **Forget** hides them from the untethered list for future (to confirm against accidental untethering).
- The first time you run it, a short welcome screen lets you choose who Tether watches.

#### Filling in your history

Discord only shares your most recent conversations with any plugin via API calls. Therefore, for more than 128 friends, Tether fills in the rest gradually with API calls intermittently, what this means is a few friends at a time in the background, and remembering via local history. Therefore, it may take a day before everyone is covered if you've been using Discord for a while and have 500+ friends added.

## Questions

- **Is Tether safe?** Tether doesn't do anything with your data! Tether sends API calls from your machine, to your machine, to read your friend list and when each conversation was last active. It never reads message contents. API calls happen intermittently to avoid bot warnings. Everything it remembers (friend ids and last-message timestamps, never message text) is stored locally in Discord's own storage on your machine, and nothing is sent anywhere except Discord's own API.

- **What do I do if I found a bug?** Please reach out to me (either Github or on Discord) with a bug report! Use `ctrl+shift+i` to bring up the Console, and please send contents of the "Tether" related warning messages.

- **Why does it install / require Vencord?** Tether is a written as a plugin for Vencord, a client and framework mod of Discord, so it ships inside a Vencord build. You do not need to install Vencord yourself.

- **Is Tether official?** No. Tether and Vencord are both unofficial modifications of Discord. As for Vencord, Tether ships with an *unofficial* Vencord build made for Tether, and it is NOT supported by the Vencord team.

- **Does Tether break Discord's rules?** Client mods are not officially supported by Discord, so any client mod is used at the user's own risk. Tether adds no automation and never messages anyone for you; it only reads the timestamps Discord already shows you and reminds you to reach out.

- **How do I remove Tether?** Run the same launcher and choose uninstall, or remove the userscript from your manager. Tether's local memory lives in Discord's own client storage and can also be cleared through Discord's clear-data options.

- **Is this open-source?** Everything is in this repository, under GPL-3.0-or-later. The installers and the userscript bundle an unofficial build of Vencord, which is also GPL-3.0-or-later; the build scripts here show the exact changes, and Vencord's source lives at [github.com/Vencord/Vencord](https://github.com/Vencord/Vencord).

## For curious developers

Architecture, review notes, roadmap, and the testing guide are in `docs/ARCHITECTURE.md`, `docs/REVIEW.md`, `docs/ROADMAP.md`, and `docs/TESTING.md`.
