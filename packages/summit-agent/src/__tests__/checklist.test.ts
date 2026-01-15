import { describe, expect, it } from 'vitest';
import { createDefaultChecklist, serializeChecklist } from '../lib/checklist.js';

describe('checklist helpers', () => {
  it('serializes a default checklist with required verifiers', () => {
    const checklist = createDefaultChecklist('demo task');
    const yaml = serializeChecklist(checklist);

    expect(checklist.items[0].requiredVerifiers).toEqual([
      'lint',
      'typecheck',
      'test',
    ]);
    expect(yaml).toContain('task: demo task');
  });
});
