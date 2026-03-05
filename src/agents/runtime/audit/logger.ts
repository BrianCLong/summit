import { ExecutionAuditLogger, ExecutionResult } from '../types';

export class ConsoleAuditLogger implements ExecutionAuditLogger {
  private readonly NEVER_LOG_KEYS = ['api_key', 'access_token', 'credentials', 'secret', 'password', 'token'];

  private redactSensitiveData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'object') {
      if (Array.isArray(data)) {
        return data.map(item => this.redactSensitiveData(item));
      }

      const redacted: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (this.NEVER_LOG_KEYS.some(k => key.toLowerCase().includes(k))) {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = this.redactSensitiveData(value);
        }
      }
      return redacted;
    }

    return data;
  }

  logStart(agentId: string): void {
    console.log(JSON.stringify({
      event: 'execution.start',
      agent_id: agentId,
      timestamp: new Date().toISOString()
    }));
  }

  logToolCall(agentId: string, toolName: string, args: any): void {
    console.log(JSON.stringify({
      event: 'execution.tool_call',
      agent_id: agentId,
      tool: toolName,
      args: this.redactSensitiveData(args),
      timestamp: new Date().toISOString()
    }));
  }

  logPolicyBlock(agentId: string, toolName: string, reason: string): void {
    console.warn(JSON.stringify({
      event: 'execution.policy_block',
      agent_id: agentId,
      tool: toolName,
      reason: reason,
      timestamp: new Date().toISOString()
    }));
  }

  logFinish(agentId: string, result: ExecutionResult): void {
    console.log(JSON.stringify({
      event: 'execution.finish',
      agent_id: agentId,
      status: result.status,
      metrics: result.metrics,
      error: result.error,
      // Note: Full tool output might contain PII, so we redact it or log separately in production
      output_summary: result.output ? 'Output generated' : 'No output',
      timestamp: new Date().toISOString()
    }));
  }
}
