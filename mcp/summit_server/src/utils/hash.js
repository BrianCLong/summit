"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashJson = void 0;
const crypto_1 = require("crypto");
const stable_json_js_1 = require("./stable-json.js");
const hashJson = (value) => {
    const hash = (0, crypto_1.createHash)('sha256');
    hash.update((0, stable_json_js_1.stableStringify)(value));
    return hash.digest('hex');
};
exports.hashJson = hashJson;
