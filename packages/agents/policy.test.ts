import { JulesPolicy } from './jules/policy.js';
import { CodexPolicy } from './codex/policy.js';
import { ObserverPolicy } from './observer/policy.js';
import { describe, it, expect } from '@jest/globals';

describe('Agent Policies', () => {
  describe('Jules', () => {
    it('allows safe_read', async () => {
      const result = await JulesPolicy.check('safe_read');
      expect(result.allowed).toBe(true);
    });
    it('denies unknown action', async () => {
      const result = await JulesPolicy.check('delete_db');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('blocked by default');
    });
  });

  describe('Codex', () => {
    it('allows generate_code', async () => {
      const result = await CodexPolicy.check('generate_code');
      expect(result.allowed).toBe(true);
    });
    it('denies unknown action', async () => {
      const result = await CodexPolicy.check('deploy_prod');
      expect(result.allowed).toBe(false);
    });
  });

  describe('Observer', () => {
    it('allows log_event', async () => {
      const result = await ObserverPolicy.check('log_event');
      expect(result.allowed).toBe(true);
    });
    it('denies unknown action', async () => {
      const result = await ObserverPolicy.check('mutate_graph');
      expect(result.allowed).toBe(false);
    });
  });
});
