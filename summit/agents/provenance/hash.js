"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashOutputs = exports.hashInputs = exports.sha256 = exports.stableJsonStringify = void 0;
const node_crypto_1 = require("node:crypto");
const sortValue = (value) => {
    if (Array.isArray(value)) {
        return value.map(sortValue);
    }
    if (value && typeof value === 'object') {
        return Object.keys(value)
            .sort()
            .reduce((accumulator, key) => {
            accumulator[key] = sortValue(value[key]);
            return accumulator;
        }, {});
    }
    return value;
};
const stableJsonStringify = (obj) => JSON.stringify(sortValue(obj));
exports.stableJsonStringify = stableJsonStringify;
const sha256 = (input) => (0, node_crypto_1.createHash)('sha256').update(input).digest('hex');
exports.sha256 = sha256;
const hashInputs = (inputs) => (0, exports.sha256)((0, exports.stableJsonStringify)(inputs));
exports.hashInputs = hashInputs;
const hashOutputs = (outputs) => (0, exports.sha256)((0, exports.stableJsonStringify)(outputs));
exports.hashOutputs = hashOutputs;
