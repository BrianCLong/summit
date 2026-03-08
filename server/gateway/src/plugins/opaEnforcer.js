"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.opaEnforcer = opaEnforcer;
exports.enforceABAC = enforceABAC;
const node_fetch_1 = __importDefault(require("node-fetch"));
function opaEnforcer() {
    return {
        async requestDidStart() {
            return {
                async willSendResponse() {
                    /* no-op */
                },
            };
        },
    };
}
async function enforceABAC(args) {
    const res = await (0, node_fetch_1.default)('http://localhost:8181/v1/data/abac/authz/allow', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: args }),
    });
    const data = await res.json();
    if (!data.result) {
        const e = new Error('Forbidden by policy');
        e.reason = 'opa_deny';
        throw e;
    }
}
