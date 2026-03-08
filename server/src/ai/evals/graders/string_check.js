"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringCheck = stringCheck;
function stringCheck(actual, expected) {
    return actual.includes(expected) ? 1.0 : 0.0;
}
