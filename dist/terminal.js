import { stripVTControlCharacters } from "node:util";
// Remote messages must never be allowed to move the cursor or set terminal titles.
export function safeText(text) {
    return stripVTControlCharacters(text.replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")).replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g, " ");
}
