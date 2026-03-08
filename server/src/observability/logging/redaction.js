"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MASK = exports.SENSITIVE_KEYS = void 0;
exports.redact = redact;
exports.SENSITIVE_KEYS = [
    'password',
    'token',
    'authorization',
    'secret',
    'key',
    'credential',
    'ssn',
    'credit_card',
    'cc',
    'cvv',
];
exports.MASK = '***REDACTED***';
function redact(obj) {
    if (obj === null || obj === undefined)
        return obj;
    if (Array.isArray(obj)) {
        return obj.map(redact);
    }
    if (typeof obj === 'object') {
        const newObj = {};
        for (const key of Object.keys(obj)) {
            if (exports.SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
                newObj[key] = exports.MASK;
            }
            else {
                newObj[key] = redact(obj[key]);
            }
        }
        return newObj;
    }
    return obj;
}
