"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.hashJson = hashJson;
exports.hashFile = hashFile;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const canonicalize_js_1 = require("./canonicalize.js");
function sha256(data) {
    const hash = (0, node_crypto_1.createHash)('sha256');
    hash.update(data);
    return hash.digest('hex');
}
function hashJson(value) {
    return sha256(Buffer.from((0, canonicalize_js_1.canonicalString)(value), 'utf8'));
}
function hashFile(path) {
    return sha256((0, node_fs_1.readFileSync)(path));
}
