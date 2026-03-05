import { AgentScalingMetrics } from './metrics';

export interface EvaluationConfig {
  maxSteps: number;
  maxTokens: number;
  topology: 'single' | 'multi' | 'parallel';
}

export class EvaluationRunner {
  constructor(private config: EvaluationConfig) {}

  async runTask(taskName: string): Promise<AgentScalingMetrics> {
    // Stub implementation
    return {
      successRate: 1.0,
      latencyMs: 150,
      tokenCost: 100,
      coordinationOverhead: this.config.topology === 'single' ? 0 : 50
    };
  }
}
