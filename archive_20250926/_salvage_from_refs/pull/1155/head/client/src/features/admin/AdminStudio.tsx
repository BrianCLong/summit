import React from 'react';
import OverridesPanel from './OverridesPanel';
import CostExplorer from './CostExplorer';

export default function AdminStudio() {
  const [cfg, setCfg] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [tenantId, setTenantId] = React.useState<string>('');
  const [n8nInfo, setN8nInfo] = React.useState<{ prefixes: string[]; flows: string[] }>({ prefixes: [], flows: [] });
  const [n8nConfig, setN8nConfig] = React.useState<{ allowedPrefixes: string[]; deniedPrefixes: string[]; allowedFlows: string[] }>({ allowedPrefixes: [], deniedPrefixes: [], allowedFlows: [] });
  const [newFlow, setNewFlow] = React.useState<string>('');
  const [activeTab, setActiveTab] = React.useState<'config' | 'overrides' | 'cost-explorer' | 'help'>('config');
  const [saveMessage, setSaveMessage] = React.useState<string>('');
  const [errors, setErrors] = React.useState<string[]>([]);
  const load = async () => {
    setLoading(true);
    const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    const r = await fetch('/api/admin/config' + q);
    const j = await r.json();
    setCfg(j);
    setLoading(false);
  };
  React.useEffect(() => { load(); }, [tenantId]);
  React.useEffect(() => {
    (async () => {
      try {
        const q = 'query { n8nAllowed { prefixes flows } }';
        const r = await fetch('/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: q }) });
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
        setN8nConfig({ allowedPrefixes: ['integration/'], deniedPrefixes: ['deploy/', 'db/'], allowedFlows: [] });
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
    const r = await fetch('/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: q }) });
    const j = await r.json();
    setN8nInfo(j?.data?.n8nAllowed || { prefixes: [], flows: [] });
  }
  const save = async () => {
    try {
      setSaveMessage('');
      setErrors([]);
      
      const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      const response = await fetch('/api/admin/config' + q, { 
        method: 'POST', 
        headers: { 'content-type': 'application/json' }, 
        body: JSON.stringify(cfg) 
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
                <li><a href="/docs/runbooks/canary-rollout-complete.md" target="_blank">Go/No-Go Checklist</a></li>
                <li><a href="/docs/runbooks/rollback-plan.md" target="_blank">Rollback Plan</a></li>
                <li><a href="/docs/safe-mutations/troubleshooting-faq.md" target="_blank">Troubleshooting FAQ</a></li>
                <li><a href="/ops/post-deploy-smoke-tests.sh" target="_blank">Post-Deploy Smoke Tests</a></li>
              </ul>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h3>Monitoring & Observability</h3>
              <ul style={{ lineHeight: '1.8' }}>
                <li><a href="https://grafana.intelgraph.dev/d/safe-mutations" target="_blank">Safe Mutations SLO Dashboard</a></li>
                <li><a href="https://alerts.intelgraph.dev" target="_blank">Alert Manager</a></li>
                <li><a href="https://bull.intelgraph.dev" target="_blank">Worker Queue Status (Bull Board)</a></li>
              </ul>
            </div>
            <div style={{ marginBottom: 24 }}>
              <h3>Emergency Contacts</h3>
              <ul style={{ lineHeight: '1.8' }}>
                <li><strong>SRE On-Call:</strong> @sre-oncall (Slack) | +1-555-SRE-HELP</li>
                <li><strong>Platform Team:</strong> @platform-team (Slack)</li>
                <li><strong>FinOps Team:</strong> @finops-team (budget issues)</li>
                <li><strong>Engineering Manager:</strong> Jane Smith @jane.smith</li>
              </ul>
            </div>
            <div style={{ 
              background: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '4px', 
              padding: '16px',
              marginTop: '24px'
            }}>
              <h4>Common Troubleshooting Commands</h4>
              <pre style={{ 
                background: '#ffffff', 
                padding: '12px', 
                borderRadius: '4px', 
                fontSize: '14px',
                overflow: 'auto'
              }}>
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
                    <input value={tenantId} onChange={(e)=>setTenantId(e.target.value)} placeholder="tenant-id" />
                  </label>
                </div>
                
                {/* Status Messages */}
                {errors.length > 0 && (
                  <div style={{ 
                    background: '#fecaca', 
                    border: '1px solid #f87171', 
                    borderRadius: '4px', 
                    padding: '12px', 
                    marginBottom: '16px' 
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#991b1b' }}>Validation Errors:</h4>
                    <ul style={{ margin: 0, paddingLeft: '16px', color: '#991b1b' }}>
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {saveMessage && (
                  <div style={{ 
                    background: '#dcfce7', 
                    border: '1px solid #22c55e', 
                    borderRadius: '4px', 
                    padding: '12px', 
                    marginBottom: '16px',
                    color: '#166534'
                  }}>
                    {saveMessage}
                  </div>
                )}
                
                {/* Model & AI Configuration */}
                <h3>Model & AI Configuration</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 720, marginBottom: 16 }}>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>MODEL_PROVIDER</span>
                    <select value={cfg.MODEL_PROVIDER || 'openai'} onChange={(e)=>setCfg({ ...cfg, MODEL_PROVIDER: e.target.value })}>
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
                      onChange={(e)=>setCfg({ ...cfg, MODEL_NAME: e.target.value })} 
                      placeholder="e.g., gpt-4-turbo-preview"
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>TEMPERATURE (0.0-1.0)</span>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="1" 
                      value={cfg.TEMPERATURE ?? 0.2} 
                      onChange={(e)=>setCfg({ ...cfg, TEMPERATURE: Number(e.target.value) })} 
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
                      onChange={(e)=>setCfg({ ...cfg, TOP_P: Number(e.target.value) })} 
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>MAX_TOKENS</span>
                    <input 
                      type="number" 
                      min="1" 
                      max="100000" 
                      value={cfg.MAX_TOKENS ?? 4096} 
                      onChange={(e)=>setCfg({ ...cfg, MAX_TOKENS: Number(e.target.value) })} 
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>BUDGET_CAP_USD</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      value={cfg.BUDGET_CAP_USD ?? 10} 
                      onChange={(e)=>setCfg({ ...cfg, BUDGET_CAP_USD: Number(e.target.value) })} 
                    />
                  </label>
                </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 720 }}>
        {Object.keys(cfg || {}).map((k) => (
                    <label key={k} style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{k}</span>
                      {typeof cfg[k] === 'boolean' ? (
                        <input type="checkbox" checked={!!cfg[k]} onChange={(e) => setCfg({ ...cfg, [k]: e.target.checked })} />
                      ) : (
                        <input value={String(cfg[k])} onChange={(e) => setCfg({ ...cfg, [k]: e.target.value })} />
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
          { key: 'help', label: 'Help' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === tab.key ? '#f8f9fa' : 'transparent',
              borderBottom: activeTab === tab.key ? '2px solid #007bff' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? 600 : 400
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 24 }}>
        <h3>n8n Policy (discoverable)</h3>
        <div>
          <strong>Allowed prefixes:</strong> {n8nInfo.prefixes.join(', ') || '—'}
        </div>
        <div style={{ marginTop: 8 }}>
          <strong>Allowed flows:</strong>
          <ul>
            {n8nInfo.flows.map((f) => (
              <li key={f}><code>{f}</code></li>
            ))}
          </ul>
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <h3>n8n Policy (edit)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 720 }}>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600 }}>Allowed Prefixes</span>
            <input value={n8nConfig.allowedPrefixes.join(',')} onChange={(e)=>setN8nConfig({ ...n8nConfig, allowedPrefixes: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600 }}>Denied Prefixes</span>
            <input value={n8nConfig.deniedPrefixes.join(',')} onChange={(e)=>setN8nConfig({ ...n8nConfig, deniedPrefixes: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} />
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input placeholder="integration/flow-key" value={newFlow} onChange={(e)=>setNewFlow(e.target.value)} />
            <button onClick={()=>{ if (newFlow.trim()) { setN8nConfig({ ...n8nConfig, allowedFlows: Array.from(new Set([...(n8nConfig.allowedFlows||[]), newFlow.trim()])) }); setNewFlow(''); } }}>Add Flow</button>
          </div>
          <ul>
            {(n8nConfig.allowedFlows||[]).map((f)=> (
              <li key={f}>
                <code>{f}</code>
                <button style={{ marginLeft: 8 }} onClick={()=> setN8nConfig({ ...n8nConfig, allowedFlows: (n8nConfig.allowedFlows||[]).filter(x=>x!==f) })}>Remove</button>
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
