import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ed25519 } from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import type { AccessRequest, AuditEvent, Template } from './types';
import './App.css';

const API_BASE = import.meta.env.VITE_JITAE_API ?? 'http://localhost:8080';
const encoder = new TextEncoder();

export default function App() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [requestForm, setRequestForm] = useState({
    templateId: '',
    requestorId: '',
    purpose: '',
  });

  const [approveInputs, setApproveInputs] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tpl, req, evt, key] = await Promise.all([
        fetchJSON<Template[]>(`${API_BASE}/templates`),
        fetchJSON<AccessRequest[]>(`${API_BASE}/requests`),
        fetchJSON<AuditEvent[]>(`${API_BASE}/audit/events`),
        fetchJSON<{ publicKey: string }>(`${API_BASE}/audit/public-key`).catch(() => ({ publicKey: '' })),
      ]);
      setTemplates(tpl);
      setRequests(req);
      setEvents(evt);
      setPublicKey(key.publicKey ?? '');
      if (!requestForm.templateId && tpl.length > 0) {
        setRequestForm((prev) => ({ ...prev, templateId: tpl[0].id }));
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [requestForm.templateId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const verification = useMemo(() => {
    if (!publicKey) {
      return [];
    }
    return events.map((evt) => ({
      id: evt.id,
      type: evt.type,
      valid: verifyEvent(evt, publicKey),
    }));
  }, [events, publicKey]);

  const onSubmitRequest = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await postJSON(`${API_BASE}/requests`, {
        templateId: requestForm.templateId,
        requestorId: requestForm.requestorId,
        purpose: requestForm.purpose,
      });
      setRequestForm((prev) => ({ ...prev, purpose: '' }));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create request');
    }
  };

  const onApprove = async (requestId: string) => {
    try {
      await postJSON(`${API_BASE}/requests/${requestId}/approve`, {
        approverId: approveInputs[requestId] ?? '',
      });
      setApproveInputs((prev) => ({ ...prev, [requestId]: '' }));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Just-In-Time Access Escalator</h1>
        <p>Dual-control timeboxed access with deterministic expiry and signed audit.</p>
        <button type="button" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {error && <div className="error">{error}</div>}

      <main>
        <section className="panel">
          <h2>Request Access</h2>
          <form onSubmit={onSubmitRequest} className="form-grid">
            <label>
              Template
              <select
                value={requestForm.templateId}
                onChange={(evt) =>
                  setRequestForm((prev) => ({ ...prev, templateId: evt.target.value }))
                }
              >
                <option value="" disabled>
                  Select template
                </option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({formatTTL(tpl.ttl)})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Requestor
              <input
                value={requestForm.requestorId}
                onChange={(evt) =>
                  setRequestForm((prev) => ({ ...prev, requestorId: evt.target.value }))
                }
                placeholder="employee id"
                required
              />
            </label>
            <label className="full">
              Purpose
              <input
                value={requestForm.purpose}
                onChange={(evt) =>
                  setRequestForm((prev) => ({ ...prev, purpose: evt.target.value }))
                }
                placeholder="Incident reference / justification"
                required
              />
            </label>
            <button type="submit" className="primary" disabled={loading || !requestForm.templateId}>
              Submit request
            </button>
          </form>

          <div className="templates">
            <h3>Least-privilege Templates</h3>
            <ul>
              {templates.map((tpl) => (
                <li key={tpl.id}>
                  <strong>{tpl.name}</strong>
                  <span>{tpl.description}</span>
                  <small>
                    TTL: {formatTTL(tpl.ttl)} · Scopes: {tpl.scopes.join(', ') || 'n/a'}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="panel">
          <h2>Requests</h2>
          <div className="request-list">
            {requests.map((req) => (
              <div key={req.id} className={`request-card status-${req.status.toLowerCase()}`}>
                <header>
                  <h3>{req.template.name}</h3>
                  <span className="status">{req.status}</span>
                </header>
                <dl>
                  <div>
                    <dt>Requestor</dt>
                    <dd>{req.requestorId}</dd>
                  </div>
                  <div>
                    <dt>Purpose</dt>
                    <dd>{req.purpose}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{formatDate(req.createdAt)}</dd>
                  </div>
                  {req.grant && (
                    <div>
                      <dt>Expires</dt>
                      <dd>{formatDate(req.grant.expiresAt)}</dd>
                    </div>
                  )}
                </dl>
                {req.status === 'PENDING' && (
                  <div className="approval">
                    <input
                      value={approveInputs[req.id] ?? ''}
                      onChange={(evt) =>
                        setApproveInputs((prev) => ({ ...prev, [req.id]: evt.target.value }))
                      }
                      placeholder="Approver id"
                    />
                    <button type="button" onClick={() => void onApprove(req.id)} disabled={loading}>
                      Approve
                    </button>
                  </div>
                )}
                <footer>
                  <strong>Approvals:</strong>{' '}
                  {req.approvals.length === 0
                    ? 'Awaiting reviewer'
                    : req.approvals.map((appr) => `${appr.approverId} (${formatDate(appr.approvedAt)})`).join(', ')}
                </footer>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Audit Log</h2>
          <p className="muted">
            Public key: {publicKey ? <code>{publicKey}</code> : 'unavailable'}
          </p>
          <ul className="audit-list">
            {events.map((evt) => {
              const verdict = verification.find((item) => item.id === evt.id);
              return (
                <li key={evt.id}>
                  <div>
                    <strong>{evt.type}</strong>
                    <small>{formatDate(evt.timestamp)}</small>
                  </div>
                  <code>{evt.signature}</code>
                  <span className={verdict?.valid ? 'badge valid' : 'badge invalid'}>
                    {verdict?.valid ? 'signature verified' : 'verification pending'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return (await res.json()) as T;
}

async function postJSON(url: string, payload: unknown): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
}

function verifyEvent(evt: AuditEvent, publicKey: string): boolean {
  try {
    const digest = canonicalDigest(evt);
    const signature = hexToBytes(evt.signature);
    const keyBytes = hexToBytes(publicKey);
    return ed25519.verify(signature, digest, keyBytes);
  } catch (err) {
    console.error('verification error', err);
    return false;
  }
}

function canonicalDigest(evt: AuditEvent): Uint8Array {
  const payloadJSON = JSON.stringify(evt.payload ?? null);
  const payloadHash = sha256(encoder.encode(payloadJSON ?? 'null'));
  const canonical = {
    id: evt.id,
    type: evt.type,
    timestamp: evt.timestamp,
    payloadHash: Array.from(payloadHash),
  };
  const canonicalBytes = encoder.encode(JSON.stringify(canonical));
  return sha256(canonicalBytes);
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('invalid hex');
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function formatTTL(ttl: number): string {
  if (!ttl) {
    return '0m';
  }
  const minutes = Math.round(ttl / 60_000_000_000);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours}h`;
}
