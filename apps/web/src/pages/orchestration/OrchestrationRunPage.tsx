import React from 'react';
import { useParams } from 'react-router-dom';

interface RunStep {
  stepId: string;
  status: string;
  output?: unknown;
  error?: string;
  policyDecision?: string;
  startedAt?: string;
  completedAt?: string;
}

interface RunPayload {
  runId: string;
  mode: string;
  startedAt?: string;
  completedAt?: string;
  planSnapshot?: { steps?: { id: string; name: string; kind: string }[] };
  steps: RunStep[];
  approvals?: { stepId: string; approvedBy: string; approvedAt: string }[];
  policyDecisions?: { stepId: string; action: string; reason?: string; mode?: string }[];
  provenance?: string[];
}

const statusColor: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  running: 'bg-blue-100 text-blue-800',
  waiting_approval: 'bg-amber-100 text-amber-900',
  completed: 'bg-green-100 text-green-800',
  blocked: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
};

export default function OrchestrationRunPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = React.useState<RunPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const policyLookup = React.useMemo(() => {
    const map = new Map<string, string>();
    run?.policyDecisions?.forEach((entry) => {
      map.set(entry.stepId, entry.action);
    });
    return map;
  }, [run?.policyDecisions]);

  React.useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/orchestration/runs/${id}`);
        if (!res.ok) throw new Error('Failed to load run');
        const json = await res.json();
        setRun(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      load();
    }
  }, [id]);

  const approveStep = async (stepId: string) => {
    await fetch(`/api/orchestration/runs/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepId }),
    });
    const res = await fetch(`/api/orchestration/runs/${id}`);
    const json = await res.json();
    setRun(json);
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!run) return <div className="p-6">No run found</div>;

  const renderLatency = (step: RunStep) => {
    if (!step.startedAt || !step.completedAt) return null;
    const duration = new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime();
    return <div className="text-xs text-gray-500">Latency: {duration}ms</div>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Orchestration Run</h1>
          <p className="text-sm text-gray-500">Run ID: {run.runId} • Mode: {run.mode}</p>
          {run.startedAt && (
            <p className="text-xs text-gray-400">
              Started {new Date(run.startedAt).toLocaleString()}
              {run.completedAt ? ` • Completed ${new Date(run.completedAt).toLocaleString()}` : ''}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-medium">Plan</h2>
          <div className="mt-2 space-y-2">
            {run.planSnapshot?.steps?.map((step) => (
              <div key={step.id} className="rounded border p-3">
                <div className="font-semibold">{step.name}</div>
                <div className="text-sm text-gray-600">{step.kind}</div>
              </div>
            )) || <p className="text-sm text-gray-500">Plan details unavailable.</p>}
          </div>
        </div>

        <div className="rounded border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-medium">Approvals</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {run.approvals?.length ? (
              run.approvals.map((approval) => (
                <li key={approval.stepId} className="rounded bg-gray-50 p-2">
                  Step {approval.stepId} approved by {approval.approvedBy}
                </li>
              ))
            ) : (
              <li className="text-gray-500">No approvals yet</li>
            )}
          </ul>
        </div>

        <div className="rounded border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-medium">Provenance</h2>
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            {run.provenance?.length ? (
              run.provenance.map((item) => <li key={item}>{item}</li>)
            ) : (
              <li className="text-gray-500">No provenance IDs recorded.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="rounded border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium">Timeline</h2>
        <div className="mt-4 space-y-3">
          {run.steps.map((step) => (
            <div key={step.stepId} className="flex items-start justify-between rounded border p-3">
              <div>
                <div className="font-semibold">{step.stepId}</div>
                <div className="text-sm text-gray-600">{step.output ? JSON.stringify(step.output) : step.error}</div>
                <div className="text-xs text-gray-500">
                  Policy: {step.policyDecision ?? policyLookup.get(step.stepId) ?? 'n/a'}
                </div>
                {renderLatency(step)}
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded px-2 py-1 text-xs font-semibold ${statusColor[step.status] ?? 'bg-gray-100'}`}>
                  {step.status}
                </span>
                {step.status === 'waiting_approval' && (
                  <button
                    onClick={() => approveStep(step.stepId)}
                    className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Approve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
