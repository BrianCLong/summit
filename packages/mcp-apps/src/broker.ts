import { McpUiResource } from './types.js';

export interface UiAction {
  method: string;
  params: any;
  id: string;
  context?: Record<string, any>;
}

export interface PolicyResult {
  allow: boolean;
  reason?: string;
}

/**
 * Broker for UI-to-Host communication via postMessage
 */
export class McpUiBroker {
  private handlers: Map<string, (params: any) => Promise<any>> = new Map();

  constructor(
    private readonly opaClient?: { evaluate: (input: any) => Promise<PolicyResult> },
    private readonly provenanceClient?: { logAction: (action: any) => Promise<void> }
  ) {
    this.registerDefaultHandlers();
  }

  /**
   * Register a handler for a UI-originated method
   */
  public registerHandler(method: string, handler: (params: any) => Promise<any>) {
    this.handlers.set(method, handler);
  }

  /**
   * Handle an incoming message from the sandboxed iframe
   */
  public async handleMessage(
    message: any,
    origin: string,
    source: { postMessage: (message: any, targetOrigin: string) => void } | null
  ): Promise<void> {
    if (!message || message.jsonrpc !== '2.0' || !message.method) {
      return;
    }

    const action: UiAction = message;

    try {
      // Step 5: OPA Policy Evaluation
      const policyResult = await this.evaluatePolicy(action);
      if (!policyResult.allow) {
        throw new Error(`Policy Denied: ${policyResult.reason || 'Unauthorized action'}`);
      }

      const result = await this.executeAction(action);

      // Step 6: Provenance Logging
      if (this.provenanceClient) {
        await this.provenanceClient.logAction({
          type: 'UI_ACTION',
          method: action.method,
          params: action.params,
          result: result,
          timestamp: new Date().toISOString()
        });
      }

      if (source && action.id) {
        source.postMessage({
          jsonrpc: '2.0',
          id: action.id,
          result
        }, origin);
      }
    } catch (error: any) {
      if (source && action.id) {
        source.postMessage({
          jsonrpc: '2.0',
          id: action.id,
          error: {
            code: -32000,
            message: error.message
          }
        }, origin);
      }
    }
  }

  private async executeAction(action: UiAction): Promise<any> {
    const handler = this.handlers.get(action.method);
    if (!handler) {
      throw new Error(`Method not found: ${action.method}`);
    }
    return await handler(action.params);
  }

  private async evaluatePolicy(action: UiAction): Promise<PolicyResult> {
    if (!this.opaClient) {
      // Default to allow if OPA is not configured (for development)
      // In production, this should be mandatory
      return { allow: true };
    }

    try {
      return await this.opaClient.evaluate({
        action: action.method,
        params: action.params,
        context: action.context
      });
    } catch (error: any) {
      return { allow: false, reason: `Policy check failed: ${error.message}` };
    }
  }

  private registerDefaultHandlers() {
    this.registerHandler('ping', async () => 'pong');
  }
}
