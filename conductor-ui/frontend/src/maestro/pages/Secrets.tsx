import React from 'react';
import { api } from '../api';

export default function Secrets() {
  const { getSecrets, rotateSecret, getProviders, testProvider } = api();
  const [items, setItems] = React.useState<any[]>([]);
  const [providers, setProviders] = React.useState<any[]>([]);
  const [msg, setMsg] = React.useState<string | null>(null);
  React.useEffect(() => { (async () => { try { const r = await getSecrets(); setItems(r.items || []); } catch {} })(); (async()=>{ try { const p = await getProviders(); setProviders(p.items||[]);} catch {} })(); }, []);
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Secrets & Connections</h2>
      <div className="overflow-hidden rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-3 py-2">Reference</th><th className="px-3 py-2">Provider</th><th className="px-3 py-2">Last Access</th><th className="px-3 py-2">Rotation Due</th><th className="px-3 py-2">Actions</th></tr></thead>
          <tbody>
            {items.map((s:any)=>(
              <tr key={s.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{s.ref}</td>
                <td className="px-3 py-2">{s.provider}</td>
                <td className="px-3 py-2 text-xs">{s.lastAccess}</td>
                <td className="px-3 py-2 text-xs">{s.rotationDue}</td>
                <td className="px-3 py-2 text-xs">
                  <button aria-label={`Rotate ${s.ref}`} className="rounded border px-2 py-1" onClick={async ()=>{ try { await rotateSecret(s.id); setMsg('Rotation triggered'); setTimeout(()=>setMsg(null), 1500); } catch(e:any){ setMsg(e?.message||'Failed'); } }}>Rotate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="rounded border bg-white">
        <div className="flex items-center justify-between border-b p-2">
          <div className="text-sm font-semibold text-slate-700">Providers</div>
          <button className="rounded border px-2 py-1 text-xs" onClick={async ()=>{ try { const p = await getProviders(); setProviders(p.items||[]);} catch {} }}>Refresh</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Latency</th><th className="px-3 py-2">Actions</th></tr></thead>
          <tbody>
            {providers.map((p:any)=>(
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2">{p.status}</td>
                <td className="px-3 py-2">{p.latencyMs}ms</td>
                <td className="px-3 py-2"><button className="rounded border px-2 py-1 text-xs" onClick={async ()=>{ try { await testProvider(p.id); const r = await getProviders(); setProviders(r.items||[]); } catch {} }}>Test</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {msg && <div className="text-xs text-slate-500">{msg}</div>}
      <div className="text-xs text-slate-500">Values are never shown. References only; actions are audited server-side.</div>
    </div>
  );
}

