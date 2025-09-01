// Main Conductor Implementation
// Orchestrates MoE routing with MCP tool execution and security controls
import { moERouter } from './router';
import { mcpClient, executeToolAnywhere, initializeMCPClient } from './mcp/client';
import { v4 as uuid } from 'uuid';
export class Conductor {
    constructor(config) {
        this.config = config;
        this.activeTaskCount = 0;
        this.auditLog = [];
        // Initialize MCP client with default options
        initializeMCPClient({
            timeout: config.defaultTimeoutMs,
            retryAttempts: 3,
            retryDelay: 1000
        });
    }
    /**
     * Execute a task using the MoE system
     */
    async conduct(input) {
        // Check concurrency limits
        if (this.activeTaskCount >= this.config.maxConcurrentTasks) {
            throw new Error('Maximum concurrent tasks reached');
        }
        this.activeTaskCount++;
        const auditId = this.config.auditEnabled ? uuid() : undefined;
        const startTime = performance.now();
        try {
            // Route to expert
            const decision = moERouter.route(input);
            // Security check
            await this.validateSecurity(input, decision);
            // Execute with selected expert
            const result = await this.executeWithExpert(decision.expert, input, decision);
            const endTime = performance.now();
            const conductResult = {
                expertId: decision.expert,
                output: result.output,
                logs: result.logs,
                cost: result.cost || 0,
                latencyMs: Math.round(endTime - startTime),
                auditId
            };
            // Audit logging
            if (this.config.auditEnabled) {
                this.logAudit({
                    auditId,
                    input,
                    decision,
                    result: conductResult,
                    timestamp: new Date().toISOString()
                });
            }
            return conductResult;
        }
        catch (error) {
            const endTime = performance.now();
            const errorResult = {
                expertId: "LLM_LIGHT", // fallback
                output: null,
                logs: [`Error: ${error.message}`],
                cost: 0,
                latencyMs: Math.round(endTime - startTime),
                error: error.message,
                auditId
            };
            if (this.config.auditEnabled) {
                this.logAudit({
                    auditId,
                    input,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
            return errorResult;
        }
        finally {
            this.activeTaskCount--;
        }
    }
    /**
     * Preview routing decision without execution
     */
    previewRouting(input) {
        return moERouter.route(input);
    }
    /**
     * Validate security constraints
     */
    async validateSecurity(input, decision) {
        // PII/Secret data constraints
        if (input.sensitivity === "secret") {
            if (decision.expert === "LLM_LIGHT" || decision.expert === "LLM_HEAVY") {
                const llmConfig = decision.expert === "LLM_LIGHT"
                    ? this.config.llmProviders.light
                    : this.config.llmProviders.heavy;
                // Check if LLM provider has enterprise agreement for secret data
                if (!llmConfig?.endpoint.includes('enterprise')) {
                    throw new Error('Secret data cannot be processed by non-enterprise LLM providers');
                }
            }
        }
        // Check user permissions for tool usage
        if (input.userContext?.scopes) {
            const requiredScopes = this.getRequiredScopes(decision.expert);
            const userScopes = input.userContext.scopes;
            const hasPermission = requiredScopes.every(scope => userScopes.includes(scope));
            if (!hasPermission) {
                throw new Error(`Insufficient permissions for ${decision.expert}. Required: ${requiredScopes.join(', ')}`);
            }
        }
    }
    /**
     * Get required scopes for an expert
     */
    getRequiredScopes(expert) {
        const scopeMap = {
            "LLM_LIGHT": [],
            "LLM_HEAVY": [],
            "GRAPH_TOOL": ["graph:read"],
            "RAG_TOOL": ["data:read"],
            "FILES_TOOL": ["files:read"],
            "OSINT_TOOL": ["osint:read"],
            "EXPORT_TOOL": ["export:create"]
        };
        return scopeMap[expert] || [];
    }
    /**
     * Execute task with the selected expert
     */
    async executeWithExpert(expert, input, decision) {
        const logs = [`Routed to ${expert}: ${decision.reason}`];
        switch (expert) {
            case "GRAPH_TOOL":
                return this.executeGraphTool(input, logs);
            case "FILES_TOOL":
                return this.executeFilesTool(input, logs);
            case "OSINT_TOOL":
                return this.executeOsintTool(input, logs);
            case "EXPORT_TOOL":
                return this.executeExportTool(input, logs);
            case "RAG_TOOL":
                return this.executeRagTool(input, logs);
            case "LLM_LIGHT":
            case "LLM_HEAVY":
                return this.executeLLM(expert, input, logs);
            default:
                throw new Error(`Expert ${expert} not implemented`);
        }
    }
    /**
     * Execute graph operations via MCP
     */
    async executeGraphTool(input, logs) {
        logs.push("Executing graph operations via MCP");
        try {
            // Simple Cypher detection and execution
            if (input.task.toLowerCase().includes('cypher') || input.task.toLowerCase().includes('match')) {
                // Extract Cypher query from task (simplified)
                const cypherMatch = input.task.match(/(?:cypher|MATCH).*?(?:\n|$)/i);
                const cypher = cypherMatch ? cypherMatch[0] : input.task;
                const result = await executeToolAnywhere('graph.query', {
                    cypher: cypher,
                    params: {},
                    tenantId: input.investigationId
                }, input.userContext?.scopes);
                logs.push(`Graph query executed on server: ${result.serverName}`);
                return {
                    output: result.result,
                    logs,
                    cost: 0.001 // Fixed cost for graph operations
                };
            }
            else {
                // Algorithm execution
                const algName = this.detectAlgorithm(input.task);
                const result = await executeToolAnywhere('graph.alg', {
                    name: algName,
                    args: this.extractAlgorithmArgs(input.task),
                    tenantId: input.investigationId
                }, input.userContext?.scopes);
                logs.push(`Graph algorithm '${algName}' executed`);
                return {
                    output: result.result,
                    logs,
                    cost: 0.002
                };
            }
        }
        catch (error) {
            logs.push(`Graph operation failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Execute file operations via MCP
     */
    async executeFilesTool(input, logs) {
        logs.push("Executing file operations via MCP");
        try {
            if (input.task.toLowerCase().includes('search')) {
                const query = this.extractSearchQuery(input.task);
                const result = await executeToolAnywhere('files.search', {
                    query: query,
                    limit: 10
                }, input.userContext?.scopes);
                logs.push(`File search completed: ${result.result.results.length} files found`);
                return {
                    output: result.result,
                    logs,
                    cost: 0.001
                };
            }
            else if (input.task.toLowerCase().includes('read') || input.task.toLowerCase().includes('get')) {
                const filePath = this.extractFilePath(input.task);
                const result = await executeToolAnywhere('files.get', {
                    path: filePath,
                    encoding: 'utf8'
                }, input.userContext?.scopes);
                logs.push(`File read: ${filePath}`);
                return {
                    output: result.result,
                    logs,
                    cost: 0.0005
                };
            }
            else {
                // Default to file listing
                const result = await executeToolAnywhere('files.list', {
                    path: '.',
                    recursive: false
                }, input.userContext?.scopes);
                return {
                    output: result.result,
                    logs,
                    cost: 0.0002
                };
            }
        }
        catch (error) {
            logs.push(`File operation failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Execute OSINT operations (placeholder)
     */
    async executeOsintTool(input, logs) {
        logs.push("OSINT tool execution (mock)");
        // Mock OSINT result
        return {
            output: {
                query: input.task,
                sources: ["mock_source_1", "mock_source_2"],
                findings: ["Mock OSINT finding 1", "Mock OSINT finding 2"],
                confidence: 0.75
            },
            logs,
            cost: 0.005
        };
    }
    /**
     * Execute export operations (placeholder)
     */
    async executeExportTool(input, logs) {
        logs.push("Export tool execution (mock)");
        return {
            output: {
                format: "pdf",
                status: "generated",
                downloadUrl: "/api/exports/mock-report-123.pdf",
                size: "2.5MB"
            },
            logs,
            cost: 0.003
        };
    }
    /**
     * Execute RAG operations (placeholder)
     */
    async executeRagTool(input, logs) {
        logs.push("RAG tool execution (mock)");
        return {
            output: {
                answer: `Based on the investigation context, here is the response to: "${input.task}"`,
                sources: ["Document A", "Entity B", "Relationship C"],
                confidence: 0.85,
                citations: ["doc_1", "doc_2"]
            },
            logs,
            cost: 0.002
        };
    }
    /**
     * Execute LLM operations (placeholder)
     */
    async executeLLM(expert, input, logs) {
        const config = expert === "LLM_LIGHT"
            ? this.config.llmProviders.light
            : this.config.llmProviders.heavy;
        if (!config) {
            throw new Error(`${expert} provider not configured`);
        }
        logs.push(`Executing ${expert} with model: ${config.model}`);
        // Mock LLM execution
        const costPerToken = expert === "LLM_LIGHT" ? 0.0001 : 0.001;
        const estimatedTokens = Math.ceil(input.task.length / 4);
        return {
            output: {
                response: `Mock ${expert} response for: "${input.task}"`,
                model: config.model,
                usage: {
                    promptTokens: estimatedTokens,
                    completionTokens: estimatedTokens * 2,
                    totalTokens: estimatedTokens * 3
                }
            },
            logs,
            cost: costPerToken * estimatedTokens * 3
        };
    }
    // Helper methods for task parsing
    detectAlgorithm(task) {
        const lower = task.toLowerCase();
        if (lower.includes('pagerank'))
            return 'pagerank';
        if (lower.includes('community'))
            return 'community';
        if (lower.includes('shortest') || lower.includes('path'))
            return 'shortestPath';
        if (lower.includes('betweenness'))
            return 'betweenness';
        if (lower.includes('closeness'))
            return 'closeness';
        return 'pagerank'; // default
    }
    extractAlgorithmArgs(task) {
        // Simple args extraction (in production, this would be more sophisticated)
        return {};
    }
    extractSearchQuery(task) {
        const match = task.match(/search.*?for\s+["']([^"']+)["']/i);
        return match ? match[1] : task.split(' ').slice(-3).join(' ');
    }
    extractFilePath(task) {
        const match = task.match(/["']([^"']*\.[a-zA-Z0-9]+)["']/);
        return match ? match[1] : 'example.txt';
    }
    /**
     * Log audit events
     */
    logAudit(event) {
        this.auditLog.push(event);
        // In production, this would persist to database
        console.log('AUDIT:', JSON.stringify(event, null, 2));
    }
    /**
     * Get conductor statistics
     */
    getStats() {
        const routingStats = moERouter.getRoutingStats();
        return {
            activeTaskCount: this.activeTaskCount,
            auditLogSize: this.auditLog.length,
            routingStats,
            mcpConnectionStatus: mcpClient?.getConnectionStatus() || {},
            config: {
                maxConcurrentTasks: this.config.maxConcurrentTasks,
                enabledExperts: this.config.enabledExperts,
                auditEnabled: this.config.auditEnabled
            }
        };
    }
    /**
     * Shutdown conductor and cleanup resources
     */
    async shutdown() {
        console.log('Shutting down Conductor');
        // Wait for active tasks to complete (with timeout)
        const maxWait = 30000; // 30 seconds
        const startWait = Date.now();
        while (this.activeTaskCount > 0 && (Date.now() - startWait) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (this.activeTaskCount > 0) {
            console.warn(`Shutting down with ${this.activeTaskCount} active tasks`);
        }
        // Disconnect MCP clients
        if (mcpClient) {
            await mcpClient.disconnectAll();
        }
        console.log('Conductor shutdown complete');
    }
}
// Export singleton conductor instance (initialized in server startup)
export let conductor;
/**
 * Initialize conductor with configuration
 */
export function initializeConductor(config) {
    conductor = new Conductor(config);
}
//# sourceMappingURL=index.js.map