"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adaptToolOutput = adaptToolOutput;
const token_js_1 = require("./token.js");
function selectFields(output, allowed) {
    if (!allowed.length)
        return output;
    return allowed.reduce((acc, key) => {
        if (Object.prototype.hasOwnProperty.call(output, key)) {
            acc[key] = output[key];
        }
        return acc;
    }, {});
}
function adaptToolOutput(output, policy) {
    let text = '';
    if (typeof output === 'string') {
        text = output;
    }
    else if (output && typeof output === 'object') {
        const filtered = policy.allowedFields && policy.allowedFields.length
            ? selectFields(output, policy.allowedFields)
            : output;
        text = (0, token_js_1.stableStringify)(filtered);
    }
    else {
        text = String(output ?? '');
    }
    if (policy.maxTokens) {
        text = (0, token_js_1.truncateToTokenLimit)(text, policy.maxTokens);
    }
    return { content: text, tokenCost: (0, token_js_1.estimateTokens)(text) };
}
