"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorRegistry = void 0;
class ConnectorRegistry {
    static instance;
    connectorClasses = new Map();
    activeConnectors = new Map();
    constructor() { }
    static getInstance() {
        if (!ConnectorRegistry.instance) {
            ConnectorRegistry.instance = new ConnectorRegistry();
        }
        return ConnectorRegistry.instance;
    }
    register(type, connectorClass) {
        this.connectorClasses.set(type, connectorClass);
    }
    createConnector(config) {
        const ConnectorClass = this.connectorClasses.get(config.type);
        if (!ConnectorClass) {
            throw new Error(`Unknown connector type: ${config.type}`);
        }
        const connector = new ConnectorClass(config);
        this.activeConnectors.set(config.id, connector);
        return connector;
    }
    getConnector(id) {
        return this.activeConnectors.get(id);
    }
    async closeConnector(id) {
        const connector = this.activeConnectors.get(id);
        if (connector) {
            await connector.disconnect();
            this.activeConnectors.delete(id);
        }
    }
    getRegisteredTypes() {
        return Array.from(this.connectorClasses.keys());
    }
}
exports.ConnectorRegistry = ConnectorRegistry;
