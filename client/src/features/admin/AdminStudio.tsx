// @ts-nocheck
import React from 'react';
import OverridesPanel from './OverridesPanel';
import CostExplorer from './CostExplorer';

interface Config {
  MODEL_PROVIDER: string;
  MODEL_NAME: string;
  TEMPERATURE: number;
  TOP_P: number;
  MAX_TOKENS: number;
  BUDGET_CAP_USD: number;
  TEMPORAL_ENABLED: boolean;
  RESEARCH_PROMPT_ENABLED: boolean;
  RESEARCH_PROMPT_PATH: string;
}

interface BundleStatus {
  ok: boolean;
  allowedFlowsCount?: number;
  sample?: string[];
  message?: string;
}

interface BundleInfo {
  name: string;
  revision?: string;
  last_successful_download?: string;
  last_successful_activation?: string;
}

interface BundleSource {
  ok: boolean;
  bundleNames?: string[];
  info?: BundleInfo[];
  message?: string;
}

export default function AdminStudio() {
  const [cfg, setCfg] = React.useState<Config | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tenantId, setTenantId] = React.useState<string>('');
  const [n8nInfo, setN8nInfo] = React.useState<{
    prefixes: string[];
    flows: string[];
  }>({ prefixes: [], flows: [] });
  const [n8nConfig, setN8nConfig] = React.useState<{
    allowedPrefixes: string[];
    deniedPrefixes: string[];
    allowedFlows: string[];
  }>({ allowedPrefixes: [], deniedPrefixes: [], allowedFlows: [] });
  const [newFlow, setNewFlow] = React.useState<string>('');
  const [opaStatus, setOpaStatus] = React.useState<{
    ok: boolean;
    message?: string;
    health?: number;
    evalOk?: boolean;
    evalReason?: string;
  } | null>(null);
  const [bundleStatus, setBundleStatus] = React.useState<BundleStatus | null>(
    null,
  );
  const [bundleSource, setBundleSource] = React.useState<BundleSource | null>(
    null,
  );
  const [opaSince, setOpaSince] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<
    'config' | 'overrides' | 'cost-explorer' | 'help'
  >('config');
  const [saveMessage, setSaveMessage] = React.useState<string>('');
  const [errors, setErrors] = React.useState<string[]>([]);
  const load = React.useCallback(async () => {
    setLoading(true);
    const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    const r = await fetch('/api/admin/config' + q);
    const j = await r.json();
    setCfg(j);
    setLoading(false);
  }, [tenantId]);
  React.useEffect(() => {
    load();
  }, [load]);
  React.useEffect(() => {
    (async () => {
      try {
        const q = 'query { n8nAllowed { prefixes flows } }';
        const r = await fetch('/graphql', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: q }),
        });
        const j = await r.json();
        const info = j?.data?.n8nAllowed || { prefixes: [], flows: [] };
        setN8nInfo(info);
      } catch {
        setN8nInfo({ prefixes: [], flows: [] });
      }
    })();
  }, []);

  // Load editable config from admin route
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/n8n-flows');
        const j = await r.json();
        setN8nConfig({
          allowedPrefixes: j.allowedPrefixes || [],
          deniedPrefixes: j.deniedPrefixes || [],
          allowedFlows: j.allowedFlows || [],
        });
      } catch {
        setN8nConfig({
          allowedPrefixes: ['integration/'],
          deniedPrefixes: ['deploy/', 'db/'],
          allowedFlows: [],
        });
      }
    })();
  }, []);

  async function saveN8nConfig() {
    await fetch('/api/admin/n8n-flows', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(n8nConfig),
    });
    // Refresh
    const q = 'query { n8nAllowed { prefixes flows } }';
    const r = await fetch('/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: q }),
    });
    const j = await r.json();
    setN8nInfo(j?.data?.n8nAllowed || { prefixes: [], flows: [] });
  }

  async function validateOPA() {
    try {
      const r = await fetch('/api/admin/opa/validate');
      const j = await r.json();
      setOpaStatus(j);
      if (j?.ok && !opaSince) setOpaSince(new Date().toLocaleTimeString());
    } catch {
      setOpaStatus({ ok: false, message: 'request failed' });
    }
  }

  async function reloadOPA() {
    try {
      await fetch('/api/admin/opa/reload', { method: 'POST' });
      await validateOPA();
    } catch {
      // ignore
    }
  }

  async function fetchBundleStatus() {
    try {
      const r = await fetch('/api/admin/opa/bundle-status');
      const j = await r.json();
      setBundleStatus(j);
    } catch {
      setBundleStatus({ ok: false, message: 'request failed' });
    }
  }

  async function pushFlowsToOPA() {
    try {
      const r = await fetch('/api/admin/opa/push-n8n-flows', {
        method: 'POST',
      });
      const j = await r.json();
      await fetchBundleStatus();
      alert(
        j.ok
          ? `Pushed ${j.count || 0} flows to OPA`
          : `Push failed: ${j.message}`,
      );
    } catch {
      alert('Push failed');
    }
  }

  async function fetchBundleSource() {
    try {
      const r = await fetch('/api/admin/opa/bundle-source');
      const j = await r.json();
      setBundleSource(j);
    } catch {
      setBundleSource({ ok: false, message: 'request failed' });
    }
  }

  // Periodic refresh of OPA bundle status/source
  React.useEffect(() => {
    const tick = () => {
      fetchBundleStatus();
      fetchBundleSource();
    };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, []);

  async function syncFlowsFromOPA() {
    try {
      const r = await fetch('/api/admin/opa/sync-n8n-flows', {
        method: 'POST',
      });
      const j = await r.json();
      if (j.ok) {
        setN8nConfig(j.config);
        await saveN8nConfig();
        alert(`Synced ${j.count} flows from OPA`);
      } else {
        alert(`Sync failed: ${j.message}`);
      }
    } catch {
      alert('Sync failed');
    }
  }
  const save = async () => {
    try {
      setSaveMessage('');
      setErrors([]);

      const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      const response = await fetch('/api/admin/config' + q, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cfg),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        if (result.errors) {
          setErrors(result.errors);
        } else {
          setErrors([result.error || 'Failed to save configuration']);
        }
      } else {
        setSaveMessage(result.message || 'Configuration saved successfully');
        await load();

        // Clear message after 3 seconds
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      setErrors(['Network error: ' + (error as Error).message]);
    }
  };
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overrides':
        return <OverridesPanel />;
      case 'cost-explorer':
        return <CostExplorer />;
      case 'help':
        return (
          <div style={{ padding: 24, maxWidth: 800 }}>
            <h2>Help & Documentation</h2>
            <div style={{ marginBottom: 24 }}>
              <h3>Quick Links</h3>
              <ul style={{ lineHeight: '1.8' }}>
                <li>
                  <a
                    href="/docs/runbooks/canary-rollout-complete.md"
                    target="_blank"
                  >
                    Go/No-Go Checklist
                  </a>
                </li>
                <li>
                  <a href="/docs/runbooks/rollback-plan.md" target="_blank">
                    Rollback Plan
                  </a>
                </li>
                <li>
                  <a
                    href="/docs/safe-mutations/troubleshooting-faq.md"
                    target="_blank"
                  >
                    Troubleshooting FAQ
                  </a>
                </li>
                <li>
                  <a href="/ops/post-deploy-smoke-tests.sh" target="_blank">
                    Post-Deploy Smoke Tests
                  </a>
                </li>
              </ul>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h3>Monitoring & Observability</h3>
              <ul style={{ lineHeight: '1.8' }}>
                <li>
                  <a
                    href="https://grafana.intelgraph.dev/d/safe-mutations"
                    target="_blank"
                  >
                    Safe Mutations SLO Dashboard
                  </a>
                </li>
                <li>
                  <a href="https://alerts.intelgraph.dev" target="_blank">
                    Alert Manager
                  </a>
                </li>
                <li>
                  <a href="https://bull.intelgraph.dev" target="_blank">
                    Worker Queue Status (Bull Board)
                  </a>
                </li>
              </ul>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h3>Emergency Contacts</h3>
              <ul style={{ lineHeight: '1.8' }}>
                <li>
                  <strong>SRE On-Call:</strong> @sre-oncall (Slack) |
                  +1-555-SRE-HELP
                </li>
                <li>
                  <strong>Platform Team:</strong> @platform-team (Slack)
                </li>
                <li>
                  <strong>FinOps Team:</strong> @finops-team (budget issues)
                </li>
                <li>
                  <strong>Engineering Manager:</strong> Jane Smith @jane.smith
                </li>
              </ul>
            </div>
            <div
              style={{
                background: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                padding: '16px',
                marginTop: '24px',
              }}
            >
              <h4>Common Troubleshooting Commands</h4>
              <pre
                style={{
                  background: '#ffffff',
                  padding: '12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  overflow: 'auto',
                }}
              >
                {`# Check budget status
curl -s "$API/admin/budget/status" | jq

# Verify PQ allowlist
redis-cli SCARD "pq:allowlist"

# Emergency bypass (use sparingly)
kubectl set env deployment/intelgraph-api PQ_BYPASS=1

# Run smoke tests
./ops/post-deploy-smoke-tests.sh`}
              </pre>
            </div>
          </div>
        );
      default:
        return (
          <div>
            <h2>Admin Studio — Knobs for Everything</h2>
            {loading ? (
              <div style={{ padding: 24 }}>Loading…</div>
            ) : (
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 12 }}>
                  <label>
                    Tenant ID (optional):&nbsp;
                    <input
                      value={tenantId}
                      onChange={(e) => setTenantId(e.target.value)}
                      placeholder="tenant-id"
                    />
                  </label>
                </div>

                {/* Status Messages */}
                {errors.length > 0 && (
                  <div
                    style={{
                      background: '#fecaca',
                      border: '1px solid #f87171',
                      borderRadius: '4px',
                      padding: '12px',
                      marginBottom: '16px',
                    }}
                  >
                    <h4 style={{ margin: '0 0 8px 0', color: '#991b1b' }}>
                      Validation Errors:
                    </h4>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: '16px',
                        color: '#991b1b',
                      }}
                    >
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {saveMessage && (
                  <div
                    style={{
                      background: '#dcfce7',
                      border: '1px solid #22c55e',
                      borderRadius: '4px',
                      padding: '12px',
                      marginBottom: '16px',
                      color: '#166534',
                    }}
                  >
                    {saveMessage}
                  </div>
                )}

                {/* Model & AI Configuration */}
                <h3>Model & AI Configuration</h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    maxWidth: 720,
                    marginBottom: 16,
                  }}
                >
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>MODEL_PROVIDER</span>
                    <select
                      value={cfg.MODEL_PROVIDER || 'openai'}
                      onChange={(e) =>
                        setCfg({ ...cfg, MODEL_PROVIDER: e.target.value })
                      }
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="oss">Open Source</option>
                      <option value="local">Local Model</option>
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>MODEL_NAME</span>
                    <input
                      value={cfg.MODEL_NAME || ''}
                      onChange={(e) =>
                        setCfg({ ...cfg, MODEL_NAME: e.target.value })
                      }
                      placeholder="e.g., gpt-4-turbo-preview"
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>
                      TEMPERATURE (0.0-1.0)
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={cfg.TEMPERATURE ?? 0.2}
                      onChange={(e) =>
                        setCfg({ ...cfg, TEMPERATURE: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>TOP_P (0.0-1.0)</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={cfg.TOP_P ?? 1.0}
                      onChange={(e) =>
                        setCfg({ ...cfg, TOP_P: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>MAX_TOKENS</span>
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      value={cfg.MAX_TOKENS ?? 4096}
                      onChange={(e) =>
                        setCfg({ ...cfg, MAX_TOKENS: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>BUDGET_CAP_USD</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cfg.BUDGET_CAP_USD ?? 10}
                      onChange={(e) =>
                        setCfg({
                          ...cfg,
                          BUDGET_CAP_USD: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    maxWidth: 720,
                  }}
                >
                  {Object.keys(cfg || {}).map((k) => (
                    <label
                      key={k}
                      style={{ display: 'flex', flexDirection: 'column' }}
                    >
                      <span style={{ fontWeight: 600 }}>{k}</span>
                      {typeof cfg[k] === 'boolean' ? (
                        <input
                          type="checkbox"
                          checked={!!cfg[k]}
                          onChange={(e) =>
                            setCfg({
                              ...cfg,
                              [k]: e.target.checked as (typeof cfg)[string],
                            })
                          }
                        />
                      ) : (
                        <input
                          value={String(cfg[k])}
                          onChange={(e) =>
                            setCfg({
                              ...cfg,
                              [k]: (e.target.value as unknown) as (typeof cfg)[string],
                            })
                          }
                        />
                      )}
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: 12 }}>
                  <button onClick={save}>Save</button>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6' }}>
        {[
          { key: 'config', label: 'Configuration' },
          { key: 'overrides', label: 'Overrides' },
          { key: 'cost-explorer', label: 'Cost Explorer' },
          { key: 'help', label: 'Help' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() =>
              setActiveTab(
                tab.key as 'config' | 'overrides' | 'cost-explorer' | 'help',
              )
            }
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === tab.key ? '#f8f9fa' : 'transparent',
              borderBottom:
                activeTab === tab.key
                  ? '2px solid #007bff'
                  : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Temporal Toggle */}
      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: 12,
          marginTop: 16,
          maxWidth: 520,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Temporal Worker</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label>
            <input
              type="checkbox"
              checked={!!cfg?.TEMPORAL_ENABLED}
              onChange={async (e) => {
                const enabled = e.target.checked;
                setCfg({ ...cfg, TEMPORAL_ENABLED: enabled });
                await fetch('/api/admin/temporal/toggle', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ enabled }),
                });
              }}
            />{' '}
            Enable Temporal
          </label>
        </div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
          Runtime toggle; persists in-process and memConfig.
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <h3>n8n Policy (discoverable)</h3>
        <div>
          <strong>Allowed prefixes:</strong>{' '}
          {n8nInfo.prefixes.join(', ') || '—'}
        </div>
        <div style={{ marginTop: 8 }}>
          <strong>Allowed flows:</strong>
          <ul>
            {n8nInfo.flows.map((f) => (
              <li key={f}>
                <code>{f}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <h4>OPA Controls</h4>
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button onClick={validateOPA}>Validate OPA</button>
          <button onClick={reloadOPA}>Reload OPA Data</button>
          <button onClick={fetchBundleStatus}>Bundle Status</button>
          <button onClick={pushFlowsToOPA}>Push n8n Flows → OPA</button>
          <button onClick={fetchBundleSource}>Bundle Source</button>
          <button onClick={syncFlowsFromOPA}>Sync n8n Flows ← OPA</button>
          <button
            onClick={async () => {
              try {
                const r = await fetch('/api/admin/opa/push-n8n-prefixes', {
                  method: 'POST',
                });
                const j = await r.json();
                alert(j.ok ? 'Pushed prefixes to OPA' : `Failed: ${j.message}`);
              } catch {
                alert('Failed');
              }
            }}
          >
            Push Prefixes → OPA
          </button>
          <button
            onClick={async () => {
              try {
                const r = await fetch('/api/admin/opa/sync-n8n-prefixes', {
                  method: 'POST',
                });
                const j = await r.json();
                if (j.ok) {
                  setN8nConfig(j.config);
                  await saveN8nConfig();
                  alert('Synced prefixes from OPA');
                } else {
                  alert(`Failed: ${j.message}`);
                }
              } catch {
                alert('Failed');
              }
            }}
          >
            Sync Prefixes ← OPA
          </button>
        </div>
        {/* JSON debug removed; replaced with summary cards below */}
      </div>

      {/* Summary cards */}
      <div
        style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}
      >
        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 12,
            minWidth: 240,
          }}
        >
          <div style={{ fontWeight: 700 }}>OPA Connectivity</div>
          <div>
            Status:{' '}
            <span style={{ color: opaStatus?.ok ? 'green' : 'crimson' }}>
              {opaStatus?.ok ? 'OK' : 'Unavailable'}
            </span>
          </div>
          {opaStatus?.health && <div>Health: {opaStatus.health}</div>}
          {opaStatus?.evalOk !== undefined && (
            <div>
              Eval: {String(opaStatus.evalOk)} ({opaStatus?.evalReason || '-'})
            </div>
          )}
          <div style={{ fontSize: 12, color: '#555' }}>
            Last updated: {new Date().toLocaleTimeString()}
          </div>
          {opaSince && (
            <div style={{ fontSize: 12, color: '#555' }}>
              Connected since: {opaSince}
            </div>
          )}
        </div>
        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 12,
            minWidth: 240,
          }}
        >
          <div style={{ fontWeight: 700 }}>Allowed Flows</div>
          <div>Count: {bundleStatus?.allowedFlowsCount ?? '—'}</div>
          <div style={{ fontSize: 12, color: '#555' }}>
            Sample: {(bundleStatus?.sample || []).slice(0, 3).join(', ') || '—'}
          </div>
          <div style={{ fontSize: 12, color: '#555' }}>
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 12,
            minWidth: 280,
          }}
        >
          <div style={{ fontWeight: 700 }}>Bundle Source</div>
          <div>Bundles: {(bundleSource?.bundleNames || []).length || 0}</div>
          <div style={{ fontSize: 12, color: '#555' }}>
            {(bundleSource?.info || [])
              .map((i: BundleInfo) => `${i.name}@${i.revision || 'unknown'}`)
              .slice(0, 2)
              .join(' · ') || '—'}
          </div>
          <div style={{ fontSize: 12, color: '#555' }}>
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <h3>n8n Policy (edit)</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            maxWidth: 720,
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600 }}>Allowed Prefixes</span>
            <input
              value={n8nConfig.allowedPrefixes.join(',')}
              onChange={(e) =>
                setN8nConfig({
                  ...n8nConfig,
                  allowedPrefixes: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600 }}>Denied Prefixes</span>
            <input
              value={n8nConfig.deniedPrefixes.join(',')}
              onChange={(e) =>
                setN8nConfig({
                  ...n8nConfig,
                  deniedPrefixes: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              placeholder="integration/flow-key"
              value={newFlow}
              onChange={(e) => setNewFlow(e.target.value)}
            />
            <button
              onClick={() => {
                if (newFlow.trim()) {
                  setN8nConfig({
                    ...n8nConfig,
                    allowedFlows: Array.from(
                      new Set([
                        ...(n8nConfig.allowedFlows || []),
                        newFlow.trim(),
                      ]),
                    ),
                  });
                  setNewFlow('');
                }
              }}
            >
              Add Flow
            </button>
          </div>
          <ul>
            {(n8nConfig.allowedFlows || []).map((f) => (
              <li key={f}>
                <code>{f}</code>
                <button
                  style={{ marginLeft: 8 }}
                  onClick={() =>
                    setN8nConfig({
                      ...n8nConfig,
                      allowedFlows: (n8nConfig.allowedFlows || []).filter(
                        (x) => x !== f,
                      ),
                    })
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button onClick={saveN8nConfig}>Save n8n Policy</button>
        </div>
      </div>
      {renderTabContent()}
    </div>
  );
}
