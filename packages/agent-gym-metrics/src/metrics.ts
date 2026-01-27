import { Turn, EpisodeResult } from '@summit/agent-gym';

export type MetricResult = {
  name: string;
  value: number;
  metadata?: Record<string, any>;
};

export class AgentMetrics {
  static calculateLoopingIndex(turns: Turn[]): MetricResult {
    const actionStrings = turns.map(t => JSON.stringify(t.action));
    const uniqueActions = new Set(actionStrings);
    const repeats = turns.length - uniqueActions.size;
    const loopingIndex = turns.length > 0 ? repeats / turns.length : 0;

    return {
      name: 'LoopingIndex',
      value: loopingIndex,
      metadata: { totalTurns: turns.length, uniqueActions: uniqueActions.size }
    };
  }

  static calculateSuccessRate(episodes: EpisodeResult[]): MetricResult {
    const successes = episodes.filter(e => e.success).length;
    return {
      name: 'SuccessRate',
      value: episodes.length > 0 ? successes / episodes.length : 0
    };
  }

  static calculateAverageSteps(episodes: EpisodeResult[]): MetricResult {
    const totalSteps = episodes.reduce((sum, e) => sum + e.turns.length, 0);
    return {
      name: 'AverageSteps',
      value: episodes.length > 0 ? totalSteps / episodes.length : 0
    };
  }
}
