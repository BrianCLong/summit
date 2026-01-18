import { describe, expect, it } from 'vitest';
import { taskQualification } from '../src/filters/task_qualification.js';
import { searchNecessity } from '../src/filters/search_necessity.js';
import { accessFeasibility } from '../src/filters/access_feasibility.js';
import type { TaskDefinition } from '../src/taskpack/schema.js';

const baseTask: TaskDefinition = {
  id: 'task-001',
  topic: 'Test',
  language: 'en',
  prompt: 'Analyze and compare multiple sources to synthesize a report with evidence and citations.',
};

describe('filters', () => {
  it('qualifies deep research prompts', () => {
    const result = taskQualification(baseTask);
    expect(result.passed).toBe(true);
  });

  it('detects search necessity signals', () => {
    const result = searchNecessity(baseTask);
    expect(result.passed).toBe(true);
  });

  it('blocks denied sources in access feasibility', () => {
    const result = accessFeasibility({
      ...baseTask,
      requiredSources: ['denied-source'],
      policy: {
        tenantId: 'tenant',
        denySources: ['denied-source'],
      },
    });
    expect(result.passed).toBe(false);
  });
});
