"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitAndCachePlugin = void 0;
const globals_1 = require("@jest/globals");
exports.rateLimitAndCachePlugin = globals_1.jest.fn().mockReturnValue({
    requestDidStart: globals_1.jest.fn().mockResolvedValue({}),
});
