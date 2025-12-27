export interface ExtensionManifest {
  id: string;
  version: string;
  type: 'agent' | 'analytics' | 'datasource';
  name: string;
  description: string;
  author: string;
  capabilities: string[];
  permissions: string[];
  dependencies?: Record<string, string>;
}

export interface ExtensionContext {
  tenantId: string;
  logger: any; // Using explicit type in real code
  config: Record<string, any>;
}

export interface Extension {
  manifest: ExtensionManifest;

  /**
   * Initialize the extension.
   * This is where you should set up any resources, connections, or subscriptions.
   */
  initialize(context: ExtensionContext): Promise<void>;

  /**
   * Shutdown the extension.
   * Clean up resources, close connections.
   */
  shutdown(): Promise<void>;

  /**
   * Health check.
   */
  health(): Promise<{ status: 'healthy' | 'unhealthy' | 'degraded'; details?: any }>;
}

export interface AgentExtension extends Extension {
  manifest: ExtensionManifest & { type: 'agent' };
  execute(task: string, context: ExtensionContext): Promise<any>;
}

export interface AnalyticsExtension extends Extension {
  manifest: ExtensionManifest & { type: 'analytics' };
  analyze(data: any, context: ExtensionContext): Promise<any>;
}
