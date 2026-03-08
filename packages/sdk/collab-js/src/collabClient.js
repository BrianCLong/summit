"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presenceReducer = exports.TextCRDT = exports.CollabClient = void 0;
const events_1 = require("events");
class CollabClient extends events_1.EventEmitter {
    ws;
    id;
    hb;
    connect(url, identity) {
        this.id = identity;
        this.ws = new WebSocket(url);
        this.ws.onopen = () => {
            this.send({ type: 'presence.join' });
            this.hb = setInterval(() => this.send({ type: 'heartbeat' }), 30000);
        };
        this.ws.onmessage = (ev) => {
            const msg = JSON.parse(ev.data.toString());
            this.emit(msg.type, msg);
        };
    }
    send(msg) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN)
            return;
        const eventId = msg.eventId || crypto.randomUUID();
        this.ws.send(JSON.stringify({ ...msg, ...this.id, eventId }));
    }
    updateSelection(entityId, selection) {
        this.send({ type: 'selection.update', entityId, selection });
    }
    addComment(entityId, text, commentId = crypto.randomUUID()) {
        this.send({ type: 'comment.add', entityId, commentId, text });
    }
    editComment(entityId, commentId, op) {
        this.send({ type: 'comment.edit', entityId, commentId, op });
    }
    typing(entityId) {
        this.send({ type: 'typing', entityId });
    }
}
exports.CollabClient = CollabClient;
var crdt_1 = require("./crdt");
Object.defineProperty(exports, "TextCRDT", { enumerable: true, get: function () { return crdt_1.TextCRDT; } });
var reducers_1 = require("./reducers");
Object.defineProperty(exports, "presenceReducer", { enumerable: true, get: function () { return reducers_1.presenceReducer; } });
