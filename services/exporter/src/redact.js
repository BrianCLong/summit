"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyRedactions = void 0;
const applyRedactions = (data, rules, log) => {
    return data.map((item) => {
        const clone = JSON.parse(JSON.stringify(item));
        for (const rule of rules) {
            if (rule.action === 'drop' &&
                Object.prototype.hasOwnProperty.call(clone, rule.field)) {
                delete clone[rule.field];
                log.push(`drop:${rule.field}`);
            }
            else if (rule.action === 'mask' &&
                Object.prototype.hasOwnProperty.call(clone, rule.field)) {
                clone[rule.field] = 'REDACTED';
                log.push(`mask:${rule.field}`);
            }
        }
        return clone;
    });
};
exports.applyRedactions = applyRedactions;
