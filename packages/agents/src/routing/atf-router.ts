import { ATFLevel } from '@summit/governance';
import { AgentRegistry } from '../registry/index.js';

interface Task {
  id: string;
  requiredCapabilities: string[];
  complexity?: number; // Optional hint
}

async function writeScopedEvidence(evidence: any) {}

export class ATFTaskRouter {
  constructor(private registry: AgentRegistry) {}

  async routeTask(task: Task): Promise<string> {
    const complexity = await this.assessComplexity(task);
    const requiredLevel = this.mapComplexityToLevel(complexity);

    // Find eligible agents
    const eligibleAgents = this.registry.findAgents({
      minLevel: requiredLevel,
      available: true,
      capabilities: task.requiredCapabilities,
    });

    if (eligibleAgents.length === 0) {
      throw new Error(`No agents available for level ${requiredLevel}`);
    }

    // Select agent with best fit
    const selectedAgent = this.selectOptimalAgent(eligibleAgents, task);

    await writeScopedEvidence({
      operation: 'task.route',
      inputs: {
        taskId: task.id,
        complexity,
        requiredLevel
      },
      outputs: {
        assignedAgent: selectedAgent.id,
        agentLevel: selectedAgent.level
      },
    });

    return selectedAgent.id;
  }

  private async assessComplexity(task: Task): Promise<number> {
    return task.complexity || 1; // Default
  }

  private mapComplexityToLevel(complexity: number): ATFLevel {
    if (complexity < 3) return 'intern';
    if (complexity < 6) return 'junior';
    if (complexity < 8) return 'senior';
    return 'principal';
  }

  private selectOptimalAgent(agents: any[], task: Task): any {
    return agents[0]; // Simple selection
  }
}
