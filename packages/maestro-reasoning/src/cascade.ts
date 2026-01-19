import type { ReasoningCrew } from './crew.js';
import type { ReasoningContext, ReasoningRunResult } from './types.js';

export interface CascadeTier {
  id: string;
  label: string;
  run: (context: ReasoningContext) => Promise<ReasoningRunResult>;
}

export interface CascadeDecision {
  tierId: string;
  result: ReasoningRunResult;
  escalated: boolean;
}

export const runCascade = async (options: {
  tiers: CascadeTier[];
  context: ReasoningContext;
  disagreementThreshold?: boolean;
  scoreThreshold?: number;
}): Promise<CascadeDecision> => {
  const { tiers, context } = options;
  const scoreThreshold = options.scoreThreshold ?? 4;

  for (const tier of tiers) {
    const result = await tier.run(context);
    const selectedScore = result.decision.scoreByLane[result.decision.selectedLaneId] ?? 0;
    const disagreement = result.decision.disagreement;
    const shouldEscalate = disagreement || selectedScore < scoreThreshold;

    if (!shouldEscalate) {
      return {
        tierId: tier.id,
        result,
        escalated: false,
      };
    }
  }

  const lastTier = tiers[tiers.length - 1];
  return {
    tierId: lastTier?.id ?? 'unknown',
    result: await lastTier.run(context),
    escalated: true,
  };
};

export const buildCascadeTiers = (options: {
  crew: ReasoningCrew;
  runtimes: Array<{ id: string; label: string; runtime: Parameters<ReasoningCrew['run']>[1] }>;
}): CascadeTier[] => {
  return options.runtimes.map((entry) => ({
    id: entry.id,
    label: entry.label,
    run: (context) => options.crew.run(context, entry.runtime),
  }));
};
