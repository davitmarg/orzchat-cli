#!/usr/bin/env node
import { Command, InvalidArgumentError } from "commander";
import { readFileSync } from "node:fs";
import chalk from "chalk";
import { startChat } from "./chat.js";
import { checkForUpdate } from "./update.js";
import { safeText } from "./terminal.js";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const program = new Command();
program.name("orzchat")
    .description("Instant anonymous terminal chat on orzchat.com")
    .version(version)
    .argument("[room]", "Room ID to join", "")
    .option("--no-update-check", "Skip the npm update check")
    .option("--server <url>", "WebSocket server URL", (value) => {
        try {
            const url = new URL(value);
            if ((url.protocol === "ws:" || url.protocol === "wss:") && !url.hash) return value;
        } catch {}
        throw new InvalidArgumentError("Use a ws:// or wss:// URL.");
    }, "wss://ws.orzchat.com:443")
    .action(async (roomArg: string, options) => {
        if (!process.stdin.isTTY || !process.stdout.isTTY) {
            console.error("OrzChat needs an interactive terminal. Run orzchat directly in your terminal.");
            process.exitCode = 1;
            return;
        }
        const room = safeText(roomArg).trim().replace(/^\/+/, "");
        console.log(chalk.green.bold(`\nOrzChat ${version}`));
        console.log(`https://orzchat.com | Room: ${room || "default"}\n`);
        if (options.updateCheck && !process.env.ORZCHAT_NO_UPDATE_CHECK) {
            const notice = await checkForUpdate(version);
            if (notice) console.log(chalk.yellow(notice) + "\n");
        }
        startChat(room, options.server);
    });
await program.parseAsync();
