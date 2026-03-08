"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.entry = entry;
const crypto_1 = require("crypto");
function entry(evt, prev) {
    const now = Date.now();
    const data = JSON.stringify({ evt, now });
    const hash = (0, crypto_1.sha256)(prev + data);
    return { now, hash, data };
}
