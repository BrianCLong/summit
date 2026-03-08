"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const loader_1 = require("../../src/policy/loader");
(0, globals_1.describe)('loadSignedPolicy strict validation', () => {
    const originalAllowUnsigned = process.env.ALLOW_UNSIGNED_POLICY;
    (0, globals_1.afterEach)(() => {
        process.env.ALLOW_UNSIGNED_POLICY = originalAllowUnsigned;
    });
    (0, globals_1.it)('rejects missing signature when unsigned not allowed', async () => {
        process.env.ALLOW_UNSIGNED_POLICY = 'false';
        const tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'policy-bundle-'));
        const bundlePath = path_1.default.join(tempDir, 'bundle.tgz');
        fs_1.default.writeFileSync(bundlePath, 'bundle');
        await (0, globals_1.expect)((0, loader_1.loadSignedPolicy)(bundlePath)).rejects.toBeTruthy();
    });
    (0, globals_1.it)('rejects empty bundle even when unsigned is allowed', async () => {
        process.env.ALLOW_UNSIGNED_POLICY = 'true';
        const tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'policy-bundle-'));
        const bundlePath = path_1.default.join(tempDir, 'bundle.tar');
        fs_1.default.writeFileSync(bundlePath, '');
        await (0, globals_1.expect)((0, loader_1.loadSignedPolicy)(bundlePath)).rejects.toThrow('empty');
    });
    (0, globals_1.it)('accepts valid unsigned bundle when override is set', async () => {
        process.env.ALLOW_UNSIGNED_POLICY = 'true';
        const tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'policy-bundle-'));
        const bundlePath = path_1.default.join(tempDir, 'bundle.tar.gz');
        fs_1.default.writeFileSync(bundlePath, 'valid bundle');
        const result = await (0, loader_1.loadSignedPolicy)(bundlePath);
        (0, globals_1.expect)(result.ok).toBe(true);
        (0, globals_1.expect)(result.signatureVerified).toBe(false);
        (0, globals_1.expect)(result.digest).toBeDefined();
    });
});
