import { BaseConnector } from './base-connector';
import { Connector, ConnectorContext, ToolDefinition } from './types';

export abstract class ActionConnector extends BaseConnector implements Connector {
  abstract getTools(): Promise<ToolDefinition[]>;

  protected abstract implementExecute(toolName: string, args: any, context: ConnectorContext): Promise<any>;

  async execute(toolName: string, args: any, context: ConnectorContext): Promise<any> {
    this.ensureInitialized();
    // Simple retry logic can be added here or in the concrete implementation.
    // For now, delegating to implementation.
    return this.implementExecute(toolName, args, context);
  }

  async dryRun(toolName: string, args: any, context: ConnectorContext): Promise<any> {
    return {
      description: `[Dry Run] Would execute tool '${toolName}' on connector '${this.manifest.name}'`,
      args,
      estimatedImpact: 'unknown'
    };
  }
}
