import { describe, expect, it } from 'vitest';
import { ThreatAnalyticsEngine } from '../src/engine.js';
import type { BehaviorEvent } from '../src/types.js';

describe('ThreatAnalyticsEngine provenance', () => {
  it('attaches provenance and evidence trails for analytic alerts', () => {
    const engine = new ThreatAnalyticsEngine({
      provenance: {
        sources: ['intel-feed'],
        tools: ['enrichment-pipeline'],
        models: [{ id: 'risk-model', version: '3.1.0' }],
        graphState: { namespace: 'intelgraph', version: 7, checksum: 'xyz' },
        actor: 'exploratory-osint-agent',
        traceId: 'trace-1',
      },
    });

    const alertEvent: BehaviorEvent = {
      entityId: 'entity-1',
      action: 'login',
      timestamp: Date.now(),
      value: 1,
      attributes: { host: 'malicious.example.com' },
    };

    engine.registerRule({
      id: 'login-indicator',
      description: 'Trigger on login events for testing',
      severity: 'medium',
      condition: ({ event }) => event.action === 'login',
    });

    const alerts = engine.processEvent(alertEvent);
    expect(alerts).toHaveLength(1);
    const alert = alerts[0];

    expect(alert.provenance?.sources).toContain('intel-feed');
    expect(alert.provenance?.tools).toContain('threat-analytics-engine');
    expect(alert.provenance?.models?.[0].id).toBe('risk-model');
    expect(alert.evidence?.entries.length).toBeGreaterThan(0);
    expect(alert.evidence?.summary.graphState?.namespace).toBe('intelgraph');
  });
});
