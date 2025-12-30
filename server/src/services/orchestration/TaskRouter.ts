import logger from '../../utils/logger.js';
import { Agent, AgentTask, TaskPriority } from './types.js';
import { AgentLifecycleManager } from './AgentLifecycleManager.js';

export class TaskRouter {
  private static instance: TaskRouter;
  private lifecycleManager: AgentLifecycleManager;

  private constructor() {
    this.lifecycleManager = AgentLifecycleManager.getInstance();
  }

  public static getInstance(): TaskRouter {
    if (!TaskRouter.instance) {
      TaskRouter.instance = new TaskRouter();
    }
    return TaskRouter.instance;
  }

  /**
   * Finds the best agent for a given task.
   */
  public routeTask(task: AgentTask): string | null {
    // 1. Get candidate agents based on capabilities
    const requiredCaps = task.requiredCapabilities || [];
    let candidates = this.lifecycleManager.getAllAgents().filter(agent => {
      // Must be active
      if (['offline', 'error', 'terminated'].includes(agent.status)) return false;

      // Must match all capabilities
      // Simplified matching: checking if agent has a capability with the same name
      return requiredCaps.every(reqCap =>
        agent.capabilities.some(cap => cap.name === reqCap)
      );
    });

    if (candidates.length === 0) {
      logger.warn(`No agents found for task ${task.id} with capabilities: ${requiredCaps.join(', ')}`);
      return null;
    }

    // 2. Filter by constraints (e.g. clearance)
    if (task.requiredClearance) {
      candidates = candidates.filter(agent => {
        // Simple string comparison for now, in reality would use a hierarchy
        return agent.constraints.requiredClearance === task.requiredClearance;
      });
    }

    // 3. Score candidates for load balancing
    // Prefer 'idle' agents over 'busy' ones
    const scoredCandidates = candidates.map(agent => ({
      agent,
      score: this.calculateScore(agent, task)
    }));

    // Sort by score (descending)
    scoredCandidates.sort((a, b) => b.score - a.score);

    if (scoredCandidates.length > 0) {
      const bestAgent = scoredCandidates[0].agent;
      logger.info(`Routing task ${task.id} to agent ${bestAgent.name} (Score: ${scoredCandidates[0].score})`);
      return bestAgent.id;
    }

    return null;
  }

  private calculateScore(agent: Agent, task: AgentTask): number {
    let score = 0;

    // Status preference
    if (agent.status === 'idle') score += 100;
    else if (agent.status === 'busy') score += 10; // Can still accept if concurrent allowed

    // Constraint checks (concurrency)
    const maxTasks = agent.constraints.maxConcurrentTasks || 1;
    // In a real system, we'd check actual current load.
    // Here we assume 'busy' means full load for simplicity unless we track active task count.

    // Priority matching?
    // Maybe specific agents are better for high priority tasks.

    return score;
  }
}
