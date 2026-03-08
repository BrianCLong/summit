"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.YjsHandler = void 0;
// @ts-nocheck
const Y = __importStar(require("yjs"));
const syncProtocol = __importStar(require("y-protocols/sync"));
const awarenessProtocol = __importStar(require("y-protocols/awareness"));
const encoding = __importStar(require("lib0/encoding"));
const decoding = __importStar(require("lib0/decoding"));
const persistence_js_1 = require("./persistence.js");
const messageSync = 0;
const messageAwareness = 1;
class YjsHandler {
    docs = new Map();
    persistence;
    connections = new Map();
    wsDocMap = new Map();
    awareness = new Map();
    constructor(redis) {
        this.persistence = new persistence_js_1.RedisPersistence(redis);
    }
    async handleConnection(ws, docName) {
        const doc = await this.getDoc(docName);
        // Track connection
        if (!this.connections.has(docName)) {
            this.connections.set(docName, new Set());
        }
        this.connections.get(docName).add(ws);
        this.wsDocMap.set(ws, docName);
        // Initialize sync
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.writeSyncStep1(encoder, doc);
        this.send(ws, encoding.toUint8Array(encoder));
        // Initialize awareness
        const awareness = this.getAwareness(docName, doc);
        const awarenessStates = awareness.getStates();
        if (awarenessStates.size > 0) {
            const awarenessEncoder = encoding.createEncoder();
            encoding.writeVarUint(awarenessEncoder, messageAwareness);
            encoding.writeVarUint8Array(awarenessEncoder, awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStates.keys())));
            this.send(ws, encoding.toUint8Array(awarenessEncoder));
        }
    }
    async handleMessage(ws, message) {
        const docName = this.wsDocMap.get(ws);
        if (!docName)
            return;
        const doc = await this.getDoc(docName);
        const decoder = decoding.createDecoder(message);
        const messageType = decoding.readVarUint(decoder);
        switch (messageType) {
            case messageSync:
                const encoder = encoding.createEncoder();
                encoding.writeVarUint(encoder, messageSync);
                syncProtocol.readSyncMessage(decoder, encoder, doc, ws); // ws as transaction origin
                if (encoding.length(encoder) > 1) {
                    this.send(ws, encoding.toUint8Array(encoder));
                }
                break;
            case messageAwareness:
                const awareness = this.getAwareness(docName, doc);
                awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), ws);
                break;
        }
    }
    handleClose(ws) {
        const docName = this.wsDocMap.get(ws);
        if (docName) {
            const awareness = this.awareness.get(docName);
            if (awareness) {
                // Remove awareness state for this client if we mapped it (optional, usually client handles this on close but hard close might need cleanup)
                // y-websocket usually handles this by tracking clientID.
                // For simplicity, we rely on awareness timeout or explicit removal if we tracked clientID.
                // But here we don't know the clientID without more logic.
                // Standard y-websocket uses ping/pong to detect disconnects and clear awareness.
            }
            const conns = this.connections.get(docName);
            if (conns) {
                conns.delete(ws);
                if (conns.size === 0) {
                    // Optional: Cleanup doc from memory if no connections
                    // But we keep it for now for cache
                }
            }
            this.wsDocMap.delete(ws);
        }
    }
    async getDoc(docName) {
        if (this.docs.has(docName)) {
            return this.docs.get(docName);
        }
        const doc = new Y.Doc();
        doc.gc = true;
        // Bind persistence
        await this.persistence.bindState(docName, doc);
        // Setup updates propagation
        doc.on('update', (update, origin) => {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageSync);
            syncProtocol.writeUpdate(encoder, update);
            const message = encoding.toUint8Array(encoder);
            // Broadcast to all clients on this doc, except origin
            const clients = this.connections.get(docName);
            if (clients) {
                clients.forEach((client) => {
                    if (client !== origin) {
                        this.send(client, message);
                    }
                });
            }
        });
        this.docs.set(docName, doc);
        return doc;
    }
    getAwareness(docName, doc) {
        if (this.awareness.has(docName)) {
            return this.awareness.get(docName);
        }
        const awareness = new awarenessProtocol.Awareness(doc);
        awareness.on('update', ({ added, updated, removed }, origin) => {
            const changedClients = added.concat(updated).concat(removed);
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageAwareness);
            encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
            const message = encoding.toUint8Array(encoder);
            const clients = this.connections.get(docName);
            if (clients) {
                clients.forEach((client) => {
                    if (client !== origin) {
                        this.send(client, message);
                    }
                });
            }
        });
        this.awareness.set(docName, awareness);
        return awareness;
    }
    send(ws, message) {
        try {
            // uWebSockets.js expects ArrayBuffer or String, Uint8Array works if passed buffer
            // or we might need to cast/copy.
            // ws.send accepts TypedArray in many implementations, but uWS might be strict.
            // The safest is to send the buffer.
            ws.send(message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength), true); // true = binary
        }
        catch (e) {
            console.error('Failed to send message to client', e);
        }
    }
}
exports.YjsHandler = YjsHandler;
