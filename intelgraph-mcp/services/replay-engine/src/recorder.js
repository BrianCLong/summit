"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Recorder = void 0;
const crypto_1 = require("crypto");
class Recorder {
    start(sessionId, seed, meta) {
        return {
            id: `rec_${(0, crypto_1.randomUUID)()}`,
            sessionId,
            seed,
            events: [],
            version: '1',
            meta,
            startedAt: new Date().toISOString(),
        };
    }
    push(rec, ev) {
        const hashed = {
            ...ev,
            hash: hashPayload(ev.payload),
        };
        rec.events.push(hashed);
        return hashed;
    }
}
exports.Recorder = Recorder;
function hashPayload(payload) {
    const h = (0, crypto_1.createHash)('sha256');
    h.update(JSON.stringify(payload));
    return h.digest('hex');
}
