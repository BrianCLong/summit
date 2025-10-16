import React from 'react';
import { getMaestroConfig } from '../config';

export default function SLOPanel({
  service,
  env,
}: {
  service?: string;
  env?: string;
}) {
  const cfg = getMaestroConfig();
  const base = cfg.grafanaBase?.replace(/\/$/, '');
  const sloUid = cfg.grafanaDashboards?.slo || 'maestro-slo';
  const url = base
    ? `${base}/d/${encodeURIComponent(sloUid)}?var-service=${encodeURIComponent(service || 'all')}&var-env=${encodeURIComponent(env || 'prod')}`
    : undefined;

  return (
    <section className="rounded border bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          SLOs & Burn Rate
        </h3>
        {url && (
          <a
            className="text-xs text-indigo-700 hover:underline"
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            Open in Grafana
          </a>
        )}
      </div>
      <div className="text-sm text-slate-600">
        Projected breach in 34m (burn 3.2×). Auto‑rollback engaged at 4× or by
        operator.
      </div>
      {!url && (
        <div className="mt-2 text-xs text-slate-500">
          Configure window.__MAESTRO_CFG__.grafanaBase to enable deep links.
        </div>
      )}
    </section>
  );
}
