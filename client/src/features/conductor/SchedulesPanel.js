"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SchedulesPanel;
const react_1 = __importDefault(require("react"));
function SchedulesPanel() {
    const [items, setItems] = react_1.default.useState([]);
    const [runbook, setRunbook] = react_1.default.useState('');
    const [cron, setCron] = react_1.default.useState('*/5 * * * *');
    const [enabled, setEnabled] = react_1.default.useState(true);
    const [busy, setBusy] = react_1.default.useState(false);
    const [err, setErr] = react_1.default.useState('');
    react_1.default.useEffect(() => {
        load();
        const t = setInterval(load, 10000);
        return () => clearInterval(t);
    }, []);
    async function load() {
        try {
            const r = await fetch('/api/conductor/v1/schedules');
            const j = await r.json();
            setItems(j.items || []);
        }
        catch (e) {
            setErr(String(e?.message || e));
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
            if (!r.ok)
                throw new Error(String(r.status));
            await load();
            setRunbook('');
        }
        catch (e) {
            setErr(String(e?.message || e));
        }
        finally {
            setBusy(false);
        }
    }
    async function toggle(id, next) {
        try {
            await fetch(`/api/conductor/v1/schedules/${encodeURIComponent(id)}`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ enabled: next }),
            });
            await load();
        }
        catch (e) {
            setErr(String(e?.message || e));
        }
    }
    return (<div style={{ padding: 24 }}>
      <h2>Schedules</h2>
      {err && <div style={{ color: 'crimson' }}>{err}</div>}
      <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: 8,
            maxWidth: 900,
            marginBottom: 12,
        }}>
        <input placeholder="runbook id or path" value={runbook} onChange={(e) => setRunbook(e.target.value)}/>
        <input placeholder="cron (e.g., */5 * * * *)" value={cron} onChange={(e) => setCron(e.target.value)}/>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)}/>{' '}
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
          {items.map((it) => (<tr key={it.id} style={{ borderBottom: '1px solid #eee' }}>
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
            </tr>))}
        </tbody>
      </table>
    </div>);
}
