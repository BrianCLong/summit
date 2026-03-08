"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashBytes = hashBytes;
const node_crypto_1 = require("node:crypto");
function hashBytes(input) {
    return (0, node_crypto_1.createHash)('sha256').update(input).digest('hex');
}
