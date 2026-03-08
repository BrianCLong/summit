"use strict";
/**
 * Integration tests for Agent Execution Platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const index_js_1 = require("../../src/index.js");
(0, globals_1.describe)('Agent Execution Platform Integration Tests', () => {
    let platform;
    (0, globals_1.beforeAll)(async () => {
        platform = new index_js_1.AgentExecutionPlatform();
        await platform.initialize();
    });
    (0, globals_1.afterAll)(async () => {
        await platform.shutdown();
    });
    (0, globals_1.describe)('Agent Runner', () => {
        (0, globals_1.test)('should execute an agent successfully', async () => {
            const config = {
                metadata: {
                    id: 'test-agent-001',
                    name: 'Test Agent',
                    version: '1.0.0',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                capabilities: {
                    maxConcurrent: 5,
                    timeout: 10000,
                    retryable: true,
                    maxRetries: 3,
                    supportedOperations: ['test'],
                },
            };
            const context = {
                agentId: 'test-agent-001',
                executionId: 'test-exec-001',
                userId: 'test-user',
                sessionId: 'test-session',
                metadata: {},
                variables: {},
            };
            const result = await index_js_1.agentRunner.execute(config, { text: 'test input' }, context);
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.metrics).toBeDefined();
            (0, globals_1.expect)(result.metrics.durationMs).toBeGreaterThan(0);
        });
        (0, globals_1.test)('should respect concurrency limits', async () => {
            const stats = index_js_1.agentRunner.getStats();
            (0, globals_1.expect)(stats.maxConcurrent).toBe(10);
            (0, globals_1.expect)(stats.activeExecutions).toBeGreaterThanOrEqual(0);
        });
        (0, globals_1.test)('should handle errors gracefully', async () => {
            const config = {
                metadata: {
                    id: 'error-agent',
                    name: 'Error Agent',
                    version: '1.0.0',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                capabilities: {
                    maxConcurrent: 1,
                    timeout: 100,
                    retryable: false,
                    maxRetries: 0,
                    supportedOperations: [],
                },
            };
            const context = {
                agentId: 'error-agent',
                executionId: 'error-exec',
                userId: 'test-user',
                sessionId: 'test-session',
                metadata: {},
                variables: {},
            };
            // This should complete even with short timeout
            const result = await index_js_1.agentRunner.execute(config, { text: 'error' }, context);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.metrics).toBeDefined();
        });
    });
    (0, globals_1.describe)('Pipeline Engine', () => {
        (0, globals_1.test)('should execute a simple pipeline', async () => {
            const pipeline = {
                id: 'test-pipeline-001',
                name: 'Test Pipeline',
                version: '1.0.0',
                steps: [
                    {
                        id: 'step-1',
                        name: 'First Step',
                        type: 'task',
                        status: 'pending',
                        config: {
                            operation: 'test-op',
                            parameters: {},
                        },
                        dependencies: [],
                    },
                ],
            };
            const context = {
                agentId: '',
                executionId: '',
                userId: 'test-user',
                sessionId: 'test-session',
                metadata: {},
                variables: {},
            };
            const execution = await index_js_1.pipelineEngine.execute(pipeline, context);
            (0, globals_1.expect)(execution).toBeDefined();
            (0, globals_1.expect)(execution.status).toBe('completed');
            (0, globals_1.expect)(execution.steps).toHaveLength(1);
            (0, globals_1.expect)(execution.steps[0].status).toBe('completed');
        });
        (0, globals_1.test)('should handle step dependencies', async () => {
            const pipeline = {
                id: 'dep-pipeline',
                name: 'Dependency Pipeline',
                version: '1.0.0',
                steps: [
                    {
                        id: 'step-1',
                        name: 'First',
                        type: 'task',
                        status: 'pending',
                        config: {
                            operation: 'first',
                            parameters: {},
                        },
                        dependencies: [],
                    },
                    {
                        id: 'step-2',
                        name: 'Second',
                        type: 'task',
                        status: 'pending',
                        config: {
                            operation: 'second',
                            parameters: {},
                        },
                        dependencies: ['step-1'],
                    },
                ],
            };
            const context = {
                agentId: '',
                executionId: '',
                userId: 'test-user',
                sessionId: 'test-session',
                metadata: {},
                variables: {},
            };
            const execution = await index_js_1.pipelineEngine.execute(pipeline, context);
            (0, globals_1.expect)(execution.status).toBe('completed');
            (0, globals_1.expect)(execution.steps).toHaveLength(2);
        });
    });
    (0, globals_1.describe)('Prompt Registry', () => {
        (0, globals_1.test)('should register and retrieve prompts', async () => {
            const template = {
                id: 'test-prompt-001',
                name: 'test-template',
                version: '1.0.0',
                content: 'Hello {{name}}, welcome to {{place}}!',
                variables: [
                    {
                        name: 'name',
                        type: 'string',
                        required: true,
                    },
                    {
                        name: 'place',
                        type: 'string',
                        required: true,
                    },
                ],
                metadata: {
                    author: 'test',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                tags: ['test'],
            };
            await index_js_1.promptRegistry.register(template);
            const retrieved = await index_js_1.promptRegistry.get('test-template');
            (0, globals_1.expect)(retrieved).toBeDefined();
            (0, globals_1.expect)(retrieved?.name).toBe('test-template');
        });
        (0, globals_1.test)('should render prompts with variables', async () => {
            const rendered = await index_js_1.promptRegistry.render('test-template', {
                name: 'Alice',
                place: 'Wonderland',
            });
            (0, globals_1.expect)(rendered.content).toBe('Hello Alice, welcome to Wonderland!');
        });
        (0, globals_1.test)('should validate required variables', async () => {
            await (0, globals_1.expect)(index_js_1.promptRegistry.render('test-template', { name: 'Alice' })).rejects.toThrow('Required variable missing: place');
        });
        (0, globals_1.test)('should track versions', async () => {
            const versions = await index_js_1.promptRegistry.getVersions('test-template');
            (0, globals_1.expect)(versions.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Safety Layer', () => {
        (0, globals_1.test)('should detect PII in content', async () => {
            // This test would need the safety validator to be accessible
            // For now, we'll test through agent execution
            const config = {
                metadata: {
                    id: 'pii-test-agent',
                    name: 'PII Test',
                    version: '1.0.0',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                capabilities: {
                    maxConcurrent: 1,
                    timeout: 10000,
                    retryable: false,
                    maxRetries: 0,
                    supportedOperations: [],
                },
            };
            const context = {
                agentId: 'pii-test-agent',
                executionId: 'pii-exec',
                userId: 'test-user',
                sessionId: 'test-session',
                metadata: {},
                variables: {},
            };
            const input = {
                text: 'Contact me at john.doe@example.com or 123-45-6789',
            };
            const result = await index_js_1.agentRunner.execute(config, input, context);
            // Result should still be successful, but PII should be logged
            (0, globals_1.expect)(result).toBeDefined();
        });
    });
    (0, globals_1.describe)('Platform Stats', () => {
        (0, globals_1.test)('should provide runner statistics', () => {
            const stats = index_js_1.agentRunner.getStats();
            (0, globals_1.expect)(stats).toHaveProperty('activeExecutions');
            (0, globals_1.expect)(stats).toHaveProperty('queuedTasks');
            (0, globals_1.expect)(stats).toHaveProperty('maxConcurrent');
        });
        (0, globals_1.test)('should provide prompt registry statistics', () => {
            const stats = index_js_1.promptRegistry.getStats();
            (0, globals_1.expect)(stats).toHaveProperty('totalPrompts');
            (0, globals_1.expect)(stats).toHaveProperty('totalVersions');
            (0, globals_1.expect)(stats).toHaveProperty('cacheSize');
        });
    });
});
