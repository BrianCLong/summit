"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PythonShell = void 0;
const globals_1 = require("@jest/globals");
class PythonShell {
    static run = globals_1.jest.fn((script, options, callback) => {
        if (callback)
            callback(null, ['0.95']);
        return {
            on: globals_1.jest.fn(),
            end: globals_1.jest.fn(),
        };
    });
    static runString = globals_1.jest.fn((code, options, callback) => {
        if (callback)
            callback(null, ['0.95']);
    });
    on = globals_1.jest.fn();
    end = globals_1.jest.fn();
    send = globals_1.jest.fn();
    constructor(script, options) { }
}
exports.PythonShell = PythonShell;
exports.default = { PythonShell };
