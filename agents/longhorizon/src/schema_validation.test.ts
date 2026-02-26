import { describe, it, expect } from 'vitest';
import { PRChainSchema } from './schema';
import fs from 'fs';
import path from 'path';

describe('PR-Chain Schema Validation', () => {
  it('should validate initial fixtures against the schema', () => {
    const fixturesPath = path.join(__dirname, '../fixtures/pr_chains.jsonl');
    const content = fs.readFileSync(fixturesPath, 'utf8');
    const lines = content.trim().split('\n');

    for (const line of lines) {
      const data = JSON.parse(line);
      const result = PRChainSchema.safeParse(data);

      if (!result.success) {
        console.error('Validation failed for:', data.id);
        console.error(result.error.format());
      }

      expect(result.success).toBe(true);
    }
  });

  it('should fail on invalid data', () => {
    const invalidData = {
      id: 'invalid-001',
      goal: 'Missing steps',
      // steps: [], // Required
      verdict: 'invalid-verdict'
    };

    const result = PRChainSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
