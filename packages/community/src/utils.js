"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sum = exports.scoreMatch = exports.normalizeText = exports.clamp = exports.createId = void 0;
const node_crypto_1 = require("node:crypto");
const createId = (prefix) => `${prefix}_${(0, node_crypto_1.randomUUID)()}`;
exports.createId = createId;
const clamp = (value, minimum, maximum) => {
    if (value < minimum) {
        return minimum;
    }
    if (value > maximum) {
        return maximum;
    }
    return value;
};
exports.clamp = clamp;
const normalizeText = (value) => value
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
exports.normalizeText = normalizeText;
const scoreMatch = (query, target) => {
    const normalizedQuery = (0, exports.normalizeText)(query);
    const normalizedTarget = (0, exports.normalizeText)(target);
    if (!normalizedQuery || !normalizedTarget) {
        return 0;
    }
    if (normalizedTarget.includes(normalizedQuery)) {
        return normalizedQuery.length / normalizedTarget.length;
    }
    let score = 0;
    for (const token of normalizedQuery.split(' ')) {
        if (normalizedTarget.includes(token)) {
            score += token.length / normalizedTarget.length;
        }
    }
    return score;
};
exports.scoreMatch = scoreMatch;
const sum = (values) => {
    let total = 0;
    for (const value of values) {
        total += value;
    }
    return total;
};
exports.sum = sum;
