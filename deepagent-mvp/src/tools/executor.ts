import { Tool } from './schemas';
import { checkPolicy } from '../agent/policies/opa';
import { logger } from '../observability/logging';

export class ToolExecutor {
  public async execute(tool: Tool, params: Record<string, any>, actor: string, tenantId: string): Promise<any> {
    const policyInput = {
      actor,
      tenant: tenantId,
      toolId: tool.name, // Using name for simplicity in the mock policy
      params,
    };

    logger.info('Checking OPA policy', { policyInput });
    const allow = await checkPolicy(policyInput);

    if (!allow) {
      logger.warn('OPA policy denied tool execution', { policyInput });
      throw new Error(`Policy violation: actor '${actor}' is not allowed to execute tool '${tool.name}'`);
    }

    logger.info('OPA policy approved tool execution', { policyInput });

    // This is a generic HTTP executor that uses the OpenAPI spec to make requests.
    // It is simplified for this MVP and assumes a single server and a single path with a POST operation.
    if (!tool.openapi.servers || !tool.openapi.servers[0] || !tool.openapi.paths) {
      throw new Error('Invalid OpenAPI spec: missing servers or paths.');
    }
    const server = tool.openapi.servers[0].url;
    const path = Object.keys(tool.openapi.paths)[0];
    const method = Object.keys(tool.openapi.paths[path])[0].toUpperCase();

    const url = `${server}${path}`;
    logger.info('Executing tool', { tool: tool.name, url, method, params });

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Tool execution failed with status ${response.status}: ${errorBody}`);
      }

      const result = await response.json();
      logger.info('Tool execution successful', { tool: tool.name, result });
      return result;
    } catch (error) {
      logger.error('Tool execution failed', { tool: tool.name, error: (error as any).message });
      throw error;
    }
  }
}
