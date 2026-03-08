"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultTokenEstimator = void 0;
exports.clampValue = clampValue;
exports.dotProduct = dotProduct;
exports.magnitude = magnitude;
exports.cosineSimilarity = cosineSimilarity;
function clampValue(value, min = 0, max = 1) {
    if (Number.isNaN(value)) {
        return min;
    }
    return Math.max(min, Math.min(max, value));
}
function dotProduct(a, b) {
    const length = Math.min(a.length, b.length);
    let total = 0;
    for (let index = 0; index < length; index += 1) {
        total += a[index] * b[index];
    }
    return total;
}
function magnitude(vector) {
    let total = 0;
    for (const value of vector) {
        total += value * value;
    }
    return Math.sqrt(total);
}
function cosineSimilarity(a, b) {
    if (a.length === 0 || b.length === 0) {
        return 0;
    }
    const denominator = magnitude(a) * magnitude(b);
    if (denominator === 0) {
        return 0;
    }
    return clampValue(dotProduct(a, b) / denominator, -1, 1);
}
const defaultTokenEstimator = text => text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
exports.defaultTokenEstimator = defaultTokenEstimator;
