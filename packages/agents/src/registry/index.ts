import { ATFLevel, IdentityManifest, createAgentId } from '@summit/governance';
import { createHash } from 'crypto';

interface RegisteredAgent {
  id: string;
  manifest: IdentityManifest;
  level: ATFLevel;
  metrics: {
    tasksCompleted: number;
    successRate: number;
    evidenceQuality: number;
  };
  registeredAt: Date;
  promotionEligible?: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function sha256(data: string) { return createHash('sha256').update(data).digest('hex'); }
async function writeScopedEvidence(evidence: any) {}

export class AgentRegistry {
  private agents: Map<string, RegisteredAgent> = new Map();

  async validateManifest(manifest: IdentityManifest): Promise<ValidationResult> {
    const errors: string[] = [];
    if (!manifest.name) errors.push('Missing name');
    if (!manifest.version) errors.push('Missing version');
    return { valid: errors.length === 0, errors };
  }

  async registerAgent(manifest: IdentityManifest): Promise<string> {
    const agentId = createAgentId(manifest);

    // Validate manifest
    const validation = await this.validateManifest(manifest);
    if (!validation.valid) {
      throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`);
    }

    // Assign initial ATF level
    const level: ATFLevel = 'intern';

    const agent: RegisteredAgent = {
      id: agentId,
      manifest,
      level,
      metrics: {
        tasksCompleted: 0,
        successRate: 0,
        evidenceQuality: 0,
      },
      registeredAt: new Date(),
    };

    this.agents.set(agentId, agent);

    // Write evidence
    await writeScopedEvidence({
      operation: 'agent.register',
      inputs: { manifestHash: sha256(JSON.stringify(manifest)) },
      outputs: { agentId, level },
    });

    return agentId;
  }

  getPromotionCriteria(level: ATFLevel) {
    // Mock criteria
    return { minTasks: 10, minSuccessRate: 0.9 };
  }

  checkEligibility(metrics: any, criteria: any) {
    return metrics.tasksCompleted >= criteria.minTasks && metrics.successRate >= criteria.minSuccessRate;
  }

  getNextLevel(level: ATFLevel): ATFLevel {
    const levels: ATFLevel[] = ['intern', 'junior', 'senior', 'principal'];
    const idx = levels.indexOf(level);
    return levels[Math.min(idx + 1, levels.length - 1)];
  }

  async promoteAgent(agentId: string): Promise<ATFLevel | null> {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const criteria = this.getPromotionCriteria(agent.level);
    const eligible = this.checkEligibility(agent.metrics, criteria);

    if (eligible) {
      const newLevel = this.getNextLevel(agent.level);
      agent.level = newLevel;

      await writeScopedEvidence({
        operation: 'agent.promote',
        inputs: { agentId, fromLevel: agent.level },
        outputs: { newLevel, metricsSnapshot: agent.metrics },
      });

      return newLevel;
    }

    return null;
  }

  getAgent(agentId: string) {
    return this.agents.get(agentId);
  }

  findAgents(criteria: any): RegisteredAgent[] {
      return Array.from(this.agents.values()); // Mock filter
  }
}
