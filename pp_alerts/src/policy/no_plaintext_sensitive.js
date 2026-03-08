"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanPayload = scanPayload;
exports.validate = validate;
const sensitive_fields_json_1 = __importDefault(require("../../policy/sensitive_fields.json"));
function scanPayload(payload, path = '') {
    const violations = [];
    const sensitiveKeys = new Set(sensitive_fields_json_1.default.sensitive_keys);
    if (payload === null || typeof payload !== 'object') {
        return violations;
    }
    for (const key in payload) {
        if (Object.prototype.hasOwnProperty.call(payload, key)) {
            const currentPath = path ? `${path}.${key}` : key;
            if (sensitiveKeys.has(key)) {
                violations.push({ path: currentPath, key });
            }
            if (typeof payload[key] === 'object') {
                violations.push(...scanPayload(payload[key], currentPath));
            }
        }
    }
    return violations;
}
function validate(payload) {
    const violations = scanPayload(payload);
    if (violations.length > 0) {
        const details = violations.map(v => `${v.path} (matched ${v.key})`).join(', ');
        throw new Error(`Governance Violation: Plaintext sensitive fields detected: ${details}`);
    }
}
