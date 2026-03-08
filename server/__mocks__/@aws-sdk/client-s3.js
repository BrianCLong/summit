"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteObjectsCommand = exports.ListObjectsV2Command = exports.PutObjectCommand = exports.S3Client = exports.sendMock = void 0;
const globals_1 = require("@jest/globals");
exports.sendMock = globals_1.jest.fn();
exports.S3Client = globals_1.jest.fn(() => {
    return {
        send: exports.sendMock,
    };
});
exports.PutObjectCommand = globals_1.jest.fn();
exports.ListObjectsV2Command = globals_1.jest.fn();
exports.DeleteObjectsCommand = globals_1.jest.fn();
