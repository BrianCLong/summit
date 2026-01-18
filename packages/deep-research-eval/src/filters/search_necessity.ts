import type { TaskDefinition } from '../taskpack/schema.js';
import type { FilterOutcome } from './types.js';

const searchSignals = [
  'sources',
  'evidence',
  'citations',
  'references',
  'latest',
  'current',
  'external',
  'report',
];

export const searchNecessity = (task: TaskDefinition): FilterOutcome => {
  const prompt = task.prompt.toLowerCase();
  const matchedSignals = searchSignals.filter((signal) => prompt.includes(signal));

  const requiresSources = matchedSignals.length > 0;
  const passed = requiresSources;
  const reasons: string[] = [];

  if (!requiresSources) {
    reasons.push('Prompt does not explicitly require external evidence.');
  }

  return {
    taskId: task.id,
    passed,
    reasons,
  };
};
