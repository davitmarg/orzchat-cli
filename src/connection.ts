import WebSocket from "ws";

export enum ConnectionStatus {
    WAITING = "WAITING",
    CONNECTED = "CONNECTED",
    DISCONNECTED = "DISCONNECTED",
    CONNECTING = "CONNECTING",
}

const PUBLIC_SIGNALING_SERVER_URL = "wss://ws.orzchat.com:443";

let socket: WebSocket | null = null;
let messageHandler: ((data: any) => void) | null = null;
let status: ConnectionStatus = ConnectionStatus.DISCONNECTED;

export function getStatus(): ConnectionStatus {
    return status;
}

export function getSocket(): WebSocket | null {
    return socket;
}

export function setMessageHandler(handler: (data: any) => void) {
    messageHandler = handler;
}

export function connect() {
    const url = PUBLIC_SIGNALING_SERVER_URL;

    if (socket) disconnect();

    status = ConnectionStatus.CONNECTING;
    socket = new WebSocket(url);

    socket.onopen = () => {
        status = ConnectionStatus.WAITING;
    };

    socket.onmessage = (event) => {
        if (!messageHandler) return;

        let data: any;
        if (typeof event.data === "string") {
            data = JSON.parse(event.data);
        } else if (event.data instanceof Buffer) {
            data = JSON.parse(event.data.toString("utf-8"));
        } else if (event.data instanceof ArrayBuffer) {
            data = JSON.parse(Buffer.from(event.data).toString("utf-8"));
        } else {
            return;
        }

        switch (data.type) {
            case "waiting":
                status = ConnectionStatus.WAITING;
                break;
            case "matched":
                status = ConnectionStatus.CONNECTED;
                break;
            case "partner_disconnected":
                status = ConnectionStatus.DISCONNECTED;
                break;
        }

        messageHandler(data);
    };

    socket.onclose = () => {
        status = ConnectionStatus.DISCONNECTED;
    };

    socket.onerror = () => {
        status = ConnectionStatus.DISCONNECTED;
    };
}

export function sendMessage(payload: any) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
    }
}

export function isSocketOpen(): boolean {
    const socket = getSocket();
    return socket !== null && socket.readyState === WebSocket.OPEN;
}

export function disconnect() {
    if (socket) {
        socket.close();
        socket = null;
        status = ConnectionStatus.DISCONNECTED;
    }
}
