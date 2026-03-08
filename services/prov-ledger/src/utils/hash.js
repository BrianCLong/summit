"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalJSON = canonicalJSON;
exports.calculateHash = calculateHash;
// @ts-nocheck
const crypto_1 = __importDefault(require("crypto"));
function canonicalJSON(obj) {
    if (obj === undefined) {
        return 'undefined';
    }
    if (obj === null) {
        return 'null';
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(item => canonicalJSON(item)).join(',') + ']';
    }
    if (typeof obj === 'object') {
        const keys = Object.keys(obj).sort();
        return '{' + keys.map(key => {
            const val = obj[key];
            return JSON.stringify(key) + ':' + canonicalJSON(val);
        }).join(',') + '}';
    }
    return JSON.stringify(obj);
}
function calculateHash(data) {
    return crypto_1.default.createHash('sha256').update(canonicalJSON(data)).digest('hex');
}
