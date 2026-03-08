"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortObject = exports.sha256 = void 0;
const crypto_1 = require("crypto");
const sha256 = (buf) => (0, crypto_1.createHash)('sha256').update(buf).digest('hex');
exports.sha256 = sha256;
const sortObject = (obj) => {
    if (Array.isArray(obj)) {
        return obj
            .map((v) => (0, exports.sortObject)(v))
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    if (obj && typeof obj === 'object') {
        const sorted = {};
        Object.keys(obj)
            .sort()
            .forEach((k) => {
            sorted[k] = (0, exports.sortObject)(obj[k]);
        });
        return sorted;
    }
    return obj;
};
exports.sortObject = sortObject;
