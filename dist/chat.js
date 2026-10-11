import readline from "node:readline";
import chalk from "chalk";
import { connect, sendMessage, setMessageHandler, getStatus, ConnectionStatus, disconnect } from "./connection.js";
import { safeText } from "./terminal.js";
export function startChat(roomId, server) {
    const output = process.stdout;
    const terminal = Boolean(process.stdin.isTTY && output.isTTY);
    const rl = readline.createInterface({ input: process.stdin, output, terminal, prompt: chalk.blue("> "), historySize: 0 });
    let closed = false;
    let partnerLeft = false;
    let retry;
    function log(message) {
        if (closed)
            return;
        const draft = rl.line;
        const cursor = rl.cursor;
        if (terminal) {
            // Clear through readline so its wrapped-row bookkeeping stays in sync.
            rl.write(null, { ctrl: true, name: "a" });
            rl.write(null, { ctrl: true, name: "k" });
            readline.cursorTo(output, 0);
            readline.clearScreenDown(output);
        }
        output.write(message + "\n");
        if (terminal) {
            rl.prompt();
            rl.write(draft);
            for (const _ of draft.slice(cursor))
                rl.write(null, { name: "left" });
        }
    }
    function logUserMessage(text) {
        const width = output.columns || 80;
        const chatWidth = Math.min(45, width - 2);
        const paddingLength = Math.max(0, chatWidth - text.length);
        if (terminal) {
            const promptLen = 2; // "> "
            const rows = Math.max(1, Math.ceil((promptLen + text.length) / width));
            readline.moveCursor(output, 0, -rows);
            readline.clearScreenDown(output);
        }
        output.write(" ".repeat(paddingLength) + chalk.white(text) + "\n");
    }
    function join() {
        clearTimeout(retry);
        partnerLeft = false;
        log(chalk.yellow("Connecting..."));
        connect(roomId, server);
    }
    function handleServerEvent(data) {
        switch (data.type) {
            case "waiting":
                log(chalk.yellow("Waiting for a chat partner..."));
                break;
            case "matched":
                log(chalk.green("Connected to a chat partner!"));
                break;
            case "partner_disconnected":
                partnerLeft = true;
                log(chalk.yellow("Partner disconnected. Press Enter or use /next to start a new chat."));
                break;
            case "connection_closed":
                if (!partnerLeft) {
                    log(chalk.yellow("Connection lost. Retrying in 5 seconds... (/next to retry now)"));
                    retry = setTimeout(join, 5000);
                }
                break;
            case "message":
                log(chalk.cyan(safeText(data.text)));
                break;
            case "error":
                log(chalk.red(safeText(data.message ?? "The server reported an error.")));
                break;
        }
    }
    rl.on("line", (line) => {
        if (closed)
            return;
        const text = safeText(line).trim();
        if (text === "/exit" || text === "/quit") {
            rl.close();
            return;
        }
        if (text === "/next" || (!text && partnerLeft)) {
            join();
            return;
        }
        if (text === "/help") {
            log("Commands: /next — new partner, /help — help, /exit — quit. Ctrl+C or Ctrl+D also exits.");
            return;
        }
        if (text.startsWith("/")) {
            log(chalk.yellow("Unknown command. Type /help for available commands."));
            return;
        }
        if (text) {
            if (getStatus() !== ConnectionStatus.CONNECTED || !sendMessage({ type: "message", text })) {
                log(chalk.yellow("Message not sent: no partner is connected. Use /next to find one."));
                return;
            }
            logUserMessage(text);
        }
        if (terminal)
            rl.prompt();
    });
    const onSignal = () => rl.close();
    rl.on("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);
    rl.once("close", () => {
        closed = true;
        clearTimeout(retry);
        setMessageHandler(null);
        disconnect();
        process.removeListener("SIGTERM", onSignal);
        output.write("\nGoodbye! Visit https://orzchat.com for more.\n");
    });
    setMessageHandler(handleServerEvent);
    log("Type /help for commands. Use /next to find a new partner.");
    join();
}
