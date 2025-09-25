import { readFileSync } from 'fs';
import path from 'path';
import { load } from 'js-yaml';

interface AlertRule {
  alert?: string;
  annotations?: Record<string, string>;
}

describe('observability alert rules', () => {
  const alertFile = path.resolve(__dirname, '../../../../observability/alert-rules.yml');
  const yamlContent = readFileSync(alertFile, 'utf8');
  const doc = load(yamlContent) as { groups: Array<{ rules?: AlertRule[] }> };
  const alerts = doc.groups.flatMap((group) => group.rules ?? []).filter((rule) => rule.alert);

  it('includes telemetry poison anomaly alert with runbook', () => {
    const poisonAlert = alerts.find((rule) => rule.alert === 'TelemetryPoisonAnomaly');
    expect(poisonAlert).toBeDefined();
    expect(poisonAlert?.annotations?.runbook_url).toMatch(/^https?:\/\//);
  });

  it('includes graph latency hotspot alert with runbook', () => {
    const latencyAlert = alerts.find((rule) => rule.alert === 'GraphQueryLatencyHotspot');
    expect(latencyAlert).toBeDefined();
    expect(latencyAlert?.annotations?.runbook_url).toMatch(/^https?:\/\//);
  });
});
