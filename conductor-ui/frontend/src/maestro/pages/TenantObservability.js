import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState } from 'react';
import TenantSLO from '../components/TenantSLO';
import TenantSLOChart from '../components/TenantSLOChart';
import GrafanaPanel from '../components/GrafanaPanel';
export default function TenantObservability() {
  const [tenant, setTenant] = useState('acme');
  const cfg = window.__MAESTRO_CFG__ || window.MAESTRO_CFG || {};
  return _jsxs('section', {
    className: 'space-y-3 p-4',
    'aria-label': 'Tenant observability',
    children: [
      _jsxs('div', {
        className: 'flex items-center gap-3',
        children: [
          _jsx('h1', {
            className: 'text-xl font-semibold',
            children: 'Tenant Observability',
          }),
          _jsx('input', {
            'aria-label': 'Tenant',
            className: 'rounded border px-2 py-1',
            value: tenant,
            onChange: (e) => setTenant(e.target.value),
          }),
        ],
      }),
      _jsx(TenantSLO, { tenant: tenant }),
      _jsx(TenantSLOChart, { tenant: tenant }),
      _jsxs('div', {
        className: 'grid grid-cols-1 gap-3 md:grid-cols-3',
        children: [
          _jsx(GrafanaPanel, {
            uid: cfg?.grafanaDashboards?.slo || 'maestro-slo',
            vars: { tenant },
          }),
          _jsx(GrafanaPanel, {
            uid: cfg?.grafanaDashboards?.overview || 'maestro-overview',
            vars: { tenant },
          }),
          _jsx(GrafanaPanel, {
            uid: cfg?.grafanaDashboards?.cost || 'maestro-cost',
            vars: { tenant },
          }),
        ],
      }),
    ],
  });
}
