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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
describe('FeatureFlagService integration', () => {
    const baseConfig = `features:\n  base-flag:\n    default: true\n    description: Base capability required for dependent features\n    rollout:\n      staging: 100\n      prod: 100\n  dependent-flag:\n    default: true\n    description: Requires base flag to protect runtime guardrails\n    guardrails:\n      requires:\n        - base-flag\n    rollout:\n      staging: 100\n      prod: 100\n`;
    let originalCwd;
    let originalEnv;
    let tempDir;
    beforeEach(() => {
        originalCwd = process.cwd();
        originalEnv = process.env.NODE_ENV;
        tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'ff-integration-'));
        fs_1.default.mkdirSync(path_1.default.join(tempDir, 'feature-flags'));
        fs_1.default.writeFileSync(path_1.default.join(tempDir, 'feature-flags', 'flags.yaml'), baseConfig, 'utf-8');
        process.chdir(tempDir);
    });
    afterEach(() => {
        process.chdir(originalCwd);
        if (originalEnv === undefined) {
            delete process.env.NODE_ENV;
        }
        else {
            process.env.NODE_ENV = originalEnv;
        }
        if (fs_1.default.existsSync(tempDir)) {
            fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
        jest.resetModules();
    });
    async function loadService(environment) {
        process.env.NODE_ENV = environment;
        jest.resetModules();
        const module = await Promise.resolve().then(() => __importStar(require('../../../src/utils/featureFlags')));
        const FeatureFlagServiceClass = module.FeatureFlagService;
        FeatureFlagServiceClass.instance = undefined;
        const service = FeatureFlagServiceClass.getInstance();
        if (originalEnv === undefined) {
            delete process.env.NODE_ENV;
        }
        else {
            process.env.NODE_ENV = originalEnv;
        }
        return service;
    }
    it('enables dependent flags when guardrails are satisfied in staging', async () => {
        const service = await loadService('staging');
        const dependent = service.getFlag('dependent-flag', 'qa-user');
        expect(dependent.enabled).toBe(true);
        expect(dependent.reason).toContain('Full rollout');
    });
    it('disables dependent flags when production rollout is zero', async () => {
        const configWithProdDisabled = baseConfig.replace('prod: 100', 'prod: 0');
        fs_1.default.writeFileSync(path_1.default.join(tempDir, 'feature-flags', 'flags.yaml'), configWithProdDisabled, 'utf-8');
        const service = await loadService('production');
        const dependent = service.getFlag('dependent-flag', 'qa-user');
        expect(dependent.enabled).toBe(false);
        expect(dependent.reason).toBe('Rollout disabled for production');
    });
});
