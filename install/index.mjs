#!/usr/bin/env node
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const VENCORD_TARBALL = "https://codeload.github.com/Vencord/Vencord/tar.gz/refs/heads/main";
const PLUGIN_NAME = "tether";
const SOURCE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKIPPED_SOURCES = new Set([".git", "install", "node_modules", "tsconfig.json", "update-vencord.sh"]);

const args = process.argv.slice(2);
const isHelp = args.includes("--help") || args.includes("-h");
const isUpdate = args.includes("--update");
const isUninstall = args.includes("--uninstall");
const skipPrompts = args.includes("--yes");
const targetArg = args.find(arg => arg.startsWith("--target="))?.split("=")[1];
const requestedTarget = ["vesktop", "discord", "both"].includes(targetArg) ? targetArg : "auto";
const dataDirArg = args.find(arg => arg.startsWith("--data-dir="))?.split("=")[1];

function dataRoot() {
    if (dataDirArg) return resolve(dataDirArg);

    if (process.platform === "win32") {
        return join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "Tether");
    }

    if (process.platform === "darwin") {
        return join(homedir(), "Library", "Application Support", "Tether");
    }

    return join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "tether");
}

const DATA_DIR = dataRoot();
const VENCORD_DIR = join(DATA_DIR, "vencord");
const PLUGIN_DIR = join(VENCORD_DIR, "src", "userplugins", PLUGIN_NAME);
const DIST_DIR = join(VENCORD_DIR, "dist");
const DIST_FILES = ["vencordDesktopMain.js", "vencordDesktopPreload.js", "vencordDesktopRenderer.js", "vencordDesktopRenderer.css"];

function vesktopStateCandidates() {
    const home = homedir();

    if (process.platform === "win32") {
        const appData = process.env.APPDATA ?? join(home, "AppData", "Roaming");
        return [join(appData, "vesktop", "state.json"), join(appData, "Vesktop", "state.json")];
    }

    if (process.platform === "darwin") {
        return [
            join(home, "Library", "Application Support", "vesktop", "state.json"),
            join(home, "Library", "Application Support", "Vesktop", "state.json")
        ];
    }

    return [
        join(process.env.XDG_CONFIG_HOME ?? join(home, ".config"), "vesktop", "state.json"),
        join(home, ".var", "app", "dev.vencord.Vesktop", "config", "vesktop", "state.json")
    ];
}

function findVesktopState() {
    const candidates = vesktopStateCandidates();
    return candidates.find(path => existsSync(path)) ?? candidates.find(path => existsSync(dirname(path))) ?? null;
}

function hasVesktop() {
    return findVesktopState() != null;
}

function hasDiscord() {
    const home = homedir();

    if (process.platform === "win32") {
        const local = process.env.LOCALAPPDATA ?? join(home, "AppData", "Local");
        return ["Discord", "DiscordPTB", "DiscordCanary"].some(name => existsSync(join(local, name)));
    }

    if (process.platform === "darwin") {
        return ["Discord.app", "Discord PTB.app", "Discord Canary.app"].some(name => existsSync(join("/Applications", name)));
    }

    return ["/opt/discord", "/usr/share/discord", "/opt/Discord"].some(path => existsSync(path));
}

function quoteWindowsArg(arg) {
    return /[\s"]/.test(arg) ? `"${arg.replaceAll('"', '\\"')}"` : arg;
}

function run(command, commandArgs, cwd) {
    const finalArgs = process.platform === "win32" ? commandArgs.map(quoteWindowsArg) : commandArgs;

    const result = spawnSync(command, finalArgs, {
        cwd,
        stdio: "inherit",
        shell: process.platform === "win32"
    });

    if (result.status !== 0) throw new Error(`${command} exited with code ${result.status}`);
}

function capture(command, commandArgs) {
    const finalArgs = process.platform === "win32" ? commandArgs.map(quoteWindowsArg) : commandArgs;

    const result = spawnSync(command, finalArgs, {
        encoding: "utf8",
        shell: process.platform === "win32"
    });

    return result.status === 0 ? (result.stdout ?? "") : null;
}

function isProcessRunning(windowsName, unixPattern) {
    if (process.platform === "win32") {
        const output = capture("tasklist", []);
        return output?.toLowerCase().includes(windowsName.toLowerCase()) ?? false;
    }

    const result = spawnSync("pgrep", ["-if", unixPattern], { encoding: "utf8" });
    return result.status === 0;
}

function isVesktopRunning() {
    return isProcessRunning("Vesktop.exe", "vesktop");
}

function isDiscordRunning() {
    return isProcessRunning("Discord.exe", "discord");
}

async function question(message) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolveQuestion => rl.question(message, resolveQuestion));
    rl.close();
    return answer;
}

async function waitForEnter(message) {
    await question(message);
}

