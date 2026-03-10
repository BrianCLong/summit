import { UncertaintyRecord, UncertaintyAction, AgentRun } from '../types/uncertainty';

// Example policy config rules
export interface PolicyRule {
  condition: (record: UncertaintyRecord) => boolean;
  actions: UncertaintyAction[];
}

// In a real implementation this would likely be loaded from a config file (e.g. YAML)
export const DEFAULT_RULES: PolicyRule[] = [
  {
    condition: (record) => record.metrics.epistemic > 0.7 && record.metrics.diverseAgentEntropy > 0.4,
    actions: ['requireMultiAgentDebate', 'spawnDebateAgents'],
  },
  {
    condition: (record) => record.metrics.epistemic > 0.9 || record.metrics.aleatoric > 0.8,
    actions: ['humanEscalate', 'humanReview'],
  },
];

export class PolicyEngine {
  private rules: PolicyRule[];

  constructor(rules: PolicyRule[] = DEFAULT_RULES) {
    this.rules = rules;
  }

  evaluatePolicy(record: UncertaintyRecord): UncertaintyAction[] {
    const triggeredActions: Set<UncertaintyAction> = new Set();

    for (const rule of this.rules) {
      if (rule.condition(record)) {
        rule.actions.forEach(action => triggeredActions.add(action));
      }
    }

    if (triggeredActions.size === 0) {
      return ['none'];
    }

    return Array.from(triggeredActions);
  }

  // Integrate with Maestro Conductor orchestrator: wrap every agentRun
  async executeWithUncertaintyWrap<T>(
    agentRun: AgentRun,
    record: UncertaintyRecord,
    agentFunction: () => Promise<T>,
    onAdaptationTriggered?: (actions: UncertaintyAction[]) => void
  ): Promise<T> {
    console.log(`[Maestro Conductor Wrapper] Starting run for ${agentRun.id} with uncertainty phase ${record.lifecycle}`);

    // Pre-flight check
    const preFlightActions = this.evaluatePolicy(record);
    if (preFlightActions.includes('humanEscalate')) {
      throw new Error(`Execution blocked: humanEscalate triggered for agent run ${agentRun.id}`);
    }

    // Check if we need to adapt before running
    if (preFlightActions.length > 0 && !preFlightActions.includes('none')) {
      if (onAdaptationTriggered) {
        onAdaptationTriggered(preFlightActions);
      }
    }

    try {
      const result = await agentFunction();

      // Post-flight analysis could go here
      return result;
    } catch (error) {
       console.error(`[Maestro Conductor Wrapper] Error in ${agentRun.id}:`, error);
       throw error;
    }
  }
}
