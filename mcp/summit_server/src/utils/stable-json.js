"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableStringify = exports.stableSortValue = void 0;
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const stableSortValue = (value) => {
    if (Array.isArray(value)) {
        return value.map((entry) => (0, exports.stableSortValue)(entry));
    }
    if (isPlainObject(value)) {
        return Object.keys(value)
            .sort()
            .reduce((acc, key) => {
            acc[key] = (0, exports.stableSortValue)(value[key]);
            return acc;
        }, {});
    }
    return value;
};
exports.stableSortValue = stableSortValue;
const stableStringify = (value) => JSON.stringify((0, exports.stableSortValue)(value));
exports.stableStringify = stableStringify;
