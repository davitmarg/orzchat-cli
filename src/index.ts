#!/usr/bin/env node

import { Command } from "commander";
import { startChat } from "./chat.js";
import chalk from "chalk";

const program = new Command();

program
    .name("orzchat")
    .description("Instant CLI chat connecting to orzchat.com")
    .version("0.1.1")
    .argument("[room]", "Optional room ID to join")
    .action((roomArg) => {
        // Default to "/" if no argument is provided, then trim leading slashes
        let room = roomArg || "/";
        room = room.replace(/^\/+/, "");
        
        printStartMessage(room);
        startChat(room);
    });

program.parse();

function printStartMessage(room: string) {
    const message = `                                                        
  ▄▄▄▄                         ▄▄▄  █               ▄   
 ▄▀  ▀▄  ▄ ▄▄  ▄▄▄▄▄         ▄▀   ▀ █ ▄▄    ▄▄▄   ▄▄█▄▄ 
 █    █  █▀  ▀    ▄▀         █      █▀  █  ▀   █    █   
 █    █  █      ▄▀           █      █   █  ▄▀▀▀█    █   
  █▄▄█   █     █▄▄▄▄          ▀▄▄▄▀ █   █  ▀▄▄▀█    ▀▄▄ 
                                                        
                                                        `;
    console.log(chalk.green(message));

    const displayRoom = room === "" ? "default" : room;
    console.log(
        chalk.gray("Powered by ") +
            chalk.blue.underline("https://orzchat.com") +
            chalk.gray(` | speak to a random stranger in room: ${displayRoom}\n`)
    );
}