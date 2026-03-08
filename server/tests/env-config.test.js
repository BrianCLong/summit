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
const loadConfigFresh = async () => {
    globals_1.jest.resetModules();
    return (await Promise.resolve().then(() => __importStar(require('../src/config/load.js')))).loadConfig;
};
const loadFeatureFlagsFresh = async () => {
    globals_1.jest.resetModules();
    return (await Promise.resolve().then(() => __importStar(require('../src/config/featureFlags.js')))).FeatureFlags;
};
(0, globals_1.describe)('Config System', () => {
    const originalEnv = process.env;
    (0, globals_1.beforeEach)(() => {
        process.env = { ...originalEnv };
    });
    (0, globals_1.afterAll)(() => {
        process.env = originalEnv;
    });
    (0, globals_1.test)('loads defaults correctly', async () => {
        delete process.env.PORT;
        delete process.env.NODE_ENV;
        const loadConfig = await loadConfigFresh();
        const config = loadConfig();
        (0, globals_1.expect)(config.env).toBe('development');
        (0, globals_1.expect)(config.port).toBe(4000);
    });
    (0, globals_1.test)('validates and overrides fields', async () => {
        process.env.PORT = '9090';
        const loadConfig = await loadConfigFresh();
        const config = loadConfig();
        (0, globals_1.expect)(config.port).toBe(9090);
    });
    (0, globals_1.test)('feature flags are loaded from env', async () => {
        process.env.FEATURE_MAESTRO_NEW_RUN_CONSOLE = 'true';
        const FeatureFlags = await loadFeatureFlagsFresh();
        const flags = FeatureFlags.getInstance();
        (0, globals_1.expect)(flags.isEnabled('maestro.newRunConsole')).toBe(true);
    });
    (0, globals_1.test)('legacy feature keys are respected', async () => {
        process.env.GRAPH_EXPAND_CACHE = 'true';
        const loadConfig = await loadConfigFresh();
        const config = loadConfig();
        (0, globals_1.expect)(config.features.GRAPH_EXPAND_CACHE).toBe(true);
    });
});
(0, globals_1.describe)('FeatureFlags', () => {
    (0, globals_1.test)('should return default value if key missing', async () => {
        const FeatureFlags = await loadFeatureFlagsFresh();
        const flags = FeatureFlags.getInstance();
        (0, globals_1.expect)(flags.isEnabled('ai.enabled')).toBe(true);
    });
    (0, globals_1.test)('should respect explicit value', async () => {
        process.env.FEATURE_AI_ENABLED = 'false';
        const FeatureFlags = await loadFeatureFlagsFresh();
        const flags = FeatureFlags.getInstance();
        (0, globals_1.expect)(flags.isEnabled('ai.enabled')).toBe(false);
    });
});
