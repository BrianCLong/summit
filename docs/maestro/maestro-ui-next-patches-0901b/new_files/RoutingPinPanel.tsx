import React, { useEffect, useState } from 'react';

type Pin = {
  step?: string;
  model: string;
  reason?: string;
  actor?: string;
  createdAt?: string;
};

async function getPins(): Promise<Pin[]> {
  const base =
    (window as any).__MAESTRO_CFG__?.gatewayBase ?? '/api/maestro/v1';
  const res = await fetch(`${base}/routing/pins`);
  if (!res.ok) throw new Error('Failed to load pins');
  return res.json();
}
async function putPin(pin: Pin): Promise<void> {
  const base =
    (window as any).__MAESTRO_CFG__?.gatewayBase ?? '/api/maestro/v1';
  await fetch(`${base}/routing/pin`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pin),
  });
}
async function explainPolicy(payload: any): Promise<any> {
  const base =
    (window as any).__MAESTRO_CFG__?.gatewayBase ?? '/api/maestro/v1';
  const res = await fetch(`${base}/policies/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export default function RoutingPinPanel() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [step, setStep] = useState('');
  const [model, setModel] = useState('');
  const [note, setNote] = useState('');
  const [explain, setExplain] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () =>
    getPins()
      .then(setPins)
      .catch((e) => setErr(String(e)));

  useEffect(() => {
    refresh();
  }, []);

  async function onExplain() {
    setBusy(true);
    setErr(null);
    try {
      const resp = await explainPolicy({
        action: 'route.pin',
        step,
        model,
        note,
      });
      setExplain(resp);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function onPin() {
    setBusy(true);
    setErr(null);
    try {
      await putPin({ step: step || undefined, model, reason: note });
      await refresh();
      setExplain(null);
      setNote('');
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border rounded-xl p-4 space-y-3">
      <h3 className="font-medium">Routing Pins</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          className="border rounded px-2 py-1"
          placeholder="Step (optional)"
          value={step}
          onChange={(e) => setStep(e.target.value)}
          aria-label="Step id"
        />
        <input
          className="border rounded px-2 py-1"
          placeholder="Model (e.g., gpt-4o)"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          aria-label="Model"
        />
        <input
          className="border rounded px-2 py-1"
          placeholder="Audit note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-label="Audit note"
        />
      </div>
      <div className="flex gap-2">
        <button
          className="border rounded px-3 py-1"
          onClick={onExplain}
          disabled={busy}
        >
          Explain (Policy)
        </button>
        <button
          className="border rounded px-3 py-1 bg-black text-white"
          onClick={onPin}
          disabled={busy || !model}
        >
          Pin
        </button>
      </div>
      {err && <div className="text-red-600 text-sm">Error: {err}</div>}
      {explain && (
        <pre className="bg-gray-50 border rounded p-2 text-xs overflow-auto">
          {JSON.stringify(explain, null, 2)}
        </pre>
      )}
      <div>
        <h4 className="text-sm font-medium mt-2">Current Pins</h4>
        <ul className="text-sm mt-1 space-y-1 max-h-[30vh] overflow-auto pr-1">
          {pins.map((p, idx) => (
            <li
              key={idx}
              className="border rounded p-2 flex items-center justify-between"
            >
              <div>
                <span className="font-mono">{p.step || '*'}</span> →{' '}
                <span className="font-mono">{p.model}</span>
              </div>
              <div className="text-xs text-gray-600">{p.reason}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
