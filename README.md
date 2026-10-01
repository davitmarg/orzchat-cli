# OrzChat CLI

Chat anonymously with random partners on [OrzChat](https://orzchat.com) from your terminal. Requires **Node.js 20 or newer** and an interactive terminal on macOS, Linux, or Windows.

```sh
npm install -g orzchat-cli
orzchat
```

Or run without a global installation:

```sh
npx orzchat-cli@latest
```

Join a specific room with `orzchat room-name`. A leading `/` is optional.

## Chat commands

- `/next`: leave the current chat and find a new partner in the same room.
- `/help`: show available commands.
- `/exit` or `/quit`: quit. Ctrl+C and Ctrl+D also exit.
- After a partner leaves, press Enter to start another chat.

Use the arrow keys, Home/End, and Backspace to edit messages. Incoming messages preserve your draft and cursor, including wrapped input. Unexpected connection failures retry every five seconds; `/next` retries immediately. Partner departures wait for you to start another chat.

## Updates and options

At startup, the CLI checks the public npm registry for a newer stable version and displays the update command when one is available. The check times out after 1.5 seconds and silently ignores network errors. It sends no chat content or room information.

```sh
npm install -g orzchat-cli@latest
orzchat --no-update-check
orzchat --version
orzchat --help
```

Set `ORZCHAT_NO_UPDATE_CHECK=1` to disable update checks persistently. Versions before 0.2.0 do not include the notifier and need one manual update first.

For local development, use `orzchat --server ws://localhost:8765`. The default server is `wss://ws.orzchat.com:443`.

## Development

```sh
npm ci
npm test
npm run dev -- --no-update-check
# Optional terminal integration test on macOS/Linux:
python3 test/pty-smoke.py
```

`npm test` compiles TypeScript and runs regression tests. `npm pack` and `npm publish` run these checks automatically. Published packages contain compiled JavaScript and package documentation.
