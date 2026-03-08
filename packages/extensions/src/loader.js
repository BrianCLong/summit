"use strict";
// @ts-nocheck
/**
 * Extension Loader
 *
 * Discovers and loads extensions from configured directories.
 */
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
exports.ExtensionLoader = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
const types_js_1 = require("./types.js");
const registry_js_1 = require("./registry.js");
const compatibility_js_1 = require("./compatibility.js");
const static_validator_js_1 = require("./policy/static-validator.js");
const sandbox_runner_js_1 = require("./sandbox/sandbox-runner.js");
const observability_js_1 = require("./observability.js");
const health_js_1 = require("./health.js");
class ExtensionLoader {
    registry;
    options;
    activations = new Map();
    compatibility;
    staticValidator;
    sandbox;
    observability;
    healthMonitor;
    constructor(options) {
        this.registry = new registry_js_1.ExtensionRegistry();
        this.observability = new observability_js_1.ExtensionObservability();
        this.compatibility = new compatibility_js_1.CompatibilityChecker({
            platformVersion: options.platformVersion || process.env.SUMMIT_VERSION || '1.0.0',
            supportedBackwardsMajorVersions: 1,
        });
        this.staticValidator = new static_validator_js_1.StaticPolicyValidator({
            dependencyAllowList: options.dependencyAllowList,
            dependencyDenyList: options.dependencyDenyList,
        });
        this.options = {
            extensionDirs: options.extensionDirs,
            configPath: options.configPath || path.join(process.cwd(), '.summit/extensions/config'),
            storagePath: options.storagePath || path.join(process.cwd(), '.summit/extensions/storage'),
            autoLoad: options.autoLoad ?? true,
            api: options.api,
            policyEnforcer: options.policyEnforcer,
        };
        this.sandbox = new sandbox_runner_js_1.SandboxRunner(this.observability);
        this.healthMonitor = new health_js_1.ExtensionHealthMonitor(this.registry, this.observability);
    }
    /**
     * Discover extensions in configured directories
     */
    async discover() {
        const manifests = [];
        for (const dir of this.options.extensionDirs) {
            try {
                // Find all extension.json files
                const pattern = path.join(dir, '**/extension.json');
                const files = await (0, glob_1.glob)(pattern, { absolute: true });
                for (const file of files) {
                    try {
                        const manifest = await this.loadManifest(file);
                        const extensionPath = path.dirname(file);
                        this.registry.register(manifest, extensionPath);
                        manifests.push(manifest);
                    }
                    catch (err) {
                        console.error(`Failed to load manifest ${file}:`, err);
                    }
                }
            }
            catch (err) {
                console.error(`Failed to discover extensions in ${dir}:`, err);
            }
        }
        console.info(`Discovered ${manifests.length} extension(s)`);
        return manifests;
    }
    /**
     * Load and validate an extension manifest
     */
    async loadManifest(manifestPath) {
        const content = await fs.readFile(manifestPath, 'utf-8');
        const data = JSON.parse(content);
        // Validate against schema
        const result = types_js_1.ExtensionManifestSchema.safeParse(data);
        if (!result.success) {
            throw new Error(`Invalid extension manifest: ${result.error.errors
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ')}`);
        }
        return result.data;
    }
    /**
     * Load all discovered extensions
     */
    async loadAll() {
        const extensions = this.registry.getEnabled();
        for (const ext of extensions) {
            try {
                await this.loadExtension(ext);
            }
            catch (err) {
                this.healthMonitor.recordFailure(ext.manifest.name);
                this.registry.markFailed(ext.manifest.name, err instanceof Error ? err.message : String(err));
            }
        }
        const stats = this.registry.getStats();
        console.info(`Loaded ${stats.loaded}/${stats.total} extensions (${stats.failed} failed)`);
    }
    /**
     * Load a single extension
     */
    async loadExtension(ext) {
        const { manifest, path: extensionPath } = ext;
        // Compatibility window enforcement
        this.compatibility.validate(manifest);
        // Static policy validation
        await this.staticValidator.validate(manifest, extensionPath);
        // Check policy
        if (this.options.policyEnforcer) {
            const allowed = await this.options.policyEnforcer.checkPermissions(manifest.name, manifest.permissions);
            if (!allowed) {
                throw new Error(`Extension ${manifest.name} denied by policy`);
            }
        }
        // Load configuration
        const config = await this.loadConfig(manifest.name);
        // Create extension context
        const context = this.createContext(extensionPath, config);
        // Load the main entrypoint
        const mainEntrypoint = manifest.entrypoints.main;
        if (!mainEntrypoint) {
            throw new Error(`Extension ${manifest.name} has no main entrypoint`);
        }
        const modulePath = path.join(extensionPath, mainEntrypoint.path);
        const exportName = mainEntrypoint.export || 'default';
        const activation = await this.sandbox.run(manifest, modulePath, exportName, context);
        // Store activation and mark as loaded
        this.activations.set(manifest.name, activation);
        this.registry.markLoaded(manifest.name, activation.exports, config);
    }
    /**
     * Create extension context
     */
    createContext(extensionPath, config) {
        const storagePath = path.join(this.options.storagePath, path.basename(extensionPath));
        // Ensure storage directory exists
        fs.mkdir(storagePath, { recursive: true }).catch(console.error);
        return {
            extensionPath,
            storagePath,
            config,
            logger: this.createLogger(path.basename(extensionPath)),
            api: this.createAPI(storagePath),
        };
    }
    /**
     * Create logger for extension
     */
    createLogger(extensionName) {
        const prefix = `[ext:${extensionName}]`;
        return {
            info: (msg, ...args) => {
                this.observability.recordLog(extensionName, 'info', msg, ...args);
                console.info(prefix, msg, ...args);
            },
            warn: (msg, ...args) => {
                this.observability.recordLog(extensionName, 'warn', msg, ...args);
                console.warn(prefix, msg, ...args);
            },
            error: (msg, ...args) => {
                this.observability.recordLog(extensionName, 'error', msg, ...args);
                console.error(prefix, msg, ...args);
                this.healthMonitor.recordFailure(extensionName);
            },
            debug: (msg, ...args) => {
                this.observability.recordLog(extensionName, 'debug', msg, ...args);
                console.debug(prefix, msg, ...args);
            },
        };
    }
    /**
     * Create API for extension
     */
    createAPI(storagePath) {
        // Default implementations with storage
        const defaultAPI = {
            entities: {
                create: async (entity) => {
                    throw new Error('entities.create not implemented');
                },
                update: async (id, data) => {
                    throw new Error('entities.update not implemented');
                },
                delete: async (id) => {
                    throw new Error('entities.delete not implemented');
                },
                query: async (filter) => {
                    throw new Error('entities.query not implemented');
                },
            },
            relationships: {
                create: async (rel) => {
                    throw new Error('relationships.create not implemented');
                },
                query: async (filter) => {
                    throw new Error('relationships.query not implemented');
                },
            },
            investigations: {
                create: async (inv) => {
                    throw new Error('investigations.create not implemented');
                },
                get: async (id) => {
                    throw new Error('investigations.get not implemented');
                },
                update: async (id, data) => {
                    throw new Error('investigations.update not implemented');
                },
            },
            storage: {
                get: async (key) => {
                    const file = path.join(storagePath, `${key}.json`);
                    try {
                        const data = await fs.readFile(file, 'utf-8');
                        return JSON.parse(data);
                    }
                    catch {
                        return undefined;
                    }
                },
                set: async (key, value) => {
                    const file = path.join(storagePath, `${key}.json`);
                    await fs.mkdir(storagePath, { recursive: true });
                    await fs.writeFile(file, JSON.stringify(value, null, 2));
                },
                delete: async (key) => {
                    const file = path.join(storagePath, `${key}.json`);
                    await fs.unlink(file).catch(() => { });
                },
            },
        };
        // Merge with provided API overrides
        return {
            ...defaultAPI,
            ...this.options.api,
        };
    }
    /**
     * Load extension configuration
     */
    async loadConfig(extensionName) {
        const configFile = path.join(this.options.configPath, `${extensionName}.json`);
        try {
            const content = await fs.readFile(configFile, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            // No config file, return empty config
            return {};
        }
    }
    /**
     * Unload all extensions (cleanup)
     */
    async unloadAll() {
        // Deactivate in reverse order
        const order = this.registry.getActivationOrder().reverse();
        for (const name of order) {
            try {
                await this.unloadExtension(name);
            }
            catch (err) {
                console.error(`Failed to unload extension ${name}:`, err);
            }
        }
        this.registry.clear();
        this.activations.clear();
    }
    /**
     * Unload a single extension
     */
    async unloadExtension(name) {
        const activation = this.activations.get(name);
        if (activation?.dispose) {
            await activation.dispose();
        }
        this.activations.delete(name);
        this.registry.unregister(name);
    }
    /**
     * Reload extensions (discover + load)
     */
    async reload() {
        await this.unloadAll();
        await this.discover();
        await this.loadAll();
    }
    /**
     * Get the extension registry
     */
    getRegistry() {
        return this.registry;
    }
}
exports.ExtensionLoader = ExtensionLoader;
