"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.merge = merge;
exports.apply = apply;
exports.sign = sign;
function merge(a, b) {
    const out = { ...a };
    for (const k of Object.keys(b)) {
        if (!out[k] || b[k].ts > out[k].ts) {
            out[k] = b[k];
        }
    }
    return out;
}
function apply(lww, key, value) {
    lww[key] = { value, ts: Date.now() };
    return lww;
}
function sign(log) {
    return { ...log, sig: 'dev' };
}
