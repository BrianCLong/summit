import React from 'react';
import { releaseTrains } from '../mockData';
import { useReasonForAccess } from '../ReasonForAccessContext';

export function ReleasesPage() {
  const { requestReason } = useReasonForAccess();
  const [approvals, setApprovals] = React.useState<Record<string, string>>({});

  const handleApproval = React.useCallback(
    async (releaseId: string) => {
      const reason = await requestReason(`Approvals for ${releaseId}`);
      setApprovals((prev) => ({ ...prev, [releaseId]: reason }));
    },
    [requestReason],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Releases</h1>
        <p className="mt-1 text-sm text-slate-400">
          Promotion flow enforces four-eyes approval with required reason
          capture and simulated policy checks.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        {releaseTrains.map((release) => (
          <div
            key={release.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {release.name}
              </h2>
              <span className="rounded-full border border-emerald-400/60 px-3 py-1 text-xs text-emerald-300">
                {release.status}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Window {new Date(release.windowStart).toLocaleTimeString()} →{' '}
              {new Date(release.windowEnd).toLocaleTimeString()}
            </p>
            <p className="mt-3 text-xs uppercase text-slate-400">Gate status</p>
            <p className="font-semibold text-emerald-300">
              {release.gateStatus}
            </p>
            <p className="mt-3 text-xs uppercase text-slate-400">Approvals</p>
            <p>
              {release.approvalsComplete}/{release.approvalsRequired}
              {approvals[release.id] ? ' • captured' : ''}
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-100 hover:border-emerald-400"
              onClick={() => void handleApproval(release.id)}
            >
              Capture approval reason
            </button>
            {approvals[release.id] ? (
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
                <p className="text-slate-400">Reason</p>
                <p className="font-medium text-emerald-300">
                  {approvals[release.id]}
                </p>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReleasesPage;
