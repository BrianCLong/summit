"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginRuntime = void 0;
const vm_1 = __importDefault(require("vm"));
const types_js_1 = require("../marketplace/types.js");
const service_js_1 = require("../marketplace/service.js");
class PluginRuntime {
    static DEFAULT_TIMEOUT_MS = 1000;
    static MAX_MEMORY_MB = 128; // Not strictly enforceable via vm alone, but good for tracking
    /**
     * Executes a plugin code in a sandboxed environment.
     */
    static async run(code, manifest, inputs, baseContext // The real implementations (vault, cache, etc.)
    ) {
        // 0. Global Kill Switch Check
        if (service_js_1.MarketplaceService.getInstance().isKillSwitchActive()) {
            throw new Error("Plugin execution prevented by Global Kill Switch.");
        }
        // 1. Create a safe context object based on capabilities
        const sandboxContext = {
            console: {
                log: (...args) => baseContext.logger?.info?.(...args),
                warn: (...args) => baseContext.logger?.warn?.(...args),
                error: (...args) => baseContext.logger?.error?.(...args),
            },
            // Standard limited globals
            JSON,
            Math,
            Date,
            // Inputs
            inputs,
        };
        // 2. Inject Capabilities
        this.injectCapabilities(sandboxContext, manifest.capabilities, baseContext);
        // 3. Create VM Context
        const context = vm_1.default.createContext(sandboxContext);
        // 4. Execution Options
        const options = {
            timeout: PluginRuntime.DEFAULT_TIMEOUT_MS,
            displayErrors: true,
            lineOffset: 0,
        };
        // Adjust limits based on Tier?
        if (manifest.trustTier === types_js_1.TrustTier.INTERNAL) {
            // Internal plugins might get more time
            options.timeout = 5000;
        }
        // 5. Memory Check (Approximate)
        // Note: This only checks pre-execution. strict memory isolation requires child processes or isolated-vm.
        const startMemory = process.memoryUsage().heapUsed;
        try {
            // Wrap code to support async/await and return value
            // We expect the user code to be something like:
            // "return await fetch('...')" or "const x = ...; return x;"
            // But standard `vm` runs script. We can wrap it in an async IIFE.
            const wrappedCode = `
        (async () => {
          ${code}
        })();
      `;
            const script = new vm_1.default.Script(wrappedCode);
            const result = await script.runInContext(context, options);
            // Post-execution memory check (very rough heuristic)
            const endMemory = process.memoryUsage().heapUsed;
            if ((endMemory - startMemory) > (PluginRuntime.MAX_MEMORY_MB * 1024 * 1024)) {
                console.warn(`[PLUGIN] Warning: Plugin execution seemed to spike memory usage.`);
            }
            return result;
        }
        catch (err) {
            if (err.message?.includes('Script execution timed out')) {
                throw new Error(`Plugin execution timed out after ${options.timeout}ms`);
            }
            throw err;
        }
    }
    static injectCapabilities(sandbox, capabilities, base) {
        // Default: No capabilities
        // Network
        if (capabilities.some(c => c.type === 'network.outbound')) {
            // Inject a restricted fetch
            sandbox.fetch = async (url, init) => {
                // Here we should check constraints if strictly enforced
                // For now, allow if capability exists
                if (!base.fetch)
                    throw new Error("Host environment does not support network access");
                return base.fetch(url, init);
            };
        }
        else {
            sandbox.fetch = async () => { throw new Error("Capability 'network.outbound' missing"); };
        }
        // FS
        if (capabilities.some(c => c.type === 'fs.read')) {
            sandbox.fs = {
                readFile: async (path) => {
                    // Strictly validate path against constraints if possible
                    // For now, simplistic check
                    if (!base.fs?.readFile)
                        throw new Error("Host environment does not support FS access");
                    return base.fs.readFile(path);
                }
            };
        }
        // Vault
        if (capabilities.some(c => c.type === 'vault.read')) {
            sandbox.vault = {
                read: async (path) => {
                    if (!base.vault?.read)
                        throw new Error("Host environment does not support Vault access");
                    return base.vault.read(path);
                }
            };
        }
        // Cache
        if (capabilities.some(c => c.type === 'cache.write')) {
            sandbox.cache = {
                get: async (k) => base.cache?.get(k),
                set: async (k, v, t) => base.cache?.set(k, v, t),
            };
        }
    }
}
exports.PluginRuntime = PluginRuntime;
