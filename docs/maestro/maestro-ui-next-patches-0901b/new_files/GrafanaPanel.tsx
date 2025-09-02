import React from 'react';

type Props = {
  uid: string;         // Grafana dashboard UID
  panelId?: string;    // optional panel ID
  title?: string;
  from?: string;       // e.g., 'now-6h'
  to?: string;         // e.g., 'now'
  vars?: Record<string,string|number>;
  height?: string;     // default 380px
};

function buildSrc(base: string, uid: string, panelId?: string, from='now-6h', to='now', vars: Record<string, any> = {}) {
  const sp = new URLSearchParams({ orgId: '1', from, to, kiosk: 'true' });
  if (panelId) sp.set('viewPanel', String(panelId));
  Object.entries(vars).forEach(([k,v]) => sp.set(f"var-{k}", String(v)));
  return `${base}/d/${uid}?${sp.toString()}`;
}

export default function GrafanaPanel({ uid, panelId, title, from, to, vars, height='380px' }: Props) {
  const base = (window as any).__MAESTRO_CFG__?.grafanaBase || '';
  const src = buildSrc(base, uid, panelId, from, to, vars);
  return (
    <section className="border rounded-xl overflow-hidden shadow-sm">
      {title && <div className="px-3 py-2 text-sm font-medium bg-gray-50 border-b">{title}</div>}
      <iframe title={title || uid} src={src} style={{ width: '100%', height }} />
    </section>
  );
}
