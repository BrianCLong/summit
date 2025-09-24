import {
  evaluateBurnRate,
  detectTelemetryAnomaly,
  runAlarmDrill,
  defaultBurnRateThresholds,
  defaultTelemetryThresholds,
} from '../alarm-simulator';

describe('alarm simulator', () => {
  it('escalates severity for aggressive burn rates', () => {
    const result = evaluateBurnRate(6.2, defaultBurnRateThresholds);
    expect(result.triggered).toBe(true);
    expect(result.severity).toBe('critical');
    expect(result.message).toContain('exceeds critical threshold');
  });

  it('detects telemetry anomalies from poison queue spikes', () => {
    const result = detectTelemetryAnomaly({ poisonEvents: 3, anomalyScore: 0.4 }, defaultTelemetryThresholds);
    expect(result.triggered).toBe(true);
    expect(result.severity).toBe('warning');
    expect(result.reason).toContain('exceeded warning thresholds');
  });

  it('runs a combined drill for on-call readiness', () => {
    const drill = runAlarmDrill(
      5.1,
      { poisonEvents: 8, anomalyScore: 0.93 },
      defaultBurnRateThresholds,
      defaultTelemetryThresholds,
    );

    expect(drill.burnRate.severity).toBe('critical');
    expect(drill.telemetry.severity).toBe('critical');
    expect(drill.telemetry.reason).toContain('breached critical thresholds');
  });
});
