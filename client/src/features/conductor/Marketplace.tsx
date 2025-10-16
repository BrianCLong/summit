import React, { useEffect, useState } from 'react';

interface MarketplaceItem {
  name: string;
  version: string;
  type: string;
  residency: string[];
}

export default function Marketplace() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/plugins/registry.json', { signal: controller.signal })
      .then((r) => r.json())
      .then((j) => setItems(j.steps || []))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Fetch error:', err);
          setItems([]);
        }
      });
    return () => controller.abort();
  }, []);
  async function install(n: string, v: string) {
    setBusy(true);
    setMsg('');
    try {
      await fetch(
        `/api/plugins/install?name=${encodeURIComponent(n)}&version=${encodeURIComponent(v)}`,
        { method: 'POST' },
      );
      setMsg(`Installed ${n}@${v}`);
    } catch (e: unknown) {
      setMsg(`Failed: ${(e as Error)?.message || e}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="p-4 rounded-2xl shadow">
      <h3 className="text-lg font-semibold">Step Marketplace</h3>
      <div className="text-xs text-gray-600 mb-2">{msg}</div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Version</th>
            <th>Residency</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s: MarketplaceItem) => (
            <tr key={s.name + s.version} className="border-b">
              <td className="font-mono">{s.name}</td>
              <td>{s.type}</td>
              <td>{s.version}</td>
              <td>{(s.residency || []).join(',')}</td>
              <td>
                <button
                  disabled={busy}
                  onClick={() => install(s.name, s.version)}
                  className="px-2 py-1 rounded-2xl shadow"
                >
                  Install
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
