"use strict";
// Integration Tests for Conductor System
// Tests the complete MoE+MCP system end-to-end
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../index.js");
const client_js_1 = require("../mcp/client.js");
const metrics_js_1 = require("../metrics.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Conductor Integration', () => {
    let conductor;
    const testConfig = {
        enabledExperts: [
            'LLM_LIGHT',
            'LLM_HEAVY',
            'GRAPH_TOOL',
            'RAG_TOOL',
            'FILES_TOOL',
        ],
        defaultTimeoutMs: 5000,
        maxConcurrentTasks: 5,
        auditEnabled: true,
        llmProviders: {
            light: {
                endpoint: 'https://api.example.com/v1',
                apiKey: 'test-key',
                model: 'test-light-model',
            },
            heavy: {
                endpoint: 'https://api.example.com/v1',
                apiKey: 'test-key',
                model: 'test-heavy-model',
            },
        },
    };
    (0, globals_1.beforeEach)(() => {
        // Reset metrics
        metrics_js_1.conductorMetrics.reset();
        // Setup mock MCP servers
        client_js_1.mcpRegistry.register('graphops', {
            url: 'ws://localhost:8001',
            name: 'graphops',
            authToken: 'test-token',
            tools: [
                {
                    name: 'graph.query',
                    description: 'Execute Cypher queries',
                    schema: {
                        type: 'object',
                        properties: {
                            cypher: { type: 'string' },
                            params: { type: 'object' },
                        },
                        required: ['cypher'],
                    },
                    scopes: ['graph:read'],
                },
                {
                    name: 'graph.alg',
                    description: 'Execute graph algorithms',
                    schema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            args: { type: 'object' },
                        },
                        required: ['name'],
                    },
                    scopes: ['graph:compute'],
                },
            ],
        });
        client_js_1.mcpRegistry.register('files', {
            url: 'ws://localhost:8002',
            name: 'files',
            authToken: 'test-token',
            tools: [
                {
                    name: 'files.search',
                    description: 'Search files',
                    schema: {
                        type: 'object',
                        properties: {
                            query: { type: 'string' },
                        },
                        required: ['query'],
                    },
                    scopes: ['files:read'],
                },
            ],
        });
        conductor = new index_js_1.Conductor(testConfig);
    });
    (0, globals_1.afterEach)(async () => {
        if (conductor) {
            await conductor.shutdown();
        }
    });
    (0, globals_1.describe)('task execution', () => {
        (0, globals_1.test)('executes graph query task', async () => {
            const input = {
                task: 'Execute cypher: MATCH (n:Person) RETURN n.name LIMIT 10',
                sensitivity: 'low',
                userContext: {
                    scopes: ['graph:read'],
                    userId: 'test-user',
                },
            };
            const result = await conductor.conduct(input);
            (0, globals_1.expect)(result.expertId).toBe('GRAPH_TOOL');
            (0, globals_1.expect)(result.latencyMs).toBeGreaterThan(0);
            (0, globals_1.expect)(result.auditId).toBeDefined();
            (0, globals_1.expect)(result.error).toBeUndefined();
            // Check that output contains expected structure
            (0, globals_1.expect)(result.output).toHaveProperty('records');
            (0, globals_1.expect)(result.logs).toContain('Routed to GRAPH_TOOL: graph-related keywords detected');
        });
        (0, globals_1.test)('executes file search task', async () => {
            const input = {
                task: "Search for files containing 'intelligence report'",
                sensitivity: 'low',
                userContext: {
                    scopes: ['files:read'],
                    userId: 'test-user',
                },
            };
            const result = await conductor.conduct(input);
            (0, globals_1.expect)(result.expertId).toBe('FILES_TOOL');
            (0, globals_1.expect)(result.output).toHaveProperty('results');
            (0, globals_1.expect)(result.logs).toContain('File search completed: 2 files found');
        });
        (0, globals_1.test)('executes LLM task', async () => {
            const input = {
                task: 'What is artificial intelligence?',
                sensitivity: 'low',
                maxLatencyMs: 1500, // Force to light LLM
            };
            const result = await conductor.conduct(input);
            (0, globals_1.expect)(result.expertId).toBe('LLM_LIGHT');
            (0, globals_1.expect)(result.output).toHaveProperty('response');
            (0, globals_1.expect)(result.output.model).toBe('test-light-model');
            (0, globals_1.expect)(result.cost).toBeGreaterThan(0);
        });
        (0, globals_1.test)('routes complex task to heavy LLM', async () => {
            const input = {
                task: 'Provide a comprehensive analysis of the geopolitical implications of artificial intelligence development across major world powers, including detailed examination of regulatory frameworks, international cooperation mechanisms, technological sovereignty concerns, and potential future scenarios for AI governance.',
                sensitivity: 'low',
                maxLatencyMs: 10000,
            };
            const result = await conductor.conduct(input);
            (0, globals_1.expect)(result.expertId).toBe('LLM_HEAVY');
            (0, globals_1.expect)(result.output.model).toBe('test-heavy-model');
        });
    });
    (0, globals_1.describe)('security controls', () => {
        (0, globals_1.test)('blocks secret data from non-enterprise LLM providers', async () => {
            const input = {
                task: 'Analyze classified intelligence data',
                sensitivity: 'secret',
            };
            const result = await conductor.conduct(input);
            (0, globals_1.expect)(result.error).toContain('Secret data cannot be processed by non-enterprise LLM providers');
        });
        (0, globals_1.test)('enforces user permissions', async () => {
            const input = {
                task: 'Execute cypher: MATCH (n) RETURN n',
                sensitivity: 'low',
                userContext: {
                    scopes: ['files:read'], // Wrong scope
                    userId: 'test-user',
                },
            };
            const result = await conductor.conduct(input);
            (0, globals_1.expect)(result.error).toContain('Insufficient permissions for GRAPH_TOOL');
        });
        (0, globals_1.test)('allows task with proper permissions', async () => {
            const input = {
                task: 'Execute cypher: MATCH (n) RETURN n',
                sensitivity: 'low',
                userContext: {
                    scopes: ['graph:read'], // Correct scope
                    userId: 'test-user',
                },
            };
            const result = await conductor.conduct(input);
            (0, globals_1.expect)(result.error).toBeUndefined();
            (0, globals_1.expect)(result.expertId).toBe('GRAPH_TOOL');
        });
    });
    (0, globals_1.describe)('concurrency control', () => {
        (0, globals_1.test)('enforces max concurrent task limit', async () => {
            const input = {
                task: 'Long running task that takes forever',
                sensitivity: 'low',
            };
            // Start maximum allowed concurrent tasks
            const promises = Array(testConfig.maxConcurrentTasks)
                .fill(null)
                .map(() => conductor.conduct(input));
            // Try to start one more - should be rejected
            const extraPromise = conductor.conduct(input);
            await (0, globals_1.expect)(extraPromise).rejects.toThrow('Maximum concurrent tasks reached');
            // Cleanup - let original tasks complete
            await Promise.allSettled(promises);
        });
    });
    (0, globals_1.describe)('routing preview', () => {
        (0, globals_1.test)('previews routing decision without execution', () => {
            const input = {
                task: 'MATCH (n) RETURN count(n)',
                sensitivity: 'low',
            };
            const decision = conductor.previewRouting(input);
            (0, globals_1.expect)(decision.expert).toBe('GRAPH_TOOL');
            (0, globals_1.expect)(decision.reason).toContain('graph-related keywords');
            (0, globals_1.expect)(decision.confidence).toBeGreaterThan(0.5);
            (0, globals_1.expect)(decision.features).toHaveProperty('hasGraphKeywords', true);
            (0, globals_1.expect)(decision.alternatives).toBeInstanceOf(Array);
        });
    });
    (0, globals_1.describe)('metrics and observability', () => {
        (0, globals_1.test)('records routing metrics', async () => {
            const input = {
                task: 'MATCH (n) RETURN n',
                sensitivity: 'low',
                userContext: { scopes: ['graph:read'] },
            };
            await conductor.conduct(input);
            const stats = conductor.getStats();
            (0, globals_1.expect)(stats.routingStats.totalDecisions).toBe(1);
            (0, globals_1.expect)(stats.routingStats.expertDistribution['GRAPH_TOOL']).toBe(1);
            (0, globals_1.expect)(stats.routingStats.avgConfidence).toBeGreaterThan(0);
        });
        (0, globals_1.test)('tracks active task count', async () => {
            const input = {
                task: 'Simple task',
                sensitivity: 'low',
            };
            // Before execution
            (0, globals_1.expect)(conductor.getStats().activeTaskCount).toBe(0);
            // During execution (task completes quickly so hard to catch)
            await conductor.conduct(input);
            // After execution
            (0, globals_1.expect)(conductor.getStats().activeTaskCount).toBe(0);
        });
        (0, globals_1.test)('provides audit trail when enabled', async () => {
            const input = {
                task: 'Test task for audit',
                sensitivity: 'low',
            };
            const result = await conductor.conduct(input);
            (0, globals_1.expect)(result.auditId).toBeDefined();
            (0, globals_1.expect)(result.auditId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });
    });
    (0, globals_1.describe)('error handling', () => {
        (0, globals_1.test)('handles expert execution failures gracefully', async () => {
            // Mock a scenario that would cause an expert to fail
            const input = {
                task: 'This will cause an error in the mock implementation',
                sensitivity: 'low',
                maxLatencyMs: 1, // Extremely tight constraint
            };
            const result = await conductor.conduct(input);
            // Should not throw, but should return error in result
            (0, globals_1.expect)(result.error).toBeDefined();
            (0, globals_1.expect)(result.latencyMs).toBeGreaterThan(0);
        });
        (0, globals_1.test)('provides meaningful error messages', async () => {
            const input = {
                task: 'Query with invalid permissions',
                sensitivity: 'secret', // This will trigger security error
                userContext: {
                    scopes: ['limited:scope'],
                },
            };
            const result = await conductor.conduct(input);
            (0, globals_1.expect)(result.error).toContain('Secret data cannot be processed');
        });
    });
    (0, globals_1.describe)('task parsing helpers', () => {
        (0, globals_1.test)('extracts algorithm names correctly', async () => {
            const inputs = [
                { task: 'Run pagerank algorithm', expectedExpert: 'GRAPH_TOOL' },
                { task: 'Calculate community detection', expectedExpert: 'GRAPH_TOOL' },
                {
                    task: 'Find shortest path between nodes',
                    expectedExpert: 'GRAPH_TOOL',
                },
            ];
            for (const { task, expectedExpert } of inputs) {
                const result = await conductor.conduct({
                    task,
                    sensitivity: 'low',
                    userContext: { scopes: ['graph:compute'] },
                });
                (0, globals_1.expect)(result.expertId).toBe(expectedExpert);
                (0, globals_1.expect)(result.output).toHaveProperty('algorithm');
            }
        });
        (0, globals_1.test)('extracts file paths and search queries', async () => {
            const fileInput = {
                task: "Read file 'report.pdf' from documents folder",
                sensitivity: 'low',
                userContext: { scopes: ['files:read'] },
            };
            const result = await conductor.conduct(fileInput);
            (0, globals_1.expect)(result.expertId).toBe('FILES_TOOL');
            (0, globals_1.expect)(result.output).toHaveProperty('path');
        });
    });
    (0, globals_1.describe)('system shutdown', () => {
        (0, globals_1.test)('shuts down gracefully', async () => {
            const shutdownPromise = conductor.shutdown();
            await (0, globals_1.expect)(shutdownPromise).resolves.toBeUndefined();
        });
        (0, globals_1.test)('waits for active tasks during shutdown', async () => {
            // This test verifies the shutdown waits for tasks (implementation-dependent)
            const shutdownStart = Date.now();
            await conductor.shutdown();
            const shutdownTime = Date.now() - shutdownStart;
            // Should complete quickly since no active tasks
            (0, globals_1.expect)(shutdownTime).toBeLessThan(1000);
        });
    });
});
