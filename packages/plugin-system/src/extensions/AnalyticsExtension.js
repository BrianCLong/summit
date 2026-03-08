"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsExtension = void 0;
const BaseExtension_js_1 = require("./BaseExtension.js");
/**
 * Base class for analytics plugins
 * Analytics plugins have read-only access to graph data and provide insights
 */
class AnalyticsExtension extends BaseExtension_js_1.BaseExtension {
    constructor(manifest) {
        super(manifest);
    }
    async onInitialize(context) {
        // Verify analytics plugin has required permissions
        const metadata = this.getMetadata();
        this.log.info(`Initializing analytics plugin: ${metadata.name}`);
        await this.validatePermissions(context);
    }
    async onStart() {
        this.log.info('Analytics plugin started and ready to process requests');
    }
    async onStop() {
        this.log.info('Analytics plugin stopped');
    }
    async onDestroy() {
        this.log.info('Analytics plugin cleaned up');
    }
    /**
     * Validate plugin has necessary permissions
     */
    async validatePermissions(_context) {
        const requiredPermissions = ['read:data', 'access:graph'];
        const hasPermissions = requiredPermissions.every(perm => this.manifest.permissions.map(p => p.toString()).includes(perm));
        if (!hasPermissions) {
            throw new Error(`Analytics plugin ${this.manifest.id} missing required permissions: ${requiredPermissions.join(', ')}`);
        }
    }
}
exports.AnalyticsExtension = AnalyticsExtension;
