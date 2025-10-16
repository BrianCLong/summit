import React, { useState } from 'react';
import TenantSLO from '../components/TenantSLO';
import TenantSLOChart from '../components/TenantSLOChart';
import GrafanaPanel from '../components/GrafanaPanel';

export default function TenantObservability() {
  const [tenant, setTenant] = useState<string>('acme');
  const cfg: any =
    (window as any).__MAESTRO_CFG__ || (window as any).MAESTRO_CFG || {};
  return (
    <section className="space-y-3 p-4" aria-label="Tenant observability">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Tenant Observability</h1>
        <input
          aria-label="Tenant"
          className="rounded border px-2 py-1"
          value={tenant}
          onChange={(e) => setTenant(e.target.value)}
        />
      </div>
      <TenantSLO tenant={tenant} />
      <TenantSLOChart tenant={tenant} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <GrafanaPanel
          uid={cfg?.grafanaDashboards?.slo || 'maestro-slo'}
          vars={{ tenant }}
        />
        <GrafanaPanel
          uid={cfg?.grafanaDashboards?.overview || 'maestro-overview'}
          vars={{ tenant }}
        />
        <GrafanaPanel
          uid={cfg?.grafanaDashboards?.cost || 'maestro-cost'}
          vars={{ tenant }}
        />
      </div>
    </section>
  );
}
