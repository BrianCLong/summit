"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordProvenance = recordProvenance;
exports.onProvenance = onProvenance;
exports.hashObject = hashObject;
exports.signPrompt = signPrompt;
const crypto_1 = require("crypto");
const listeners = new Set();
function recordProvenance(record) {
    const now = new Date();
    const complete = {
        ...record,
        time: record.time ?? { start: now.toISOString(), end: now.toISOString() },
        inputHash: record.inputHash || hashObject(''),
        outputHash: record.outputHash || hashObject(''),
        policy: record.policy || {
            retention: 'standard-365d',
            purpose: 'engineering',
        },
    };
    for (const l of listeners) {
        try {
            l(complete);
        }
        catch (err) {
            if (process.env.NODE_ENV !== 'test') {
                console.warn('provenance-listener-error', err);
            }
        }
    }
}
function onProvenance(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
function hashObject(obj) {
    const h = (0, crypto_1.createHash)('sha256');
    const serialized = typeof obj === 'string' ? obj : JSON.stringify(obj ?? {});
    h.update(serialized);
    return `sha256:${h.digest('hex')}`;
}
function signPrompt(prompt, modelId) {
    return hashObject(`${modelId}:${prompt}`);
}
