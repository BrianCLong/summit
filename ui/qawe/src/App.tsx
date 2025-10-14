
import { useEffect, useMemo, useState } from 'react';
import { sign } from '@noble/ed25519';
import type { ApprovalBundle, WorkflowDefinition, WorkflowInstance } from './types';
import { ApprovalRequest, createWorkflow, fetchServerInfo, loadInstance, startInstance, submitApproval } from './api';

const encoder = new TextEncoder();

function collectActiveGates(inst: WorkflowInstance | null): { stageId: string; gateId: string }[] {
  if (!inst) return [];
  const pairs: { stageId: string; gateId: string }[] = [];
  Object.entries(inst.activeStages).forEach(([stageId, stage]) => {
    Object.entries(stage.gates).forEach(([gateId, gate]) => {
      if (!gate.satisfied) {
        if (stage.definition.kind !== 'sequential' || stage.activeGate === gateId) {
          pairs.push({ stageId, gateId });
        }
      }
    });
  });
  return pairs;
}

const sampleWorkflow = `{
  "name": "QAWE Sample Workflow",
  "start": "intake",
  "stages": [
    {
      "id": "intake",
      "kind": "conditional",
      "branches": [
        { "condition": { "field": "risk", "equals": "high" }, "next": ["parallel-review"] }
      ],
      "next": ["fast-track"]
    },
    {
      "id": "parallel-review",
      "kind": "parallel",
      "gates": [
        { "id": "legal", "role": "legal", "quorum": 2, "expirySeconds": 3600 },
        { "id": "security", "role": "security", "quorum": 1, "expirySeconds": 3600, "allowDelegates": true }
      ],
      "next": ["data-owner"]
    },
    {
      "id": "fast-track",
      "kind": "sequential",
      "gates": [
        { "id": "legal-fast", "role": "legal", "quorum": 1, "expirySeconds": 1800 }
      ],
      "next": ["data-owner"]
    },
    {
      "id": "data-owner",
      "kind": "sequential",
      "gates": [
        { "id": "owner", "role": "data-owner", "quorum": 1, "expirySeconds": 7200 }
      ]
    }
  ],
  "policy": {
    "roles": {
      "legal": {
        "id": "legal",
        "name": "Legal Quorum",
        "principals": []
      },
      "security": {
        "id": "security",
        "name": "Security",
        "principals": []
      },
      "data-owner": {
        "id": "data-owner",
        "name": "Data Owner",
        "principals": []
      }
    }
  }
}`;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function decodePrivateKey(base64Key: string): Uint8Array {
  const sanitized = base64Key.trim();
  if (!sanitized) {
    throw new Error('A base64-encoded Ed25519 private key is required.');
  }
  const binary = atob(sanitized);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    buffer[i] = binary.charCodeAt(i);
  }
  if (buffer.length === 32) {
    return buffer;
  }
  if (buffer.length === 64) {
    return buffer.slice(0, 32);
  }
  throw new Error('Private key must decode to 32 or 64 bytes.');
}

function canonicalMessage(instanceId: string, stageId: string, gateId: string, actorId: string, delegatedFrom: string, nanos: bigint): string {
  return `${instanceId}|${stageId}|${gateId}|${actorId}|${delegatedFrom}|${nanos}`;
}

interface StatusMessage {
  tone: 'success' | 'error';
  message: string;
}

const emptyApproval = {
  stageId: '',
  gateId: '',
  actorId: '',
  delegatedFrom: '',
  privateKey: ''
};

const emptyContext = `{
  "risk": "high"
}`;

