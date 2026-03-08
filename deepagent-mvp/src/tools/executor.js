"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolExecutor = void 0;
const opa_1 = require("../agent/policies/opa");
const logging_1 = require("../observability/logging");
class ToolExecutor {
    async execute(tool, params, actor, tenantId) {
        const policyInput = {
            actor,
            tenant: tenantId,
            toolId: tool.name, // Using name for simplicity in the mock policy
            params,
        };
        logging_1.logger.info('Checking OPA policy', { policyInput });
        const allow = await (0, opa_1.checkPolicy)(policyInput);
        if (!allow) {
            logging_1.logger.warn('OPA policy denied tool execution', { policyInput });
            throw new Error(`Policy violation: actor '${actor}' is not allowed to execute tool '${tool.name}'`);
        }
        logging_1.logger.info('OPA policy approved tool execution', { policyInput });
        // This is a generic HTTP executor that uses the OpenAPI spec to make requests.
        // It is simplified for this MVP and assumes a single server and a single path with a POST operation.
        if (!tool.openapi.servers || !tool.openapi.servers[0] || !tool.openapi.paths) {
            throw new Error('Invalid OpenAPI spec: missing servers or paths.');
        }
        const server = tool.openapi.servers[0].url;
        const path = Object.keys(tool.openapi.paths)[0];
        const method = Object.keys(tool.openapi.paths[path])[0].toUpperCase();
        const url = `${server}${path}`;
        logging_1.logger.info('Executing tool', { tool: tool.name, url, method, params });
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
            logging_1.logger.info('Tool execution successful', { tool: tool.name, result });
            return result;
        }
        catch (error) {
            logging_1.logger.error('Tool execution failed', { tool: tool.name, error: error.message });
            throw error;
        }
    }
}
exports.ToolExecutor = ToolExecutor;