async function chooseTarget() {
    const vesktop = hasVesktop();
    const discord = hasDiscord();

    console.log("Detected on this computer:");
    console.log(`  [${vesktop ? "x" : " "}] Vesktop`);
    console.log(`  [${discord ? "x" : " "}] Official Discord app`);
    console.log("");

    if (requestedTarget !== "auto") return requestedTarget;

    if (vesktop && discord) {
        const answer = (await question("Install Tether for which one? 1 = Vesktop, 2 = Discord, 3 = both: ")).trim();
        if (answer === "1") return "vesktop";
        if (answer === "3") return "both";
        return "discord";
    }

    if (vesktop) return "vesktop";
    if (discord) return "discord";

    console.log("Tether needs Discord or Vesktop, and neither was found.");
    console.log("");
    console.log("Discord: https://discord.com/download");
    console.log("Vesktop: https://vesktop.dev");
    console.log("");
    console.log("Install one of them, open it once, close it, and run this again.");
    return null;
}

function describePlan(target) {
    const plan = [`Download Vencord and build it with Tether inside ${DATA_DIR}`];

    if (target === "vesktop" || target === "both") {
        plan.push("Point Vesktop at the new build");
        if (process.platform === "linux") plan.push("On a Flatpak install, allow Vesktop to read that folder");
    }

    if (target === "discord" || target === "both") {
        plan.push("Patch the official Discord app, which can be undone with --uninstall");
    }

    return plan;
}

async function confirm(message) {
    if (skipPrompts || process.stdin.isTTY !== true) return true;

    const answer = (await question(message)).trim().toLowerCase();
    return answer === "" || answer === "y" || answer === "yes";
}

async function ensureClosed(target) {
    const running = [];
    if ((target === "vesktop" || target === "both") && isVesktopRunning()) running.push("Vesktop");
    if ((target === "discord" || target === "both") && isDiscordRunning()) running.push("Discord");

    if (running.length === 0) return;

    console.log(`${running.join(" and ")} running. Quit completely, including any tray icon, so the install is not overwritten.`);
    await waitForEnter("Press Enter once closed. ");
}

function checkTools() {
    if (Number(process.versions.node.split(".")[0]) < 20) {
        throw new Error("Node.js 20 or newer is required. Get it from https://nodejs.org");
    }

    if (capture("npx", ["--version"]) == null) {
        throw new Error("npx was not found. It comes with Node.js, so reinstall Node from https://nodejs.org");
    }

    if (capture("tar", ["--version"]) == null) {
        throw new Error("The tar command is required. It ships with Windows 10 and later, macOS, and Linux");
    }
}

async function syncVencord() {
    console.log("Downloading Vencord...");

    const response = await fetch(VENCORD_TARBALL);
    if (!response.ok) throw new Error(`Could not download Vencord: ${response.status} ${response.statusText}`);

    mkdirSync(DATA_DIR, { recursive: true });

    const archive = join(DATA_DIR, "vencord.tar.gz");
    writeFileSync(archive, Buffer.from(await response.arrayBuffer()));

    rmSync(VENCORD_DIR, { recursive: true, force: true });
    mkdirSync(VENCORD_DIR, { recursive: true });

    run("tar", ["-xzf", archive, "-C", VENCORD_DIR, "--strip-components=1"]);
    rmSync(archive, { force: true });
}

function copyPlugin() {
    console.log("Copying Tether into the checkout...");
    rmSync(PLUGIN_DIR, { recursive: true, force: true });
    mkdirSync(PLUGIN_DIR, { recursive: true });
    cpSync(SOURCE_DIR, PLUGIN_DIR, {
        recursive: true,
        filter: source => !SKIPPED_SOURCES.has(basename(source))
    });
}

function readPnpmVersion() {
    try {
        const pkg = JSON.parse(readFileSync(join(VENCORD_DIR, "package.json"), "utf8"));
        const pinned = String(pkg.packageManager ?? "").replace(/^pnpm@/, "").split("+")[0];
        return pinned || "latest";
    } catch {
        return "latest";
    }
}

function buildVencord() {
    console.log("Installing build dependencies...");

    const pnpm = readPnpmVersion();
    const pnpmArgs = ["--yes", pnpm === "latest" ? "pnpm@latest" : `pnpm@${pnpm}`];

    run("npx", [...pnpmArgs, "install", "--frozen-lockfile"], VENCORD_DIR);

    console.log("Building Vencord with Tether...");
    run("npx", [...pnpmArgs, "build"], VENCORD_DIR);
}

function verifyBuild() {
    const missing = DIST_FILES.filter(file => !existsSync(join(DIST_DIR, file)));
    if (missing.length) throw new Error(`The build is missing: ${missing.join(", ")}`);
}

function configureVesktop() {
    const statePath = findVesktopState();
    if (statePath == null) {
        console.log("Vesktop settings were not found. Set Vencord Location to this folder by hand:");
        console.log(DIST_DIR);
        return;
    }

    const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {};
    state.vencordDir = DIST_DIR;
    writeFileSync(statePath, JSON.stringify(state, null, 4));
    console.log(`Told Vesktop to load Vencord from ${DIST_DIR}`);
}

