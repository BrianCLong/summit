"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorExtension = void 0;
const BaseExtension_js_1 = require("./BaseExtension.js");
/**
 * Base class for connector plugins
 * Connectors integrate external data sources and ingest data
 */
class ConnectorExtension extends BaseExtension_js_1.BaseExtension {
    constructor(manifest) {
        super(manifest);
    }
    async onInitialize(context) {
        const metadata = this.getMetadata();
        this.log.info(`Initializing connector plugin: ${metadata.name}`);
        await this.validatePermissions(context);
    }
    async onStart() {
        this.log.info('Connector plugin started');
    }
    async onStop() {
        this.log.info('Connector plugin stopped');
    }
    async onDestroy() {
        this.log.info('Connector plugin cleaned up');
    }
    async validatePermissions(_context) {
        const requiredPermissions = ['network:access', 'write:data'];
        const hasPermissions = requiredPermissions.every(perm => this.manifest.permissions.map(p => p.toString()).includes(perm));
        if (!hasPermissions) {
            throw new Error(`Connector plugin ${this.manifest.id} missing required permissions: ${requiredPermissions.join(', ')}`);
        }
    }
}
exports.ConnectorExtension = ConnectorExtension;
