"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PiiGuard = void 0;
const crypto_1 = __importDefault(require("crypto"));
function applyAction(value, action) {
    if (action === 'drop')
        return undefined;
    if (action === 'redact')
        return '[REDACTED]';
    return crypto_1.default.createHash('sha256').update(String(value)).digest('hex');
}
function getNested(record, path) {
    return path.split('.').reduce((acc, part) => {
        if (acc && typeof acc === 'object' && part in acc) {
            return acc[part];
        }
        return undefined;
    }, record);
}
function setNested(record, path, value) {
    const parts = path.split('.');
    let current = record;
    parts.forEach((part, idx) => {
        if (idx === parts.length - 1) {
            if (value === undefined) {
                delete current[part];
            }
            else {
                current[part] = value;
            }
        }
        else {
            if (!current[part] || typeof current[part] !== 'object') {
                current[part] = {};
            }
            current = current[part];
        }
    });
}
class PiiGuard {
    rules;
    constructor(rules) {
        this.rules = rules;
    }
    tag(record) {
        const tags = [];
        for (const rule of this.rules) {
            const value = getNested(record, rule.path);
            if (value !== undefined) {
                tags.push(rule.path);
            }
        }
        return tags;
    }
    redact(record) {
        const output = JSON.parse(JSON.stringify(record));
        for (const rule of this.rules) {
            const value = getNested(output, rule.path);
            if (value === undefined)
                continue;
            setNested(output, rule.path, applyAction(value, rule.action));
        }
        return output;
    }
}
exports.PiiGuard = PiiGuard;
