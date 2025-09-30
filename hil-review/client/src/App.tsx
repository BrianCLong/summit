import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Actor, createClient } from './api';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

type Role = 'admin' | 'reviewer' | 'auditor';

type Evidence = {
  id: string;
  label: string;
  description: string;
  url: string | null;
  addedAt: string;
  addedBy: Actor;
};

type DecisionEntry = {
  id: string;
  actor: Actor;
  decision: 'approve' | 'deny';
  comment: string;
  timestamp: string;
};

type PolicySuggestion = {
  id: string;
  summary: string;
  rationale: string;
  createdAt: string;
  createdBy: Actor;
  status: string;
};

type Appeal = {
  id: string;
  title: string;
  description: string;
  submittedBy: string;
  metadata: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
  evidence: Evidence[];
  approvals: DecisionEntry[];
  policySuggestions: PolicySuggestion[];
};

type PolicyProposal = {
  id: string;
  title: string;
  summary: string;
  relatedAppealId: string | null;
  createdAt: string;
  createdBy: Actor;
  status: string;
  decisions: {
    id: string;
    actor: Actor;
    disposition: 'advance' | 'reject';
    comment: string;
    timestamp: string;
  }[];
};

type AuditEntry = {
  id: string;
  timestamp: string;
  actor: Actor;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
};

const defaultUser: Actor = {
  id: 'reviewer-1',
  name: 'Reviewer One',
  role: 'reviewer'
};

const formatDate = (iso: string) => new Date(iso).toLocaleString();

