"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpUiBroker = void 0;
/**
 * Broker for UI-to-Host communication via postMessage
 */
class McpUiBroker {
    opaClient;
    provenanceClient;
    handlers = new Map();
    constructor(opaClient, provenanceClient) {
        this.opaClient = opaClient;
        this.provenanceClient = provenanceClient;
        this.registerDefaultHandlers();
    }
    /**
     * Register a handler for a UI-originated method
     */
    registerHandler(method, handler) {
        this.handlers.set(method, handler);
    }
    /**
     * Handle an incoming message from the sandboxed iframe
     */
    async handleMessage(message, origin, source) {
        if (!message || message.jsonrpc !== '2.0' || !message.method) {
            return;
        }
        const action = message;
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
        }
        catch (error) {
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
    async executeAction(action) {
        const handler = this.handlers.get(action.method);
        if (!handler) {
            throw new Error(`Method not found: ${action.method}`);
        }
        return await handler(action.params);
    }
    async evaluatePolicy(action) {
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
        }
        catch (error) {
            return { allow: false, reason: `Policy check failed: ${error.message}` };
        }
    }
    registerDefaultHandlers() {
        this.registerHandler('ping', async () => 'pong');
    }
}
exports.McpUiBroker = McpUiBroker;
