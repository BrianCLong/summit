"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const secret_manager_js_1 = require("../lib/secrets/secret-manager.js");
// Use process.cwd() since tests run from server directory
const testsDir = path.join(process.cwd(), 'tests');
(0, globals_1.describe)('SecretManager', () => {
    const tmpDir = path.join(testsDir, 'tmp-secrets');
    (0, globals_1.beforeEach)(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        fs.mkdirSync(tmpDir, { recursive: true });
    });
    (0, globals_1.afterEach)(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        delete process.env.SECRET_MANAGER_TEST;
        delete process.env.SECRET_MANAGER_DEFAULT_ONLY;
        delete process.env.CONFIG_ENCRYPTION_KEY;
    });
    (0, globals_1.it)('caches env secrets and respects ttl overrides', () => {
        const manager = new secret_manager_js_1.SecretManager({ cacheTtlSeconds: 5, rotationIntervalSeconds: 0 });
        process.env.SECRET_MANAGER_TEST = 'initial';
        const first = manager.resolveConfig('env://SECRET_MANAGER_TEST?ttl=5');
        (0, globals_1.expect)(first).toBe('initial');
        const base = Date.now();
        const nowSpy = globals_1.jest.spyOn(Date, 'now');
        nowSpy.mockImplementation(() => base);
        process.env.SECRET_MANAGER_TEST = 'updated';
        const cached = manager.resolveConfig('env://SECRET_MANAGER_TEST?ttl=5');
        (0, globals_1.expect)(cached).toBe('initial');
        nowSpy.mockImplementation(() => base + 6000);
        const refreshed = manager.resolveConfig('env://SECRET_MANAGER_TEST?ttl=5');
        (0, globals_1.expect)(refreshed).toBe('updated');
        nowSpy.mockRestore();
        manager.close();
    });
    (0, globals_1.it)('supports file:// references with base paths and json fields', () => {
        const fileBasePath = path.join(tmpDir, 'base');
        fs.mkdirSync(fileBasePath, { recursive: true });
        const secretFile = path.join(fileBasePath, 'secret.json');
        fs.writeFileSync(secretFile, JSON.stringify({ token: 'file-secret', nested: { value: 'nested' } }));
        const manager = new secret_manager_js_1.SecretManager({
            fileBasePath,
            rotationIntervalSeconds: 0,
            providerPreference: ['file'],
        });
        const resolved = manager.resolveConfig({ secret: 'file://secret.json#token' });
        (0, globals_1.expect)(resolved.secret).toBe('file-secret');
        const nested = manager.resolveConfig('file://' + secretFile + '#nested');
        (0, globals_1.expect)(nested).toBe(JSON.stringify({ value: 'nested' }));
        const defaulted = manager.resolveConfig('file://missing.json?default=fallback&optional=true');
        (0, globals_1.expect)(defaulted).toBe('fallback');
        manager.close();
    });
    (0, globals_1.it)('decrypts enc:: secrets using the configured encryption key env', () => {
        process.env.CONFIG_ENCRYPTION_KEY = 'rotate-me';
        const ciphertext = secret_manager_js_1.SecretManager.encrypt('cipher-text', 'rotate-me');
        const manager = new secret_manager_js_1.SecretManager({ rotationIntervalSeconds: 0 });
        const resolved = manager.resolveConfig({ encrypted: ciphertext });
        (0, globals_1.expect)(resolved.encrypted).toBe('cipher-text');
        manager.close();
    });
});
