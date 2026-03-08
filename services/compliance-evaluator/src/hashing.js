"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalJson = canonicalJson;
exports.sha256Hex = sha256Hex;
const node_crypto_1 = __importDefault(require("node:crypto"));
/**
 * Produce a canonical JSON representation with sorted keys.
 */
function canonicalJson(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
}
/**
 * SHA-256 hex digest of a string.
 */
function sha256Hex(input) {
    return node_crypto_1.default.createHash('sha256').update(input).digest('hex');
}
