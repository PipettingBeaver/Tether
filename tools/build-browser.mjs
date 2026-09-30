#!/usr/bin/env node
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(process.argv.find(arg => arg.startsWith("--out="))?.split("=")[1] ?? join(HERE, "..", "..", "Tether-Testing"));
const vencordArg = process.argv.find(arg => arg.startsWith("--vencord="))?.split("=")[1];
const VENCORD_DIR = resolve(vencordArg ?? process.env.VENCORD_DIR ?? join(homedir(), "PipettingBeaver_Github", "Vencord"));
const PNPM = process.env.PNPM ?? "pnpm";

if (!existsSync(join(VENCORD_DIR, "src", "userplugins", "tether", "index.tsx"))) {
    console.error(`Tether was not found in ${VENCORD_DIR}. Pass --vencord=/path/to/Vencord`);
    process.exit(1);
}

function run(command, args, cwd) {
    const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
    if (result.status !== 0) throw new Error(`${command} exited with code ${result.status}`);
}

console.log("Building the browser userscript...");
run(PNPM, ["-C", VENCORD_DIR, "buildWeb", "--skip-extension"], process.cwd());

const LATEST_URL = "https://github.com/PipettingBeaver/Tether/releases/latest/download/Vencord-with-Tether.user.js";

const metadata = [
    [/^\/\/ @name\s+.*/m, "// @name            Vencord + Tether (unofficial)"],
    [/^\/\/ @description\s+.*/m, "// @description     Unofficial Vencord beta build with Tether included"],
    [/^\/\/ @author\s+.*/m, "// @author          Vendicated and contributors; Tether bundle by tan"],
    [/^\/\/ @namespace\s+.*/m, "// @namespace       tether-unofficial"],
    [/^\/\/ @supportURL\s+.*/m, `// @supportURL      https://github.com/PipettingBeaver/Tether\n// @downloadURL     ${LATEST_URL}\n// @updateURL       ${LATEST_URL}`]
];

let userscript = readFileSync(join(VENCORD_DIR, "dist", "Vencord.user.js"), "utf8");
for (const [pattern, replacement] of metadata) userscript = userscript.replace(pattern, replacement);

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "Vencord-with-Tether.user.js"), userscript);

console.log("");
console.log("Ready to hand out:");
console.log(`  ${join(OUT, "Vencord-with-Tether.user.js")}`);
console.log("");
console.log("Install with ViolentMonkey on Chrome, Edge, Opera, or Safari,");
console.log("or Tampermonkey on Firefox. Firefox plus ViolentMonkey needs its Bypass CSP option.");