export default function App() {
  const [actor, setActor] = useState<Actor>(defaultUser);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [selectedAppealId, setSelectedAppealId] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [policyProposals, setPolicyProposals] = useState<PolicyProposal[]>([]);
  const [newAppeal, setNewAppeal] = useState({ title: '', description: '', submittedBy: '' });
  const [evidenceForm, setEvidenceForm] = useState({ label: '', description: '', url: '' });
  const [decisionComment, setDecisionComment] = useState('');
  const [policySuggestion, setPolicySuggestion] = useState({ summary: '', rationale: '' });
  const [proposalForm, setProposalForm] = useState({ title: '', summary: '' });
  const [exported, setExported] = useState('');
  const [importInput, setImportInput] = useState('');
  const [status, setStatus] = useState('');
  const [focusTarget, setFocusTarget] = useState<'newAppeal' | 'evidence' | 'policy' | null>(null);

  const client = useMemo(() => createClient(actor), [actor]);

  const evidenceRef = useRef<HTMLInputElement>(null);
  const newAppealRef = useRef<HTMLInputElement>(null);
  const policyRef = useRef<HTMLInputElement>(null);

  const selectedAppeal = useMemo(
    () => appeals.find((item) => item.id === selectedAppealId) ?? null,
    [appeals, selectedAppealId]
  );

  useEffect(() => {
    if (!selectedAppeal && appeals.length > 0) {
      setSelectedAppealId(appeals[0].id);
    }
  }, [appeals, selectedAppeal]);

  const refreshAppeals = useCallback(async () => {
    try {
      const [{ data: appealsResponse }, { data: auditResponse }, { data: policyResponse }] =
        await Promise.all([
          client.get('/appeals'),
          client.get('/audit-log'),
          client.get('/policy-proposals')
        ]);
      setAppeals(appealsResponse.appeals ?? []);
      setAuditLog(auditResponse.logs ?? []);
      setPolicyProposals(policyResponse.proposals ?? []);
    } catch (error) {
      setStatus('Unable to refresh data. Check server logs.');
    }
  }, [client]);

  useEffect(() => {
    refreshAppeals();
  }, [refreshAppeals]);

  useEffect(() => {
    if (focusTarget === 'evidence') {
      evidenceRef.current?.focus();
    }
    if (focusTarget === 'newAppeal') {
      newAppealRef.current?.focus();
    }
    if (focusTarget === 'policy') {
      policyRef.current?.focus();
    }
    if (focusTarget) {
      setFocusTarget(null);
    }
  }, [focusTarget]);

  const moveSelection = useCallback(
    (direction: number) => {
      if (appeals.length === 0) return;
      const currentIndex = appeals.findIndex((item) => item.id === selectedAppealId);
      const nextIndex =
        currentIndex === -1 ? 0 : Math.max(0, Math.min(appeals.length - 1, currentIndex + direction));
      setSelectedAppealId(appeals[nextIndex].id);
    },
    [appeals, selectedAppealId]
  );

  const handleDecision = useCallback(
    async (decision: 'approve' | 'deny') => {
      if (!selectedAppeal) return;
      if (!['admin', 'reviewer'].includes(actor.role)) {
        setStatus('Only admins and reviewers can register decisions.');
        return;
      }

      try {
        await client.post(`/appeals/${selectedAppeal.id}/decision`, {
          decision,
          comment: decisionComment
        });
        setDecisionComment('');
        setStatus(`Recorded ${decision} decision. Dual-control enforced.`);
        await refreshAppeals();
      } catch (error: any) {
        setStatus(error?.response?.data?.error ?? 'Unable to record decision.');
      }
    },
    [actor.role, client, decisionComment, refreshAppeals, selectedAppeal]
  );

  const handleExport = useCallback(async () => {
    try {
      const { data } = await client.get('/export');
      setExported(JSON.stringify(data, null, 2));
      setStatus('Export ready. Use Shift+E anytime to refresh export.');
    } catch (error: any) {
      setStatus(error?.response?.data?.error ?? 'Unable to export.');
    }
  }, [client]);

  const shortcuts = useMemo(
    () => ({
      j: () => moveSelection(1),
      k: () => moveSelection(-1),
      n: () => setFocusTarget('newAppeal'),
      e: () => setFocusTarget('evidence'),
      p: () => setFocusTarget('policy'),
      a: () => handleDecision('approve'),
      x: () => handleDecision('deny'),
      'Shift+E': () => handleExport()
    }),
    [handleDecision, handleExport, moveSelection]
  );

  useKeyboardShortcuts(shortcuts, { enabled: true });

  const handleRoleChange = (role: Role) => {
    setActor((prev) => ({ ...prev, role }));
  };

  const handleCreateAppeal = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await client.post('/appeals', {
        title: newAppeal.title,
        description: newAppeal.description,
        submittedBy: newAppeal.submittedBy
      });
      setNewAppeal({ title: '', description: '', submittedBy: '' });
      setStatus('Appeal submitted and queued.');
      await refreshAppeals();
    } catch (error: any) {
      setStatus(error?.response?.data?.error ?? 'Unable to create appeal.');
    }
  };

  const handleQueueAppeal = async () => {
    if (!selectedAppeal) return;
    try {
      await client.post(`/appeals/${selectedAppeal.id}/queue`);
      setStatus('Appeal moved to triage queue.');
      await refreshAppeals();
    } catch (error: any) {
      setStatus(error?.response?.data?.error ?? 'Unable to update queue.');
    }
  };

  const handleAddEvidence = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedAppeal) return;
    try {
      await client.post(`/appeals/${selectedAppeal.id}/evidence`, evidenceForm);
      setEvidenceForm({ label: '', description: '', url: '' });
      setStatus('Evidence attached.');
      await refreshAppeals();
    } catch (error: any) {
      setStatus(error?.response?.data?.error ?? 'Unable to attach evidence.');
    }
  };

  const handleAddSuggestion = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedAppeal) return;
    try {
      await client.post(`/appeals/${selectedAppeal.id}/policy-suggestions`, policySuggestion);
      setPolicySuggestion({ summary: '', rationale: '' });
      setStatus('Policy suggestion submitted.');
      await refreshAppeals();
    } catch (error: any) {
      setStatus(error?.response?.data?.error ?? 'Unable to submit policy suggestion.');
    }
  };

  const handlePolicyProposal = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await client.post('/policy-proposals', {
        ...proposalForm,
        relatedAppealId: selectedAppeal?.id ?? null
      });
      setProposalForm({ title: '', summary: '' });
      setStatus('Policy change proposal recorded.');
      await refreshAppeals();
    } catch (error: any) {
      setStatus(error?.response?.data?.error ?? 'Unable to record policy proposal.');
    }
  };

  const handlePolicyDecision = async (proposal: PolicyProposal, disposition: 'advance' | 'reject') => {
    try {
      await client.post(`/policy-proposals/${proposal.id}/decision`, {
        disposition,
        comment: ''
      });
      setStatus(`Policy proposal ${disposition}.`);
      await refreshAppeals();
    } catch (error: any) {
      setStatus(error?.response?.data?.error ?? 'Unable to evaluate proposal.');
    }
  };

  const handleImport = async () => {
    if (!importInput.trim()) return;
    try {
      const payload = JSON.parse(importInput);
      await client.post('/import', payload);
      setStatus('Import successful. State rehydrated.');
      setImportInput('');
      await refreshAppeals();
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        setStatus('Import payload is not valid JSON.');
        return;
      }
      setStatus(error?.response?.data?.error ?? 'Unable to import payload.');
    }
  };

  const queue = useMemo(
    () => appeals.filter((appeal) => ['pending', 'queued'].includes(appeal.status)),
    [appeals]
  );

  return (
    <div className="app-shell">
      <section className="panel" style={{ gridColumn: '1 / span 1', gridRow: '1 / span 2' }}>
        <header className="section">
          <h2>Appeals Queue</h2>
          <p className="shortcut-hint">
            <kbd>j</kbd>/<kbd>k</kbd> navigate · <kbd>n</kbd> new · <kbd>a</kbd>/<kbd>x</kbd> approve/deny
          </p>
        </header>
        <div className="section">
          <label htmlFor="role">Active role</label>
          <div className="form-row">
            <select
              id="role"
              value={actor.role}
              onChange={(event) => handleRoleChange(event.target.value as Role)}
            >
              <option value="admin">Admin</option>
              <option value="reviewer">Reviewer</option>
              <option value="auditor">Auditor</option>
            </select>
            <input
              placeholder="User ID"
              value={actor.id}
              onChange={(event) => setActor((prev) => ({ ...prev, id: event.target.value }))}
            />
          </div>
          <input
            placeholder="Display name"
            value={actor.name}
            onChange={(event) => setActor((prev) => ({ ...prev, name: event.target.value }))}
            style={{ marginTop: 8 }}
          />
        </div>
        <div className="queue-list">
          {queue.map((item) => (
            <button
              key={item.id}
              className={`queue-item ${item.id === selectedAppealId ? 'active' : ''}`}
              onClick={() => setSelectedAppealId(item.id)}
            >
              <div className={`badge ${item.status}`}>{item.status}</div>
              <h3>{item.title}</h3>
              <p>{item.description.slice(0, 80)}</p>
              <small>Submitted by {item.submittedBy}</small>
            </button>
          ))}
          {queue.length === 0 && <p>No items in queue. Capture appeals to begin triage.</p>}
        </div>
      </section>

      <section className="panel" style={{ gridColumn: '2 / span 1' }}>
        <div className="section">
          <h2>Submit new appeal</h2>
          <form onSubmit={handleCreateAppeal}>
            <input
              ref={newAppealRef}
              placeholder="Appeal title"
              value={newAppeal.title}
              onChange={(event) => setNewAppeal((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
            <textarea
              placeholder="Describe the request, impacted policies, and key context"
              value={newAppeal.description}
              onChange={(event) =>
                setNewAppeal((prev) => ({ ...prev, description: event.target.value }))
              }
              required
              style={{ marginTop: 8 }}
            />
            <input
              placeholder="Submitted by"
              value={newAppeal.submittedBy}
              onChange={(event) =>
                setNewAppeal((prev) => ({ ...prev, submittedBy: event.target.value }))
              }
              required
              style={{ marginTop: 8 }}
            />
            <div className="button-row" style={{ marginTop: 12 }}>
              <button className="button-primary" type="submit">
                Capture appeal
              </button>
              <button
                className="button-secondary"
                type="button"
                onClick={() => setNewAppeal({ title: '', description: '', submittedBy: '' })}
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {selectedAppeal ? (
          <div className="section">
            <div className="section-header">
              <h2>Appeal detail</h2>
              <div className={`badge ${selectedAppeal.status}`}>{selectedAppeal.status}</div>
            </div>
            <h3>{selectedAppeal.title}</h3>
            <p>{selectedAppeal.description}</p>
            <p>
              <strong>Submitted by:</strong> {selectedAppeal.submittedBy}
            </p>
            <p>
              <strong>Created:</strong> {formatDate(selectedAppeal.createdAt)} · <strong>Updated:</strong>{' '}
              {formatDate(selectedAppeal.updatedAt)}
            </p>
            <div className="button-row">
              <button className="button-secondary" onClick={handleQueueAppeal}>
                Send to queue
              </button>
            </div>

            <div className="section" style={{ marginTop: 16 }}>
              <h3>Evidence attachments</h3>
              <form onSubmit={handleAddEvidence}>
                <input
                  ref={evidenceRef}
                  placeholder="Label"
                  value={evidenceForm.label}
                  onChange={(event) =>
                    setEvidenceForm((prev) => ({ ...prev, label: event.target.value }))
                  }
                  required
                />
                <textarea
                  placeholder="Describe supporting signals"
                  value={evidenceForm.description}
                  onChange={(event) =>
                    setEvidenceForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  style={{ marginTop: 8 }}
                />
                <input
                  placeholder="Link (optional)"
                  value={evidenceForm.url}
                  onChange={(event) => setEvidenceForm((prev) => ({ ...prev, url: event.target.value }))}
                  style={{ marginTop: 8 }}
                />
                <button className="button-secondary" type="submit" style={{ marginTop: 8 }}>
                  Attach evidence
                </button>
              </form>
              <ul>
                {selectedAppeal.evidence.map((item) => (
                  <li key={item.id}>
                    <strong>{item.label}</strong> — added {formatDate(item.addedAt)} by {item.addedBy.name}{' '}
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noreferrer">
                        evidence link
                      </a>
                    )}
                    <p>{item.description}</p>
                  </li>
                ))}
                {selectedAppeal.evidence.length === 0 && <p>No evidence captured yet.</p>}
              </ul>
            </div>

            <div className="section">
              <h3>Decision log</h3>
              <textarea
                placeholder="Decision context (stores with your approval/denial)"
                value={decisionComment}
                onChange={(event) => setDecisionComment(event.target.value)}
              />
              <div className="button-row" style={{ marginTop: 8 }}>
                <button className="button-primary" type="button" onClick={() => handleDecision('approve')}>
                  Approve (dual-control)
                </button>
                <button className="button-secondary" type="button" onClick={() => handleDecision('deny')}>
                  Deny (dual-control)
                </button>
              </div>
              <ul>
                {selectedAppeal.approvals.map((entry) => (
                  <li key={entry.id}>
                    <strong>{entry.actor.name}</strong> {entry.decision} — {formatDate(entry.timestamp)}
                    {entry.comment && <p>{entry.comment}</p>}
                  </li>
                ))}
                {selectedAppeal.approvals.length === 0 && <p>No decisions recorded.</p>}
              </ul>
            </div>

            <div className="section">
              <h3>Policy suggestions</h3>
              <form onSubmit={handleAddSuggestion}>
                <input
                  ref={policyRef}
                  placeholder="Summary"
                  value={policySuggestion.summary}
                  onChange={(event) =>
                    setPolicySuggestion((prev) => ({ ...prev, summary: event.target.value }))
                  }
                  required
                />
                <textarea
                  placeholder="Rationale"
                  value={policySuggestion.rationale}
                  onChange={(event) =>
                    setPolicySuggestion((prev) => ({ ...prev, rationale: event.target.value }))
                  }
                  style={{ marginTop: 8 }}
                />
                <button className="button-secondary" type="submit" style={{ marginTop: 8 }}>
                  Capture suggestion
                </button>
              </form>
              <ul>
                {selectedAppeal.policySuggestions.map((item) => (
                  <li key={item.id}>
                    <strong>{item.summary}</strong> — proposed by {item.createdBy.name} on{' '}
                    {formatDate(item.createdAt)}
                    <p>{item.rationale}</p>
                  </li>
                ))}
                {selectedAppeal.policySuggestions.length === 0 && <p>No policy suggestions yet.</p>}
              </ul>
            </div>
          </div>
        ) : (
          <p>Select an appeal from the queue to begin reviewing.</p>
        )}
      </section>

      <section className="panel" style={{ gridColumn: '3 / span 1', gridRow: '1 / span 2' }}>
        <div className="section">
          <h2>Policy change proposals</h2>
          <form onSubmit={handlePolicyProposal}>
            <input
              placeholder="Proposal title"
              value={proposalForm.title}
              onChange={(event) => setProposalForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
            <textarea
              placeholder="Summary of proposed change"
              value={proposalForm.summary}
              onChange={(event) =>
                setProposalForm((prev) => ({ ...prev, summary: event.target.value }))
              }
              required
              style={{ marginTop: 8 }}
            />
            <button className="button-secondary" type="submit" style={{ marginTop: 8 }}>
              Submit policy proposal
            </button>
          </form>
          <div style={{ marginTop: 16 }}>
            {policyProposals.map((proposal) => (
              <div className="policy-card" key={proposal.id}>
                <div className="section-header">
                  <h3>{proposal.title}</h3>
                  <span className={`badge ${proposal.status}`}>{proposal.status}</span>
                </div>
                <p>{proposal.summary}</p>
                {proposal.relatedAppealId && (
                  <p>
                    Related appeal: <code>{proposal.relatedAppealId}</code>
                  </p>
                )}
                <p>
                  Introduced by {proposal.createdBy.name} on {formatDate(proposal.createdAt)}
                </p>
                <div className="button-row">
                  <button
                    className="button-primary"
                    type="button"
                    onClick={() => handlePolicyDecision(proposal, 'advance')}
                  >
                    Advance
                  </button>
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => handlePolicyDecision(proposal, 'reject')}
                  >
                    Reject
                  </button>
                </div>
                <ul>
                  {proposal.decisions.map((entry) => (
                    <li key={entry.id}>
                      <strong>{entry.actor.name}</strong> {entry.disposition} — {formatDate(entry.timestamp)}
                    </li>
                  ))}
                  {proposal.decisions.length === 0 && <li>No decisions yet.</li>}
                </ul>
              </div>
            ))}
            {policyProposals.length === 0 && <p>No policy proposals registered.</p>}
          </div>
        </div>

        <div className="section">
          <h2>Audit trail</h2>
          <div className="audit-log">
            {auditLog.map((entry) => (
              <div className="audit-entry" key={entry.id}>
                <strong>{entry.action}</strong>
                <p>
                  {`${formatDate(entry.timestamp)} · ${entry.actor.name} (${entry.actor.role}) → ${entry.targetType} #${entry.targetId}`}
                </p>
                {entry.details && (
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(entry.details, null, 2)}</pre>
                )}
              </div>
            ))}
            {auditLog.length === 0 && <p>No audit entries recorded yet.</p>}
          </div>
        </div>

        <div className="section">
          <h2>JSON export &amp; import</h2>
          <div className="button-row">
            <button className="button-secondary" type="button" onClick={handleExport}>
              Generate export
            </button>
            <button className="button-secondary" type="button" onClick={handleImport}>
              Import payload
            </button>
          </div>
          <textarea
            placeholder="Exported JSON"
            value={exported}
            readOnly
            style={{ marginTop: 8, minHeight: 120 }}
          />
          <textarea
            placeholder="Paste exported JSON here to import"
            value={importInput}
            onChange={(event) => setImportInput(event.target.value)}
            style={{ marginTop: 8, minHeight: 120 }}
          />
          {status && <p style={{ marginTop: 8 }}>{status}</p>}
        </div>
      </section>
    </div>
  );
}
