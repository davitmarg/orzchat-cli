import readline from "readline";
import chalk from "chalk";
import { connect, sendMessage, setMessageHandler, getStatus, ConnectionStatus, getSocket, disconnect, } from "./connection.js";
export function startChat() {
    const width = process.stdout.columns;
    const CHAT_WIDTH = Math.min(60, width - 2);
    let connected = false;
    let inputBuffer = "";
    initializeConnection();
    const autoReconnect = setupAutoReconnect(() => {
        if (!connected && getStatus() !== ConnectionStatus.DISCONNECTED) {
            logSystem("🔄 Reconnecting...");
            initializeConnection();
        }
    });
    setupInputHandlers(() => {
        logSystem("👋 Goodbye!");
        cleanup(autoReconnect);
    });
    function initializeConnection() {
        connect();
        setMessageHandler(handleServerEvent);
    }
    function handleServerEvent(data) {
        clearPromptLine();
        switch (data.type) {
            case "waiting":
                connected = false;
                logSystem("⏳ Waiting for a chat partner...", "yellow");
                break;
            case "matched":
                connected = true;
                logSystem("💚 Connected to a chat partner!\n", "green");
                break;
            case "partner_disconnected":
                connected = false;
                logSystem("❌ Partner disconnected.", "red");
                promptReconnect();
                break;
            case "message":
                logPartnerMessage(data.text);
                break;
            default:
                logSystem(`⚠️ Unknown message type: ${data.type}`, "gray");
        }
        renderInput();
    }
    function promptReconnect() {
        process.stdout.write("Press Enter to start a new chat: ");
        process.stdin.once("data", (data) => {
            const answer = data.toString().trim();
            if (answer === "") {
                logSystem("🔄 Starting a new chat...", "blue");
                initializeConnection();
            }
            else {
                logSystem("👋 Goodbye!", "green");
                cleanup(autoReconnect);
            }
        });
    }
    function setupInputHandlers(onExit) {
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on("keypress", (str, key) => {
            if (key.sequence === "\r") {
                const message = inputBuffer.trim();
                if (message.toLowerCase() === "/exit") {
                    onExit();
                    return;
                }
                if (!connected) {
                    if (message.length > 0) {
                        logSystem("⚠️ Not connected yet!", "red");
                    }
                }
                else if (message.length > 0) {
                    sendMessage({ type: "message", text: message });
                    logUserMessage(message);
                }
                inputBuffer = "";
            }
            else if (key.name === "backspace") {
                inputBuffer = inputBuffer.slice(0, -1);
            }
            else if (!key.ctrl && !key.meta && key.sequence) {
                inputBuffer += key.sequence;
            }
            else if (key.ctrl && key.name === "c") {
                logSystem("\n👋 Exiting...", "green");
                onExit();
                return;
            }
            renderInput();
        });
        renderInput();
    }
    function renderInput() {
        clearPromptLine();
        if (inputBuffer.length === 0) {
            const placeholder = "Type here...";
            process.stdout.write(chalk.blue("> ") + chalk.gray(placeholder));
            readline.cursorTo(process.stdout, 2); // cursor at start
        }
        else {
            process.stdout.write(chalk.blue("> ") + chalk.white(inputBuffer));
            readline.cursorTo(process.stdout, inputBuffer.length + 2);
        }
    }
    function setupAutoReconnect(callback) {
        return setInterval(() => {
            const socket = getSocket();
            if (!socket || socket.readyState !== WebSocket.OPEN)
                callback();
        }, 5000);
    }
    function cleanup(interval) {
        clearInterval(interval);
        disconnect();
        process.exit(0);
    }
    function logSystem(message, color = "white") {
        clearPromptLine();
        console.log(chalk[color](message));
        renderInput();
    }
    function logUserMessage(text) {
        clearPromptLine();
        // Pad to the right so it doesn’t collide with user input
        const paddingLength = Math.max(0, CHAT_WIDTH - text.length);
        console.log(" ".repeat(paddingLength) + chalk.blue(text));
    }
    function logPartnerMessage(text) {
        clearPromptLine();
        const label = "💬";
        const line = label + " " + text;
        console.log(chalk.cyan(text));
    }
    function clearPromptLine() {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
    }
}
