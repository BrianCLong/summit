"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringSlot = stringSlot;
exports.numberSlot = numberSlot;
exports.booleanSlot = booleanSlot;
exports.enumSlot = enumSlot;
function stringSlot(options = {}) {
    return { kind: 'string', ...options };
}
function numberSlot(options = {}) {
    return { kind: 'number', ...options };
}
function booleanSlot(options = {}) {
    return { kind: 'boolean', ...options };
}
function enumSlot(values, options = {}) {
    return { kind: 'enum', values, ...options };
}
