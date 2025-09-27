import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface GroupMetrics {
  group: string;
  support: number;
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
  tpr: number;
  fpr: number;
  positive_rate: number;
  top_k_rate: number;
}

interface MetricSnapshot {
  window_start: string;
  window_end: string;
  group_metrics: GroupMetrics[];
  tpr_gap: number;
  fpr_gap: number;
  demographic_parity_diff: number;
  eq_opp_at_k_diff: number;
}

interface Alert {
  metric: string;
  value: number;
  threshold: number;
  window_end: string;
  groups: string[];
  slices?: string[];
  explanation?: Record<string, string>;
}

interface SnapshotEnvelope {
  snapshot: MetricSnapshot;
  signature: string;
}

interface ReplayRequest {
  path: string;
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await axios.get<T>(url, { headers: { Accept: 'application/json' } });
  return res.data;
}

const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

const metricLabels: Record<keyof Pick<MetricSnapshot, 'tpr_gap' | 'fpr_gap' | 'demographic_parity_diff' | 'eq_opp_at_k_diff'>, string> = {
  tpr_gap: 'TPR Gap',
  fpr_gap: 'FPR Gap',
  demographic_parity_diff: 'Demographic Parity Diff',
  eq_opp_at_k_diff: 'Equality of Opportunity @k Diff'
};

const metricOrder = ['tpr_gap', 'fpr_gap', 'demographic_parity_diff', 'eq_opp_at_k_diff'] as const;

type MetricKey = typeof metricOrder[number];

const badgeClass = (value: number) => {
  if (value < 0.05) return 'badge badge--good';
  if (value < 0.1) return 'badge badge--warn';
  return 'badge badge--bad';
};

const AlertsPanel: React.FC<{ alerts: Alert[] | undefined }> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <section className="panel">
        <h2>Alerts</h2>
        <p className="empty">No fairness alerts in the active window.</p>
      </section>
    );
  }
  return (
    <section className="panel">
      <h2>Alerts</h2>
      <ul className="alert-list">
        {alerts.map((alert, idx) => (
          <li key={`${alert.metric}-${idx}`}>
            <header>
              <span className="metric-name">{metricLabels[alert.metric as MetricKey] ?? alert.metric}</span>
              <span className="badge badge--bad">{formatPercent(alert.value)} &gt; {formatPercent(alert.threshold)}</span>
            </header>
            <div className="alert-body">
              <div>
                <strong>Window:</strong> {alert.explanation?.window ?? alert.window_end}
              </div>
              <div>
                <strong>Groups:</strong> {alert.groups.join(', ')}
              </div>
              {alert.slices && alert.slices.length > 0 && (
                <div>
                  <strong>Slices:</strong> {alert.slices.join(', ')}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

const MetricsPanel: React.FC<{ snapshot: MetricSnapshot | undefined }> = ({ snapshot }) => {
  if (!snapshot) {
    return (
      <section className="panel">
        <h2>Window Metrics</h2>
        <p className="empty">Waiting for first event...</p>
      </section>
    );
  }
  return (
    <section className="panel">
      <h2>Window Metrics</h2>
      <div className="window-range">{snapshot.window_start} → {snapshot.window_end}</div>
      <div className="metrics-grid">
        {metricOrder.map((key) => (
          <div key={key} className={`metric-card ${badgeClass(snapshot[key])}`}>
            <span className="metric-label">{metricLabels[key]}</span>
            <span className="metric-value">{formatPercent(snapshot[key])}</span>
          </div>
        ))}
      </div>
      <table className="metrics-table">
        <thead>
          <tr>
            <th>Group</th>
            <th>Support</th>
            <th>TPR</th>
            <th>FPR</th>
            <th>Positive Rate</th>
            <th>Eq. Opp @k</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.group_metrics.map((group) => (
            <tr key={group.group}>
              <td>{group.group}</td>
              <td>{group.support}</td>
              <td>{formatPercent(group.tpr)}</td>
              <td>{formatPercent(group.fpr)}</td>
              <td>{formatPercent(group.positive_rate)}</td>
              <td>{formatPercent(group.top_k_rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

const SnapshotPanel: React.FC<{ onMint: () => Promise<SnapshotEnvelope>; status: string; signature?: string }> = ({ onMint, status, signature }) => {
  return (
    <section className="panel">
      <h2>Snapshot</h2>
      <p>Create a signed fairness snapshot for audit/replay.</p>
      <button className="primary" onClick={onMint}>Mint Snapshot</button>
      <div className="status">{status}</div>
      {signature && (
        <code className="signature">{signature}</code>
      )}
    </section>
  );
};

const ReplayPanel: React.FC<{ onReplay: (req: ReplayRequest) => Promise<void>; status: string }> = ({ onReplay, status }) => {
  const [path, setPath] = useState('');
  return (
    <section className="panel">
      <h2>Deterministic Replay</h2>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (!path) return;
        void onReplay({ path });
      }}>
        <label>
          Parquet Path
          <input value={path} onChange={(event) => setPath(event.target.value)} placeholder="/data/replay.parquet" />
        </label>
        <button className="secondary" type="submit">Replay</button>
      </form>
      <div className="status">{status}</div>
    </section>
  );
};

const App: React.FC = () => {
  const client = useQueryClient();
  const [signature, setSignature] = useState<string | undefined>();
  const metricsQuery = useQuery({ queryKey: ['metrics'], queryFn: () => getJSON<MetricSnapshot>('/metrics') });
  const alertsQuery = useQuery({ queryKey: ['alerts'], queryFn: () => getJSON<Alert[]>('/alerts') });

  const mintMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post<SnapshotEnvelope>('/snapshots', {});
      return res.data;
    },
    onSuccess: (envelope) => {
      setSignature(envelope.signature);
    }
  });

  const replayMutation = useMutation({
    mutationFn: async (req: ReplayRequest) => {
      await axios.post('/replay', req);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['metrics'] });
      void client.invalidateQueries({ queryKey: ['alerts'] });
    }
  });

  const snapshotStatus = useMemo(() => {
    if (mintMutation.isPending) return 'Minting snapshot...';
    if (mintMutation.isError) return (mintMutation.error as Error).message;
    if (mintMutation.isSuccess) return 'Snapshot minted';
    return 'Idle';
  }, [mintMutation.isPending, mintMutation.isError, mintMutation.isSuccess, mintMutation.error]);

  const replayStatus = useMemo(() => {
    if (replayMutation.isPending) return 'Replaying parquet...';
    if (replayMutation.isError) return (replayMutation.error as Error).message;
    if (replayMutation.isSuccess) return 'Replay complete';
    return 'Idle';
  }, [replayMutation.isPending, replayMutation.isError, replayMutation.isSuccess, replayMutation.error]);

  return (
    <div className="app">
      <header>
        <h1>Streaming Fairness Monitor</h1>
        <p>Real-time fairness telemetry across demographic slices.</p>
      </header>
      <main>
        <MetricsPanel snapshot={metricsQuery.data} />
        <AlertsPanel alerts={alertsQuery.data} />
        <div className="panel-grid">
          <SnapshotPanel
            onMint={() => mintMutation.mutateAsync()}
            status={snapshotStatus}
            signature={signature}
          />
          <ReplayPanel
            onReplay={(req) => replayMutation.mutateAsync(req)}
            status={replayStatus}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
