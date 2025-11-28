/**
 * Agent Runner - Core orchestration engine for agent execution
 */

import {
  AgentConfig,
  AgentContext,
  AgentResult,
  AgentStatus,
  ExecutionMetrics,
  AgentError,
} from '../types/index.js';
import { logger } from '../logging/index.js';
import { SafetyValidator, RateLimiter } from '../safety/index.js';
import { pipelineEngine } from '../pipeline/index.js';
import { promptRegistry } from '../registry/index.js';

export interface RunnerConfig {
  maxConcurrent: number;
  defaultTimeout: number;
  enableSafety: boolean;
  enableRateLimiting: boolean;
}

export class AgentRunner {
  private config: RunnerConfig;
  private activeAgents: Map<string, AgentExecution>;
  private queue: AgentTask[];
  private safetyValidator?: SafetyValidator;
  private rateLimiter?: RateLimiter;

  constructor(config: RunnerConfig) {
    this.config = config;
    this.activeAgents = new Map();
    this.queue = [];

    if (config.enableSafety) {
      this.safetyValidator = new SafetyValidator({
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
      this.rateLimiter = new RateLimiter(60000, 100);
    }
  }

  async execute(
    agentConfig: AgentConfig,
    input: any,
    context: AgentContext
  ): Promise<AgentResult> {
    const executionId = context.executionId || this.generateExecutionId();
    const startTime = Date.now();

    logger.getLogger().info('Starting agent execution', {
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
      if (!safetyReport.passed) {
        const error: AgentError = {
          code: 'SAFETY_VIOLATION',
          message: 'Input failed safety validation',
          details: { violations: safetyReport.violations },
          recoverable: false,
        };

        logger.getLogger().error('Safety validation failed', new Error(error.message), {
          executionId,
          violations: safetyReport.violations.length,
        });

        return {
          success: false,
          error,
          metrics: this.createMetrics(executionId, startTime),
        };
      }
    }

    // Check concurrency limit
    if (this.activeAgents.size >= this.config.maxConcurrent) {
      logger.getLogger().warn('Max concurrent agents reached, queueing task', {
        executionId,
        queueSize: this.queue.length,
      });

      return await this.queueTask(agentConfig, input, context);
    }

    // Create execution
    const execution: AgentExecution = {
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

      logger.getLogger().info('Agent execution completed successfully', {
        agentId: agentConfig.metadata.id,
        executionId,
        durationMs: execution.endTime.getTime() - execution.startTime.getTime(),
      });

      return {
        success: true,
        data: result,
        metrics: this.createMetrics(executionId, startTime),
      };
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();

      logger.getLogger().error('Agent execution failed', error as Error, {
        agentId: agentConfig.metadata.id,
        executionId,
      });

      const agentError: AgentError = {
        code: 'EXECUTION_ERROR',
        message: (error as Error).message,
        stack: (error as Error).stack,
        recoverable: this.isRecoverableError(error as Error),
      };

      return {
        success: false,
        error: agentError,
        metrics: this.createMetrics(executionId, startTime),
      };
    } finally {
      this.activeAgents.delete(executionId);
      await this.processQueue();
    }
  }

  private async executeAgent(execution: AgentExecution): Promise<any> {
    // Apply timeout
    const timeout = execution.config.capabilities.timeout || this.config.defaultTimeout;

    return await this.withTimeout(
      async () => {
        // Main execution logic
        logger.getLogger().debug('Executing agent logic', {
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
      },
      timeout,
      'Agent execution timeout'
    );
  }

  private async queueTask(
    agentConfig: AgentConfig,
    input: any,
    context: AgentContext
  ): Promise<AgentResult> {
    return new Promise((resolve, reject) => {
      const task: AgentTask = {
        agentConfig,
        input,
        context,
        resolve,
        reject,
        queuedAt: new Date(),
      };

      this.queue.push(task);

      logger.getLogger().debug('Task queued', {
        queueSize: this.queue.length,
        agentId: agentConfig.metadata.id,
      });
    });
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.activeAgents.size < this.config.maxConcurrent) {
      const task = this.queue.shift();
      if (!task) break;

      logger.getLogger().debug('Processing queued task', {
        queueSize: this.queue.length,
        agentId: task.agentConfig.metadata.id,
      });

      try {
        const result = await this.execute(task.agentConfig, task.input, task.context);
        task.resolve(result);
      } catch (error) {
        task.reject(error);
      }
    }
  }

  private async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      ),
    ]);
  }

  private isRecoverableError(error: Error): boolean {
    const recoverableErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];
    return recoverableErrors.some((code) => error.message.includes(code));
  }

  private createMetrics(executionId: string, startTime: number): ExecutionMetrics {
    return {
      executionId,
      startTime: new Date(startTime),
      endTime: new Date(),
      durationMs: Date.now() - startTime,
    };
  }

  private generateExecutionId(): string {
    return 'exec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async getExecution(executionId: string): Promise<AgentExecution | null> {
    return this.activeAgents.get(executionId) || null;
  }

  async listExecutions(): Promise<AgentExecution[]> {
    return Array.from(this.activeAgents.values());
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.activeAgents.get(executionId);
    if (!execution) {
      return false;
    }

    execution.status = 'cancelled';
    this.activeAgents.delete(executionId);

    logger.getLogger().info('Agent execution cancelled', {
      executionId,
    });

    return true;
  }

  getStats(): RunnerStats {
    return {
      activeExecutions: this.activeAgents.size,
      queuedTasks: this.queue.length,
      maxConcurrent: this.config.maxConcurrent,
    };
  }
}

interface AgentExecution {
  id: string;
  agentId: string;
  status: AgentStatus;
  startTime: Date;
  endTime?: Date;
  context: AgentContext;
  input: any;
  config: AgentConfig;
  result?: any;
}

interface AgentTask {
  agentConfig: AgentConfig;
  input: any;
  context: AgentContext;
  resolve: (result: AgentResult) => void;
  reject: (error: Error) => void;
  queuedAt: Date;
}

interface RunnerStats {
  activeExecutions: number;
  queuedTasks: number;
  maxConcurrent: number;
}

// Singleton instance
export const agentRunner = new AgentRunner({
  maxConcurrent: 10,
  defaultTimeout: 300000,
  enableSafety: true,
  enableRateLimiting: true,
});
