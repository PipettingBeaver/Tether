#!/usr/bin/env node
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const OUT = resolve(process.argv.find(arg => arg.startsWith("--out="))?.split("=")[1] ?? join(HERE, "..", "..", "Tether-Testing"));
const BUILD = join(tmpdir(), "tether-testing-build");
const EXCLUDED = new Set([".git", "tools", "node_modules", "dist"]);

function copyRepo(destination) {
    rmSync(destination, { recursive: true, force: true });
    mkdirSync(destination, { recursive: true });
    cpSync(ROOT, destination, {
        recursive: true,
        filter: source => !EXCLUDED.has(basename(source))
    });
}

function writeLaunchers(stage, platform) {
    if (platform === "windows") {
        writeFileSync(join(stage, "Windows - Start Here.bat"), '@echo off\r\ncall "%~dp0install\\Tether-Installer.bat" %*\r\n');
        writeFileSync(join(stage, "READ ME FIRST.txt"), [
            "Tether - Friend Beta Testing Version",
            "",
            "1. Quit Discord completely, including the icon near the clock.",
            "2. Double click \"Windows - Start Here.bat\".",
            "3. If Windows shows a blue warning, click More info, then Run anyway.",
            "4. If Node.js is missing, the installer downloads it once on its own.",
            "5. Follow the prompts in the window. It tells you when it is done.",
            "6. Open Discord, then Settings, Vencord, Plugins, and check Tether.",
            "",
            "To undo, run \"Windows - Start Here.bat\" and choose uninstall,",
            "or run: install\\Tether-Installer.bat --uninstall",
            "",
            "Client mods are not officially supported by Discord.",
            "This is an unofficial Vencord build made for Tether, not supported by the Vencord team.",
            "Tether reads timestamps only and sends nothing anywhere.",
            ""
        ].join("\r\n"));
        return;
    }

    if (platform === "macos") {
        const launcher = join(stage, "Mac - Start Here.command");
        writeFileSync(launcher, [
            "#!/bin/bash",
            'cd "$(dirname "$0")"',
            'if ! command -v node >/dev/null 2>&1; then',
            '    echo "Node.js 20 or newer is needed. Install it from https://nodejs.org and run this again."',
            '    read -r -p "Press Enter to close."',
            "    exit 1",
            "fi",
            'node install/index.mjs "$@"',
            'read -r -p "Press Enter to close."',
            ""
        ].join("\n"));
        chmodSync(launcher, 0o755);

        writeFileSync(join(stage, "READ ME FIRST.txt"), [
            "Tether - Friend Beta Testing Version",
            "",
            "1. Quit Discord or Vesktop completely.",
            "2. Double click \"Mac - Start Here.command\".",
            "3. If macOS blocks it, right click the file, choose Open, then Open again.",
            "4. Node.js 20 or newer is required. Get it from https://nodejs.org if prompted.",
            "5. Follow the prompts. It tells you when it is done.",
            "6. Open Discord or Vesktop, then Settings, Vencord, Plugins, and check Tether.",
            "",
            "To undo: run \"Mac - Start Here.command\" and choose uninstall.",
            "",
            "Client mods are not officially supported by Discord.",
            "This is an unofficial Vencord build made for Tether, not supported by the Vencord team.",
            "Tether reads timestamps only and sends nothing anywhere.",
            ""
        ].join("\n"));
        return;
    }

    const launcher = join(stage, "Linux - Start Here.sh");
    writeFileSync(launcher, '#!/bin/bash\ncd "$(dirname "$0")"\nbash install/tether-installer.sh "$@"\n');
    chmodSync(launcher, 0o755);

    writeFileSync(join(stage, "READ ME FIRST.txt"), [
        "Tether - Friend Beta Testing Version",
        "",
        "1. Quit Vesktop or Discord completely.",
        "2. Run \"Linux - Start Here.sh\". Right click it and pick Run in Terminal,",
        "   or from a terminal: bash \"Linux - Start Here.sh\"",
        "3. Follow the prompts. It tells you when it is done.",
        "4. Open Vesktop or Discord, then Settings, Vencord, Plugins, and check Tether.",
        "",
        "To undo: bash \"Linux - Start Here.sh\" --uninstall",
        "",
        "Client mods are not officially supported by Discord.",
        "This is an unofficial Vencord build made for Tether, not supported by the Vencord team.",
        "Tether reads timestamps only and sends nothing anywhere.",
        ""
    ].join("\n"));
}

function createZip(stage, outFile) {
    rmSync(outFile, { force: true });
    const result = spawnSync("python3", ["-m", "zipfile", "-c", outFile, stage], { stdio: "inherit" });
    if (result.status !== 0) throw new Error("Could not create the Windows zip. Is python3 installed?");
}

function createTar(stage, outFile) {
    rmSync(outFile, { force: true });
    const result = spawnSync("tar", ["-czf", outFile, "-C", dirname(stage), basename(stage)], { stdio: "inherit" });
    if (result.status !== 0) throw new Error("Could not create the Linux archive");
}

function main() {
    mkdirSync(OUT, { recursive: true });
    mkdirSync(BUILD, { recursive: true });

    const winStage = join(BUILD, "Tether Testing (Windows)");
    const linuxStage = join(BUILD, "Tether Testing (Linux)");
    const macStage = join(BUILD, "Tether Testing (macOS)");

    console.log("Staging the Windows package...");
    copyRepo(winStage);
    writeLaunchers(winStage, "windows");

    console.log("Staging the Linux package...");
    copyRepo(linuxStage);
    writeLaunchers(linuxStage, "linux");

    console.log("Staging the macOS package...");
    copyRepo(macStage);
    writeLaunchers(macStage, "macos");

    console.log("Creating archives...");
    const zip = join(OUT, "Tether-Testing-Windows.zip");
    const tar = join(OUT, "Tether-Testing-Linux.tar.gz");
    const macTar = join(OUT, "Tether-Testing-macOS.tar.gz");
    createZip(winStage, zip);
    createTar(linuxStage, tar);
    createTar(macStage, macTar);

    rmSync(BUILD, { recursive: true, force: true });

    console.log("");
    console.log("Ready to hand out:");
    console.log(`  ${zip}`);
    console.log(`  ${tar}`);
    console.log(`  ${macTar}`);
}

main();
