import { useEffect, useMemo, useState } from 'react';
import AnomalyTable from './components/AnomalyTable';
import SuppressionForm from './components/SuppressionForm';
import { useCdqdApi } from './hooks/useCdqdApi';
import type { Anomaly, SuppressionInput, MetricConfigMap } from './types';

const REFRESH_INTERVAL_MS = 30_000;

export default function App() {
  const api = useCdqdApi();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [metrics, setMetrics] = useState<MetricConfigMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [replayStatus, setReplayStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshAnomalies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listAnomalies();
      setAnomalies(data.anomalies);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const cfg = await api.fetchConfig();
      setMetrics(cfg.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    refreshAnomalies();
    loadConfig();
    const id = window.setInterval(() => {
      refreshAnomalies();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const handleReplay = async () => {
    setBusy(true);
    setReplayStatus(null);
    setError(null);
    try {
      const result = await api.replay();
      setReplayStatus(result.matched ? 'Replay matched alert sequence' : 'Replay diverged from live alerts');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSuppression = async (input: SuppressionInput) => {
    setBusy(true);
    setError(null);
    try {
      await api.createSuppression(input);
      await refreshAnomalies();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const targets = useMemo(() => {
    const unique = new Set<string>();
    anomalies.forEach((anomaly) => unique.add(anomaly.target));
    return Array.from(unique);
  }, [anomalies]);

  return (
    <main>
      <section>
        <h1>Continuous Data Quality Detective</h1>
        <p>
          Seasonality-aware anomaly detection and semantic rule enforcement for streaming metrics and tabular datasets. Inject
          anomalies are surfaced with Holt-Winters and robust z-scores, while denial constraints and entity integrity keep your
          tables honest.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={refreshAnomalies} disabled={loading || busy}>
            {loading ? 'Refreshing…' : 'Refresh anomalies'}
          </button>
          <button onClick={handleReplay} disabled={busy}>
            {busy ? 'Running…' : 'Deterministic replay'}
          </button>
        </div>
        {replayStatus && <p style={{ marginTop: '0.75rem' }}>{replayStatus}</p>}
        {error && (
          <p style={{ marginTop: '0.75rem', color: '#f87171' }}>
            {error}
          </p>
        )}
      </section>

      <section>
        <h2>Active anomalies</h2>
        <AnomalyTable anomalies={anomalies} onSelectTarget={(target) => setSelectedTarget(target)} />
      </section>

      <section>
        <h2>Alert suppressions</h2>
        <SuppressionForm
          targets={targets}
          defaultTarget={selectedTarget ?? undefined}
          loading={busy}
          onSubmit={handleSuppression}
        />
      </section>

      <section>
        <h2>Seasonality baselines</h2>
        {metrics ? (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {Object.entries(metrics).map(([metricName, cfg]) => (
              <article key={metricName} style={{ border: '1px solid rgba(148,163,184,0.3)', borderRadius: '12px', padding: '1rem' }}>
                <h3 style={{ marginTop: 0 }}>{metricName}</h3>
                <dl style={{ display: 'grid', gap: '0.4rem', margin: 0 }}>
                  <div>
                    <dt>Season length</dt>
                    <dd>{cfg.seasonLength}</dd>
                  </div>
                  <div>
                    <dt>Alpha / Beta / Gamma</dt>
                    <dd>
                      {cfg.alpha.toFixed(2)} / {cfg.beta.toFixed(2)} / {cfg.gamma.toFixed(2)}
                    </dd>
                  </div>
                  <div>
                    <dt>Residual sensitivity</dt>
                    <dd>{cfg.sensitivity}</dd>
                  </div>
                  <div>
                    <dt>Robust z-window</dt>
                    <dd>
                      {cfg.robustZWindow} @ ±{cfg.robustZThreshold.toFixed(1)}σ
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p>No baseline configuration captured yet. Stream some metrics to bootstrap the model.</p>
        )}
      </section>
    </main>
  );
}
