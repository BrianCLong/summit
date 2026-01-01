
import { MaestroAgent, AgentTask } from '../model';

export interface AgentExecutionConfig {
  maxTimeMs: number;
  maxMemoryBytes: number;
  maxOutputChars: number;
  snapshotOnly: boolean;
  confidenceThreshold: number;
}

export interface AgentResult<T = any> {
  success: boolean;
  data: T;
  confidence: number;
  provenance: {
    agentId: string;
    model: string;
    timestamp: string;
    executionTimeMs: number;
  };
  error?: string;
}

export class LanguageFilter {
  private static forbiddenPatterns = [
    /DROP TABLE/i,
    /DELETE FROM/i,
    /ALTER USER/i,
    /GRANT/i,
    /exec\(/i,
    /eval\(/i,
    /process\.exit/i
  ];

  static validate(content: string): boolean {
    return !this.forbiddenPatterns.some(pattern => pattern.test(content));
  }
}

export class GovernedAgentRuntime {
  private static instance: GovernedAgentRuntime;

  private constructor() {}

  static getInstance(): GovernedAgentRuntime {
    if (!GovernedAgentRuntime.instance) {
      GovernedAgentRuntime.instance = new GovernedAgentRuntime();
    }
    return GovernedAgentRuntime.instance;
  }

  async executeAgent<T>(
    agent: MaestroAgent,
    task: AgentTask,
    config: AgentExecutionConfig,
    executor: () => Promise<T>
  ): Promise<AgentResult<T>> {
    const start = Date.now();

    // 1. Snapshot Only Enforcement
    if (config.snapshotOnly && this.detectLiveAccess(task)) {
      return this.createErrorResult(agent, 'Live data access detected in snapshot-only mode');
    }

    // 2. Resource Limits & Timeout
    try {
      const resultPromise = executor();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Execution timed out')), config.maxTimeMs)
      );

      // Race against timeout
      const result = await Promise.race([resultPromise, timeoutPromise]);

      // 3. Output Size Check
      const serialized = JSON.stringify(result);
      if (serialized.length > config.maxOutputChars) {
        return this.createErrorResult(agent, `Output size exceeded limit: ${serialized.length} > ${config.maxOutputChars}`);
      }

      // 4. Language Filter (on string inputs/outputs)
      if (typeof result === 'string' && !LanguageFilter.validate(result)) {
         return this.createErrorResult(agent, 'Output contains forbidden language patterns');
      }

      // 5. Memory Check (Optimistic/Simulated for Node.js unless we use child process)
      // Real implementation would inspect `process.memoryUsage()` relative to start or use V8 isolate limits.
      // Here we assume executor is well-behaved or we check usage after.
      const memUsage = process.memoryUsage().heapUsed;
      if (memUsage > config.maxMemoryBytes) {
          // Note: This is checking the whole process, which is imperfect for shared runtime.
          // For true isolation, we'd need V8 Isolates or Containers.
          // We'll log a warning for now as we can't easily isolate memory per async flow in Node.js without workers.
          console.warn(`Memory usage high: ${memUsage}`);
      }

      const duration = Date.now() - start;
      return {
        success: true,
        data: result,
        confidence: 0.95, // Placeholder, normally comes from model logprobs or self-reflection
        provenance: {
          agentId: agent.id,
          model: agent.model || 'unknown',
          timestamp: new Date().toISOString(),
          executionTimeMs: duration
        }
      };

    } catch (error: any) {
      return this.createErrorResult(agent, error.message);
    }
  }

  private detectLiveAccess(task: AgentTask): boolean {
    // Mock implementation: check if task metadata requests "live" access
    if (task.metadata && task.metadata.accessMode === 'live') {
      return true;
    }
    // Deep inspection of task payload could happen here
    return false;
  }

  private createErrorResult(agent: MaestroAgent, message: string): AgentResult<any> {
    return {
      success: false,
      data: null,
      confidence: 0,
      provenance: {
        agentId: agent.id,
        model: agent.model || 'unknown',
        timestamp: new Date().toISOString(),
        executionTimeMs: 0
      },
      error: message
    };
  }
}

export const governedRuntime = GovernedAgentRuntime.getInstance();
