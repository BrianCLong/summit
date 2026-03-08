"use strict";
/**
 * Agent Runner - Core orchestration engine for agent execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentRunner = exports.AgentRunner = void 0;
const index_js_1 = require("../logging/index.js");
const index_js_2 = require("../safety/index.js");
const index_js_3 = require("../governance/index.js");
class AgentRunner {
    config;
    activeAgents;
    queue;
    safetyValidator;
    rateLimiter;
    constructor(config) {
        this.config = config;
        this.activeAgents = new Map();
        this.queue = [];
        if (config.enableSafety) {
            this.safetyValidator = new index_js_2.SafetyValidator({
                level: 'high',
                enabledChecks: [
                    'input-validation',
                    'output-filtering',
                    'pii-detection',
                    'injection-detection',
                ],
                actionOnViolation: 'block',
            });
        }
        if (config.enableRateLimiting) {
            this.rateLimiter = new index_js_2.RateLimiter(60000, 100);
        }
    }
    async execute(agentConfig, input, context) {
        const executionId = context.executionId || this.generateExecutionId();
        const startTime = Date.now();
        index_js_1.logger.getLogger().info('Starting agent execution', {
            agentId: agentConfig.metadata.id,
            executionId,
            userId: context.userId,
        });
        // Rate limiting check
        if (this.rateLimiter) {
            const allowed = await this.rateLimiter.checkLimit(context.userId);
            if (!allowed) {
                throw new Error('Rate limit exceeded for user: ' + context.userId);
            }
        }
        // Safety validation
        if (this.safetyValidator) {
            const safetyReport = await this.safetyValidator.validate(input, executionId);
            const governanceService = (0, index_js_3.getGovernanceService)();
            const safetyVerdict = await governanceService.generateVerdictFromSafety(safetyReport);
            if (!safetyReport.passed) {
                const error = {
                    code: 'SAFETY_VIOLATION',
                    message: 'Input failed safety validation',
                    details: { violations: safetyReport.violations },
                    recoverable: false,
                };
                index_js_1.logger.getLogger().error('Safety validation failed', new Error(error.message), {
                    executionId,
                    violations: safetyReport.violations.length,
                    governanceVerdict: safetyVerdict.verdict,
                });
                return {
                    success: false,
                    error,
                    metrics: this.createMetrics(executionId, startTime),
                    governanceVerdict: safetyVerdict,
                };
            }
        }
        // Check concurrency limit
        if (this.activeAgents.size >= this.config.maxConcurrent) {
            index_js_1.logger.getLogger().warn('Max concurrent agents reached, queueing task', {
                executionId,
                queueSize: this.queue.length,
            });
            return await this.queueTask(agentConfig, input, context);
        }
        // Create execution
        const execution = {
            id: executionId,
            agentId: agentConfig.metadata.id,
            status: 'running',
            startTime: new Date(),
            context,
            input,
            config: agentConfig,
        };
        this.activeAgents.set(executionId, execution);
        try {
            // Execute the agent
            const result = await this.executeAgent(execution);
            execution.status = 'completed';
            execution.endTime = new Date();
            execution.result = result;
            // Generate governance verdict for successful execution
            const governanceService = (0, index_js_3.getGovernanceService)();
            const verdict = await governanceService.generateVerdict({ input, result }, context, 'agent-execution-policy');
            index_js_1.logger.getLogger().info('Agent execution completed successfully', {
                agentId: agentConfig.metadata.id,
                executionId,
                durationMs: execution.endTime.getTime() - execution.startTime.getTime(),
                governanceVerdict: verdict.verdict,
            });
            return {
                success: true,
                data: result,
                metrics: this.createMetrics(executionId, startTime),
                governanceVerdict: verdict,
            };
        }
        catch (error) {
            execution.status = 'failed';
            execution.endTime = new Date();
            index_js_1.logger.getLogger().error('Agent execution failed', error, {
                agentId: agentConfig.metadata.id,
                executionId,
            });
            const agentError = {
                code: 'EXECUTION_ERROR',
                message: error.message,
                stack: error.stack,
                recoverable: this.isRecoverableError(error),
            };
            // Generate governance verdict for failed execution
            const governanceService = (0, index_js_3.getGovernanceService)();
            const verdict = await governanceService.generateVerdict({ input, error: agentError }, context, 'agent-execution-policy');
            return {
                success: false,
                error: agentError,
                metrics: this.createMetrics(executionId, startTime),
                governanceVerdict: verdict,
            };
        }
        finally {
            this.activeAgents.delete(executionId);
            await this.processQueue();
        }
    }
    async executeAgent(execution) {
        // Apply timeout
        const timeout = execution.config.capabilities.timeout || this.config.defaultTimeout;
        return await this.withTimeout(async () => {
            // Main execution logic
            index_js_1.logger.getLogger().debug('Executing agent logic', {
                executionId: execution.id,
                operation: 'execute',
            });
            // Simulate agent execution
            // In real implementation, this would call the actual agent logic
            await new Promise((resolve) => setTimeout(resolve, 500));
            return {
                executionId: execution.id,
                timestamp: new Date(),
                result: 'Agent execution completed',
                metadata: execution.config.metadata,
            };
        }, timeout, 'Agent execution timeout');
    }
    async queueTask(agentConfig, input, context) {
        return new Promise((resolve, reject) => {
            const task = {
                agentConfig,
                input,
                context,
                resolve,
                reject,
                queuedAt: new Date(),
            };
            this.queue.push(task);
            index_js_1.logger.getLogger().debug('Task queued', {
                queueSize: this.queue.length,
                agentId: agentConfig.metadata.id,
            });
        });
    }
    async processQueue() {
        while (this.queue.length > 0 && this.activeAgents.size < this.config.maxConcurrent) {
            const task = this.queue.shift();
            if (!task)
                break;
            index_js_1.logger.getLogger().debug('Processing queued task', {
                queueSize: this.queue.length,
                agentId: task.agentConfig.metadata.id,
            });
            try {
                const result = await this.execute(task.agentConfig, task.input, task.context);
                task.resolve(result);
            }
            catch (error) {
                task.reject(error);
            }
        }
    }
    async withTimeout(fn, timeoutMs, errorMessage) {
        return Promise.race([
            fn(),
            new Promise((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs)),
        ]);
    }
    isRecoverableError(error) {
        const recoverableErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];
        return recoverableErrors.some((code) => error.message.includes(code));
    }
    createMetrics(executionId, startTime) {
        return {
            executionId,
            startTime: new Date(startTime),
            endTime: new Date(),
            durationMs: Date.now() - startTime,
        };
    }
    generateExecutionId() {
        return 'exec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    async getExecution(executionId) {
        return this.activeAgents.get(executionId) || null;
    }
    async listExecutions() {
        return Array.from(this.activeAgents.values());
    }
    async cancelExecution(executionId) {
        const execution = this.activeAgents.get(executionId);
        if (!execution) {
            return false;
        }
        execution.status = 'cancelled';
        this.activeAgents.delete(executionId);
        index_js_1.logger.getLogger().info('Agent execution cancelled', {
            executionId,
        });
        return true;
    }
    getStats() {
        return {
            activeExecutions: this.activeAgents.size,
            queuedTasks: this.queue.length,
            maxConcurrent: this.config.maxConcurrent,
        };
    }
}
exports.AgentRunner = AgentRunner;
// Singleton instance
exports.agentRunner = new AgentRunner({
    maxConcurrent: 10,
    defaultTimeout: 300000,
    enableSafety: true,
    enableRateLimiting: true,
});
