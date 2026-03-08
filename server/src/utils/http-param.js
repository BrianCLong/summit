"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firstString = firstString;
exports.firstStringOr = firstStringOr;
function firstString(value) {
    if (typeof value === 'string')
        return value;
    if (Array.isArray(value) && typeof value[0] === 'string')
        return value[0];
    return undefined;
}
function firstStringOr(value, fallback) {
    return firstString(value) ?? fallback;
}
