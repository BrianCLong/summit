"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketJsonRpcClientTransport = void 0;
const ws_1 = __importDefault(require("ws"));
const DEFAULT_CONNECT_TIMEOUT_MS = 10000;
function resolveDeadlineTimeout(options) {
    if (!options?.deadline) {
        return null;
    }
    if (options.deadline.timeoutMs) {
        return options.deadline.timeoutMs;
    }
    if (options.deadline.deadline) {
        const diff = options.deadline.deadline.getTime() - Date.now();
        return Math.max(diff, 0);
    }
    return null;
}
function mergeHeaders(authToken, metadata) {
    const headers = {};
    if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }
    if (metadata) {
        for (const [key, value] of Object.entries(metadata)) {
            if (key.toLowerCase() === 'authorization') {
                continue;
            }
            headers[key] = value;
        }
    }
    return headers;
}
class WebSocketJsonRpcClientTransport {
    config;
    socket;
    messageHandler;
    closeHandler;
    errorHandler;
    constructor(config) {
        this.config = config;
    }
    async connect(options) {
        const timeoutMs = resolveDeadlineTimeout(options) ?? DEFAULT_CONNECT_TIMEOUT_MS;
        const headers = mergeHeaders(this.config.authToken, options?.metadata);
        await new Promise((resolve, reject) => {
            const socket = new ws_1.default(this.config.url, { headers });
            this.socket = socket;
            let settled = false;
            const timeout = setTimeout(() => {
                if (settled) {
                    return;
                }
                settled = true;
                socket.close();
                reject(new Error('MCP transport connect timed out'));
            }, timeoutMs);
            socket.once('open', () => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timeout);
                this.bindHandlers();
                resolve();
            });
            socket.once('error', (error) => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timeout);
                reject(error);
            });
        });
    }
    recv(handler) {
        this.messageHandler = handler;
        if (this.socket) {
            this.socket.removeAllListeners('message');
            this.socket.on('message', (data) => this.handleMessage(data));
        }
    }
    async send(payload, _options) {
        if (!this.socket || this.socket.readyState !== ws_1.default.OPEN) {
            throw new Error('MCP transport socket is not open');
        }
        await new Promise((resolve, reject) => {
            this.socket?.send(JSON.stringify(payload), (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }
    async close() {
        if (this.socket) {
            this.socket.close();
        }
    }
    onClose(handler) {
        this.closeHandler = handler;
        if (this.socket) {
            this.socket.on('close', (code, reason) => {
                handler({ code, reason: reason.toString() });
            });
        }
    }
    onError(handler) {
        this.errorHandler = handler;
        if (this.socket) {
            this.socket.on('error', handler);
        }
    }
    bindHandlers() {
        if (!this.socket) {
            return;
        }
        if (this.messageHandler) {
            this.socket.on('message', (data) => this.handleMessage(data));
        }
        if (this.closeHandler) {
            this.socket.on('close', (code, reason) => {
                this.closeHandler?.({ code, reason: reason.toString() });
            });
        }
        if (this.errorHandler) {
            this.socket.on('error', this.errorHandler);
        }
    }
    handleMessage(data) {
        if (!this.messageHandler) {
            return;
        }
        try {
            const message = JSON.parse(data.toString());
            this.messageHandler({ payload: message, metadata: {} });
        }
        catch (error) {
            const handledError = error instanceof Error
                ? error
                : new Error('Failed to parse MCP message');
            this.errorHandler?.(handledError);
        }
    }
}
exports.WebSocketJsonRpcClientTransport = WebSocketJsonRpcClientTransport;
