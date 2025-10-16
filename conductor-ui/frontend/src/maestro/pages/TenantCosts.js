import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import React, { useState, useEffect } from 'react';
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
  const cfg = window.__MAESTRO_CFG__ || window.MAESTRO_CFG || {};
  const {
    listAlertRoutes,
    createAlertRoute,
    deleteAlertRoute,
    testAlertEvent,
    getTenantBudgetPolicy,
    billingExport,
  } = api();
  const [routes, setRoutes] = React.useState([]);
  const [receiver, setReceiver] = React.useState('email');
  const [severity, setSeverity] = React.useState('page');
  const [endpoint, setEndpoint] = React.useState('');
  const [budgetPolicy, setBudgetPolicy] = useState(null);
  const refreshRoutes = React.useCallback(
    () => listAlertRoutes().then((r) => setRoutes(r.routes || [])),
    [listAlertRoutes],
  );
  useEffect(() => {
    refreshRoutes();
  }, [refreshRoutes]);
  useEffect(() => {
    const fetchBudgetPolicy = async () => {
      try {
        const policy = await getTenantBudgetPolicy(tenant);
        setBudgetPolicy(policy);
      } catch (error) {
        console.error('Failed to fetch budget policy:', error);
        setBudgetPolicy(null);
      }
    };
    fetchBudgetPolicy();
  }, [tenant, getTenantBudgetPolicy]);
  const handleDownloadExport = async (format) => {
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      const result = await billingExport(tenant, month, format);
      const url = format === 'csv' ? result.csvUrl : result.jsonUrl;
      if (url) {
        window.open(url, '_blank');
      } else {
        alert(`Failed to get download URL for ${format} format.`);
      }
    } catch (error) {
      console.error('Failed to download export:', error);
      alert(`Error downloading export: ${error.message}`);
    }
  };
  return _jsxs('section', {
    className: 'space-y-3 p-4',
    'aria-label': 'Tenant cost',
    children: [
      _jsxs('div', {
        className: 'flex items-center gap-3',
        children: [
          _jsx('h1', {
            className: 'text-xl font-semibold',
            children: 'Tenant Cost & SLO',
          }),
          _jsx('input', {
            'aria-label': 'Tenant',
            className: 'rounded border px-2 py-1',
            value: tenant,
            onChange: (e) => setTenant(e.target.value),
          }),
          budgetPolicy &&
            _jsxs('span', {
              className: `inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                budgetPolicy.type === 'hard'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`,
              children: [
                'Budget: ',
                budgetPolicy.type.toUpperCase(),
                ' Cap $',
                budgetPolicy.limit,
                budgetPolicy.type === 'soft' &&
                  ` (Grace: ${budgetPolicy.grace * 100}%)`,
              ],
            }),
          _jsx('button', {
            className: 'rounded border px-2 py-1 text-sm',
            onClick: () => handleDownloadExport('csv'),
            children: 'Download Usage (CSV)',
          }),
          _jsx('button', {
            className: 'rounded border px-2 py-1 text-sm',
            onClick: () => handleDownloadExport('json'),
            children: 'Download Usage (JSON)',
          }),
        ],
      }),
      _jsx(TenantSLO, { tenant: tenant }),
      _jsx(TenantSLOChart, { tenant: tenant }),
      _jsx(TenantCost, { tenant: tenant }),
      _jsx(TenantBudgetForecast, { tenant: tenant }),
      _jsx(TenantCostAnomalies, { tenant: tenant }),
      _jsxs('section', {
        className: 'space-y-2 rounded-2xl border p-4',
        'aria-label': 'Alert routes',
        children: [
          _jsx('div', {
            className: 'text-sm font-medium',
            children: 'Forecast alert routes',
          }),
          _jsxs('div', {
            className: 'flex flex-wrap items-center gap-2 text-sm',
            children: [
              _jsxs('label', {
                className: 'flex items-center gap-2',
                children: [
                  'Severity',
                  _jsxs('select', {
                    className: 'rounded border px-2 py-1',
                    value: severity,
                    onChange: (e) => setSeverity(e.target.value),
                    children: [
                      _jsx('option', { value: 'warn', children: 'Warn' }),
                      _jsx('option', { value: 'page', children: 'Page' }),
                    ],
                  }),
                ],
              }),
              _jsxs('label', {
                className: 'flex items-center gap-2',
                children: [
                  'Receiver',
                  _jsxs('select', {
                    className: 'rounded border px-2 py-1',
                    value: receiver,
                    onChange: (e) => setReceiver(e.target.value),
                    children: [
                      _jsx('option', { value: 'email', children: 'Email' }),
                      _jsx('option', { value: 'webhook', children: 'Webhook' }),
                    ],
                  }),
                ],
              }),
              _jsx('input', {
                className: 'w-72 rounded border px-2 py-1',
                placeholder: receiver === 'email' ? 'Email' : 'Webhook URL',
                value: endpoint,
                onChange: (e) => setEndpoint(e.target.value),
              }),
              _jsx('button', {
                className: 'rounded bg-blue-600 px-3 py-2 text-white',
                onClick: async () => {
                  await createAlertRoute({
                    type: 'forecast',
                    tenant,
                    severity,
                    receiver,
                    meta: { endpoint },
                  });
                  setEndpoint('');
                  refreshRoutes();
                },
                children: 'Create route',
              }),
              _jsx('button', {
                className: 'rounded border px-3 py-2',
                onClick: () => testAlertEvent({ tenant }),
                children: 'Test alert',
              }),
            ],
          }),
          _jsx('div', {
            className: 'rounded border',
            children: _jsxs('table', {
              className: 'w-full text-sm',
              children: [
                _jsx('thead', {
                  children: _jsxs('tr', {
                    children: [
                      _jsx('th', { children: 'ID' }),
                      _jsx('th', { children: 'Severity' }),
                      _jsx('th', { children: 'Receiver' }),
                      _jsx('th', { children: 'Actions' }),
                    ],
                  }),
                }),
                _jsxs('tbody', {
                  children: [
                    routes
                      .filter(
                        (r) => r.tenant === tenant && r.type === 'forecast',
                      )
                      .map((r) =>
                        _jsxs(
                          'tr',
                          {
                            children: [
                              _jsx('td', { children: r.id }),
                              _jsx('td', { children: r.severity }),
                              _jsx('td', { children: r.receiver }),
                              _jsx('td', {
                                children: _jsx('button', {
                                  className: 'text-red-600 underline',
                                  onClick: () =>
                                    deleteAlertRoute(r.id).then(refreshRoutes),
                                  children: 'Delete',
                                }),
                              }),
                            ],
                          },
                          r.id,
                        ),
                      ),
                    !routes.length &&
                      _jsx('tr', {
                        children: _jsx('td', {
                          colSpan: 4,
                          className: 'p-3 text-center text-gray-500',
                          children: 'No routes',
                        }),
                      }),
                  ],
                }),
              ],
            }),
          }),
        ],
      }),
      _jsxs('div', {
        className: 'grid grid-cols-1 gap-3 md:grid-cols-3',
        children: [
          _jsx(GrafanaPanel, {
            uid: cfg?.grafanaDashboards?.cost || 'maestro-cost',
            vars: { tenant },
          }),
          _jsx(GrafanaPanel, {
            uid: cfg?.grafanaDashboards?.overview || 'maestro-overview',
            vars: { tenant },
          }),
          _jsx(GrafanaPanel, {
            uid: cfg?.grafanaDashboards?.slo || 'maestro-slo',
            vars: { tenant },
          }),
        ],
      }),
      _jsx(ModelAnomalyPanels, { tenant: tenant }),
    ],
  });
}
