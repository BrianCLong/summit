"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFieldMaskRule = exports.applyConnectorRedactions = void 0;
const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';
const maskValue = (value, mask) => {
    if (typeof value === 'string' && value.length > mask.length) {
        return `${mask}${value.slice(mask.length)}`;
    }
    return mask;
};
const clone = (value) => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
};
const traverse = (value, cb) => {
    if (Array.isArray(value)) {
        value.forEach((item, idx, arr) => {
            cb({ key: String(idx), value: item, parent: arr });
            traverse(item, cb);
        });
        return;
    }
    if (isPlainObject(value)) {
        Object.entries(value).forEach(([key, val]) => {
            cb({ key, value: val, parent: value });
            traverse(val, cb);
        });
    }
};
const applyConnectorRedactions = (connector, input, rules) => {
    if (!rules?.length) {
        return { data: input, applied: [] };
    }
    const applicable = rules.filter((rule) => rule.connector === connector);
    if (!applicable.length) {
        return { data: input, applied: [] };
    }
    let working = clone(input);
    const applied = [];
    for (const rule of applicable) {
        working = rule.apply(clone(working));
        applied.push(rule.description);
    }
    return { data: working, applied };
};
exports.applyConnectorRedactions = applyConnectorRedactions;
const createFieldMaskRule = (connector, fields, mask = '[REDACTED]', description = 'Mask sensitive fields') => ({
    connector,
    description,
    apply: (input) => {
        const result = clone(input);
        const fieldSet = new Set(fields);
        traverse(result, ({ key, value, parent }) => {
            if (fieldSet.has(key)) {
                if (Array.isArray(parent)) {
                    parent[Number(key)] = maskValue(value, mask);
                }
                else if (isPlainObject(parent)) {
                    parent[key] = maskValue(value, mask);
                }
            }
        });
        return result;
    },
});
exports.createFieldMaskRule = createFieldMaskRule;
