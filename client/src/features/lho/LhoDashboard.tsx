import { useEffect, useMemo, useState } from 'react';
import holdData from './data/sampleHold.json';
import type { HoldDataset } from './types';
import { verifyCustodyChain } from './utils';

type VerificationState = {
  valid: boolean;
  message?: string;
};

const dataset = holdData as HoldDataset;

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toUTCString()} → ${endDate.toUTCString()}`;
}

export function LhoDashboard() {
  const [verification, setVerification] = useState<VerificationState | null>(null);

  useEffect(() => {
    let cancelled = false;
    verifyCustodyChain(dataset.custodyChain)
      .then((result) => {
        if (!cancelled) {
          setVerification(result);
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setVerification({ valid: false, message: error.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const systemKeys = useMemo(() => Object.keys(dataset.scope).sort(), []);
  const diffSections = useMemo(() => {
    return [
      { label: 'Added', data: dataset.scopeDiff.added },
      { label: 'Removed', data: dataset.scopeDiff.removed },
      { label: 'Unchanged', data: dataset.scopeDiff.unchanged },
    ];
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Hold Summary</h2>
        <dl className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">Hold Identifier</dt>
            <dd className="text-base font-semibold text-slate-900">{dataset.holdId}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Issued At</dt>
            <dd className="text-base text-slate-900">{new Date(dataset.issuedAt).toUTCString()}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-slate-500">Preservation Window</dt>
            <dd className="text-base text-slate-900">{formatDateRange(dataset.window.start, dataset.window.end)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Scope Overview</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="pb-2">System</th>
              <th className="pb-2">Resources</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {systemKeys.map((system) => (
              <tr key={system}>
                <td className="py-2 font-medium text-slate-700">{system}</td>
                <td className="py-2 text-slate-900">
                  <ul className="list-inside list-disc space-y-1">
                    {dataset.scope[system].map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Deterministic Scope Diff</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {diffSections.map(({ label, data }) => (
            <div key={label} className="rounded border border-slate-100 bg-slate-50 p-3">
              <h3 className="text-sm font-semibold text-slate-600">{label}</h3>
              {Object.keys(data).length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">None</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  {Object.entries(data)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([system, resources]) => (
                      <li key={system}>
                        <span className="font-medium">{system}:</span>
                        <ul className="ml-4 list-disc space-y-1">
                          {resources.map((resource) => (
                            <li key={resource}>{resource}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Custody Verification</h2>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              verification?.valid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {verification?.valid ? 'Chain intact' : verification ? 'Attention required' : 'Checking...'}
          </span>
        </div>
        {verification?.message && !verification.valid && (
          <p className="mt-2 text-sm text-amber-700">{verification.message}</p>
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-2">Seq</th>
                <th className="pb-2">System</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Timestamp (UTC)</th>
                <th className="pb-2">Scope Fingerprint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {dataset.custodyChain.map((event) => (
                <tr key={event.sequence}>
                  <td className="py-2 text-slate-600">{event.sequence}</td>
                  <td className="py-2 font-medium text-slate-700">{event.system}</td>
                  <td className="py-2 text-slate-600">{event.action}</td>
                  <td className="py-2 text-slate-600">{new Date(event.timestamp).toUTCString()}</td>
                  <td className="py-2 text-slate-600">
                    <code className="break-all text-xs text-slate-500">{event.scopeFingerprint}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">System Reports</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {dataset.reports
            .slice()
            .sort((a, b) => a.system.localeCompare(b.system))
            .map((report) => (
              <div key={report.system} className="rounded border border-slate-100 bg-slate-50 p-3">
                <h3 className="text-sm font-semibold text-slate-700">{report.system}</h3>
                <dl className="mt-2 space-y-2 text-sm text-slate-600">
                  <div>
                    <dt className="font-medium text-slate-500">Frozen</dt>
                    <dd>{report.frozenResources.join(', ') || 'None'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Snapshots</dt>
                    <dd>{report.snapshotted.length > 0 ? report.snapshotted.join(', ') : 'None'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Tags</dt>
                    <dd>
                      {Object.keys(report.tagged).length === 0 ? (
                        'None'
                      ) : (
                        <ul className="list-inside list-disc space-y-1">
                          {Object.entries(report.tagged)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([resource, tags]) => (
                              <li key={resource}>
                                <span className="font-medium text-slate-600">{resource}:</span>{' '}
                                {Object.entries(tags)
                                  .map(([key, value]) => `${key}=${value}`)
                                  .join(', ')}
                              </li>
                            ))}
                        </ul>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

export default LhoDashboard;
