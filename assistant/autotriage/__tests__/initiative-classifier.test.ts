import { describe, it, expect } from '@jest/globals';
import { classifyInitiative } from '../classifier/initiative-classifier';
import { TriageItem } from '../types.js';
import { InitiativeRule } from '../config.js';

describe('classifyInitiative', () => {
  const rules: InitiativeRule[] = [
    {
      id: 'my-initiative',
      keywords: ['foo', 'bar'],
      patterns: [/baz-\d+/],
    },
  ];

  it('matches keyword in title', () => {
    const item = {
      title: 'This has foo in it',
      description: 'nothing',
    } as unknown as TriageItem;
    expect(classifyInitiative(item, rules)).toBe('my-initiative');
  });

  it('matches pattern in description', () => {
    const item = {
      title: 'Normal title',
      description: 'Has baz-123 pattern',
    } as unknown as TriageItem;
    expect(classifyInitiative(item, rules)).toBe('my-initiative');
  });

  it('returns undefined for no match', () => {
    const item = {
      title: 'Nothing here',
      description: 'Also nothing',
    } as unknown as TriageItem;
    expect(classifyInitiative(item, rules)).toBeUndefined();
  });
});
