import React from 'react';

type ValidationType = 'model' | 'tool' | 'route' | 'artifact';

interface TimelineEntry {
  action: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

interface RollbackPlan {
  steps: string[];
  ready: boolean;
  initiatedBy: string;
  generatedAt: string;
}

interface ECCStatus {
  disabled: {
    models: string[];
    tools: string[];
    routes: string[];
  };
  quarantinedArtifacts: string[];
  blocklist: string[];
  cachePurges: string[];
  activeActions: string[];
}

const parseList = (input: string): string[] =>
  input
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const BadgeList: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <div style={{ marginBottom: 16 }}>
    <strong>{title}</strong>
    {items.length === 0 ? (
      <div style={{ color: '#64748b', fontSize: 14 }}>None</div>
    ) : (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {items.map((item) => (
          <span
            key={item}
            style={{
              background: '#e2e8f0',
              borderRadius: 999,
              padding: '4px 12px',
              fontSize: 13,
            }}
          >
            {item}
          </span>
        ))}
      </div>
    )}
  </div>
);

const EmergencyContainmentPanel: React.FC = () => {
  const [modelsInput, setModelsInput] = React.useState('');
  const [toolsInput, setToolsInput] = React.useState('');
  const [routesInput, setRoutesInput] = React.useState('');
  const [artifactsInput, setArtifactsInput] = React.useState('');
  const [blocklistInput, setBlocklistInput] = React.useState('');
  const [cacheInput, setCacheInput] = React.useState('');
  const [initiatedBy, setInitiatedBy] = React.useState('sec-ops');
  const [reason, setReason] = React.useState('Emergency containment');
  const [slaMs, setSlaMs] = React.useState(500);

  const [status, setStatus] = React.useState<ECCStatus | null>(null);
  const [timeline, setTimeline] = React.useState<TimelineEntry[]>([]);
  const [signature, setSignature] = React.useState<string>('');
  const [rollbackPlan, setRollbackPlan] = React.useState<RollbackPlan | null>(null);
  const [rollbackTimeline, setRollbackTimeline] = React.useState<TimelineEntry[]>([]);
  const [rollbackSignature, setRollbackSignature] = React.useState('');
  const [lastActionId, setLastActionId] = React.useState<string | null>(null);
  const [slaMet, setSlaMet] = React.useState<boolean | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const [validationType, setValidationType] = React.useState<ValidationType>('artifact');
  const [validationName, setValidationName] = React.useState('');
  const [validationOutcome, setValidationOutcome] = React.useState<string>('');

  const refreshStatus = React.useCallback(async () => {
    try {
      const response = await fetch('/api/ecc/status');
      const payload = await response.json();
      if (payload?.ok) {
        setStatus(payload.status as ECCStatus);
      }
    } catch (err) {
      console.error('Failed to fetch ECC status', err);
    }
  }, []);

  React.useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const executeKillPlan = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    setRollbackTimeline([]);
    setRollbackSignature('');

    const payload = {
      initiatedBy,
      reason,
      slaMs,
      models: parseList(modelsInput),
      tools: parseList(toolsInput),
      routes: parseList(routesInput),
      artifacts: parseList(artifactsInput),
      policy: {
        blocklist: parseList(blocklistInput),
        cachePurge: parseList(cacheInput),
      },
    };

    try {
      const response = await fetch('/api/ecc/actions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok || body?.ok === false) {
        throw new Error(body?.error || 'Failed to execute emergency kill plan');
      }

      setTimeline(body.timeline || []);
      setSignature(body.signature || '');
      setRollbackPlan(body.rollbackPlan || null);
      setLastActionId(body.actionId || null);
      setSlaMet(Boolean(body.slaMet));
      setMessage(`Kill plan ${body.actionId} executed at ${new Date().toLocaleTimeString()}`);
      await refreshStatus();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const executeRollback = async () => {
    const target = lastActionId ?? status?.activeActions?.[status.activeActions.length - 1];
    if (!target) {
      setError('No ECC action available to rollback. Execute a kill plan first.');
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const response = await fetch('/api/ecc/rollback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actionId: target, initiatedBy }),
      });
      const body = await response.json();
      if (!response.ok || body?.ok === false) {
        throw new Error(body?.error || 'Rollback failed');
      }

      setRollbackTimeline(body.timeline || []);
      setRollbackSignature(body.signature || '');
      setMessage(`Rollback executed for ${target}`);
      setLastActionId(null);
      await refreshStatus();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const validateEntry = async () => {
    setValidationOutcome('');
    if (!validationName.trim()) {
      setValidationOutcome('Provide a name to validate.');
      return;
    }

    try {
      const response = await fetch('/api/ecc/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: validationType, name: validationName }),
      });
      const body = await response.json();
      if (body?.ok) {
        setValidationOutcome(body.allowed ? 'Allowed — safe to use' : `Blocked (${body.reason || 'policy'})`);
      } else {
        setValidationOutcome(body?.error || 'Validation failed');
      }
    } catch (err) {
      setValidationOutcome((err as Error).message);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 960 }}>
      <h2>Emergency Containment Controller (ECC)</h2>
      <p style={{ color: '#475569', maxWidth: 720 }}>
        Trigger an immediate kill-and-quarantine workflow across models, tools, and ingress routes. ECC drains traffic,
        quarantines artifacts, applies compensating policies, and prepares a signed rollback plan.
      </p>

      {error && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #ef4444',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          style={{
            background: '#dcfce7',
            border: '1px solid #22c55e',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            color: '#166534',
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span>Initiated By</span>
          <input value={initiatedBy} onChange={(e) => setInitiatedBy(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span>Reason</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span>SLA (ms)</span>
          <input
            type="number"
            min={100}
            value={slaMs}
            onChange={(e) => setSlaMs(Number(e.target.value) || 500)}
          />
        </label>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span>Models to disable</span>
          <textarea
            rows={3}
            placeholder="gpt-4-turbo\nclaude-3-opus"
            value={modelsInput}
            onChange={(e) => setModelsInput(e.target.value)}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span>Tools to disable</span>
          <textarea
            rows={3}
            placeholder="vector-search\nweb-browse"
            value={toolsInput}
            onChange={(e) => setToolsInput(e.target.value)}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span>Routes to drain</span>
          <textarea
            rows={3}
            placeholder="/api/ai/completions\n/api/tools/graph"
            value={routesInput}
            onChange={(e) => setRoutesInput(e.target.value)}
          />
        </label>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span>Artifacts to quarantine</span>
          <textarea
            rows={3}
            placeholder="run-123\nagent-record-42"
            value={artifactsInput}
            onChange={(e) => setArtifactsInput(e.target.value)}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span>Policy blocklist entries</span>
          <textarea
            rows={3}
            placeholder="retrieval-plugin"
            value={blocklistInput}
            onChange={(e) => setBlocklistInput(e.target.value)}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span>Cache purges</span>
          <textarea
            rows={3}
            placeholder="/cache/ai/completions"
            value={cacheInput}
            onChange={(e) => setCacheInput(e.target.value)}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <button onClick={executeKillPlan} disabled={loading} style={{ padding: '10px 18px' }}>
          {loading ? 'Executing…' : 'Execute Emergency Kill'}
        </button>
        <button onClick={executeRollback} disabled={loading} style={{ padding: '10px 18px' }}>
          Trigger Rollback
        </button>
        {slaMet !== null && (
          <span style={{ alignSelf: 'center', color: slaMet ? '#15803d' : '#b91c1c' }}>
            {slaMet ? 'Propagation within SLA' : 'Propagation exceeded SLA'}
          </span>
        )}
      </div>

      {timeline.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3>Signed Action Timeline</h3>
          <p style={{ fontSize: 13, color: '#475569' }}>Signature: {signature}</p>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc', textAlign: 'left' }}>
                <tr>
                  <th style={{ padding: 12 }}>Action</th>
                  <th style={{ padding: 12 }}>Timestamp</th>
                  <th style={{ padding: 12 }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((entry) => (
                  <tr key={`${entry.action}-${entry.timestamp}`}>
                    <td style={{ padding: 12, borderTop: '1px solid #e2e8f0' }}>{entry.action}</td>
                    <td style={{ padding: 12, borderTop: '1px solid #e2e8f0' }}>{entry.timestamp}</td>
                    <td style={{ padding: 12, borderTop: '1px solid #e2e8f0', fontSize: 13 }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {JSON.stringify(entry.details ?? {}, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rollbackPlan && (
        <div style={{ marginBottom: 32 }}>
          <h3>Automated Rollback Plan</h3>
          <p style={{ fontSize: 13, color: '#475569' }}>Generated at {rollbackPlan.generatedAt}</p>
          <ol style={{ paddingLeft: 20, color: '#334155' }}>
            {rollbackPlan.steps.map((step, index) => (
              <li key={index} style={{ marginBottom: 8 }}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {rollbackTimeline.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3>Rollback Execution</h3>
          <p style={{ fontSize: 13, color: '#475569' }}>Signature: {rollbackSignature}</p>
          <ul style={{ paddingLeft: 20, color: '#334155' }}>
            {rollbackTimeline.map((entry) => (
              <li key={`${entry.action}-${entry.timestamp}`}>
                <strong>{entry.action}</strong> — {entry.timestamp}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginBottom: 32 }}>
        <h3>Current State</h3>
        {status ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <BadgeList title="Disabled models" items={status.disabled.models} />
            <BadgeList title="Disabled tools" items={status.disabled.tools} />
            <BadgeList title="Disabled routes" items={status.disabled.routes} />
            <BadgeList title="Quarantined artifacts" items={status.quarantinedArtifacts} />
            <BadgeList title="Blocklist" items={status.blocklist} />
            <BadgeList title="Cache purges" items={status.cachePurges} />
            <BadgeList title="Active actions" items={status.activeActions} />
          </div>
        ) : (
          <div style={{ color: '#64748b' }}>Loading status…</div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 24 }}>
        <h3>Validate Access</h3>
        <p style={{ fontSize: 13, color: '#475569' }}>
          Confirm whether a model, tool, route, or artifact is currently blocked by ECC.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={validationType} onChange={(e) => setValidationType(e.target.value as ValidationType)}>
            <option value="artifact">Artifact</option>
            <option value="model">Model</option>
            <option value="tool">Tool</option>
            <option value="route">Route</option>
          </select>
          <input
            style={{ flex: '1 1 240px' }}
            placeholder="Identifier to check"
            value={validationName}
            onChange={(e) => setValidationName(e.target.value)}
          />
          <button onClick={validateEntry} style={{ padding: '8px 16px' }}>
            Validate
          </button>
          {validationOutcome && <span style={{ color: '#0f172a' }}>{validationOutcome}</span>}
        </div>
      </div>
    </div>
  );
};

export default EmergencyContainmentPanel;

