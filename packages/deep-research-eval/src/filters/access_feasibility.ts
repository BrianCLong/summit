import type { TaskDefinition } from '../taskpack/schema.js';
import type { FilterOutcome } from './types.js';

export const accessFeasibility = (task: TaskDefinition): FilterOutcome => {
  const policy = task.policy;
  const requiredSources = task.requiredSources ?? [];
  const reasons: string[] = [];

  if (!policy) {
    return {
      taskId: task.id,
      passed: true,
      reasons: ['No policy attached; access feasibility defaulted to allow.'],
    };
  }

  const allowList = policy.allowSources ?? [];
  const denyList = policy.denySources ?? [];

  const blockedSources = requiredSources.filter((source) => denyList.includes(source));
  const missingAllow = allowList.length > 0
    ? requiredSources.filter((source) => !allowList.includes(source))
    : [];

  if (blockedSources.length > 0) {
    reasons.push(`Denied sources: ${blockedSources.join(', ')}.`);
  }
  if (missingAllow.length > 0) {
    reasons.push(`Sources outside allow list: ${missingAllow.join(', ')}.`);
  }

  const passed = blockedSources.length === 0 && missingAllow.length === 0;

  return {
    taskId: task.id,
    passed,
    reasons,
  };
};
