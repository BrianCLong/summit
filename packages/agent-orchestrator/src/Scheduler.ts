/**
 * Priority-Based Task Scheduler
 * Intelligently schedules tasks to agents based on priority, capabilities, and load
 */

import { Logger } from 'pino';
import { EventEmitter } from 'eventemitter3';
import {
  Task,
  AgentCapability,
  AgentPriority,
  TaskStatus,
} from '@intelgraph/agent-framework';
import { AgentRegistry } from '@intelgraph/agent-framework';

export interface SchedulerConfig {
  maxRetries?: number;
  retryDelay?: number;
  loadBalancingStrategy?: 'round-robin' | 'least-loaded' | 'fastest' | 'best-fit';
  enableAdaptive?: boolean;
}

export interface SchedulingDecision {
  task: Task;
  agentId: string;
  reason: string;
  estimatedDuration?: number;
}

export class Scheduler extends EventEmitter {
  private registry: AgentRegistry;
  private logger: Logger;
  private config: SchedulerConfig;
  private roundRobinIndex: Map<AgentCapability, number>;

  constructor(
    registry: AgentRegistry,
    config: SchedulerConfig,
    logger: Logger,
  ) {
    super();
    this.registry = registry;
    this.config = {
      maxRetries: 3,
      retryDelay: 5000,
      loadBalancingStrategy: 'best-fit',
      enableAdaptive: true,
      ...config,
    };
    this.logger = logger.child({ component: 'Scheduler' });
    this.roundRobinIndex = new Map();
  }

  /**
   * Schedule a single task to an appropriate agent
   */
  async schedule(task: Task): Promise<SchedulingDecision> {
    this.logger.debug({ taskId: task.id, taskType: task.type }, 'Scheduling task');

    // Determine required capability
    const capability = this.getRequiredCapability(task);
    if (!capability) {
      throw new Error(`Cannot determine required capability for task: ${task.type}`);
    }

    // Find available agents with the capability
    const availableAgents = await this.registry.findAvailable(capability);

    if (availableAgents.length === 0) {
      this.logger.warn(
        { taskId: task.id, capability },
        'No available agents for capability',
      );
      throw new Error(
        `No available agents found for capability: ${capability}`,
      );
    }

    // Select the best agent based on strategy
    const selectedAgent = await this.selectAgent(
      availableAgents,
      task,
      capability,
    );

    const decision: SchedulingDecision = {
      task,
      agentId: selectedAgent.config.id,
      reason: `Selected using ${this.config.loadBalancingStrategy} strategy`,
      estimatedDuration: selectedAgent.metrics.averageExecutionTime || undefined,
    };

    this.logger.info(
      {
        taskId: task.id,
        agentId: decision.agentId,
        strategy: this.config.loadBalancingStrategy,
      },
      'Task scheduled',
    );

    this.emit('scheduled', decision);

    return decision;
  }

  /**
   * Schedule multiple tasks in batch
   */
  async scheduleBatch(tasks: Task[]): Promise<SchedulingDecision[]> {
    this.logger.info({ count: tasks.length }, 'Scheduling batch of tasks');

    // Sort tasks by priority
    const sortedTasks = this.sortTasksByPriority(tasks);

    const decisions: SchedulingDecision[] = [];

    for (const task of sortedTasks) {
      try {
        const decision = await this.schedule(task);
        decisions.push(decision);
      } catch (error) {
        this.logger.error(
          { taskId: task.id, error },
          'Failed to schedule task',
        );
        // Continue with other tasks
      }
    }

    this.emit('batch-scheduled', { tasks: sortedTasks, decisions });

    return decisions;
  }

  /**
   * Select the best agent based on configured strategy
   */
  private async selectAgent(
    availableAgents: any[],
    task: Task,
    capability: AgentCapability,
  ): Promise<any> {
    switch (this.config.loadBalancingStrategy) {
      case 'round-robin':
        return this.selectRoundRobin(availableAgents, capability);

      case 'least-loaded':
        return this.selectLeastLoaded(availableAgents);

      case 'fastest':
        return this.selectFastest(availableAgents);

      case 'best-fit':
      default:
        return this.selectBestFit(availableAgents, task);
    }
  }

  /**
   * Round-robin selection
   */
  private selectRoundRobin(
    agents: any[],
    capability: AgentCapability,
  ): any {
    const currentIndex = this.roundRobinIndex.get(capability) || 0;
    const selectedAgent = agents[currentIndex % agents.length];

    this.roundRobinIndex.set(capability, currentIndex + 1);

    return selectedAgent;
  }

  /**
   * Select least loaded agent
   */
  private selectLeastLoaded(agents: any[]): any {
    return agents.reduce((least, current) =>
      current.metrics.tasksCompleted < least.metrics.tasksCompleted
        ? current
        : least,
    );
  }

