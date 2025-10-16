import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function DLQSimulator() {
  const { getDLQ, simulateDLQPolicy } = api();
  const [items, setItems] = useState<any[]>([]);
  const [json, setJson] = useState<string>('');
  const [res, setRes] = useState<any>(null);
  const [sel, setSel] = useState<string>('');

  useEffect(() => {
    getDLQ({ sinceMs: 7 * 24 * 3600 * 1000 }).then((r) =>
      setItems(r.items || []),
    );
  }, []);

  const itemFromSel = items.find((i) => i.id === sel);
  const candidate: any = json.trim() ? safeParse(json) : itemFromSel || null;

  return (
    <section className="space-y-3 p-4" aria-label="DLQ Policy Simulator">
      <h1 className="text-xl font-semibold">DLQ Policy Simulator</h1>
      <div className="space-y-2 rounded-2xl border p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm">Pick existing DLQ item</label>
            <select
              className="w-full rounded border px-2 py-1"
              value={sel}
              onChange={(e) => setSel(e.target.value)}
            >
              <option value="">—</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.kind} / {i.stepId} / {String(i.id).slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm">Or paste DLQ item JSON</label>
            <textarea
              className="h-28 w-full rounded border p-2"
              placeholder='{"kind":"BUILD_IMAGE","stepId":"build","runId":"r123","error":"..."}'
              value={json}
              onChange={(e) => setJson(e.target.value)}
            />
          </div>
        </div>
        <div>
          <button
            className="rounded bg-blue-600 px-3 py-2 text-white disabled:bg-gray-300"
            disabled={!candidate}
            onClick={async () => {
              const r = await simulateDLQPolicy({
                kind: candidate!.kind,
                error: candidate!.error,
                stepId: candidate!.stepId,
                runId: candidate!.runId,
                id: candidate!.id,
              });
              setRes(r);
            }}
          >
            Simulate
          </button>
        </div>
      </div>

      {res && (
        <div
          className="space-y-2 rounded-2xl border p-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <span
              className={`rounded px-3 py-1 text-white ${
                res.decision === 'ALLOW'
                  ? 'bg-emerald-600'
                  : res.decision === 'DRY_RUN'
                    ? 'bg-amber-500'
                    : 'bg-red-600'
              }`}
            >
              {res.decision}
            </span>
            <div className="text-sm text-gray-600">
              signature: <code>{res.normalizedSignature}</code>
            </div>
          </div>
          <ul className="ml-6 list-disc text-sm">
            <li>
              policy: {res.enabled ? 'enabled' : 'disabled'}
              {res.dryRun ? ' (dry-run)' : ''}
            </li>
            <li>kind allowed: {String(res.passKind)}</li>
            <li>signature allowed: {String(res.passSig)}</li>
            <li>rate limited: {String(res.rateLimited)}</li>
          </ul>
          {res.reasons?.length ? (
            <>
              <div className="font-medium">Reasons</div>
              <pre className="overflow-auto whitespace-pre-wrap break-all bg-gray-50 p-2 text-xs">
                {JSON.stringify(res.reasons, null, 2)}
              </pre>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}

function safeParse(j: string) {
  try {
    return JSON.parse(j);
  } catch {
    return null;
  }
}
