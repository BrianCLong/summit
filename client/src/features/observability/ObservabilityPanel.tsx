import React, { useMemo } from 'react';
import { OHIEPanel } from '../ohie';

export default function ObservabilityPanel() {
  const grafana = import.meta.env.VITE_OBS_GRAFANA_URL || '';
  const tempo = import.meta.env.VITE_OBS_TEMPO_URL || '';
  const prom = import.meta.env.VITE_OBS_PROM_URL || '';
  const embed = (import.meta.env.VITE_OBS_EMBED || 'true') === 'true';
  const ohieData = useMemo(
    () => ({
      scenario: {
        baselineKpi: 0.824,
        optOutRate: 0.18,
        population: 12000,
        sensitivity: 0.45,
      },
      sensitivityCurve: [
        { optOutRate: 0.05, analyticKpi: 0.801, simulatedKpi: 0.8, kpiDegradation: 0.024 },
        { optOutRate: 0.1, analyticKpi: 0.779, simulatedKpi: 0.778, kpiDegradation: 0.046 },
        { optOutRate: 0.15, analyticKpi: 0.756, simulatedKpi: 0.754, kpiDegradation: 0.068 },
        { optOutRate: 0.18, analyticKpi: 0.742, simulatedKpi: 0.741, kpiDegradation: 0.083 },
      ],
      samplingPlan: {
        sampleSize: 2600,
        achievedError: 0.038,
        dpNoise: 0.012,
        samplingError: 0.035,
        confidence: 0.95,
      },
      confidenceInterval: [0.072, 0.094],
      riskBrief: {
        title: 'Opt-Out Herd Immunity Risk Brief',
        mitigations: [
          'Deploy minimal-view DMP cohorting to isolate high-sensitivity attributes.',
          'Shift KPI measurement cadence to bi-weekly until opt-out rate stabilises.',
          'Flag campaigns exceeding degradation guardrail for manual approval.',
        ],
        signature: '9d38f0c0d6f978b2',
        signedBy: 'OHIE-Automaton',
      },
    }),
    [],
  );

  return (
    <div style={{ padding: 24 }}>
      <h2>Observability</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <OHIEPanel data={ohieData} />
        {grafana && (
          <section>
            <h3>Grafana</h3>
            {embed ? (
              <iframe 
                title="grafana" 
                src={grafana} 
                style={{ width: '100%', height: 480, border: 0 }} 
                sandbox="allow-same-origin allow-scripts"
              />
            ) : (
              <a href={grafana} target="_blank" rel="noreferrer">Open Grafana Dashboard</a>
            )}
          </section>
        )}
        {tempo && (
          <section>
            <h3>Traces (Tempo/Jaeger)</h3>
            {embed ? (
              <iframe 
                title="traces" 
                src={tempo} 
                style={{ width: '100%', height: 480, border: 0 }}
                sandbox="allow-same-origin allow-scripts"
              />
            ) : (
              <a href={tempo} target="_blank" rel="noreferrer">Open Distributed Traces</a>
            )}
          </section>
        )}
        {prom && (
          <section>
            <h3>Prometheus</h3>
            {embed ? (
              <iframe 
                title="prom" 
                src={prom} 
                style={{ width: '100%', height: 480, border: 0 }}
                sandbox="allow-same-origin allow-scripts"
              />
            ) : (
              <a href={prom} target="_blank" rel="noreferrer">Open Prometheus Metrics</a>
            )}
          </section>
        )}
        {!grafana && !tempo && !prom && <p>Set VITE_OBS_GRAFANA_URL / VITE_OBS_TEMPO_URL / VITE_OBS_PROM_URL to embed dashboards.</p>}
      </div>
    </div>
  );
}

