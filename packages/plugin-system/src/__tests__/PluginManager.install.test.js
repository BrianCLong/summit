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
const PluginManager_js_1 = require("../core/PluginManager.js");
const plugin_js_1 = require("../types/plugin.js");
const signatureVerifier = __importStar(require("../security/verifySignature.js"));
class StubRegistry {
    store = new Map();
    register(plugin) {
        this.store.set(plugin.manifest.id, plugin);
        return Promise.resolve();
    }
    unregister(pluginId) {
        this.store.delete(pluginId);
        return Promise.resolve();
    }
    get(pluginId) {
        return Promise.resolve(this.store.get(pluginId) ?? null);
    }
    list() {
        return Promise.resolve(Array.from(this.store.values()));
    }
    update(pluginId, updates) {
        const existing = this.store.get(pluginId);
        if (!existing) {
            return Promise.resolve();
        }
        this.store.set(pluginId, { ...existing, ...updates });
        return Promise.resolve();
    }
    search(_query) {
        return this.list();
    }
}
class StubLoader {
    load() {
        return Promise.reject(new Error('not implemented for install tests'));
    }
    unload() {
        return Promise.resolve();
    }
    reload() {
        return Promise.resolve();
    }
    isLoaded() {
        return false;
    }
    getLoadedPlugins() {
        return new Map();
    }
}
class StubDependencyResolver {
    resolve(_pluginId, _version) {
        return Promise.reject(new Error('not needed for install tests'));
    }
    checkCompatibility(_pluginId, _version) {
        return Promise.resolve({ compatible: true, issues: [] });
    }
}
const baseManifest = {
    id: 'sample-plugin',
    name: 'Sample Plugin',
    version: '1.2.3',
    description: 'A sample plugin manifest used for installation tests',
    author: { name: 'Plugin Author', email: 'author@example.com' },
    homepage: 'https://example.com/plugin',
    repository: 'https://example.com/plugin/repo',
    license: 'MIT',
    category: 'utility',
    main: 'dist/index.js',
    engineVersion: '1.0.0',
    permissions: [plugin_js_1.PluginPermission.READ_DATA],
    signature: {
        signature: 'signed-payload',
        publicKey: 'public-key',
    },
};
function createManager() {
    return new PluginManager_js_1.PluginManager(new StubLoader(), new StubRegistry(), new StubDependencyResolver(), '1.0.0');
}
function createManifest(overrides = {}) {
    return {
        ...baseManifest,
        author: { ...baseManifest.author },
        signature: baseManifest.signature ? { ...baseManifest.signature } : undefined,
        ...overrides,
    };
}
describe('PluginManager.install manifest verification', () => {
    beforeEach(() => {
        process.env.PLUGIN_VERIFY_ENABLED = 'true';
        globals_1.jest.restoreAllMocks();
    });
    afterEach(() => {
        delete process.env.PLUGIN_VERIFY_ENABLED;
    });
    it('rejects invalid manifest with stable error code', async () => {
        const manager = createManager();
        const invalidManifest = createManifest({ id: 'INVALID ID' });
        await expect(manager.install(invalidManifest, { type: 'local', location: './plugin' })).rejects.toMatchObject({ code: 'PLUGIN_MANIFEST_INVALID' });
    });
    it('accepts a valid manifest when verification is enabled', async () => {
        const manager = createManager();
        const validManifest = createManifest();
        await expect(manager.install(validManifest, { type: 'local', location: './plugin' })).resolves.not.toThrow();
    });
    it('invokes signature verification when the flag is enabled', async () => {
        const manager = createManager();
        const validManifest = createManifest();
        const verifySpy = globals_1.jest.spyOn(signatureVerifier, 'verifySignature');
        await manager.install(validManifest, { type: 'local', location: './plugin' });
        expect(verifySpy).toHaveBeenCalledWith(expect.objectContaining({ manifest: expect.objectContaining({ id: validManifest.id }) }));
    });
});
