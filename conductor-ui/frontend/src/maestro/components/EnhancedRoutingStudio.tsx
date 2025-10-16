import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { RoutingCandidate, SSEEvent } from '../types/maestro-api';
import { getMaestroConfig } from '../config';

interface RoutingPinPanelProps {
  className?: string;
}

function RoutingPinPanel({ className }: RoutingPinPanelProps) {
  const [pins, setPins] = useState<Record<string, string>>({});
  const [newPin, setNewPin] = useState({ route: '', model: '', note: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const { getRoutingPins, putRoutingPin, deleteRoutingPin } = api();

  useEffect(() => {
    const fetchPins = async () => {
      try {
        const currentPins = await getRoutingPins();
        setPins(currentPins);
      } catch (error) {
        console.error('Failed to fetch routing pins:', error);
      }
    };
    fetchPins();
  }, []);

  const handleAddPin = async () => {
    if (!newPin.route || !newPin.model) return;

    try {
      await putRoutingPin({
        route: newPin.route,
        model: newPin.model,
        note: newPin.note || undefined,
      });

      setPins((prev) => ({ ...prev, [newPin.route]: newPin.model }));
      setNewPin({ route: '', model: '', note: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add routing pin:', error);
    }
  };

  const handleRemovePin = async (route: string) => {
    try {
      await deleteRoutingPin(route);
      setPins((prev) => {
        const updated = { ...prev };
        delete updated[route];
        return updated;
      });
    } catch (error) {
      console.error('Failed to remove routing pin:', error);
    }
  };

  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Routing Pins</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
        >
          {showAddForm ? 'Cancel' : 'Pin Route'}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 rounded-lg bg-slate-50 p-3">
          <h3 className="mb-2 text-sm font-medium text-slate-700">
            Pin New Route
          </h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <input
              type="text"
              placeholder="Route (e.g., /chat/completions)"
              value={newPin.route}
              onChange={(e) =>
                setNewPin((prev) => ({ ...prev, route: e.target.value }))
              }
              className="rounded border px-2 py-1 text-sm"
            />
            <input
              type="text"
              placeholder="Model (e.g., gpt-4o-mini)"
              value={newPin.model}
              onChange={(e) =>
                setNewPin((prev) => ({ ...prev, model: e.target.value }))
              }
              className="rounded border px-2 py-1 text-sm"
            />
            <input
              type="text"
              placeholder="Note (optional)"
              value={newPin.note}
              onChange={(e) =>
                setNewPin((prev) => ({ ...prev, note: e.target.value }))
              }
              className="rounded border px-2 py-1 text-sm"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleAddPin}
              disabled={!newPin.route || !newPin.model}
              className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
            >
              Add Pin
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {Object.keys(pins).length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No routing pins configured. Pin routes to specific models for
            consistent routing.
          </div>
        ) : (
          Object.entries(pins).map(([route, model]) => (
            <div
              key={route}
              className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
            >
              <div>
                <div className="text-sm font-medium text-slate-900">
                  {route}
                </div>
                <div className="text-xs text-slate-600">→ {model}</div>
              </div>
              <div className="flex gap-2">
                <button className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-200">
                  Edit
                </button>
                <button
                  onClick={() => handleRemovePin(route)}
                  className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface CandidatesPanelProps {
  className?: string;
}

function CandidatesPanel({ className }: CandidatesPanelProps) {
  const [requestClass, setRequestClass] = useState('chat.completions');
  const [candidates, setCandidates] = useState<RoutingCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const { routingPreview } = api();

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const response = await routingPreview({
        class: requestClass,
        // Mock request payload
        payload: {
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0.7,
        },
      });
      setCandidates(response.candidates || []);
    } catch (error) {
      console.error('Failed to fetch routing candidates:', error);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [requestClass]);

  const handleTogglePin = (candidate: RoutingCandidate) => {
    // This would implement pinning logic
    console.log('Toggle pin for candidate:', candidate);
  };

  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Routing Candidates
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={requestClass}
            onChange={(e) => setRequestClass(e.target.value)}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="chat.completions">Chat Completions</option>
            <option value="embeddings">Embeddings</option>
            <option value="images">Images</option>
            <option value="audio">Audio</option>
          </select>
          <button
            onClick={fetchCandidates}
            disabled={loading}
            className="rounded border px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {candidates.map((candidate, i) => (
          <div key={i} className="rounded-lg border p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">
                    {candidate.provider}/{candidate.model}
                  </span>
                  <span className="text-xs font-medium text-slate-700">
                    Score: {candidate.score.toFixed(2)}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-4 text-xs text-slate-600">
                  <span>Latency: {candidate.latency}ms</span>
                  <span>Cost: ${candidate.cost.toFixed(4)}</span>
                  <span>
                    Reliability: {(candidate.reliability * 100).toFixed(1)}%
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 font-medium ${
                      candidate.policyGrade === 'A'
                        ? 'bg-green-100 text-green-800'
                        : candidate.policyGrade === 'B'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    Policy: {candidate.policyGrade}
                  </span>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => handleTogglePin(candidate)}
                  className="rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50"
                >
                  📌 Pin
                </button>
                <button className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
                  Test
                </button>
              </div>
            </div>
          </div>
        ))}

        {candidates.length === 0 && !loading && (
          <div className="text-center py-8 text-slate-500">
            No candidates available for {requestClass}
          </div>
        )}
      </div>
    </div>
  );
}

interface PolicySheetProps {
  className?: string;
}

function PolicySheet({ className }: PolicySheetProps) {
  const [policies, setPolicies] = useState([
    {
      id: 'data-residency',
      name: 'Data Residency',
      enabled: true,
      rules: ['US/EU only', 'No China/Russia'],
      violations: 0,
    },
    {
      id: 'rate-limits',
      name: 'Rate Limits',
      enabled: true,
      rules: ['1000 RPM per tenant', '10K TPM global'],
      violations: 3,
    },
    {
      id: 'cost-controls',
      name: 'Cost Controls',
      enabled: true,
      rules: ['$0.10 per request max', 'Emergency brake at $1K/hour'],
      violations: 1,
    },
    {
      id: 'fallback-strategy',
      name: 'Fallback Strategy',
      enabled: false,
      rules: ['Primary → Secondary → Cache', 'Timeout: 30s'],
      violations: 0,
    },
  ]);

  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Policy Configuration
        </h2>
        <button className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          Edit Policies
        </button>
      </div>

      <div className="space-y-3">
        {policies.map((policy) => (
          <div key={policy.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">
                    {policy.name}
                  </span>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={policy.enabled}
                      onChange={(e) => {
                        setPolicies((prev) =>
                          prev.map((p) =>
                            p.id === policy.id
                              ? { ...p, enabled: e.target.checked }
                              : p,
                          ),
                        );
                      }}
                      className="form-checkbox h-4 w-4 text-indigo-600"
                    />
                  </label>
                </div>

                <div className="mt-1 space-y-0.5">
                  {policy.rules.map((rule, i) => (
                    <div key={i} className="text-xs text-slate-600">
                      • {rule}
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-right">
                {policy.violations > 0 ? (
                  <span className="text-xs font-medium text-red-600">
                    {policy.violations} violation
                    {policy.violations !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-xs text-green-600">✓ Compliant</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TrafficHealthProps {
  className?: string;
}

function TrafficHealth({ className }: TrafficHealthProps) {
  const [healthData, setHealthData] = useState([
    {
      provider: 'OpenAI',
      model: 'gpt-4o-mini',
      successRate: 99.7,
      avgLatency: 245,
      requestsPerMin: 1240,
      tokensPerSec: 15600,
      costPerHour: 8.45,
      status: 'healthy' as const,
    },
    {
      provider: 'Anthropic',
      model: 'claude-3-haiku',
      successRate: 99.9,
      avgLatency: 189,
      requestsPerMin: 890,
      tokensPerSec: 11200,
      costPerHour: 6.78,
      status: 'healthy' as const,
    },
    {
      provider: 'Google',
      model: 'gemini-pro',
      successRate: 97.2,
      avgLatency: 567,
      requestsPerMin: 234,
      tokensPerSec: 3400,
      costPerHour: 2.34,
      status: 'degraded' as const,
    },
  ]);

  const [streamConnected, setStreamConnected] = useState(false);

  useEffect(() => {
    // Set up SSE stream for routing events
    const cfg = getMaestroConfig();
    if (!cfg.gatewayBase) return;

    const eventSource = new EventSource(`${cfg.gatewayBase}/streams/routing`);

    eventSource.onopen = () => setStreamConnected(true);
    eventSource.onerror = () => setStreamConnected(false);

    eventSource.addEventListener('routing_failover', (event) => {
      const data: SSEEvent = JSON.parse(event.data);
      console.log('Routing failover detected:', data.payload);
      // Update health data based on failover events
    });

    eventSource.addEventListener('routing_restored', (event) => {
      const data: SSEEvent = JSON.parse(event.data);
      console.log('Routing restored:', data.payload);
    });

    return () => eventSource.close();
  }, []);

  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Traffic & Health
        </h2>
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              streamConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-xs text-slate-500">
            {streamConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2">Provider/Model</th>
              <th className="px-3 py-2">Success Rate</th>
              <th className="px-3 py-2">Latency</th>
              <th className="px-3 py-2">Traffic</th>
              <th className="px-3 py-2">Cost/Hour</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {healthData.map((item, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2">
                  <div className="text-sm font-medium text-slate-900">
                    {item.provider}
                  </div>
                  <div className="text-xs text-slate-600">{item.model}</div>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`text-sm font-medium ${
                      item.successRate >= 99
                        ? 'text-green-600'
                        : item.successRate >= 95
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}
                  >
                    {item.successRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-3 py-2 text-sm">{item.avgLatency}ms</td>
                <td className="px-3 py-2">
                  <div className="text-xs">
                    <div>{item.requestsPerMin} RPM</div>
                    <div className="text-slate-500">
                      {item.tokensPerSec} tok/s
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-sm">
                  ${item.costPerHour.toFixed(2)}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      item.status === 'healthy'
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'degraded'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EnhancedRoutingStudio() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Routing Studio</h1>
          <p className="text-sm text-slate-600">
            Manage model routing, pins, policies, and traffic health
          </p>
        </div>
        <div className="flex gap-2">
          <button className="rounded border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Export Config
          </button>
          <button className="rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700">
            Emergency Stop
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CandidatesPanel />
        <RoutingPinPanel />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        <TrafficHealth />
        <PolicySheet />
      </div>
    </div>
  );
}
