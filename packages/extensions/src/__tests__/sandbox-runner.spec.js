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
const fs = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const vitest_1 = require("vitest");
const sandbox_runner_js_1 = require("../sandbox/sandbox-runner.js");
const observability_js_1 = require("../observability.js");
const baseManifest = {
    name: 'timeout-ext',
    displayName: 'Timeout Extension',
    version: '1.0.0',
    description: 'Long running extension to test sandbox',
    type: 'tool',
    capabilities: ['analytics'],
    permissions: [],
    entrypoints: {
        main: {
            type: 'function',
            path: 'index.mjs',
            export: 'default',
        },
    },
};
(0, vitest_1.describe)('SandboxRunner', () => {
    (0, vitest_1.it)('enforces activation timeouts and isolates execution', async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sandbox-test-'));
        const entrypoint = path.join(dir, 'index.mjs');
        await fs.writeFile(entrypoint, "export default async function() { await new Promise((resolve) => setTimeout(resolve, 200)); return { exports: { ok: true } }; }", 'utf-8');
        const runner = new sandbox_runner_js_1.SandboxRunner(new observability_js_1.ExtensionObservability(), { timeoutMs: 50, memoryLimitMb: 16 });
        const context = createContext(dir);
        await (0, vitest_1.expect)(() => runner.run(baseManifest, entrypoint, 'default', context)).rejects.toThrow(/timed out|exceeded sandbox timeout/);
    });
    (0, vitest_1.it)('returns activation exports when within limits', async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sandbox-test-pass-'));
        const entrypoint = path.join(dir, 'index.mjs');
        await fs.writeFile(entrypoint, "export default async function() { return { exports: { healthy: true } }; }", 'utf-8');
        const runner = new sandbox_runner_js_1.SandboxRunner(new observability_js_1.ExtensionObservability(), { timeoutMs: 500, memoryLimitMb: 16 });
        const context = createContext(dir);
        const activation = await runner.run(baseManifest, entrypoint, 'default', context);
        (0, vitest_1.expect)(activation.exports).toEqual({ healthy: true });
        await activation.dispose();
    });
});
function createContext(extensionPath) {
    return {
        extensionPath,
        storagePath: path.join(extensionPath, 'storage'),
        config: {},
        logger: {
            info: () => { },
            warn: () => { },
            error: () => { },
            debug: () => { },
        },
        api: {
            entities: {
                create: async () => ({}),
                update: async () => ({}),
                delete: async () => { },
                query: async () => [],
            },
            relationships: {
                create: async () => ({}),
                query: async () => [],
            },
            investigations: {
                create: async () => ({}),
                get: async () => ({}),
                update: async () => ({}),
            },
            storage: {
                get: async () => undefined,
                set: async () => { },
                delete: async () => { },
            },
        },
    };
}
