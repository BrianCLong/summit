"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verify = exports.hash = void 0;
const globals_1 = require("@jest/globals");
const mockArgon2 = {
    hash: globals_1.jest.fn().mockResolvedValue('$argon2id$v=19$m=65536,t=3,p=4$628j...'),
    verify: globals_1.jest.fn().mockResolvedValue(true),
};
exports.default = mockArgon2;
exports.hash = mockArgon2.hash;
exports.verify = mockArgon2.verify;
