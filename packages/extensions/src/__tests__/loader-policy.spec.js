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
const loader_js_1 = require("../loader.js");
const enforcer_js_1 = require("../policy/enforcer.js");
async function createExtension(options) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'loader-ext-'));
    const manifest = {
        name: options.name || 'policy-ext',
        displayName: 'Policy Extension',
        version: '1.0.0',
        description: 'Extension for policy testing',
        type: 'tool',
        capabilities: ['analytics'],
        permissions: ['entities:read'],
        dependencies: options.dependencies,
        entrypoints: { main: { type: 'function', path: 'index.mjs', export: 'default' } },
        summit: { minVersion: '1.0.0', maxVersion: '2.0.0' },
    };
    await fs.writeFile(path.join(dir, 'extension.json'), JSON.stringify(manifest, null, 2));
    await fs.writeFile(path.join(dir, 'index.mjs'), "export default async () => ({ exports: { id: 'ok' } })");
    if (options.lockfile !== false) {
        await fs.writeFile(path.join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9');
    }
    return dir;
}
(0, vitest_1.describe)('ExtensionLoader policy gates', () => {
    (0, vitest_1.it)('blocks extensions that violate dependency deny list', async () => {
        const dir = await createExtension({ dependencies: { banned: '^1.0.0' }, lockfile: true });
        const loader = new loader_js_1.ExtensionLoader({
            extensionDirs: [dir],
            dependencyDenyList: ['banned'],
            platformVersion: '1.5.0',
            autoLoad: true,
        });
        await loader.discover();
        await loader.loadAll();
        const registry = loader.getRegistry();
        const ext = registry.get('policy-ext');
        (0, vitest_1.expect)(ext?.error).toMatch(/blocked by policy/);
    });
    (0, vitest_1.it)('denies extensions when OPA policy disallows permissions', async () => {
        const dir = await createExtension({ dependencies: {}, lockfile: true });
        const policyEnforcer = new (class extends enforcer_js_1.PolicyEnforcer {
            async checkPermissions() {
                return false;
            }
        })();
        const loader = new loader_js_1.ExtensionLoader({
            extensionDirs: [dir],
            policyEnforcer,
            platformVersion: '1.5.0',
        });
        await loader.discover();
        await loader.loadAll();
        const registry = loader.getRegistry();
        const ext = registry.get('policy-ext');
        (0, vitest_1.expect)(ext?.error).toMatch(/denied by policy/);
    });
    (0, vitest_1.it)('loads extensions within compatibility window with lockfile enforcement', async () => {
        const dir = await createExtension({ dependencies: {}, lockfile: true });
        const loader = new loader_js_1.ExtensionLoader({
            extensionDirs: [dir],
            dependencyAllowList: [],
            platformVersion: '1.5.0',
        });
        await loader.discover();
        await loader.loadAll();
        const registry = loader.getRegistry();
        const ext = registry.get('policy-ext');
        (0, vitest_1.expect)(ext?.loaded).toBe(true);
    });
});
