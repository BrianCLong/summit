"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginManager = void 0;
const eventemitter3_1 = __importDefault(require("eventemitter3"));
const semver_1 = __importDefault(require("semver"));
const plugin_js_1 = require("../types/plugin.js");
const schema_js_1 = require("../manifest/schema.js");
const PluginManifestValidationError_js_1 = require("../errors/PluginManifestValidationError.js");
const verifySignature_js_1 = require("../security/verifySignature.js");
/**
 * Central plugin manager implementing microkernel pattern
 */
class PluginManager extends eventemitter3_1.default {
    plugins = new Map();
    loader;
    registry;
    dependencyResolver;
    platformVersion;
    constructor(loader, registry, dependencyResolver, platformVersion) {
        super();
        this.loader = loader;
        this.registry = registry;
        this.dependencyResolver = dependencyResolver;
        this.platformVersion = platformVersion;
    }
    /**
     * Install a plugin
     */
    async install(manifest, _source) {
        const verificationEnabled = this.shouldVerify();
        const manifestToInstall = verificationEnabled
            ? this.validateManifest(manifest)
            : manifest;
        const { id, version } = manifestToInstall;
        // Check if already installed
        if (this.plugins.has(id)) {
            throw new Error(`Plugin ${id} is already installed`);
        }
        if (verificationEnabled) {
            await (0, verifySignature_js_1.verifySignature)({
                manifest: manifestToInstall,
                signature: manifestToInstall.signature?.signature,
                publicKey: manifestToInstall.signature?.publicKey,
                algorithm: manifestToInstall.signature?.algorithm,
            });
        }
        // Check platform compatibility
        if (!semver_1.default.satisfies(this.platformVersion, manifestToInstall.engineVersion)) {
            throw new Error(`Plugin ${id} requires platform version ${manifestToInstall.engineVersion}, but current version is ${this.platformVersion}`);
        }
        // Resolve and check dependencies
        const compatibilityResult = await this.dependencyResolver.checkCompatibility(id, version);
        if (!compatibilityResult.compatible) {
            const errors = compatibilityResult.issues.filter(issue => issue.severity === 'error');
            throw new Error(`Plugin ${id} has compatibility issues:\n${errors.map(e => e.message).join('\n')}`);
        }
        // Create plugin metadata
        const metadata = {
            manifest: manifestToInstall,
            state: plugin_js_1.PluginState.UNLOADED,
            installedAt: new Date(),
            updatedAt: new Date(),
            config: {},
            stats: {
                downloads: 0,
                activeInstalls: 0,
                rating: 0,
                reviews: 0,
                errorCount: 0,
                successCount: 0,
            },
        };
        // Register plugin
        await this.registry.register(metadata);
        this.emit('plugin:installed', { pluginId: id, version });
    }
    /**
     * Enable and start a plugin
     */
    async enable(pluginId) {
        const metadata = await this.registry.get(pluginId);
        if (!metadata) {
            throw new Error(`Plugin ${pluginId} not found`);
        }
        if (this.plugins.has(pluginId)) {
            throw new Error(`Plugin ${pluginId} is already enabled`);
        }
        // Load plugin
        await this.registry.update(pluginId, { state: plugin_js_1.PluginState.LOADING });
        const plugin = await this.loader.load(pluginId, metadata.manifest.version);
        // Create plugin context
        const context = this.createPluginContext(metadata);
        // Initialize plugin
        await this.registry.update(pluginId, { state: plugin_js_1.PluginState.INITIALIZING });
        await plugin.initialize(context);
        // Start plugin
        await plugin.start();
        // Store plugin instance
        const instance = {
            plugin,
            metadata,
            context,
            startedAt: new Date(),
        };
        this.plugins.set(pluginId, instance);
        await this.registry.update(pluginId, {
            state: plugin_js_1.PluginState.ACTIVE,
            enabledAt: new Date(),
        });
        this.emit('plugin:enabled', { pluginId });
    }
    /**
     * Disable and stop a plugin
     */
    async disable(pluginId) {
        const instance = this.plugins.get(pluginId);
        if (!instance) {
            throw new Error(`Plugin ${pluginId} is not enabled`);
        }
        // Stop plugin
        await instance.plugin.stop();
        // Cleanup
        await instance.plugin.destroy();
        // Unload
        await this.loader.unload(pluginId);
        // Remove from active plugins
        this.plugins.delete(pluginId);
        await this.registry.update(pluginId, {
            state: plugin_js_1.PluginState.UNLOADED,
            disabledAt: new Date(),
        });
        this.emit('plugin:disabled', { pluginId });
    }
    /**
     * Uninstall a plugin
     */
    async uninstall(pluginId) {
        // Disable if enabled
        if (this.plugins.has(pluginId)) {
            await this.disable(pluginId);
        }
        // Unregister
        await this.registry.unregister(pluginId);
        this.emit('plugin:uninstalled', { pluginId });
    }
    /**
     * Update a plugin
     */
    async update(pluginId, newVersion) {
        const instance = this.plugins.get(pluginId);
        const wasEnabled = Boolean(instance);
        // Disable if enabled
        if (wasEnabled) {
            await this.disable(pluginId);
        }
        // Update version in registry (simplified - would fetch new manifest)
        await this.registry.update(pluginId, {
            updatedAt: new Date(),
        });
        // Re-enable if it was enabled
        if (wasEnabled) {
            await this.enable(pluginId);
        }
        this.emit('plugin:updated', { pluginId, version: newVersion });
    }
    /**
     * Hot reload a plugin
     */
    async reload(pluginId) {
        const instance = this.plugins.get(pluginId);
        if (!instance) {
            throw new Error(`Plugin ${pluginId} is not enabled`);
        }
        // Stop current instance
        await instance.plugin.stop();
        // Reload code
        await this.loader.reload(pluginId);
        // Load fresh instance
        const plugin = await this.loader.load(pluginId, instance.metadata.manifest.version);
        // Initialize and start
        await plugin.initialize(instance.context);
        await plugin.start();
        // Update instance
        instance.plugin = plugin;
        instance.startedAt = new Date();
        this.emit('plugin:reloaded', { pluginId });
    }
    /**
     * Get plugin instance
     */
    get(pluginId) {
        return this.plugins.get(pluginId);
    }
    /**
     * List all installed plugins
     */
    listInstalled() {
        return this.registry.list();
    }
    /**
     * List all enabled plugins
     */
    listEnabled() {
        return Array.from(this.plugins.values());
    }
    /**
     * Check plugin health
     */
    async checkHealth(pluginId) {
        const instance = this.plugins.get(pluginId);
        if (!instance || !instance.plugin.healthCheck) {
            return { healthy: false, message: 'Plugin not running or no health check' };
        }
        try {
            return await instance.plugin.healthCheck();
        }
        catch (error) {
            return {
                healthy: false,
                message: error instanceof Error ? error.message : 'Health check failed',
            };
        }
    }
    /**
     * Create plugin context
     */
    createPluginContext(metadata) {
        // This would be implemented with actual services
        return {
            pluginId: metadata.manifest.id,
            version: metadata.manifest.version,
            config: metadata.config,
            logger: this.createLogger(metadata.manifest.id),
            storage: this.createStorage(metadata.manifest.id),
            api: this.createAPI(metadata.manifest.id),
            events: this.createEventBus(metadata.manifest.id),
        };
    }
    /* eslint-disable no-console */
    createLogger(pluginId) {
        return {
            debug: (msg, meta) => console.debug(`[${pluginId}]`, msg, meta),
            info: (msg, meta) => console.info(`[${pluginId}]`, msg, meta),
            warn: (msg, meta) => console.warn(`[${pluginId}]`, msg, meta),
            error: (msg, error, meta) => console.error(`[${pluginId}]`, msg, error, meta),
        };
    }
    /* eslint-enable no-console */
    createStorage(_pluginId) {
        // Simplified storage - would use actual storage service
        const store = new Map();
        return {
            get: (key) => Promise.resolve(store.get(key) ?? null),
            set: (key, value) => {
                store.set(key, value);
                return Promise.resolve();
            },
            delete: (key) => {
                store.delete(key);
                return Promise.resolve();
            },
            has: (key) => Promise.resolve(store.has(key)),
            keys: () => Promise.resolve(Array.from(store.keys())),
            clear: () => {
                store.clear();
                return Promise.resolve();
            },
        };
    }
    createAPI(_pluginId) {
        return {
            request: (_endpoint, _options) => Promise.reject(new Error('Not implemented')),
            graphql: (_query, _variables) => Promise.reject(new Error('Not implemented')),
        };
    }
    createEventBus(_pluginId) {
        const emitter = new eventemitter3_1.default();
        return {
            on: (event, handler) => emitter.on(event, handler),
            off: (event, handler) => emitter.off(event, handler),
            emit: (event, ...args) => {
                emitter.emit(event, ...args);
                return Promise.resolve();
            },
            once: (event, handler) => emitter.once(event, handler),
        };
    }
    shouldVerify() {
        return String(process.env.PLUGIN_VERIFY_ENABLED).toLowerCase() === 'true';
    }
    validateManifest(manifest) {
        const result = schema_js_1.PluginManifestSchema.safeParse(manifest);
        if (!result.success) {
            throw new PluginManifestValidationError_js_1.PluginManifestValidationError(result.error);
        }
        return result.data;
    }
}
exports.PluginManager = PluginManager;
