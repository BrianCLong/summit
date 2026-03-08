"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256Bytes = sha256Bytes;
exports.canonicalJson = canonicalJson;
const crypto_1 = require("crypto");
function sha256Bytes(buf) {
    return (0, crypto_1.createHash)("sha256").update(buf).digest("hex");
}
function canonicalJson(obj) {
    // Deterministic stringify: stable key ordering + no whitespace.
    const seen = new WeakSet();
    const normalize = (v) => {
        if (v && typeof v === "object") {
            if (seen.has(v))
                throw new Error("cycle");
            seen.add(v);
            if (Array.isArray(v))
                return v.map(normalize);
            return Object.keys(v).sort().reduce((acc, k) => {
                acc[k] = normalize(v[k]);
                return acc;
            }, {});
        }
        return v;
    };
    return Buffer.from(JSON.stringify(normalize(obj)));
}
