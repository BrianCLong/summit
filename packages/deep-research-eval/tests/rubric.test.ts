import { describe, expect, it } from 'vitest';
import { generateAdaptiveRubric } from '../src/rubric/adaptive_rubric.js';
import type { TaskDefinition } from '../src/taskpack/schema.js';

describe('adaptive rubric', () => {
  it('generates governance and task-specific dimensions', () => {
    const task: TaskDefinition = {
      id: 'task-009',
      topic: 'Policy test',
      language: 'en',
      prompt: 'Analyze evidence with citations and summarize findings.',
      objectives: ['Summarize evidence', 'Compare sources'],
    };

    const rubric = generateAdaptiveRubric(task, 'seed');
    const ids = rubric.dimensions.map((dimension) => dimension.id);

    expect(ids).toContain('policy-compliance');
    expect(ids).toContain('objective-1');
    expect(ids).toContain('objective-2');
  });
});
