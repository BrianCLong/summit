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
exports.DefaultPluginLoader = void 0;
/**
 * Plugin loader with sandboxing and isolation
 */
class DefaultPluginLoader {
    loadedPlugins = new Map();
    pluginPaths = new Map();
    sandbox;
    constructor(sandbox) {
        this.sandbox = sandbox;
    }
    /**
     * Register a plugin path
     */
    registerPath(pluginId, path) {
        this.pluginPaths.set(pluginId, path);
    }
    /**
     * Load a plugin
     */
    async load(pluginId, version) {
        const key = version ? `${pluginId}@${version}` : pluginId;
        // Check if already loaded
        if (this.loadedPlugins.has(key)) {
            return this.loadedPlugins.get(key).plugin;
        }
        // Get plugin path
        const path = this.pluginPaths.get(pluginId);
        if (!path) {
            throw new Error(`Plugin path not registered for ${pluginId}`);
        }
        // Load manifest
        const manifest = await this.loadManifest(path);
        // Validate version if specified
        if (version && manifest.version !== version) {
            throw new Error(`Version mismatch: requested ${version}, found ${manifest.version}`);
        }
        // Load plugin code in sandbox
        const plugin = await this.sandbox.loadPlugin(path, manifest);
        // Cache loaded plugin
        this.loadedPlugins.set(key, {
            plugin,
            manifest,
            path,
            loadedAt: new Date(),
        });
        return plugin;
    }
    /**
     * Unload a plugin
     */
    async unload(pluginId) {
        const loaded = this.loadedPlugins.get(pluginId);
        if (!loaded) {
            return;
        }
        // Cleanup sandbox
        await this.sandbox.unloadPlugin(pluginId);
        this.loadedPlugins.delete(pluginId);
    }
    /**
     * Reload a plugin (for hot-reloading)
     */
    async reload(pluginId) {
        const loaded = this.loadedPlugins.get(pluginId);
        if (!loaded) {
            throw new Error(`Plugin ${pluginId} is not loaded`);
        }
        // Unload current version
        await this.unload(pluginId);
        // Clear require cache for the plugin (Node.js specific)
        this.clearRequireCache(loaded.path);
        // Will be reloaded on next load() call
    }
    /**
     * Check if plugin is loaded
     */
    isLoaded(pluginId) {
        return this.loadedPlugins.has(pluginId);
    }
    /**
     * Get all loaded plugins
     */
    getLoadedPlugins() {
        const result = new Map();
        for (const [key, loaded] of this.loadedPlugins.entries()) {
            result.set(key, loaded.plugin);
        }
        return result;
    }
    /**
     * Load plugin manifest
     */
    async loadManifest(pluginPath) {
        try {
            const manifestPath = `${pluginPath}/plugin.json`;
            const { default: manifest } = await Promise.resolve(`${manifestPath}`).then(s => __importStar(require(s)));
            return manifest;
        }
        catch (error) {
            throw new Error(`Failed to load plugin manifest from ${pluginPath}: ${error}`);
        }
    }
    /**
     * Clear Node.js require cache for a module
     */
    clearRequireCache(pluginPath) {
        // Find all cached modules from this plugin
        const cacheKeys = Object.keys(require.cache).filter(key => key.startsWith(pluginPath));
        // Delete from cache
        for (const key of cacheKeys) {
            delete require.cache[key];
        }
    }
}
exports.DefaultPluginLoader = DefaultPluginLoader;
