import type { ModelPolicy } from './types.js';

export type ModelPhase = 'search' | 'plan' | 'execute' | 'debug';

export const selectModelForPhase = (
  policy: ModelPolicy,
  phase: ModelPhase,
): string => {
  switch (phase) {
    case 'search':
      return policy.searchModel;
    case 'plan':
    case 'execute':
      return policy.buildModel;
    case 'debug':
      return policy.debugModel;
    default: {
      const exhaustiveCheck: never = phase;
      return exhaustiveCheck;
    }
  }
};
