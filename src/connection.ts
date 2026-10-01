import WebSocket from "ws";

export enum ConnectionStatus {
    WAITING = "WAITING",
    CONNECTED = "CONNECTED",
    DISCONNECTED = "DISCONNECTED",
    CONNECTING = "CONNECTING",
}
export type ServerEvent = { type: string; text?: string; message?: string };
let socket: WebSocket | null = null;
let messageHandler: ((data: ServerEvent) => void) | null = null;
let status = ConnectionStatus.DISCONNECTED;
export const getStatus = () => status;
export const getSocket = () => socket;
export function setMessageHandler(handler: ((data: ServerEvent) => void) | null) {
    messageHandler = handler;
}
export function connect(roomId: string, url = "wss://ws.orzchat.com:443") {
    disconnect();
    status = ConnectionStatus.CONNECTING;
    const current = new WebSocket(url, { handshakeTimeout: 10000, maxPayload: 1024 * 1024 });
    socket = current;
    current.on("open", () => {
        if (socket !== current) return;
        status = ConnectionStatus.WAITING;
        sendMessage({ type: "join", room_id: roomId });
    });
    current.on("message", (raw) => {
        if (socket !== current) return;
        let data: ServerEvent;
        try {
            data = JSON.parse(raw.toString());
            if (!data || typeof data.type !== "string") return;
            if (data.type === "message" && typeof data.text !== "string") return;
            if (data.message !== undefined && typeof data.message !== "string") return;
        } catch { return; }
        if (data.type === "waiting") status = ConnectionStatus.WAITING;
        if (data.type === "matched") status = ConnectionStatus.CONNECTED;
        if (data.type === "partner_disconnected") status = ConnectionStatus.DISCONNECTED;
        messageHandler?.(data);
    });
    current.on("close", () => {
        if (socket !== current) return;
        socket = null;
        status = ConnectionStatus.DISCONNECTED;
        messageHandler?.({ type: "connection_closed" });
    });
    // ws emits close after an error; handle recovery once, in the close listener.
    current.on("error", () => {});
}
export function sendMessage(payload: object): boolean {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(payload));
    return true;
}
export const isSocketOpen = () => socket?.readyState === WebSocket.OPEN;
export function disconnect() {
    const previous = socket;
    socket = null;
    status = ConnectionStatus.DISCONNECTED;
    if (previous) previous.terminate();
}
