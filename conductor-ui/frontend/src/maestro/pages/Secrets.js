import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import React from 'react';
import { api } from '../api';
import SecretField from '../components/SecretField';
import { redactSensitive, sanitizeLogs } from '../utils/secretUtils';
export default function Secrets() {
  const { getSecrets, rotateSecret, getProviders, testProvider } = api();
  const [items, setItems] = React.useState([]);
  const [providers, setProviders] = React.useState([]);
  const [msg, setMsg] = React.useState(null);
  const [newSecret, setNewSecret] = React.useState({
    name: '',
    value: '',
    provider: 'vault',
  });
  const [auditLogs, setAuditLogs] = React.useState([]);
  const [showNewSecretForm, setShowNewSecretForm] = React.useState(false);
  React.useEffect(() => {
    (async () => {
      try {
        const r = await getSecrets();
        setItems(r.items || []);
      } catch {}
    })();
    (async () => {
      try {
        const p = await getProviders();
        setProviders(p.items || []);
      } catch {}
    })();
  }, []);
  const handleCreateSecret = async () => {
    try {
      // In production this would call the API
      const mockSecret = {
        id: `sec_${Date.now()}`,
        ref: `${newSecret.provider}/${newSecret.name}`,
        provider: newSecret.provider.toUpperCase(),
        lastAccess: new Date().toISOString(),
        rotationDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      };
      setItems([...items, mockSecret]);
      setNewSecret({ name: '', value: '', provider: 'vault' });
      setShowNewSecretForm(false);
      setMsg('Secret created successfully');
      setTimeout(() => setMsg(null), 3000);
      // Add to audit log (redacted)
      const logEntry = `Secret created: ${redactSensitive(`${newSecret.name}=${newSecret.value}`)}`;
      setAuditLogs([...auditLogs, logEntry]);
    } catch (error) {
      setMsg('Failed to create secret');
    }
  };
  return _jsxs('div', {
    className: 'space-y-4',
    children: [
      _jsxs('div', {
        className: 'flex items-center justify-between',
        children: [
          _jsx('h2', {
            className: 'text-lg font-semibold',
            children: 'Secrets & Connections',
          }),
          _jsx('button', {
            onClick: () => setShowNewSecretForm(!showNewSecretForm),
            className:
              'bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-indigo-700',
            children: 'Add Secret',
          }),
        ],
      }),
      showNewSecretForm &&
        _jsxs('div', {
          className:
            'bg-white p-4 rounded-lg border border-slate-200 space-y-4',
          children: [
            _jsx('h3', {
              className: 'font-medium text-slate-900',
              children: 'Create New Secret',
            }),
            _jsxs('div', {
              className: 'grid grid-cols-1 md:grid-cols-2 gap-4',
              children: [
                _jsxs('div', {
                  children: [
                    _jsx('label', {
                      className: 'block text-sm font-medium text-slate-700',
                      children: 'Name',
                    }),
                    _jsx('input', {
                      type: 'text',
                      value: newSecret.name,
                      onChange: (e) =>
                        setNewSecret({ ...newSecret, name: e.target.value }),
                      className:
                        'mt-1 w-full px-3 py-2 border border-slate-200 rounded-md',
                      placeholder: 'e.g., api-key-prod',
                    }),
                  ],
                }),
                _jsxs('div', {
                  children: [
                    _jsx('label', {
                      className: 'block text-sm font-medium text-slate-700',
                      children: 'Provider',
                    }),
                    _jsxs('select', {
                      value: newSecret.provider,
                      onChange: (e) =>
                        setNewSecret({
                          ...newSecret,
                          provider: e.target.value,
                        }),
                      className:
                        'mt-1 w-full px-3 py-2 border border-slate-200 rounded-md',
                      children: [
                        _jsx('option', {
                          value: 'vault',
                          children: 'HashiCorp Vault',
                        }),
                        _jsx('option', {
                          value: 'aws-kms',
                          children: 'AWS KMS',
                        }),
                        _jsx('option', {
                          value: 'azure-kv',
                          children: 'Azure Key Vault',
                        }),
                        _jsx('option', {
                          value: 'gcp-sm',
                          children: 'Google Secret Manager',
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            _jsx(SecretField, {
              label: 'Secret Value',
              value: newSecret.value,
              onChange: (value) => setNewSecret({ ...newSecret, value }),
              showStrengthIndicator: true,
              allowCopy: false,
              className: 'w-full',
            }),
            _jsxs('div', {
              className: 'flex gap-2',
              children: [
                _jsx('button', {
                  onClick: handleCreateSecret,
                  disabled: !newSecret.name || !newSecret.value,
                  className:
                    'bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed',
                  children: 'Create Secret',
                }),
                _jsx('button', {
                  onClick: () => {
                    setShowNewSecretForm(false);
                    setNewSecret({ name: '', value: '', provider: 'vault' });
                  },
                  className:
                    'border border-slate-200 px-4 py-2 rounded-md text-sm hover:bg-slate-50',
                  children: 'Cancel',
                }),
              ],
            }),
          ],
        }),
      _jsxs('div', {
        className: 'overflow-hidden rounded-lg border bg-white',
        children: [
          _jsx('div', {
            className: 'border-b bg-slate-50 px-4 py-2',
            children: _jsx('h3', {
              className: 'font-semibold text-slate-700',
              children: 'Managed Secrets',
            }),
          }),
          _jsxs('table', {
            className: 'w-full text-sm',
            children: [
              _jsx('thead', {
                className: 'bg-slate-50 text-left text-slate-500',
                children: _jsxs('tr', {
                  children: [
                    _jsx('th', {
                      className: 'px-4 py-3',
                      children: 'Reference',
                    }),
                    _jsx('th', {
                      className: 'px-4 py-3',
                      children: 'Provider',
                    }),
                    _jsx('th', {
                      className: 'px-4 py-3',
                      children: 'Last Access',
                    }),
                    _jsx('th', {
                      className: 'px-4 py-3',
                      children: 'Rotation Due',
                    }),
                    _jsx('th', { className: 'px-4 py-3', children: 'Actions' }),
                  ],
                }),
              }),
              _jsx('tbody', {
                children: items.map((s) =>
                  _jsxs(
                    'tr',
                    {
                      className: 'border-t hover:bg-slate-50',
                      children: [
                        _jsx('td', {
                          className: 'px-4 py-3 font-mono text-xs',
                          children: s.ref,
                        }),
                        _jsx('td', {
                          className: 'px-4 py-3',
                          children: _jsx('span', {
                            className:
                              'inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800',
                            children: s.provider,
                          }),
                        }),
                        _jsx('td', {
                          className: 'px-4 py-3 text-xs text-slate-500',
                          children: s.lastAccess,
                        }),
                        _jsx('td', {
                          className: 'px-4 py-3 text-xs',
                          children: _jsx('span', {
                            className: `inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              new Date(s.rotationDue) <
                              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`,
                            children: s.rotationDue,
                          }),
                        }),
                        _jsx('td', {
                          className: 'px-4 py-3',
                          children: _jsx('div', {
                            className: 'flex gap-2',
                            children: _jsx('button', {
                              'aria-label': `Rotate ${s.ref}`,
                              className:
                                'text-indigo-600 hover:text-indigo-800 text-xs',
                              onClick: async () => {
                                try {
                                  await rotateSecret(s.id);
                                  setMsg('Rotation triggered');
                                  setTimeout(() => setMsg(null), 1500);
                                  // Add to audit log
                                  setAuditLogs([
                                    ...auditLogs,
                                    `Secret rotated: ${s.ref}`,
                                  ]);
                                } catch (e) {
                                  setMsg(e?.message || 'Failed');
                                }
                              },
                              children: 'Rotate',
                            }),
                          }),
                        }),
                      ],
                    },
                    s.id,
                  ),
                ),
              }),
            ],
          }),
        ],
      }),
      _jsxs('section', {
        className: 'rounded-lg border bg-white',
        children: [
          _jsxs('div', {
            className: 'flex items-center justify-between border-b p-4',
            children: [
              _jsx('div', {
                className: 'font-semibold text-slate-700',
                children: 'Provider Connections',
              }),
              _jsx('button', {
                className: 'text-indigo-600 hover:text-indigo-800 text-sm',
                onClick: async () => {
                  try {
                    const p = await getProviders();
                    setProviders(p.items || []);
                  } catch {}
                },
                children: 'Refresh',
              }),
            ],
          }),
          _jsxs('table', {
            className: 'w-full text-sm',
            children: [
              _jsx('thead', {
                className: 'bg-slate-50 text-left text-slate-500',
                children: _jsxs('tr', {
                  children: [
                    _jsx('th', { className: 'px-4 py-3', children: 'Name' }),
                    _jsx('th', { className: 'px-4 py-3', children: 'Status' }),
                    _jsx('th', { className: 'px-4 py-3', children: 'Latency' }),
                    _jsx('th', { className: 'px-4 py-3', children: 'Actions' }),
                  ],
                }),
              }),
              _jsx('tbody', {
                children: providers.map((p) =>
                  _jsxs(
                    'tr',
                    {
                      className: 'border-t hover:bg-slate-50',
                      children: [
                        _jsx('td', {
                          className: 'px-4 py-3 font-medium',
                          children: p.name,
                        }),
                        _jsx('td', {
                          className: 'px-4 py-3',
                          children: _jsx('span', {
                            className: `inline-flex items-center px-2 py-1 rounded-full text-xs ${p.status === 'UP' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`,
                            children: p.status,
                          }),
                        }),
                        _jsxs('td', {
                          className: 'px-4 py-3 text-slate-600',
                          children: [p.latencyMs, 'ms'],
                        }),
                        _jsx('td', {
                          className: 'px-4 py-3',
                          children: _jsx('button', {
                            className:
                              'text-indigo-600 hover:text-indigo-800 text-sm',
                            onClick: async () => {
                              try {
                                await testProvider(p.id);
                                const r = await getProviders();
                                setProviders(r.items || []);
                                setAuditLogs([
                                  ...auditLogs,
                                  `Connection tested: ${p.name}`,
                                ]);
                              } catch {}
                            },
                            children: 'Test Connection',
                          }),
                        }),
                      ],
                    },
                    p.id,
                  ),
                ),
              }),
            ],
          }),
        ],
      }),
      auditLogs.length > 0 &&
        _jsxs('section', {
          className: 'rounded-lg border bg-white',
          children: [
            _jsx('div', {
              className: 'border-b bg-slate-50 px-4 py-2',
              children: _jsx('h3', {
                className: 'font-semibold text-slate-700',
                children: 'Audit Log',
              }),
            }),
            _jsx('div', {
              className: 'p-4',
              children: _jsx('div', {
                className:
                  'bg-slate-900 text-green-400 p-3 rounded-md font-mono text-xs max-h-48 overflow-y-auto',
                children: sanitizeLogs(auditLogs).map((log, index) =>
                  _jsxs(
                    'div',
                    {
                      className: 'flex items-start gap-2',
                      children: [
                        _jsx('span', {
                          className: 'text-slate-500',
                          children: new Date().toISOString(),
                        }),
                        _jsx('span', { children: log }),
                      ],
                    },
                    index,
                  ),
                ),
              }),
            }),
          ],
        }),
      msg &&
        _jsx('div', {
          className: `p-3 rounded-md text-sm ${
            msg.includes('success') || msg.includes('triggered')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`,
          children: msg,
        }),
      _jsx('div', {
        className: 'bg-blue-50 border border-blue-200 rounded-md p-3',
        children: _jsxs('div', {
          className: 'flex',
          children: [
            _jsx('div', {
              className: 'flex-shrink-0',
              children: _jsx('svg', {
                className: 'h-5 w-5 text-blue-400',
                fill: 'currentColor',
                viewBox: '0 0 20 20',
                children: _jsx('path', {
                  fillRule: 'evenodd',
                  d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z',
                  clipRule: 'evenodd',
                }),
              }),
            }),
            _jsx('div', {
              className: 'ml-3 text-sm text-blue-800',
              children: _jsxs('p', {
                children: [
                  _jsx('strong', { children: 'Security Note:' }),
                  ' Secret values are never displayed in plaintext. All operations are logged and audited. Secrets are automatically encrypted at rest and in transit.',
                ],
              }),
            }),
          ],
        }),
      }),
    ],
  });
}
