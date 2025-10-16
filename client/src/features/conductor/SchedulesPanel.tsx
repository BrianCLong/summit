import React from 'react';

type Sched = {
  id: string;
  runbook: string;
  cron: string;
  enabled: boolean;
  last_run_at?: string;
};

export default function SchedulesPanel() {
  const [items, setItems] = React.useState<Sched[]>([]);
  const [runbook, setRunbook] = React.useState('');
  const [cron, setCron] = React.useState('*/5 * * * *');
  const [enabled, setEnabled] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  async function load() {
    try {
      const r = await fetch('/api/conductor/v1/schedules');
      const j = await r.json();
      setItems(j.items || []);
    } catch (e: unknown) {
      setErr(String((e as Error)?.message || e));
    }
  }

  async function create() {
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/conductor/v1/schedules', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ runbook, cron, enabled }),
      });
      if (!r.ok) throw new Error(String(r.status));
      await load();
      setRunbook('');
    } catch (e: unknown) {
      setErr(String((e as Error)?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, next: boolean) {
    try {
      await fetch(`/api/conductor/v1/schedules/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      await load();
    } catch (e: unknown) {
      setErr(String((e as Error)?.message || e));
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Schedules</h2>
      {err && <div style={{ color: 'crimson' }}>{err}</div>}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: 8,
          maxWidth: 900,
          marginBottom: 12,
        }}
      >
        <input
          placeholder="runbook id or path"
          value={runbook}
          onChange={(e) => setRunbook(e.target.value)}
        />
        <input
          placeholder="cron (e.g., */5 * * * *)"
          value={cron}
          onChange={(e) => setCron(e.target.value)}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />{' '}
          enabled
        </label>
        <button disabled={busy || !runbook || !cron} onClick={create}>
          Create
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">Runbook</th>
            <th align="left">Cron</th>
            <th align="left">Enabled</th>
            <th align="left">Last Run</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} style={{ borderBottom: '1px solid #eee' }}>
              <td>{it.runbook}</td>
              <td>{it.cron}</td>
              <td>{String(it.enabled)}</td>
              <td>
                {it.last_run_at
                  ? new Date(it.last_run_at).toLocaleString()
                  : '—'}
              </td>
              <td>
                <button onClick={() => toggle(it.id, !it.enabled)}>
                  {it.enabled ? 'Disable' : 'Enable'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