function configureFlatpak() {
    if (process.platform !== "linux") return;
    if (capture("flatpak", ["--version"]) == null) return;

    const user = spawnSync("flatpak", ["info", "--user", "dev.vencord.Vesktop"], { encoding: "utf8" });
    const system = spawnSync("flatpak", ["info", "--system", "dev.vencord.Vesktop"], { encoding: "utf8" });
    if (user.status !== 0 && system.status !== 0) return;

    run("flatpak", ["override", "--user", "dev.vencord.Vesktop", `--filesystem=${VENCORD_DIR}`]);
    console.log("Allowed the Vesktop sandbox to read the Vencord folder.");
}

function injectDiscord() {
    console.log("Injecting the custom build into Discord...");
    run("node", ["scripts/runInstaller.mjs", "--", "--install"], VENCORD_DIR);
}

function uninjectDiscord() {
    console.log("Removing Vencord from Discord...");
    run("node", ["scripts/runInstaller.mjs", "--", "--uninstall"], VENCORD_DIR);
}

function uninstallDiscord() {
    if (!existsSync(join(VENCORD_DIR, "scripts", "runInstaller.mjs"))) return;
    uninjectDiscord();
}

function uninstallVesktop() {
    const statePath = findVesktopState();
    if (statePath != null && existsSync(statePath)) {
        const state = JSON.parse(readFileSync(statePath, "utf8"));
        delete state.vencordDir;
        writeFileSync(statePath, JSON.stringify(state, null, 4));
        console.log("Removed the custom Vencord location from Vesktop.");
    }

    if (process.platform === "linux" && capture("flatpak", ["--version"]) != null) {
        spawnSync("flatpak", ["override", "--user", "dev.vencord.Vesktop", `--nofilesystem=${VENCORD_DIR}`], { encoding: "utf8" });
    }
}

function printHelp() {
    console.log(`
Tether installer

  node install/index.mjs                       install or repair
  node install/index.mjs --update              rebuild with the latest Vencord and Tether
  node install/index.mjs --uninstall           undo the install
  node install/index.mjs --target=vesktop      only Vesktop
  node install/index.mjs --target=discord      only the official Discord app
  node install/index.mjs --target=both         both
  node install/index.mjs --yes                 skip the questions
  node install/index.mjs --data-dir=PATH       keep everything in PATH instead of the default location

Without a target, the installer detects what is installed and asks if both are found.

What it does:
  1. Downloads Vencord into ${DATA_DIR}
  2. Copies Tether into the checkout
  3. Builds Vencord with Tether inside
  4. Vesktop: points Vesktop at the build
     Discord: injects the build with Vencord's own installer

Quit Vesktop or Discord before running this so the install is not overwritten.
Node.js 20 or newer must already be installed, or use the launcher in this folder.
`);
}

async function install() {
    console.log("");
    console.log("================================================");
    console.log("   Tether - Friend Beta Testing Version!");
    console.log("================================================");
    console.log("");

    const target = await chooseTarget();
    if (target == null) return;

    console.log("Tether runs inside Vencord, a client mod.");
    console.log("You do not need to install Vencord yourself; this installer brings it along.");
    console.log("");
    console.log(isUpdate ? "This will update Tether:" : "This will install Tether:");
    for (const line of describePlan(target)) console.log(`  - ${line}`);
    console.log("");

    if (!await confirm("Continue? (Y/n) ")) {
        console.log("Nothing was changed.");
        return;
    }

    console.log("");
    await ensureClosed(target);
    checkTools();
    syncVencord();
    copyPlugin();
    buildVencord();
    verifyBuild();

    if (target === "vesktop" || target === "both") {
        configureVesktop();
        configureFlatpak();
    }

    if (target === "discord" || target === "both") {
        injectDiscord();
    }

    console.log("");
    console.log("All done!");
    console.log("");
    console.log("Next steps:");
    console.log(`  1. Open ${target === "vesktop" ? "Vesktop" : "Discord"}`);
    console.log("  2. Go to Settings, Vencord, Plugins");
    console.log("  3. Turn on Tether");

    if (target === "discord" || target === "both") {
        console.log("");
        console.log("Discord updates replace the patch. Run this installer with --update afterwards.");
    }
}

async function main() {
    if (isHelp) {
        printHelp();
        return;
    }

    if (isUninstall) {
        const target = requestedTarget === "auto" ? "both" : requestedTarget;

        if (target === "vesktop" || target === "both") uninstallVesktop();
        if (target === "discord" || target === "both") uninstallDiscord();

        console.log("Restart the app you patched. The checkout is still at:");
        console.log(VENCORD_DIR);
        return;
    }

    await install();
}

main().catch(error => {
    console.error("");
    console.error(`Installer stopped: ${error.message}`);
    process.exit(1);
});
