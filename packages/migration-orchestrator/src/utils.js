"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepEqual = void 0;
const deepEqual = (a, b) => {
    if (Object.is(a, b))
        return true;
    if (typeof a !== typeof b)
        return false;
    if (a === null || b === null)
        return false;
    if (typeof a !== 'object' || typeof b !== 'object')
        return false;
    const aEntries = Object.entries(a);
    const bEntries = Object.entries(b);
    if (aEntries.length !== bEntries.length)
        return false;
    return aEntries.every(([key, value]) => (0, exports.deepEqual)(value, b[key]));
};
exports.deepEqual = deepEqual;
