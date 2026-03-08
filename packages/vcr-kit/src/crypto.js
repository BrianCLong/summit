"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.base64UrlEncode = base64UrlEncode;
exports.base64UrlDecode = base64UrlDecode;
exports.signEd25519 = signEd25519;
const ed25519_1 = require("@noble/ed25519");
function base64UrlEncode(data) {
    return Buffer.from(data)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}
function base64UrlDecode(value) {
    const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
    const normalized = padded.replace(/-/g, '+').replace(/_/g, '/');
    return new Uint8Array(Buffer.from(normalized, 'base64'));
}
async function signEd25519(message, secretKey) {
    return (0, ed25519_1.sign)(message, secretKey);
}
