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
// Mocks
const mockAccess = globals_1.jest.fn();
const mockExecFile = globals_1.jest.fn((bin, args, cb) => cb(null));
const mockMkdir = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('node:child_process', () => ({
    execFile: mockExecFile,
}));
globals_1.jest.unstable_mockModule('fs', () => ({
    promises: {
        mkdir: mockMkdir,
        access: mockAccess,
    },
}));
globals_1.jest.unstable_mockModule('../plugins/verify.js', () => ({
    verifyCosign: globals_1.jest.fn().mockResolvedValue(true),
}));
(0, globals_1.describe)('Marketplace Security', () => {
    let installStep;
    (0, globals_1.beforeEach)(async () => {
        globals_1.jest.clearAllMocks();
        process.env.OFFLINE = 'true';
        globals_1.jest.resetModules(); // Reset cache to ensure fresh import
        const module = await Promise.resolve().then(() => __importStar(require('../marketplace.js')));
        installStep = module.installStep;
    });
    (0, globals_1.it)('should prevent path traversal in name', async () => {
        const name = '../../../../tmp/evil';
        const version = '1.0.0';
        await (0, globals_1.expect)(installStep(name, version)).rejects.toThrow();
        // Verify access was NOT called
        (0, globals_1.expect)(mockAccess).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('should prevent invalid characters in name', async () => {
        const name = 'valid-name; rm -rf /';
        const version = '1.0.0';
        await (0, globals_1.expect)(installStep(name, version)).rejects.toThrow('Invalid name format');
        (0, globals_1.expect)(mockAccess).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('should prevent invalid characters in version', async () => {
        const name = 'valid-name';
        const version = '1.0.0; rm -rf /';
        await (0, globals_1.expect)(installStep(name, version)).rejects.toThrow('Invalid version format');
        (0, globals_1.expect)(mockAccess).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('should allow valid scoped name and version', async () => {
        const name = '@scope/package-name';
        const version = '1.0.0-beta.1';
        // Should not throw
        try {
            await installStep(name, version);
        }
        catch (e) {
            // If it throws, test fails
            throw e;
        }
        (0, globals_1.expect)(mockAccess).toHaveBeenCalled();
    });
});
