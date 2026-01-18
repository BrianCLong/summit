import type { TaskDefinition } from '../taskpack/schema.js';
import type { FilterOutcome } from './types.js';

const deepResearchSignals = [
  'compare',
  'analyze',
  'synthesize',
  'evaluate',
  'trade-off',
  'timeline',
  'root cause',
  'multi-source',
  'cross-source',
];

export const taskQualification = (task: TaskDefinition): FilterOutcome => {
  const prompt = task.prompt.toLowerCase();
  const matchedSignals = deepResearchSignals.filter((signal) => prompt.includes(signal));
  const longForm = task.prompt.length >= 120;

  const passed = matchedSignals.length > 0 && longForm;
  const reasons: string[] = [];

  if (!longForm) {
    reasons.push('Prompt too short to qualify as deep research.');
  }
  if (matchedSignals.length === 0) {
    reasons.push('No deep research signals detected in prompt.');
  }

  return {
    taskId: task.id,
    passed,
    reasons,
  };
};
