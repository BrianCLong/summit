import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockAnalystAdapter } from '../services/analystAdapter';

describe('mockAnalystAdapter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves case-001 with expected structure', async () => {
    const promise = mockAnalystAdapter.getCase('case-001');
    vi.advanceTimersByTime(700);
    const result = await promise;

    expect(result.id).toBe('case-001');
    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.relationships.length).toBeGreaterThan(0);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.reports.length).toBeGreaterThan(0);
  });

  it('rejects for unknown case IDs', async () => {
    const promise = mockAnalystAdapter.getCase('case-999');
    vi.advanceTimersByTime(700);
    await expect(promise).rejects.toThrow('Case case-999 not found');
  });

  it('searchCases returns all cases with empty query', async () => {
    const promise = mockAnalystAdapter.searchCases('');
    vi.advanceTimersByTime(300);
    const results = await promise;
    expect(results.length).toBe(3);
  });

  it('searchCases filters by title', async () => {
    const promise = mockAnalystAdapter.searchCases('Sandstorm');
    vi.advanceTimersByTime(300);
    const results = await promise;
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('case-001');
  });

  it('case entities have required fields', async () => {
    const promise = mockAnalystAdapter.getCase('case-001');
    vi.advanceTimersByTime(700);
    const result = await promise;

    for (const entity of result.entities) {
      expect(entity).toHaveProperty('id');
      expect(entity).toHaveProperty('label');
      expect(entity).toHaveProperty('type');
      expect(entity).toHaveProperty('deception_score');
      expect(entity).toHaveProperty('connections');
      expect(entity).toHaveProperty('properties');
      expect(entity.deception_score).toBeGreaterThanOrEqual(0);
      expect(entity.deception_score).toBeLessThanOrEqual(1);
    }
  });

  it('timeline events have valid severity values', async () => {
    const promise = mockAnalystAdapter.getCase('case-001');
    vi.advanceTimersByTime(700);
    const result = await promise;
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    for (const event of result.events) {
      expect(validSeverities).toContain(event.severity);
    }
  });
});
