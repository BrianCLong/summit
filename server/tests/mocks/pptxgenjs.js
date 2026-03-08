"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const mockPptxGen = globals_1.jest.fn().mockImplementation(() => ({
    addSlide: globals_1.jest.fn(),
    writeFile: globals_1.jest.fn().mockResolvedValue(undefined),
}));
exports.default = mockPptxGen;
