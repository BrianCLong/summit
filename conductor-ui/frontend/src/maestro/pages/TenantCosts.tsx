import React, { useState } from 'react';
import TenantSLO from '../components/TenantSLO';
import TenantSLOChart from '../components/TenantSLOChart';
import TenantCost from '../components/TenantCost';
import TenantBudgetForecast from '../components/TenantBudgetForecast';
import TenantCostAnomalies from '../components/TenantCostAnomalies';
import { api } from '../api';
import GrafanaPanel from '../components/GrafanaPanel';
import ModelAnomalyPanels from '../components/ModelAnomalyPanels';

export default function TenantCosts() {
  const [tenant, setTenant] = useState('acme');
  const cfg: any = (window as any).__MAESTRO_CFG__ || (window as any).MAESTRO_CFG || {};
  const { listAlertRoutes, createAlertRoute, deleteAlertRoute, testAlertEvent } = api();
  const [routes, setRoutes] = React.useState<any[]>([]);
  const [receiver, setReceiver] = React.useState<'email'|'webhook'>('email');
  const [severity, setSeverity] = React.useState<'warn'|'page'>('page');
  const [endpoint, setEndpoint] = React.useState('');
  const refreshRoutes = React.useCallback(()=> listAlertRoutes().then(r=>setRoutes(r.routes||[])), [listAlertRoutes]);
  React.useEffect(()=>{ refreshRoutes(); }, []);
  return (
    <section className="space-y-3 p-4" aria-label="Tenant cost">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Tenant Cost & SLO</h1>
        <input aria-label="Tenant" className="rounded border px-2 py-1" value={tenant} onChange={e => setTenant(e.target.value)} />
      </div>
      <TenantSLO tenant={tenant} />
      <TenantSLOChart tenant={tenant} />
      <TenantCost tenant={tenant} />
      <TenantBudgetForecast tenant={tenant} />
      <TenantCostAnomalies tenant={tenant} />
      <section className="space-y-2 rounded-2xl border p-4" aria-label="Alert routes">
        <div className="text-sm font-medium">Forecast alert routes</div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2">Severity<select className="rounded border px-2 py-1" value={severity} onChange={e=>setSeverity(e.target.value as any)}><option value="warn">Warn</option><option value="page">Page</option></select></label>
          <label className="flex items-center gap-2">Receiver<select className="rounded border px-2 py-1" value={receiver} onChange={e=>setReceiver(e.target.value as any)}><option value="email">Email</option><option value="webhook">Webhook</option></select></label>
          <input className="w-72 rounded border px-2 py-1" placeholder={receiver==='email'?'Email':'Webhook URL'} value={endpoint} onChange={e=>setEndpoint(e.target.value)} />
          <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={async ()=>{ await createAlertRoute({ type:'forecast', tenant, severity, receiver, meta:{ endpoint } }); setEndpoint(''); refreshRoutes(); }}>Create route</button>
          <button className="rounded border px-3 py-2" onClick={()=>testAlertEvent({ tenant })}>Test alert</button>
        </div>
        <div className="rounded border">
          <table className="w-full text-sm"><thead><tr><th>ID</th><th>Severity</th><th>Receiver</th><th>Actions</th></tr></thead>
            <tbody>
              {routes.filter(r=>r.tenant===tenant && r.type==='forecast').map(r=> (
                <tr key={r.id}><td>{r.id}</td><td>{r.severity}</td><td>{r.receiver}</td><td><button className="text-red-600 underline" onClick={()=>deleteAlertRoute(r.id).then(refreshRoutes)}>Delete</button></td></tr>
              ))}
              {!routes.length && <tr><td colSpan={4} className="p-3 text-center text-gray-500">No routes</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <GrafanaPanel uid={cfg?.grafanaDashboards?.cost || 'maestro-cost'} vars={{ tenant }} />
        <GrafanaPanel uid={cfg?.grafanaDashboards?.overview || 'maestro-overview'} vars={{ tenant }} />
        <GrafanaPanel uid={cfg?.grafanaDashboards?.slo || 'maestro-slo'} vars={{ tenant }} />
      </div>
      <ModelAnomalyPanels tenant={tenant} />
    </section>
  );
}