  /**
   * Select fastest agent based on average execution time
   */
  private selectFastest(agents: any[]): any {
    // Filter agents that have execution history
    const withHistory = agents.filter(
      (a) => a.metrics.tasksCompleted > 0,
    );

    if (withHistory.length === 0) {
      // No history, pick randomly
      return agents[Math.floor(Math.random() * agents.length)];
    }

    return withHistory.reduce((fastest, current) =>
      current.metrics.averageExecutionTime <
      fastest.metrics.averageExecutionTime
        ? current
        : fastest,
    );
  }

  /**
   * Select best fit agent based on multiple factors
   */
  private selectBestFit(agents: any[], task: Task): any {
    const scores = agents.map((agent) => {
      let score = 0;

      // Factor 1: Success rate (40% weight)
      const totalTasks =
        agent.metrics.tasksCompleted + agent.metrics.tasksFailed;
      const successRate =
        totalTasks > 0 ? agent.metrics.tasksCompleted / totalTasks : 0.5;
      score += successRate * 40;

      // Factor 2: Current load (30% weight)
      const loadFactor = Math.max(
        0,
        1 - agent.metrics.tasksCompleted / 1000,
      );
      score += loadFactor * 30;

      // Factor 3: Speed (20% weight)
      if (agent.metrics.averageExecutionTime > 0) {
        const speedFactor = Math.max(
          0,
          1 - agent.metrics.averageExecutionTime / 60000,
        ); // Normalize to 1 minute
        score += speedFactor * 20;
      } else {
        score += 10; // Give some benefit of doubt to new agents
      }

      // Factor 4: Health (10% weight)
      const healthScore = agent.metrics.healthStatus === 'healthy' ? 1 : 0;
      score += healthScore * 10;

      // Bonus: Priority matching
      if (task.priority === agent.config.priority) {
        score += 5;
      }

      return { agent, score };
    });

    // Select agent with highest score
    const best = scores.reduce((prev, current) =>
      current.score > prev.score ? current : prev,
    );

    this.logger.debug(
      {
        agentId: best.agent.config.id,
        score: best.score.toFixed(2),
      },
      'Best fit agent selected',
    );

    return best.agent;
  }

  /**
   * Sort tasks by priority
   */
  private sortTasksByPriority(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      // Lower priority enum value = higher priority
      return a.priority - b.priority;
    });
  }

  /**
   * Get required capability for a task
   */
  private getRequiredCapability(task: Task): AgentCapability | null {
    // Map task types to capabilities
    const capabilityMap: Record<string, AgentCapability> = {
      'osint:collect': AgentCapability.OSINT_COLLECTION,
      'web:scrape': AgentCapability.WEB_SCRAPING,
      'nlp:analyze': AgentCapability.NLP_ANALYSIS,
      'graph:analyze': AgentCapability.GRAPH_ANALYSIS,
      'sentiment:analyze': AgentCapability.SENTIMENT_ANALYSIS,
      'pattern:detect': AgentCapability.PATTERN_RECOGNITION,
      'anomaly:detect': AgentCapability.ANOMALY_DETECTION,
      'report:generate': AgentCapability.REPORT_GENERATION,
      'summarize': AgentCapability.SUMMARIZATION,
      'alert': AgentCapability.ALERTING,
      'monitor': AgentCapability.HEALTH_MONITORING,
      'llm:reason': AgentCapability.LLM_REASONING,
      'decide': AgentCapability.DECISION_MAKING,
    };

    // Check if task type maps directly
    if (capabilityMap[task.type]) {
      return capabilityMap[task.type];
    }

    // Check if task metadata specifies capability
    if (task.metadata?.requiredCapability) {
      return task.metadata.requiredCapability as AgentCapability;
    }

    // Try to infer from task type prefix
    const prefix = task.type.split(':')[0];
    const prefixCapability = capabilityMap[`${prefix}:*`];
    if (prefixCapability) {
      return prefixCapability;
    }

    return null;
  }

  /**
   * Check if task dependencies are satisfied
   */
  async checkDependencies(task: Task): Promise<boolean> {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    // In a real implementation, this would check if all dependency tasks
    // have completed successfully
    this.logger.debug(
      { taskId: task.id, dependencies: task.dependencies },
      'Checking task dependencies',
    );

    return true; // Simplified for now
  }

  /**
   * Reschedule a failed task
   */
  async reschedule(
    task: Task,
    reason: string,
    delay = this.config.retryDelay,
  ): Promise<SchedulingDecision | null> {
    const retryCount = (task.metadata?.retryCount || 0) + 1;

    if (retryCount > (this.config.maxRetries || 3)) {
      this.logger.error(
        { taskId: task.id, retryCount },
        'Task exceeded max retries',
      );
      return null;
    }

    task.metadata = {
      ...task.metadata,
      retryCount,
      lastFailureReason: reason,
      delayUntil: new Date(Date.now() + (delay || 0)).toISOString(),
    };

    this.logger.info(
      { taskId: task.id, retryCount, delay },
      'Rescheduling task',
    );

    // Wait for delay if specified
    if (delay && delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return this.schedule(task);
  }
}
