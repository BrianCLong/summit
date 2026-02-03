import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InstinctStore } from '../store';

describe('InstinctStore', () => {
  const originalEnv = process.env.SUMMIT_INSTINCTS;

  beforeEach(() => {
    process.env.SUMMIT_INSTINCTS = '1';
  });

  afterEach(() => {
    process.env.SUMMIT_INSTINCTS = originalEnv;
  });

  it('should add and export instincts deterministically', () => {
    const store = new InstinctStore();
    store.addInstinct({
      pattern: 'beta',
      confidence: 0.8,
      source: 'manual',
      tags: [],
    });
    store.addInstinct({
      pattern: 'alpha',
      confidence: 0.9,
      source: 'manual',
      tags: [],
    });

    const exported = store.export();
    const parsed = JSON.parse(exported);
    expect(parsed[0].pattern).toBe('alpha');
    expect(parsed[1].pattern).toBe('beta');
  });

  it('should not add instincts when disabled', () => {
    process.env.SUMMIT_INSTINCTS = '0';
    const store = new InstinctStore();
    store.addInstinct({
      pattern: 'test',
      confidence: 1,
      source: 'manual',
      tags: [],
    });
    expect(store.getInstincts()).toHaveLength(0);
  });
});
