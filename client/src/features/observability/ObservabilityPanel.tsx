import React from 'react';

export default function ObservabilityPanel() {
  const grafana = import.meta.env.VITE_OBS_GRAFANA_URL || '';
  const tempo = import.meta.env.VITE_OBS_TEMPO_URL || '';
  const prom = import.meta.env.VITE_OBS_PROM_URL || '';
  const embed = (import.meta.env.VITE_OBS_EMBED || 'true') === 'true';

  return (
    <div style={{ padding: 24 }}>
      <h2>Observability</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
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
              <a href={grafana} target="_blank" rel="noreferrer">
                Open Grafana Dashboard
              </a>
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
              <a href={tempo} target="_blank" rel="noreferrer">
                Open Distributed Traces
              </a>
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
              <a href={prom} target="_blank" rel="noreferrer">
                Open Prometheus Metrics
              </a>
            )}
          </section>
        )}
        {!grafana && !tempo && !prom && (
          <p>
            Set VITE_OBS_GRAFANA_URL / VITE_OBS_TEMPO_URL / VITE_OBS_PROM_URL to
            embed dashboards.
          </p>
        )}
      </div>
    </div>
  );
}