function App() {
  const [serverKey, setServerKey] = useState<string>('');
  const [workflowInput, setWorkflowInput] = useState<string>(sampleWorkflow);
  const [contextInput, setContextInput] = useState<string>(emptyContext);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowDefinition | null>(null);
  const [workflowIdInput, setWorkflowIdInput] = useState<string>('');
  const [instanceIdInput, setInstanceIdInput] = useState<string>('');
  const [instance, setInstance] = useState<WorkflowInstance | null>(null);
  const [approvalForm, setApprovalForm] = useState({ ...emptyApproval });
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchServerInfo()
      .then((info) => setServerKey(info.serverPublicKey))
      .catch((err) => setStatus({ tone: 'error', message: `Failed to load server info: ${err.message}` }));
  }, []);

  const activeGates = useMemo(() => collectActiveGates(instance), [instance]);

  const handleCreateWorkflow = async () => {
    setStatus(null);
    try {
      const parsed = JSON.parse(workflowInput) as WorkflowDefinition;
      setLoading(true);
      const created = await createWorkflow(parsed);
      setCurrentWorkflow(created);
      setWorkflowIdInput(created.id ?? '');
      setStatus({ tone: 'success', message: `Workflow created with id ${created.id}` });
    } catch (err) {
      setStatus({ tone: 'error', message: `Unable to create workflow: ${(err as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleStartInstance = async () => {
    if (!workflowIdInput) {
      setStatus({ tone: 'error', message: 'Workflow ID is required to start an instance.' });
      return;
    }
    setStatus(null);
    try {
      const context = contextInput ? (JSON.parse(contextInput) as Record<string, string>) : {};
      setLoading(true);
      const created = await startInstance(workflowIdInput, context);
      setInstance(created);
      setInstanceIdInput(created.id);
      setStatus({ tone: 'success', message: `Instance ${created.id} started.` });
      const gates = collectActiveGates(created);
      if (gates[0]) {
        setApprovalForm((prev) => ({ ...prev, stageId: gates[0].stageId, gateId: gates[0].gateId }));
      }
    } catch (err) {
      setStatus({ tone: 'error', message: `Unable to start instance: ${(err as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadInstance = async (id: string) => {
    if (!id) {
      setStatus({ tone: 'error', message: 'Instance ID is required to load state.' });
      return;
    }
    setStatus(null);
    try {
      setLoading(true);
      const loaded = await loadInstance(id);
      setInstance(loaded);
      const gates = collectActiveGates(loaded);
      if (gates[0]) {
        setApprovalForm((prev) => ({ ...prev, stageId: gates[0].stageId, gateId: gates[0].gateId }));
      }
      setStatus({ tone: 'success', message: `Instance ${loaded.id} state refreshed.` });
    } catch (err) {
      setStatus({ tone: 'error', message: `Unable to load instance: ${(err as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalSubmit = async () => {
    if (!instance) {
      setStatus({ tone: 'error', message: 'Load an instance before submitting approvals.' });
      return;
    }
    const { stageId, gateId, actorId, delegatedFrom, privateKey } = approvalForm;
    if (!stageId || !gateId || !actorId || !privateKey) {
      setStatus({ tone: 'error', message: 'Stage, gate, actor, and private key are required.' });
      return;
    }
    setStatus(null);
    try {
      const seed = decodePrivateKey(privateKey);
      const issuedAt = new Date();
      const nanos = BigInt(issuedAt.getTime()) * 1_000_000n;
      const message = canonicalMessage(instance.id, stageId, gateId, actorId, delegatedFrom ?? '', nanos);
      const signature = await sign(encoder.encode(message), seed);
      const payload: ApprovalRequest = {
        stageId,
        gateId,
        actorId,
        delegatedFrom: delegatedFrom ? delegatedFrom : undefined,
        signature: toBase64(signature),
        signedAt: issuedAt.toISOString()
      };
      setLoading(true);
      const response = await submitApproval(instance.id, payload);
      let info = 'Approval recorded.';
      if ((response as ApprovalBundle).gateId) {
        info = `Gate ${stageId}/${gateId} reached quorum.`;
      }
      const updated = await loadInstance(instance.id);
      setInstance(updated);
      setStatus({ tone: 'success', message: info });
    } catch (err) {
      setStatus({ tone: 'error', message: `Approval failed: ${(err as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const renderBundles = (bundles: ApprovalBundle[]) => {
    if (bundles.length === 0) {
      return <p>No approval bundles issued yet.</p>;
    }
    return (
      <div className="form-grid">
        {bundles.map((bundle) => (
          <section key={`${bundle.stageId}-${bundle.gateId}-${bundle.issuedAt}`}>
            <h3>
              Bundle for stage <strong>{bundle.stageId}</strong> / gate <strong>{bundle.gateId}</strong>
            </h3>
            <p className="badge">Quorum {bundle.quorum}</p>
            <p>Issued: {new Date(bundle.issuedAt).toLocaleString()}</p>
            <pre>{JSON.stringify(bundle, null, 2)}</pre>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className="container">
      <h1>Quorum Approval Workflow Engine</h1>
      <p>
        Server public key: <code>{serverKey || 'loading...'}</code>
      </p>

      {status && (
        <section style={{ border: status.tone === 'success' ? '1px solid #22c55e' : '1px solid #f87171' }}>
          <strong>{status.tone === 'success' ? 'Success' : 'Error'}:</strong> {status.message}
        </section>
      )}

      <section>
        <h2>1. Define Workflow</h2>
        <p>Paste a workflow definition including policy participants. Create operations to persist and receive the workflow id.</p>
        <textarea
          rows={16}
          value={workflowInput}
          onChange={(event) => setWorkflowInput(event.target.value)}
        />
        <div className="flex-row" style={{ marginTop: '1rem' }}>
          <button onClick={handleCreateWorkflow} disabled={loading}>
            Create / Update Workflow
          </button>
          <div>
            <label htmlFor="workflow-id">Workflow ID</label>
            <input
              id="workflow-id"
              value={workflowIdInput}
              onChange={(event) => setWorkflowIdInput(event.target.value)}
              placeholder="workflow identifier"
            />
          </div>
        </div>
      </section>

      <section>
        <h2>2. Start or Load Instance</h2>
        <div className="form-grid">
          <div>
            <label htmlFor="context-json">Context JSON</label>
            <textarea
              id="context-json"
              rows={6}
              value={contextInput}
              onChange={(event) => setContextInput(event.target.value)}
            />
            <button style={{ marginTop: '0.75rem' }} onClick={handleStartInstance} disabled={loading}>
              Start Instance
            </button>
          </div>
          <div>
            <label htmlFor="instance-id">Instance ID</label>
            <input
              id="instance-id"
              value={instanceIdInput}
              onChange={(event) => setInstanceIdInput(event.target.value)}
              placeholder="instance identifier"
            />
            <button style={{ marginTop: '0.75rem' }} onClick={() => handleLoadInstance(instanceIdInput)} disabled={loading}>
              Load Instance
            </button>
          </div>
        </div>
        {instance && (
          <div style={{ marginTop: '1rem' }}>
            <h3>Instance Snapshot</h3>
            <p>
              Status: <strong>{instance.status}</strong> | Created {new Date(instance.createdAt).toLocaleString()} | Updated{' '}
              {new Date(instance.updatedAt).toLocaleString()}
            </p>
            <details>
              <summary>View raw instance payload</summary>
              <pre>{JSON.stringify(instance, null, 2)}</pre>
            </details>
          </div>
        )}
      </section>

      <section>
        <h2>3. Submit Approval</h2>
        <div className="form-grid">
          <div className="flex-row">
            <div>
              <label htmlFor="stage-id">Stage ID</label>
              <input
                id="stage-id"
                value={approvalForm.stageId}
                onChange={(event) => setApprovalForm((prev) => ({ ...prev, stageId: event.target.value }))}
                placeholder="stage-identifier"
                list="active-stages"
              />
            </div>
            <div>
              <label htmlFor="gate-id">Gate ID</label>
              <input
                id="gate-id"
                value={approvalForm.gateId}
                onChange={(event) => setApprovalForm((prev) => ({ ...prev, gateId: event.target.value }))}
                placeholder="gate-identifier"
                list="active-gates"
              />
            </div>
          </div>
          <div className="flex-row">
            <div>
              <label htmlFor="actor-id">Actor ID</label>
              <input
                id="actor-id"
                value={approvalForm.actorId}
                onChange={(event) => setApprovalForm((prev) => ({ ...prev, actorId: event.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="delegated-from">Delegated From</label>
              <input
                id="delegated-from"
                value={approvalForm.delegatedFrom}
                onChange={(event) => setApprovalForm((prev) => ({ ...prev, delegatedFrom: event.target.value }))}
                placeholder="optional principal id"
              />
            </div>
          </div>
          <div>
            <label htmlFor="private-key">Signer Private Key (base64)</label>
            <textarea
              id="private-key"
              rows={4}
              value={approvalForm.privateKey}
              onChange={(event) => setApprovalForm((prev) => ({ ...prev, privateKey: event.target.value }))}
            />
          </div>
          <button onClick={handleApprovalSubmit} disabled={loading || !instance}>
            Submit Approval
          </button>
        </div>
        <datalist id="active-stages">
          {activeGates.map((pair) => (
            <option key={`stage-${pair.stageId}`} value={pair.stageId} />
          ))}
        </datalist>
        <datalist id="active-gates">
          {activeGates.map((pair) => (
            <option key={`gate-${pair.stageId}-${pair.gateId}`} value={pair.gateId} />
          ))}
        </datalist>
      </section>

      <section>
        <h2>4. Approval Bundles</h2>
        {instance ? renderBundles(instance.approvalBundles) : <p>Load an instance to view signed bundles.</p>}
      </section>
    </div>
  );
}

export default App;
