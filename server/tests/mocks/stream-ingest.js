"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamIngest = void 0;
const globals_1 = require("@jest/globals");
exports.streamIngest = {
    start: globals_1.jest.fn().mockResolvedValue(undefined),
    stop: globals_1.jest.fn(),
};
