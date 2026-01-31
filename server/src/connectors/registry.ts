
import { BaseConnector } from './base.js';
import { ConnectorConfig } from './types.js';

export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private connectorClasses: Map<string, new (config: ConnectorConfig) => BaseConnector> = new Map();
  private activeConnectors: Map<string, BaseConnector> = new Map();

  private constructor() {}

  static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
    }
    return ConnectorRegistry.instance;
  }

  register(type: string, connectorClass: new (config: ConnectorConfig) => BaseConnector): void {
    this.connectorClasses.set(type, connectorClass);
  }

  createConnector(config: ConnectorConfig): BaseConnector {
    const ConnectorClass = this.connectorClasses.get(config.type);
    if (!ConnectorClass) {
      throw new Error(`Unknown connector type: ${config.type}`);
    }
    const connector = new ConnectorClass(config);
    this.activeConnectors.set(config.id, connector);
    return connector;
  }

  getConnector(id: string): BaseConnector | undefined {
    return this.activeConnectors.get(id);
  }

  async closeConnector(id: string): Promise<void> {
    const connector = this.activeConnectors.get(id);
    if (connector) {
      await connector.disconnect();
      this.activeConnectors.delete(id);
    }
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.connectorClasses.keys());
  }
}
