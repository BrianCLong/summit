import React from 'react';

export default function GrafanaPanel({
  uid,
  vars = {} as Record<string, string | number>,
}: {
  uid: string;
  vars?: Record<string, string | number>;
}) {
  const cfg: any = (window as any).__MAESTRO_CFG__ || {};
  const base: string | undefined = cfg.grafanaBase;
  if (!base) {
    return (
      <div className="rounded border p-3 text-sm text-slate-500">
        Configure window.__MAESTRO_CFG__.grafanaBase to embed Grafana panel{' '}
        {uid}.
      </div>
    );
  }
  const params = new URLSearchParams();
  params.set('orgId', '1');
  params.set('kiosk', '');
  params.set('refresh', '30s');
  Object.entries(vars || {}).forEach(([k, v]) =>
    params.set(`var-${k}`, String(v)),
  );
  const src = `${base.replace(/\/$/, '')}/d/${encodeURIComponent(uid)}?${params.toString()}`;
  return (
    <iframe
      title={`Grafana ${uid}`}
      src={src}
      className="w-full"
      style={{ height: 360, border: 0, borderRadius: 12 }}
      sandbox="allow-same-origin allow-scripts allow-popups"
    />
  );
}
