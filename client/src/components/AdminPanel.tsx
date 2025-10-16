import React, { useEffect, useState } from 'react';

export default function AdminPanel() {
  const api = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';
  const [tenants, setTenants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState('');
  const [audit, setAudit] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [policy, setPolicy] = useState('');

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    try {
      const t = await (await fetch(api + '/admin/tenants')).json();
      setTenants(t.items || []);
      const u = await (await fetch(api + '/admin/users')).json();
      setUsers(u.items || []);
      const f = await (await fetch(api + '/admin/flags')).json();
      setFlags(f.flags || {});
      await loadAudit();
      await loadPolicy();
    } catch (e) {
      setStatus(String(e));
    }
  }

  async function toggleFlag(k: string) {
    const v = !flags[k];
    await fetch(api + '/admin/flags/' + k, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ value: v }),
    });
    setFlags({ ...flags, [k]: v });
  }
  async function loadAudit() {
    const a = await (
      await fetch(
        api +
          '/admin/audit?limit=200' +
          (q ? `&query=${encodeURIComponent(q)}` : ''),
      )
    ).json();
    setAudit(a.items || []);
  }
  async function loadPolicy() {
    try {
      const txt = await (await fetch(api + '/admin/policy')).text();
      setPolicy(txt);
    } catch {}
  }
  async function savePolicy() {
    await fetch(api + '/admin/policy', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: policy }),
    });
    setStatus('Policy saved');
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12 }}>
      <strong>Admin</strong>
      {status && <div style={{ color: '#a00' }}>{status}</div>}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 600 }}>Tenants</div>
        <ul>
          {tenants.map((t) => (
            <li key={t.id}>
              {t.id} – {t.name}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 600 }}>Users</div>
        <ul>
          {users.map((u) => (
            <li key={u.id}>
              {u.email} ({u.role})
            </li>
          ))}
        </ul>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 600 }}>Feature Flags</div>
        <ul>
          {Object.keys(flags).length === 0 && <li>No flags</li>}
          {Object.entries(flags).map(([k, v]) => (
            <li key={k}>
              <label>
                <input
                  type="checkbox"
                  checked={!!v}
                  onChange={() => toggleFlag(k)}
                />{' '}
                {k}
              </label>
            </li>
          ))}
          <li>
            <button onClick={() => toggleFlag('demo-mode')}>
              Toggle demo-mode
            </button>
          </li>
        </ul>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 600 }}>Audit (filter)</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="query"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button onClick={loadAudit}>Search</button>
        </div>
        <ul>
          {audit.map((a, i) => (
            <li key={i}>
              <code style={{ fontSize: 12 }}>{a.ts}</code> {a.action}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 600 }}>Policy Editor</div>
        <textarea
          rows={8}
          value={policy}
          onChange={(e) => setPolicy(e.target.value)}
          style={{ width: '100%', fontFamily: 'monospace' }}
        />
        <div>
          <button onClick={savePolicy}>Save Policy</button>
        </div>
      </div>
    </div>
  );
}
