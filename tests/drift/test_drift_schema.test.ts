import { describe, expect, test } from 'vitest';
import { buildDriftReport } from '../../scripts/monitoring/bellingcat-osint-toolkit-drift';

describe('bellingcat drift schema', () => {
  test('produces summary shape with expected counters and results', () => {
    const report = buildDriftReport('artifacts/toolkit/bellingcat.json');
    expect(report.source).toBe('bellingcat');
    expect(typeof report.checked_tools).toBe('number');
    expect(report.ok + report.warn + report.fail).toBe(report.checked_tools);
    expect(Array.isArray(report.results)).toBe(true);
    expect(report.results[0]).toHaveProperty('tool_id');
    expect(report.results[0]).toHaveProperty('status');
    expect(report.results[0]).toHaveProperty('http');
  });
});
