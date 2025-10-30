#!/usr/bin/env node

import { Command } from "commander";
import { startChat } from "./chat.js";
import chalk from "chalk";

const program = new Command();

program
    .name("orzchat")
    .description("Instant CLI chat connecting to orzchat.com")
    .version("0.1.0")
    .action(() => {
        printStartMessage();
        startChat();
    });

program.parse();

function printStartMessage() {
    const message = `                                                        
  ▄▄▄▄                         ▄▄▄  █               ▄   
 ▄▀  ▀▄  ▄ ▄▄  ▄▄▄▄▄         ▄▀   ▀ █ ▄▄    ▄▄▄   ▄▄█▄▄ 
 █    █  █▀  ▀    ▄▀         █      █▀  █  ▀   █    █   
 █    █  █      ▄▀           █      █   █  ▄▀▀▀█    █   
  █▄▄█   █     █▄▄▄▄          ▀▄▄▄▀ █   █  ▀▄▄▀█    ▀▄▄ 
                                                        
                                                        `;
    console.log(chalk.green(message));

    // print that powered by orzchat.com so that it will be a link
    console.log(
        chalk.gray("Powered by ") +
            chalk.blue.underline("https://orzchat.com") +
            chalk.gray(" | speak to a random stranger\n")
    );
}
