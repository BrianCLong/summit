"use strict";
// Mock for utils/audit
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAudit = writeAudit;
exports.deepDiff = deepDiff;
exports.signPayload = signPayload;
async function writeAudit(_entry) { }
function deepDiff(_before, _after) {
    return {};
}
function signPayload(_payload, _secret) {
    return 'mock-signature';
}
exports.default = {
    writeAudit,
    deepDiff,
    signPayload,
};
