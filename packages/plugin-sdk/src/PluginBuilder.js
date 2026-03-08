"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginBuilder = void 0;
exports.createPlugin = createPlugin;
/**
 * Builder class for creating plugins with fluent API
 */
class PluginBuilder {
    manifest = {
        permissions: [],
        extensionPoints: [],
        webhooks: [],
        apiEndpoints: [],
    };
    initHandler;
    startHandler;
    stopHandler;
    destroyHandler;
    healthCheckHandler;
    /**
     * Set plugin metadata
     */
    withMetadata(metadata) {
        Object.assign(this.manifest, metadata);
        return this;
    }
    /**
     * Set main entry point
     */
    withMain(main) {
        this.manifest.main = main;
        return this;
    }
    /**
     * Add required platform version
     */
    requiresEngine(version) {
        this.manifest.engineVersion = version;
        return this;
    }
    /**
     * Add permission
     */
    requestPermission(permission) {
        if (!this.manifest.permissions) {
            this.manifest.permissions = [];
        }
        if (!this.manifest.permissions.includes(permission)) {
            this.manifest.permissions.push(permission);
        }
        return this;
    }
    /**
     * Add multiple permissions
     */
    requestPermissions(...permissions) {
        permissions.forEach(p => this.requestPermission(p));
        return this;
    }
    /**
     * Set resource limits
     */
    withResources(resources) {
        this.manifest.resources = {
            maxMemoryMB: resources.maxMemoryMB || 256,
            maxCpuPercent: resources.maxCpuPercent || 50,
            maxStorageMB: resources.maxStorageMB || 100,
            maxNetworkMbps: resources.maxNetworkMbps || 10,
        };
        return this;
    }
    /**
     * Add extension point
     */
    providesExtensionPoint(extensionPoint) {
        if (!this.manifest.extensionPoints) {
            this.manifest.extensionPoints = [];
        }
        this.manifest.extensionPoints.push(extensionPoint);
        return this;
    }
    /**
     * Add webhook handler
     */
    onWebhook(event, handler) {
        if (!this.manifest.webhooks) {
            this.manifest.webhooks = [];
        }
        this.manifest.webhooks.push({ event, handler });
        return this;
    }
    /**
     * Add API endpoint
     */
    addEndpoint(endpoint) {
        if (!this.manifest.apiEndpoints) {
            this.manifest.apiEndpoints = [];
        }
        this.manifest.apiEndpoints.push(endpoint);
        return this;
    }
    /**
     * Set initialization handler
     */
    onInitialize(handler) {
        this.initHandler = handler;
        return this;
    }
    /**
     * Set start handler
     */
    onStart(handler) {
        this.startHandler = handler;
        return this;
    }
    /**
     * Set stop handler
     */
    onStop(handler) {
        this.stopHandler = handler;
        return this;
    }
    /**
     * Set destroy handler
     */
    onDestroy(handler) {
        this.destroyHandler = handler;
        return this;
    }
    /**
     * Set health check handler
     */
    withHealthCheck(handler) {
        this.healthCheckHandler = handler;
        return this;
    }
    /**
     * Build the plugin
     */
    build() {
        // Validate required fields
        if (!this.manifest.id)
            throw new Error('Plugin ID is required');
        if (!this.manifest.name)
            throw new Error('Plugin name is required');
        if (!this.manifest.version)
            throw new Error('Plugin version is required');
        if (!this.manifest.description)
            throw new Error('Plugin description is required');
        if (!this.manifest.author)
            throw new Error('Plugin author is required');
        if (!this.manifest.license)
            throw new Error('Plugin license is required');
        if (!this.manifest.category)
            throw new Error('Plugin category is required');
        if (!this.manifest.main)
            throw new Error('Plugin main entry point is required');
        if (!this.manifest.engineVersion)
            throw new Error('Engine version is required');
        const manifest = this.manifest;
        return {
            manifest,
            initialize: this.initHandler || (async () => { }),
            start: this.startHandler || (async () => { }),
            stop: this.stopHandler || (async () => { }),
            destroy: this.destroyHandler || (async () => { }),
            healthCheck: this.healthCheckHandler,
        };
    }
}
exports.PluginBuilder = PluginBuilder;
/**
 * Create a new plugin builder
 */
function createPlugin() {
    return new PluginBuilder();
}
