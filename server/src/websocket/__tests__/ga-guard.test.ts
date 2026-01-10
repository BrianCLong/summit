
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { checkCounterGate } from '../ga-guard.js';

describe('GA WebSocket Guard', () => {
  test('BLOCKS messages containing PII', () => {
    const result = checkCounterGate({
      type: 'counter',
      pii: true
    });
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('BLOCK');
    expect(result.reason).toContain('PII');
  });

  test('BLOCKS unsafe modes', () => {
    const result = checkCounterGate({
      type: 'counter',
      mode: 'attack_mode',
      human_approved: true
    });
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('BLOCK');
    expect(result.reason).toContain('unsafe mode');
  });

  test('HOLDS messages without human approval', () => {
    const result = checkCounterGate({
      type: 'counter',
      mode: 'prebunk',
      human_approved: false
    });
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('HOLD');
    expect(result.reason).toContain('needs human approval');
  });

  test('ALLOWS safe mode with human approval', () => {
    const result = checkCounterGate({
      type: 'counter',
      mode: 'prebunk',
      human_approved: true
    });
    expect(result.allowed).toBe(true);
  });

  test('ALLOWS valid cred_bridge mode', () => {
      const result = checkCounterGate({
        type: 'counter',
        mode: 'cred_bridge',
        human_approved: true
      });
      expect(result.allowed).toBe(true);
    });

  test('ALLOWS valid myth_card mode', () => {
    const result = checkCounterGate({
      type: 'counter',
      mode: 'myth_card',
      human_approved: true
    });
    expect(result.allowed).toBe(true);
  });
});
