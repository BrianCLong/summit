"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPolicy = void 0;
const opa_wasm_1 = require("@open-policy-agent/opa-wasm");
const fs_1 = require("fs");
const path_1 = require("path");
let policy;
const checkPolicy = async (input) => {
    if (!policy) {
        const policyWasm = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'policy.wasm'));
        policy = await (0, opa_wasm_1.loadPolicy)(policyWasm);
    }
    const result = policy.evaluate(input);
    if (result && result.length > 0 && result[0].result) {
        return result[0].result.allow;
    }
    return false;
};
exports.checkPolicy = checkPolicy;
