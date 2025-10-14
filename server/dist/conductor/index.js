// Main Conductor Implementation
// Orchestrates MoE routing with MCP tool execution and security controls
import { moERouter } from './router';
import { mcpClient, executeToolAnywhere, initializeMCPClient } from './mcp/client';
import { randomUUID as uuid } from 'crypto';
import { createBudgetController } from './admission/budget-control';
import { runsRepo } from '../maestro/runs/runs-repo.js'; // Import runsRepo
import Redis from 'ioredis'; // Assuming Redis is used for budget control
import { ConductorCache } from './cache';
import { createHash } from 'crypto';
import { registerBuiltins, runPlugin } from '../plugins/index.js';
import { checkResidency } from '../policy/opaClient.js';
import { checkQuota, accrueUsage } from './quotas.js';
export class Conductor {
    constructor(config) {
        this.config = config;
        this.activeTaskCount = 0;
        this.queue = [];
        this.auditLog = []; // Keep existing auditLog
        // Initialize MCP client with default options
        initializeMCPClient({
            timeout: config.defaultTimeoutMs,
            retryAttempts: 3,
            retryDelay: 1000,
        });
        // Initialize budget controller
        // In a real application, Redis client should be injected or managed globally
        const redisClient = new Redis();
        this.budgetController = createBudgetController(redisClient);
        this.cache = new ConductorCache();
        try {
            registerBuiltins();
        }
        catch { }
    }
    /**
     * Execute a task using the MoE system
     */
    async conduct(input) {
        if (this.activeTaskCount >= this.config.maxConcurrentTasks) {
            return new Promise((resolve, reject) => {
                this.queue.push({ input, resolve, reject });
            });
        }
        this.activeTaskCount++;
        const auditId = this.config.auditEnabled ? uuid() : undefined;
        const startTime = performance.now();
        // Determine tenantId for budget control
        const tenantId = input.userContext?.tenantId || input.userContext?.tenant || 'global';
        try {
            // Quotas admission
            const q = await checkQuota(tenantId);
            if (!q.allow) {
                throw new Error(q.reason || 'quota denied');
            }
            // Fetch current run cost for preemption check
            let currentRunCost = 0;
            if (input.runId) {
                const runRecord = await runsRepo.get(input.runId, tenantId);
                if (runRecord) {
                    currentRunCost = runRecord.cost || 0;
                }
            }
            // Route to expert
            const decision = moERouter.route(input);
            // Cache lookup (if enabled)
            const cacheEnabled = (process.env.CACHE_ENABLED ?? 'true').toLowerCase() === 'true';
            const tenantForCache = input.userContext?.tenantId || input.userContext?.tenant || 'unknown';
            let cached = null;
            let cacheKey = '';
            if (cacheEnabled) {
                cacheKey = this.makeCacheKey(decision.expert, input);
                const hit = await this.cache.lookup(cacheKey, tenantForCache);
                if (hit) {
                    try {
                        const output = JSON.parse(hit.body.toString('utf8'));
                        const endTime = performance.now();
                        const conductResult = {
                            expertId: decision.expert,
                            output,
                            logs: [`cache:hit key=${cacheKey}`],
                            cost: 0,
                            latencyMs: Math.round(endTime - startTime),
                            auditId,
                        };
                        if (this.config.auditEnabled) {
                            this.logAudit({ auditId, input, decision, result: conductResult, cache: 'hit', timestamp: new Date().toISOString() });
                        }
                        return conductResult;
                    }
                    catch { }
                }
            }
            // Placeholder for estimated cost of the current task
            const estimatedTaskCost = 0.01;
            // Perform budget admission check for the current task + accumulated run cost
            const admissionDecision = await this.budgetController.admit(decision.expert, estimatedTaskCost, {
                userId: input.userContext?.userId,
                tenantId: tenantId,
            });
            if (!admissionDecision.admit) {
                // Preempt the run if budget is exceeded
                if (input.runId) {
                    await runsRepo.update(input.runId, { status: 'failed', error_message: 'Budget cap exceeded' }, tenantId);
                    this.logAudit({
                        auditId,
                        input,
                        event: 'run_preempted',
                        reason: 'Budget cap exceeded',
                        runId: input.runId,
                        timestamp: new Date().toISOString(),
                    });
                }
                throw new Error(`Budget admission denied: ${admissionDecision.reason}`);
            }
            // Residency + security gates
            const residency = input.userContext?.residency || undefined;
            const region = input.userContext?.region || this.config?.llmProviders?.light?.endpoint?.match(/(eu|us\-east|us\-west)/)?.[1];
            if (residency) {
                const r = await checkResidency({ region, residency });
                if (!r.allow) {
                    throw new Error(`Residency gate denied: ${r.reason || `${region} vs ${residency}`}`);
                }
            }
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
                auditId,
            };
            // Cache write (best-effort)
            if (cacheEnabled && cacheKey) {
                try {
                    const buf = Buffer.from(JSON.stringify(conductResult.output ?? null));
                    await this.cache.write(cacheKey, buf, { expert: decision.expert, ts: Date.now() }, undefined, tenantForCache);
                    conductResult.logs.push(`cache:set key=${cacheKey}`);
                }
                catch { }
            }
            // Usage accrual (runs count now, resource metrics TBD)
            try {
                await accrueUsage(tenantId, { runInc: true });
            }
            catch { }
            // Record actual spending for the task
            if (result.cost) {
                await this.budgetController.recordSpending(decision.expert, result.cost, {
                    userId: input.userContext?.userId,
                    tenantId: tenantId,
                });
            }
            // Audit logging
            if (this.config.auditEnabled) {
                this.logAudit({
                    auditId,
                    input,
                    decision,
                    result: conductResult,
                    timestamp: new Date().toISOString(),
                });
            }
            return conductResult;
        }
        catch (error) {
            const endTime = performance.now();
            const redacted = (s) => s.replace(/(api[_-]?key|token|secret)\s*[:=]\s*["']?([A-Za-z0-9\-_]{4,})["']?/gi, (_m, k) => `${k}: ****`);
            const errorResult = {
                expertId: 'LLM_LIGHT', // fallback
                output: null,
                logs: [`Error: ${redacted(error.message || String(error))}`],
                cost: 0,
                latencyMs: Math.round(endTime - startTime),
                error: error.message,
                auditId,
            };
            if (this.config.auditEnabled) {
                this.logAudit({
                    auditId,
                    input,
                    error: redacted(error.message || String(error)),
                    timestamp: new Date().toISOString(),
                });
            }
            return errorResult;
        }
        finally {
            this.activeTaskCount--;
            // drain one from queue
            const next = this.queue.shift();
            if (next) {
                this.conduct(next.input).then(next.resolve).catch(next.reject);
            }
        }
    }
    makeCacheKey(expert, input) {
        const basis = JSON.stringify({ expert, task: input.task, dataRefs: input.dataRefs, ctx: input.userContext });
        return createHash('sha1').update(basis).digest('hex');
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
        if (input.sensitivity === 'secret') {
            if (decision.expert === 'LLM_LIGHT' || decision.expert === 'LLM_HEAVY') {
                const llmConfig = decision.expert === 'LLM_LIGHT'
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
            const hasPermission = requiredScopes.every((scope) => userScopes.includes(scope));
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
            LLM_LIGHT: [],
            LLM_HEAVY: [],
            GRAPH_TOOL: ['graph:read'],
            RAG_TOOL: ['data:read'],
            FILES_TOOL: ['files:read'],
            OSINT_TOOL: ['osint:read'],
            EXPORT_TOOL: ['export:create'],
        };
        return scopeMap[expert] || [];
    }
    /**
     * Execute task with the selected expert
     */
    async executeWithExpert(expert, input, decision) {
        const logs = [`Routed to ${expert}: ${decision.reason}`];
        switch (expert) {
            case 'GRAPH_TOOL':
                return this.executeGraphTool(input, logs);
            case 'FILES_TOOL':
                return this.executeFilesTool(input, logs);
            case 'OSINT_TOOL':
                return this.executeOsintTool(input, logs);
            case 'EXPORT_TOOL':
                return this.executeExportTool(input, logs);
            case 'RAG_TOOL':
                return this.executeRagTool(input, logs);
            case 'LLM_LIGHT':
            case 'LLM_HEAVY':
                return this.executeLLM(expert, input, logs);
            default:
                throw new Error(`Expert ${expert} not implemented`);
        }
    }
    /**
     * Execute graph operations via MCP
     */
    async executeGraphTool(input, logs) {
        logs.push('Executing graph operations via MCP');
        try {
            // Simple Cypher detection and execution
            if (input.task.toLowerCase().includes('cypher') ||
                input.task.toLowerCase().includes('match')) {
                // Extract Cypher query from task (simplified)
                const cypherMatch = input.task.match(/(?:cypher|MATCH).*?(?:\n|$)/i);
                const cypher = cypherMatch ? cypherMatch[0] : input.task;
                const result = await executeToolAnywhere('graph.query', {
                    cypher: cypher,
                    params: {},
                    tenantId: input.investigationId,
                }, input.userContext?.scopes);
                logs.push(`Graph query executed on server: ${result.serverName}`);
                return {
                    output: result.result,
                    logs,
                    cost: 0.001, // Fixed cost for graph operations
                };
            }
            else {
                // Algorithm execution
                const algName = this.detectAlgorithm(input.task);
                const result = await executeToolAnywhere('graph.alg', {
                    name: algName,
                    args: this.extractAlgorithmArgs(input.task),
                    tenantId: input.investigationId,
                }, input.userContext?.scopes);
                logs.push(`Graph algorithm '${algName}' executed`);
                return {
                    output: result.result,
                    logs,
                    cost: 0.002,
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
        logs.push('Executing file operations via MCP');
        try {
            if (input.task.toLowerCase().includes('search')) {
                const query = this.extractSearchQuery(input.task);
                const result = await executeToolAnywhere('files.search', {
                    query: query,
                    limit: 10,
                }, input.userContext?.scopes);
                logs.push(`File search completed: ${result.result.results.length} files found`);
                return {
                    output: result.result,
                    logs,
                    cost: 0.001,
                };
            }
            else if (input.task.toLowerCase().includes('read') ||
                input.task.toLowerCase().includes('get')) {
                const filePath = this.extractFilePath(input.task);
                const result = await executeToolAnywhere('files.get', {
                    path: filePath,
                    encoding: 'utf8',
                }, input.userContext?.scopes);
                logs.push(`File read: ${filePath}`);
                return {
                    output: result.result,
                    logs,
                    cost: 0.0005,
                };
            }
            else {
                // Default to file listing
                const result = await executeToolAnywhere('files.list', {
                    path: '.',
                    recursive: false,
                }, input.userContext?.scopes);
                return {
                    output: result.result,
                    logs,
                    cost: 0.0002,
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
        // Plugin integration
        const tenant = input.userContext?.tenantId || input.userContext?.tenant || 'unknown';
        const p = input.userContext?.plugin;
        if (p?.name) {
            logs.push(`OSINT via plugin: ${p.name}`);
            const out = await runPlugin(p.name, p.inputs || {}, { tenant });
            return { output: out?.data ?? out, logs, cost: 0.004 };
        }
        // Heuristic: parse `plugin:name arg` from task
        const m = /^plugin:([\w\.\-]+)\s+(.+)$/.exec(input.task.trim());
        if (m) {
            const name = m[1];
            const arg = m[2];
            logs.push(`OSINT via plugin prompt: ${name}`);
            let inputs = {};
            if (name === 'shodan.ip.lookup')
                inputs = { ip: arg };
            else if (name === 'virustotal.hash.lookup')
                inputs = { hash: arg };
            else if (name === 'crowdstrike.query')
                inputs = { query: arg };
            const out = await runPlugin(name, inputs, { tenant });
            return { output: out?.data ?? out, logs, cost: 0.004 };
        }
        logs.push('OSINT tool execution (mock)');
        return { output: { query: input.task, sources: [], findings: [], confidence: 0.5 }, logs, cost: 0.003 };
    }
    /**
     * Execute export operations (placeholder)
     */
    async executeExportTool(input, logs) {
        logs.push('Export tool execution (mock)');
        return {
            output: {
                format: 'pdf',
                status: 'generated',
                downloadUrl: '/api/exports/mock-report-123.pdf',
                size: '2.5MB',
            },
            logs,
            cost: 0.003,
        };
    }
    /**
     * Execute RAG operations (placeholder)
     */
    async executeRagTool(input, logs) {
        logs.push('RAG tool execution (mock)');
        return {
            output: {
                answer: `Based on the investigation context, here is the response to: "${input.task}"`,
                sources: ['Document A', 'Entity B', 'Relationship C'],
                confidence: 0.85,
                citations: ['doc_1', 'doc_2'],
            },
            logs,
            cost: 0.002,
        };
    }
    /**
     * Execute LLM operations (placeholder)
     */
    async executeLLM(expert, input, logs) {
        const config = expert === 'LLM_LIGHT' ? this.config.llmProviders.light : this.config.llmProviders.heavy;
        if (!config) {
            throw new Error(`${expert} provider not configured`);
        }
        logs.push(`Executing ${expert} with model: ${config.model}`);
        // Mock LLM execution
        const costPerToken = expert === 'LLM_LIGHT' ? 0.0001 : 0.001;
        const estimatedTokens = Math.ceil(input.task.length / 4);
        return {
            output: {
                response: `Mock ${expert} response for: "${input.task}"`,
                model: config.model,
                usage: {
                    promptTokens: estimatedTokens,
                    completionTokens: estimatedTokens * 2,
                    totalTokens: estimatedTokens * 3,
                },
            },
            logs,
            cost: costPerToken * estimatedTokens * 3,
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
        const match = task.match(/["']([^"']*\\[a-zA-Z0-9]+)["']/);
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
                auditEnabled: this.config.auditEnabled,
            },
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
        while (this.activeTaskCount > 0 && Date.now() - startWait < maxWait) {
            await new Promise((resolve) => setTimeout(resolve, 100));
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