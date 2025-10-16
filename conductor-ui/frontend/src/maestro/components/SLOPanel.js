import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { getMaestroConfig } from '../config';
export default function SLOPanel({ service, env }) {
  const cfg = getMaestroConfig();
  const base = cfg.grafanaBase?.replace(/\/$/, '');
  const sloUid = cfg.grafanaDashboards?.slo || 'maestro-slo';
  const url = base
    ? `${base}/d/${encodeURIComponent(sloUid)}?var-service=${encodeURIComponent(service || 'all')}&var-env=${encodeURIComponent(env || 'prod')}`
    : undefined;
  return _jsxs('section', {
    className: 'rounded border bg-white p-3',
    children: [
      _jsxs('div', {
        className: 'mb-2 flex items-center justify-between',
        children: [
          _jsx('h3', {
            className: 'text-sm font-semibold text-slate-700',
            children: 'SLOs & Burn Rate',
          }),
          url &&
            _jsx('a', {
              className: 'text-xs text-indigo-700 hover:underline',
              href: url,
              target: '_blank',
              rel: 'noreferrer',
              children: 'Open in Grafana',
            }),
        ],
      }),
      _jsx('div', {
        className: 'text-sm text-slate-600',
        children:
          'Projected breach in 34m (burn 3.2\u00D7). Auto\u2011rollback engaged at 4\u00D7 or by operator.',
      }),
      !url &&
        _jsx('div', {
          className: 'mt-2 text-xs text-slate-500',
          children:
            'Configure window.__MAESTRO_CFG__.grafanaBase to enable deep links.',
        }),
    ],
  });
}
