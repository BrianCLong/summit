"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisualizationExtension = void 0;
const BaseExtension_js_1 = require("./BaseExtension.js");
/**
 * Base class for visualization plugins
 * Visualization plugins render UI components (via iframe/web component)
 */
class VisualizationExtension extends BaseExtension_js_1.BaseExtension {
    constructor(manifest) {
        super(manifest);
    }
    async onInitialize(context) {
        const metadata = this.getMetadata();
        this.log.info(`Initializing visualization plugin: ${metadata.name}`);
        await this.validatePermissions(context);
    }
    async onStart() {
        this.log.info('Visualization plugin started');
    }
    async onStop() {
        this.log.info('Visualization plugin stopped');
    }
    async onDestroy() {
        this.log.info('Visualization plugin cleaned up');
    }
    async validatePermissions(_context) {
        const requiredPermissions = ['ui:extensions'];
        const hasPermissions = requiredPermissions.every(perm => this.manifest.permissions.map(p => p.toString()).includes(perm));
        if (!hasPermissions) {
            throw new Error(`Visualization plugin ${this.manifest.id} missing required permissions: ${requiredPermissions.join(', ')}`);
        }
    }
}
exports.VisualizationExtension = VisualizationExtension;
