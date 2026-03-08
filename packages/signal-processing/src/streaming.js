"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalStreamingPipeline = void 0;
const events_1 = require("events");
const window_js_1 = require("./window.js");
class SignalStreamingPipeline extends events_1.EventEmitter {
    options;
    sockets = new Set();
    channels = new Set();
    constructor(options) {
        super();
        this.options = options;
    }
    attachWebSocket(socket) {
        this.sockets.add(socket);
        socket.onmessage = (event) => this.handleInbound(event.data);
    }
    attachDataChannel(channel) {
        this.channels.add(channel);
        channel.onmessage = (event) => this.handleInbound(event.data);
    }
    ingestFrame(data) {
        const frame = (0, window_js_1.normalizeFrame)(data, this.options.frameSize);
        const rawEvent = { type: 'raw', payload: frame, timestamp: Date.now() };
        this.emit('event', rawEvent);
        const results = this.options.processors.map((processor) => processor(frame));
        const processed = { frame, results };
        const processedEvent = { type: 'processed', payload: processed, timestamp: Date.now() };
        this.emit('event', processedEvent);
        this.broadcast(processed);
        return processed;
    }
    shutdown() {
        this.sockets.forEach((socket) => socket.close());
        this.channels.forEach((channel) => channel.close());
        this.sockets.clear();
        this.channels.clear();
    }
    handleInbound(data) {
        const frame = this.decodePayload(data);
        if (frame) {
            this.ingestFrame(frame);
        }
    }
    normalizeFrame(data) {
        return (0, window_js_1.normalizeFrame)(data, this.options.frameSize);
    }
    decodePayload(data) {
        try {
            if (typeof data === 'string') {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    return this.normalizeFrame(Float64Array.from(parsed));
                }
            }
            else if (data instanceof ArrayBuffer) {
                return this.normalizeFrame(new Float64Array(data));
            }
            else if (ArrayBuffer.isView(data)) {
                return this.normalizeFrame(new Float64Array(data.buffer));
            }
        }
        catch {
            // ignore malformed frames
        }
        return null;
    }
    broadcast(processed) {
        const payload = JSON.stringify({
            frame: Array.from(processed.frame),
            results: processed.results,
            sampleRate: this.options.sampleRate,
        });
        this.sockets.forEach((socket) => {
            if (socket.readyState === 1) {
                socket.send(payload);
            }
        });
        this.channels.forEach((channel) => {
            if (channel.readyState === 'open') {
                channel.send(payload);
            }
        });
    }
}
exports.SignalStreamingPipeline = SignalStreamingPipeline;
