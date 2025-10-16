import React from 'react';
import { sloSnapshots, sloBudget } from '../mockData';

export function ObservabilityPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Observability</h1>
        <p className="mt-1 text-sm text-slate-400">
          SLO widget tracks latency, error, and saturation with quick links to
          runs.
        </p>
      </header>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-semibold text-white">Service SLOs</h2>
        <table className="mt-4 w-full text-sm text-slate-300">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 text-left">Service</th>
              <th className="text-left">Latency p95</th>
              <th className="text-left">Error Rate</th>
              <th className="text-left">Saturation</th>
            </tr>
          </thead>
          <tbody>
            {sloSnapshots.map((snapshot) => (
              <tr
                key={snapshot.service}
                className="border-t border-slate-800/60"
              >
                <td className="py-2 text-slate-200">{snapshot.service}</td>
                <td>
                  <span
                    className={
                      snapshot.latencyP95Ms > sloBudget.latencyBudgetMs
                        ? 'text-amber-300'
                        : 'text-slate-300'
                    }
                  >
                    {snapshot.latencyP95Ms}ms
                  </span>
                </td>
                <td>
                  <span
                    className={
                      snapshot.errorRate > sloBudget.errorBudget
                        ? 'text-red-300'
                        : 'text-slate-300'
                    }
                  >
                    {(snapshot.errorRate * 100).toFixed(2)}%
                  </span>
                </td>
                <td>{(snapshot.saturation * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <a
          href="/runs/run-1?filter=slo"
          className="mt-3 inline-flex text-xs font-semibold text-emerald-300 hover:text-emerald-200"
        >
          View impacted runs →
        </a>
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
        <h2 className="text-lg font-semibold text-white">Self-SLO (UI)</h2>
        <p className="mt-2 text-slate-300">
          UI latency p95: 820ms • Error budget burn: 2.1% • Observed long tasks:
          0.7%
        </p>
        <p className="mt-2 text-xs text-slate-400">
          These metrics hydrate from the in-app telemetry hook and surface
          regressions directly for operators.
        </p>
      </section>
    </div>
  );
}

export default ObservabilityPage;
