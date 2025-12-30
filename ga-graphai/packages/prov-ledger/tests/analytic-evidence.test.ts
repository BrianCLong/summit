import { describe, expect, it } from 'vitest';
import { buildAnalyticEvidenceTrail } from '../src/analytic-evidence.js';

describe('buildAnalyticEvidenceTrail', () => {
  it('chains sources, tools, models, graph state, and output into an evidence trail', () => {
    const trail = buildAnalyticEvidenceTrail({
      outputId: 'alert-123',
      actor: 'agent-7',
      sources: ['event-1', 'event-2'],
      tools: ['threat-analytics-engine', 'intel-sync'],
      models: [
        { id: 'llm-x', version: '1.2.0', usage: 'triage' },
        { id: 'detector-y', usage: 'signal-correlation' },
      ],
      graphState: { namespace: 'intelgraph', version: 42, checksum: 'abc123' },
      traceId: 'trace-abc',
      producedAt: '2024-01-01T00:00:00Z',
    });

    expect(trail.summary.outputId).toBe('alert-123');
    expect(trail.summary.sources).toEqual(['event-1', 'event-2']);
    expect(trail.summary.tools).toContain('threat-analytics-engine');
    expect(trail.summary.graphState?.checksum).toBe('abc123');
    expect(trail.headHash).toBeDefined();
    expect(trail.entries).toHaveLength(6);

    const hashes = trail.entries.map((entry) => entry.hash);
    expect(new Set(hashes).size).toBe(hashes.length);
    for (let index = 1; index < trail.entries.length; index += 1) {
      expect(trail.entries[index].previousHash).toBe(trail.entries[index - 1].hash);
    }
  });
});
