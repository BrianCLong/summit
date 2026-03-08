"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSlug = createSlug;
exports.computeSha256 = computeSha256;
exports.splitIntoSentences = splitIntoSentences;
exports.limitWords = limitWords;
exports.unique = unique;
exports.ensureIsoDate = ensureIsoDate;
// @ts-nocheck
const node_crypto_1 = __importDefault(require("node:crypto"));
function createSlug(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}
function computeSha256(content) {
    return node_crypto_1.default.createHash('sha256').update(content, 'utf8').digest('hex');
}
function splitIntoSentences(text) {
    const sanitized = text
        .replace(/\s+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1. $2');
    return sanitized
        .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length > 0);
}
function limitWords(text, maxWords) {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) {
        return text.trim();
    }
    return `${words.slice(0, maxWords).join(' ')}…`;
}
function unique(values) {
    return Array.from(new Set(values));
}
function ensureIsoDate(input) {
    if (!input) {
        return '';
    }
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }
    return parsed.toISOString().split('T')[0];
}
