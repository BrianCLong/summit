"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePlugin = void 0;
class BasePlugin {
    manifest;
    constructor(manifest) {
        this.manifest = manifest;
    }
    /**
     * Initialize the plugin with configuration.
     * Plugins should override this to perform setup.
     */
    async init(config) {
        // Default implementation: no-op
    }
    /**
     * Check the health of the plugin.
     * Plugins should override this to provide detailed status.
     */
    async health() {
        return { status: 'ok' };
    }
    /**
     * Gracefully shutdown the plugin.
     * Plugins should override this to cleanup resources.
     */
    async shutdown() {
        // Default implementation: no-op
    }
}
exports.BasePlugin = BasePlugin;
