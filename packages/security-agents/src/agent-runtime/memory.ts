import { AgentMode, AgentStepResult } from './runtime.js';

type MemoryStep = {
  incidentId: string;
  step: string;
  mode: AgentMode;
  decision: AgentStepResult;
};

export class EpisodeMemory {
  private steps: MemoryStep[] = [];

  recordStep(step: MemoryStep): void {
    this.steps.push(step);
  }

  toSummary(): Record<string, unknown> {
    return {
      totalSteps: this.steps.length,
      decisions: this.steps.map((entry) => ({
        step: entry.step,
        mode: entry.mode,
        policy: entry.decision.policyDecision,
        costUsd: entry.decision.costUsd
      }))
    };
  }
}

export class CaseLearningStore {
  private summaries: Record<string, Record<string, unknown>> = {};

  persistContext(incidentId: string, summary: Record<string, unknown>): void {
    this.summaries[incidentId] = summary;
  }

  getSummary(incidentId: string): Record<string, unknown> | undefined {
    return this.summaries[incidentId];
  }
}
