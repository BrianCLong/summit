import React from 'react';
import { useReasonForAccess } from '../ReasonForAccessContext';

export function AdminPage() {
  const { auditLog } = useReasonForAccess();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Admin / Audit</h1>
        <p className="mt-1 text-sm text-slate-400">
          Local audit log showing who accessed sensitive surfaces and why.
        </p>
      </header>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
        <h2 className="text-lg font-semibold text-white">Access reasons</h2>
        {auditLog.length === 0 ? (
          <p className="mt-3 text-slate-400">No access recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {auditLog.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-4"
              >
                <p className="text-xs uppercase text-slate-500">
                  {new Date(entry.timestamp).toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  <span className="font-semibold text-white">
                    {entry.resource}
                  </span>
                </p>
                <p className="mt-2 text-sm text-emerald-300">{entry.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default AdminPage;
