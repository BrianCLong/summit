import { PrivacyIncidentDrillEngine, defaultScenario } from '@server/pits';

describe('PrivacyIncidentDrillEngine', () => {
  it('produces deterministic outputs when the seed is fixed', () => {
    const seed = 42;
    const engineA = new PrivacyIncidentDrillEngine(defaultScenario);
    const engineB = new PrivacyIncidentDrillEngine(defaultScenario);

    const reportA = engineA.run(seed);
    const reportB = engineB.run(seed);

    expect(reportA.timeline).toEqual(reportB.timeline);
    expect(reportA.integrations).toEqual(reportB.integrations);
    expect(reportA.score).toBe(reportB.score);
  });

  it('produces artifacts for each integration and tracks evidence metrics', () => {
    const engine = new PrivacyIncidentDrillEngine(defaultScenario);
    const report = engine.run(99);

    expect(report.integrations.IAB.totalArtifacts).toBeGreaterThan(0);
    expect(report.integrations.IDTL.totalArtifacts).toBeGreaterThan(0);

    const totalArtifacts =
      report.integrations.IAB.totalArtifacts + report.integrations.IDTL.totalArtifacts;

    expect(report.metrics.evidenceRequests).toBe(totalArtifacts);
    expect(report.metrics.averageTimeToEvidenceHours).toBeGreaterThan(0);
  });

  it('flags SLA breaches with actionable remediation guidance', () => {
    const engine = new PrivacyIncidentDrillEngine(defaultScenario);
    const report = engine.run(1337);

    expect(report.slaBreaches.length).toBeGreaterThan(0);

    for (const breach of report.slaBreaches) {
      expect(breach.recommendedAction).toMatch(/\d+(\.\d+)?h/);
      const matchingTimeline = report.timeline.find((entry) => entry.eventId === breach.eventId);
      expect(matchingTimeline?.status).toBe('breached');
    }
  });
});
