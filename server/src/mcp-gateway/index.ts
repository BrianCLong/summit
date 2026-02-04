import { PolicyEngine } from './policy.js';
import { AuditLogger } from './audit.js';

interface MCPRequest {
  jsonrpc: string;
  method: string;
  params: any;
  id: string | number;
}

export class MCPGateway {
  private policyEngine: PolicyEngine;
  private auditLogger: AuditLogger;

  constructor() {
    this.policyEngine = new PolicyEngine();
    this.auditLogger = new AuditLogger();
  }

  async handleRequest(request: MCPRequest, userId: string, traceId: string): Promise<any> {
    // Basic validation
    if (request.jsonrpc !== '2.0') {
      return { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: request.id };
    }

    const toolId = request.method === 'tools/call' ? request.params?.name : undefined;
    const resourceId = request.method === 'resources/read' ? request.params?.uri : undefined;

    // Check Policy
    const allowed = await this.policyEngine.checkPolicy({
      userId,
      traceId,
      toolId,
      resourceId
    });

    const auditEvent = {
        timestamp: new Date().toISOString(),
        userId,
        traceId,
        action: toolId ? 'tool_execution' : 'resource_access',
        targetId: toolId || resourceId || 'unknown',
        status: allowed ? 'allowed' : 'denied' as 'allowed' | 'denied',
        details: { method: request.method, params: request.params }
    };

    await this.auditLogger.log(auditEvent);

    if (!allowed) {
      return {
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Access Denied by MCP Policy' },
        id: request.id
      };
    }

    // Forward to actual handler (mocked for now)
    return {
      jsonrpc: '2.0',
      result: { status: 'success', data: 'Mock execution result' },
      id: request.id
    };
  }
}
