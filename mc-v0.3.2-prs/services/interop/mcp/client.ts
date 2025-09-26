// services/interop/mcp/client.ts
// MC v0.3.2 - MCP Client for calling external MCP servers

import { logger } from '../../config/logger';
import { enforcePolicy, PolicyContext, PolicyAction } from '../policy-wrapper';

export interface MCPClientConfig {
  endpoint: string;
  apiKey?: string;
  timeout: number;
  retries: number;
}

export interface MCPRequest {
  tool: string;
  context: PolicyContext;
  parameters: Record<string, any>;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
  auditEventId?: string;
}

/**
 * MCP Client - calls external MCP servers through policy enforcement
 */
export class MCPClient {
  constructor(private config: MCPClientConfig) {}

  async callTool(request: MCPRequest): Promise<MCPResponse> {
    const startTime = Date.now();

    try {
      // Policy enforcement before external call
      const action: PolicyAction = {
        kind: 'mcp',
        resource: request.tool,
        method: 'POST',
        parameters: request.parameters
      };

      const policyResult = await enforcePolicy(request.context, action);
      if (!policyResult.allowed) {
        return {
          success: false,
          error: 'POLICY_DENIED',
          auditEventId: policyResult.auditEventId
        };
      }

      // Make external MCP call
      const response = await this.makeRequest({
        method: 'POST',
        path: `/mcp/tools/${request.tool}`,
        body: {
          context: request.context,
          parameters: request.parameters
        }
      });

      logger.info('MCP external call completed', {
        tool: request.tool,
        tenant: request.context.tenantId,
        duration_ms: Date.now() - startTime,
        success: response.success
      });

      return {
        success: true,
        data: response.data,
        auditEventId: policyResult.auditEventId
      };

    } catch (error) {
      logger.error('MCP client error', {
        error: error.message,
        tool: request.tool,
        tenant: request.context.tenantId,
        duration_ms: Date.now() - startTime
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  private async makeRequest(options: {
    method: string;
    path: string;
    body?: any;
  }): Promise<any> {
    const url = `${this.config.endpoint}${options.path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'MC-Platform-MCP-Client/v0.3.2'
    };

    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } finally {
      clearTimeout(timeoutId);
    }
  }
}
