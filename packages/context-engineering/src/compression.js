"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressItemIfNeeded = compressItemIfNeeded;
exports.extractiveCompress = extractiveCompress;
const token_js_1 = require("./token.js");
const PRESERVE_LABELS = new Set(['intent', 'commitment', 'pinned', 'policy']);
function compressItemIfNeeded(item, policy) {
    if (!policy.compressionThreshold) {
        return item;
    }
    if (item.policyLabels?.some(label => PRESERVE_LABELS.has(label))) {
        return item;
    }
    if (item.tokenCost <= policy.compressionThreshold) {
        return item;
    }
    const content = typeof item.content === 'string'
        ? item.content
        : JSON.stringify(item.content, null, 2);
    const compressed = extractiveCompress(content, policy.compressionThreshold);
    return {
        ...item,
        content: compressed,
        compressionState: 'extractive',
        tokenCost: (0, token_js_1.estimateTokens)(compressed),
    };
}
function extractiveCompress(text, maxTokens) {
    if (!text)
        return '';
    const sentences = text.split(/(?<=[.!?])\s+/);
    let output = '';
    for (const sentence of sentences) {
        const candidate = output ? `${output} ${sentence}` : sentence;
        if ((0, token_js_1.estimateTokens)(candidate) > maxTokens) {
            break;
        }
        output = candidate;
    }
    if (!output) {
        return (0, token_js_1.truncateToTokenLimit)(text, maxTokens);
    }
    return output;
}
