export function isNewerVersion(latest: string, current: string): boolean {
    const pattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
    if (!pattern.test(latest) || !pattern.test(current)) return false;
    const a = latest.split(".").map(Number);
    const b = current.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
        if (a[i] !== b[i]) return a[i] > b[i];
    }
    return false;
}
export async function checkForUpdate(current: string, fetcher: typeof fetch = fetch): Promise<string | null> {
    try {
        const response = await fetcher("https://registry.npmjs.org/orzchat-cli/latest", {
            signal: AbortSignal.timeout(1500), headers: { accept: "application/json" },
        });
        if (!response.ok) return null;
        const data = await response.json() as { version?: unknown };
        if (typeof data.version !== "string" || !isNewerVersion(data.version, current)) return null;
        return `Update available: ${current} → ${data.version}. Run: npm install -g orzchat-cli@latest`;
    } catch { return null; }
}
