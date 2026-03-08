"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SseEmitter = exports.formatSseEvent = void 0;
const formatSseEvent = (event) => {
    const lines = [`event: ${event.event}`];
    if (event.id) {
        lines.push(`id: ${event.id}`);
    }
    event.data
        .split('\n')
        .forEach((line) => lines.push(`data: ${line}`));
    lines.push('');
    return `${lines.join('\n')}\n`;
};
exports.formatSseEvent = formatSseEvent;
class SseEmitter {
    writable;
    maxBytesPerEvent;
    constructor(writable, maxBytesPerEvent = 16_384) {
        this.writable = writable;
        this.maxBytesPerEvent = maxBytesPerEvent;
    }
    async send(event) {
        const payload = (0, exports.formatSseEvent)(event);
        const size = Buffer.byteLength(payload, 'utf-8');
        if (size > this.maxBytesPerEvent) {
            throw new Error('SSE event exceeds max bytes per event');
        }
        if (!this.writable.write(payload)) {
            await new Promise((resolve) => {
                this.writable.once('drain', () => resolve());
            });
        }
    }
}
exports.SseEmitter = SseEmitter;
