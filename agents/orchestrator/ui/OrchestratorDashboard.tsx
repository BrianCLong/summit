/**
 * Orchestrator Dashboard Component
 *
 * React component for visualizing multi-LLM orchestrator status,
 * metrics, and governance violations.
 */

import React, { useEffect, useState, useCallback } from 'react';

// Types
interface ProviderStatus {
  model: string;
  available: boolean;
  state: 'closed' | 'open' | 'half-open';
}

interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  totalCostUSD: number;
}

interface GovernanceViolation {
  gateId: string;
  gateName: string;
  gateType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
}

interface ChainExecution {
  chainId: string;
  status: 'running' | 'completed' | 'failed';
  steps: number;
  completedSteps: number;
  startTime: Date;
  totalCostUSD?: number;
}

interface DashboardProps {
  apiEndpoint?: string;
  refreshInterval?: number;
  onError?: (error: Error) => void;
}

// Severity colors
const severityColors = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
  critical: '#9c27b0',
};

// Circuit state colors
const circuitColors = {
  closed: '#4caf50',
  open: '#f44336',
  'half-open': '#ff9800',
};

/**
 * Provider Status Card Component
 */
const ProviderStatusCard: React.FC<{
  status: ProviderStatus;
  metrics?: ProviderMetrics;
}> = ({ status, metrics }) => {
  const successRate = metrics
    ? ((metrics.successfulRequests / Math.max(1, metrics.totalRequests)) * 100).toFixed(1)
    : 0;

  return (
    <div
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        backgroundColor: status.available ? '#fff' : '#f5f5f5',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>{status.model}</h4>
          <div style={{ display: 'flex', gap: '12px', fontSize: '14px' }}>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: circuitColors[status.state],
                color: '#fff',
              }}
            >
              {status.state}
            </span>
            <span style={{ color: status.available ? '#4caf50' : '#f44336' }}>
              {status.available ? '● Available' : '○ Unavailable'}
            </span>
          </div>
        </div>
        {metrics && (
          <div style={{ textAlign: 'right', fontSize: '14px', color: '#666' }}>
            <div>Requests: {metrics.totalRequests}</div>
            <div>Success: {successRate}%</div>
            <div>Avg Latency: {metrics.averageLatencyMs.toFixed(0)}ms</div>
            <div>Cost: ${metrics.totalCostUSD.toFixed(4)}</div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Governance Violations Panel Component
 */
const GovernanceViolationsPanel: React.FC<{
  violations: GovernanceViolation[];
}> = ({ violations }) => {
  if (violations.length === 0) {
    return (
      <div style={{ padding: '16px', color: '#666', textAlign: 'center' }}>
        No governance violations detected
      </div>
    );
  }

  return (
    <div>
      {violations.slice(0, 10).map((violation, index) => (
        <div
          key={index}
          style={{
            padding: '12px',
            marginBottom: '8px',
            borderLeft: `4px solid ${severityColors[violation.severity]}`,
            backgroundColor: '#f9f9f9',
            borderRadius: '4px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{violation.gateName}</strong>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: severityColors[violation.severity],
                color: '#fff',
                fontSize: '12px',
              }}
            >
              {violation.severity}
            </span>
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
            {violation.message}
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
            {new Date(violation.timestamp).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Chain Execution Monitor Component
 */
const ChainExecutionMonitor: React.FC<{
  executions: ChainExecution[];
}> = ({ executions }) => {
  if (executions.length === 0) {
    return (
      <div style={{ padding: '16px', color: '#666', textAlign: 'center' }}>
        No active chain executions
      </div>
    );
  }

  return (
    <div>
      {executions.map((execution, index) => (
        <div
          key={index}
          style={{
            padding: '12px',
            marginBottom: '8px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>{execution.chainId}</strong>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor:
                  execution.status === 'completed'
                    ? '#4caf50'
                    : execution.status === 'failed'
                      ? '#f44336'
                      : '#2196f3',
                color: '#fff',
                fontSize: '12px',
              }}
            >
              {execution.status}
            </span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <div
              style={{
                height: '8px',
                backgroundColor: '#e0e0e0',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(execution.completedSteps / execution.steps) * 100}%`,
                  backgroundColor: '#2196f3',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Step {execution.completedSteps} of {execution.steps}
              {execution.totalCostUSD && ` • $${execution.totalCostUSD.toFixed(4)}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Hallucination Score Indicator Component
 */
const HallucinationScoreIndicator: React.FC<{
  score: number;
  confidence: number;
}> = ({ score, confidence }) => {
  const getColor = (value: number) => {
    if (value >= 0.8) return '#4caf50';
    if (value >= 0.6) return '#ff9800';
    return '#f44336';
  };

  return (
    <div style={{ display: 'flex', gap: '24px', padding: '16px' }}>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: `4px solid ${getColor(score)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            color: getColor(score),
          }}
        >
          {(score * 100).toFixed(0)}%
        </div>
        <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>Factuality Score</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: `4px solid ${getColor(confidence)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            color: getColor(confidence),
          }}
        >
          {(confidence * 100).toFixed(0)}%
        </div>
        <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>Confidence</div>
      </div>
    </div>
  );
};

/**
 * Main Orchestrator Dashboard Component
 */
export const OrchestratorDashboard: React.FC<DashboardProps> = ({
  apiEndpoint = '/api/orchestrator',
  refreshInterval = 5000,
  onError,
}) => {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [metrics, setMetrics] = useState<Record<string, ProviderMetrics>>({});
  const [violations, setViolations] = useState<GovernanceViolation[]>([]);
  const [executions, setExecutions] = useState<ChainExecution[]>([]);
  const [lastHallucinationScore, setLastHallucinationScore] = useState<{
    score: number;
    confidence: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`${apiEndpoint}/status`);
      if (!response.ok) throw new Error('Failed to fetch orchestrator status');

      const data = await response.json();

      setProviders(
        Object.entries(data.health || {}).map(([model, status]: [string, any]) => ({
          model,
          available: status.available,
          state: status.state,
        })),
      );

      setMetrics(data.metrics?.providers || {});
      setViolations(data.recentViolations || []);
      setExecutions(data.activeExecutions || []);

      if (data.lastHallucinationScore) {
        setLastHallucinationScore(data.lastHallucinationScore);
      }

      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, onError]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
        Loading orchestrator status...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginBottom: '24px', color: '#333' }}>Multi-LLM Orchestrator Dashboard</h2>

      {error && (
        <div
          style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#ffebee',
            border: '1px solid #f44336',
            borderRadius: '4px',
            color: '#c62828',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Provider Status */}
        <div
          style={{
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: '#fff',
          }}
        >
          <h3 style={{ marginTop: 0, color: '#333' }}>Provider Status</h3>
          {providers.length === 0 ? (
            <div style={{ color: '#666' }}>No providers configured</div>
          ) : (
            providers.map((provider) => (
              <ProviderStatusCard
                key={provider.model}
                status={provider}
                metrics={metrics[`${provider.model}`]}
              />
            ))
          )}
        </div>

        {/* Governance Violations */}
        <div
          style={{
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: '#fff',
          }}
        >
          <h3 style={{ marginTop: 0, color: '#333' }}>
            Governance Violations
            {violations.length > 0 && (
              <span
                style={{
                  marginLeft: '8px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: '#f44336',
                  color: '#fff',
                  fontSize: '12px',
                }}
              >
                {violations.length}
              </span>
            )}
          </h3>
          <GovernanceViolationsPanel violations={violations} />
        </div>

        {/* Chain Executions */}
        <div
          style={{
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: '#fff',
          }}
        >
          <h3 style={{ marginTop: 0, color: '#333' }}>Chain Executions</h3>
          <ChainExecutionMonitor executions={executions} />
        </div>

        {/* Hallucination Score */}
        {lastHallucinationScore && (
          <div
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: '#fff',
            }}
          >
            <h3 style={{ marginTop: 0, color: '#333' }}>Latest Hallucination Score</h3>
            <HallucinationScoreIndicator
              score={lastHallucinationScore.score}
              confidence={lastHallucinationScore.confidence}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default OrchestratorDashboard;
