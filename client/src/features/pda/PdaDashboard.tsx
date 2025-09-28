import React, { useCallback, useEffect, useMemo, useState } from 'react';

type TraceStep = {
  description: string;
  evidence: string;
};

type Trace = {
  eventId: string;
  contractId: string;
  policyId: string;
  verdict: string;
  suppressed: boolean;
  steps: TraceStep[];
  policy: {
    endpointPurpose: string;
    allowedPurposes: string[];
    owners: string[];
    suppressionWindow: number;
    description?: string;
  };
};

type Verdict = {
  drift: boolean;
  suppressed: boolean;
  owner: string;
  reason: string;
  falsePositive: boolean;
  trace: Trace;
};

type Alert = {
  event: {
    id: string;
    consentId: string;
    declaredPurpose: string;
    endpoint: string;
    endpointPurpose: string;
    streamKind?: string;
    observedAt: string;
  };
  verdict: Verdict;
  raisedAt: string;
};

type Health = {
  status: string;
  time: string;
  fpRate: number;
  contracts: number;
};

export interface PdaDashboardProps {
  apiBaseUrl: string;
  pollIntervalMs?: number;
}

const formatDuration = (windowMs: number): string => {
  if (windowMs <= 0) {
    return 'disabled';
  }
  const seconds = Math.floor(windowMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
};

export const PdaDashboard: React.FC<PdaDashboardProps> = ({ apiBaseUrl, pollIntervalMs = 10000 }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [traceLoadingId, setTraceLoadingId] = useState<string | null>(null);

  const normalizedBase = useMemo(() => apiBaseUrl.replace(/\/$/, ''), [apiBaseUrl]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      try {
        setError(null);
        const [alertsResponse, healthResponse] = await Promise.all([
          fetch(`${normalizedBase}/api/v1/alerts`),
          fetch(`${normalizedBase}/api/v1/health`),
        ]);
        if (!alertsResponse.ok) {
          throw new Error(`alerts request failed: ${alertsResponse.status}`);
        }
        if (!healthResponse.ok) {
          throw new Error(`health request failed: ${healthResponse.status}`);
        }
        const [alertsPayload, healthPayload] = await Promise.all([
          alertsResponse.json(),
          healthResponse.json(),
        ]);
        if (!cancelled) {
          setAlerts(alertsPayload as Alert[]);
          setHealth(healthPayload as Health);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(run, pollIntervalMs);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [normalizedBase, pollIntervalMs]);

  const explain = useCallback(
    async (eventId: string) => {
      setTraceLoadingId(eventId);
      try {
        const response = await fetch(`${normalizedBase}/api/v1/explain?eventId=${encodeURIComponent(eventId)}`);
        if (!response.ok) {
          throw new Error(`explain request failed: ${response.status}`);
        }
        const payload = (await response.json()) as Trace;
        setSelectedTrace(payload);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setTraceLoadingId(null);
      }
    },
    [normalizedBase],
  );

  const hasAlerts = alerts.length > 0;

  return (
    <div className="pda-dashboard" data-testid="pda-dashboard">
      <header className="pda-dashboard__header">
        <h2>Purpose Drift Auditor</h2>
        {health && (
          <div className="pda-dashboard__stats">
            <span data-testid="pda-health-status">Status: {health.status}</span>
            <span>False positive rate: {(health.fpRate * 100).toFixed(2)}%</span>
            <span>Contracts: {health.contracts}</span>
          </div>
        )}
      </header>

      {loading && <p>Loading...</p>}
      {error && <p className="pda-dashboard__error">{error}</p>}

      <section className="pda-dashboard__table">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Consent</th>
              <th>Declared Purpose</th>
              <th>Endpoint Purpose</th>
              <th>Owner</th>
              <th>Raised</th>
              <th>Suppression</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {hasAlerts ? (
              alerts.map((alert) => (
                <tr key={alert.event.id}>
                  <td>{alert.event.id}</td>
                  <td>{alert.event.consentId}</td>
                  <td>{alert.event.declaredPurpose}</td>
                  <td>{alert.event.endpointPurpose}</td>
                  <td>{alert.verdict.owner}</td>
                  <td>{new Date(alert.raisedAt).toLocaleString()}</td>
                  <td>
                    {formatDuration(Math.floor(alert.verdict.trace.policy.suppressionWindow / 1_000_000))}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => explain(alert.event.id)}
                      disabled={traceLoadingId === alert.event.id}
                    >
                      {traceLoadingId === alert.event.id ? 'Loading…' : 'Explain'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="pda-dashboard__empty">
                  {loading ? 'Loading alerts…' : 'No purpose drift detected'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {selectedTrace && (
        <section className="pda-dashboard__trace" aria-live="polite">
          <h3>Explainability Trace</h3>
          <p>
            Verdict: <strong>{selectedTrace.verdict}</strong> (policy: {selectedTrace.policyId})
          </p>
          <ul>
            {selectedTrace.steps.map((step) => (
              <li key={`${step.description}-${step.evidence}`}>{step.description}: {step.evidence}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default PdaDashboard;

