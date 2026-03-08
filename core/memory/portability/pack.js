"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pack = pack;
function pack(userId, contextSpace, memories) {
    if (process.env.MEMORY_PORTABILITY_ENABLED !== 'true') {
        throw new Error("Memory portability is currently disabled.");
    }
    const bundle = {
        version: "1.0",
        userId,
        contextSpace,
        memories,
        exportedAt: Date.now(),
        signature: "simulated-hmac-signature"
    };
    return bundle;
}
