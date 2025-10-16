import React from 'react';
import { api } from '../api';

export default function RoutingStudio() {
  const {
    routingPreview,
    getRoutingPins,
    putRoutingPin,
    deleteRoutingPin,
    postPolicyExplain,
    getPinHistory,
    postRollback,
    getWatchdogConfigs,
    putWatchdogConfigs,
    getWatchdogEvents,
  } = api();
  const [task, setTask] = React.useState('Build and package IntelGraph');
  const [latency, setLatency] = React.useState(3000);
  const [resp, setResp] = React.useState<any | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [pins, setPins] = React.useState<Record<string, string>>({});
  const [route, setRoute] = React.useState('');
  const [model, setModel] = React.useState('');
  const [note, setNote] = React.useState('');
  const refreshPins = React.useCallback(() => {
    getRoutingPins()
      .then(setPins)
      .catch(() => setPins({}));
  }, [getRoutingPins]);
  React.useEffect(() => {
    refreshPins();
  }, []);
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Routing Studio</h2>
      <section className="rounded border bg-white p-3">
        <div className="mb-2 text-sm font-semibold text-slate-700">
          Dry-run simulation
        </div>
        <div className="mb-2 flex items-center gap-2">
          <textarea
            className="h-24 w-full rounded border p-2"
            value={task}
            onChange={(e) => setTask(e.target.value)}
          />
        </div>
        <div className="mb-2 flex items-center gap-2 text-sm">
          <label htmlFor="latency">Max Latency (ms)</label>
          <input
            id="latency"
            className="w-32 rounded border px-2 py-1"
            type="number"
            value={latency}
            onChange={(e) => setLatency(Number(e.target.value))}
          />
          <button
            className="rounded border px-2 py-1"
            onClick={async () => {
              try {
                setErr(null);
                const r = await routingPreview({ task, maxLatencyMs: latency });
                setResp(r);
              } catch (e: any) {
                setErr(e?.message || 'Failed');
              }
            }}
          >
            Preview
          </button>
        </div>
        {err && <div className="text-sm text-red-700">{err}</div>}
        {resp && (
          <div className="text-sm">
            <div>
              Decision:{' '}
              <span className="font-semibold">
                {resp.decision?.model || resp.decision?.expert || 'unknown'}
              </span>{' '}
              • conf {resp.decision?.confidence ?? '—'}
            </div>
            <div className="mt-2 text-slate-700">Candidates</div>
            <ul className="list-disc pl-5">
              {(resp.candidates || []).map((c: any, i: number) => (
                <li key={i}>
                  {c.model || c.expert}: {c.score || c.confidence}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <section
        className="rounded border bg-white p-3"
        aria-label="Routing pins"
      >
        <div className="mb-2 text-sm font-semibold text-slate-700">
          Pin route to model
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            className="rounded border px-2 py-1"
            placeholder="Route"
            aria-label="Route"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
          />
          <input
            className="rounded border px-2 py-1"
            placeholder="Model"
            aria-label="Model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          <input
            className="rounded border px-2 py-1"
            placeholder="Audit note"
            aria-label="Audit note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="mt-2 flex gap-2">
          <button
            className="rounded border px-2 py-1 text-sm"
            onClick={async () => {
              const ex = await postPolicyExplain({
                input: { action: 'route.pin', route, model, note },
              });
              const allow = !!ex?.allowed || !!ex?.result?.allow;
              if (!allow) {
                const proceed = window.confirm(
                  'Policy would DENY. Proceed anyway (will be audited)?',
                );
                if (!proceed) return;
              }
              await putRoutingPin({ route, model, note });
              setRoute('');
              setModel('');
              setNote('');
              refreshPins();
            }}
            disabled={!route || !model}
          >
            Pin
          </button>
        </div>
        <div className="mt-3 rounded border">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Route</th>
                <th className="px-2 py-1 text-left">Model</th>
                <th className="px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(pins).map(([r, m]) => (
                <tr key={r} className="border-t">
                  <td className="px-2 py-1">{r}</td>
                  <td className="px-2 py-1">{m}</td>
                  <td className="px-2 py-1">
                    <button
                      className="text-blue-600 underline"
                      onClick={async () => {
                        await deleteRoutingPin(r);
                        refreshPins();
                      }}
                    >
                      Unpin
                    </button>
                  </td>
                </tr>
              ))}
              {!Object.keys(pins).length && (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-slate-500">
                    No pins
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <AutoRollbackSection
        apiFns={{
          getPinHistory,
          postRollback,
          getWatchdogConfigs,
          putWatchdogConfigs,
          getWatchdogEvents,
        }}
      />
    </div>
  );
}

function AutoRollbackSection({ apiFns }: { apiFns: any }) {
  const [route, setRoute] = React.useState('codegen');
  const [cfg, setCfg] = React.useState<any>({ enabled: false, routes: {} });
  const [events, setEvents] = React.useState<any[]>([]);
  const cur = cfg.routes?.[route] || {
    enabled: false,
    maxCostZ: 2.0,
    maxDLQ10m: 10,
  };

  const refresh = async () => {
    const c = await apiFns.getWatchdogConfigs();
    setCfg(c);
    const e = await apiFns.getWatchdogEvents();
    setEvents(e.items || []);
  };
  React.useEffect(() => {
    refresh();
  }, []);

  async function save() {
    const next = {
      ...cfg,
      enabled: cfg.enabled,
      routes: { ...(cfg.routes || {}), [route]: cur },
    };
    await apiFns.putWatchdogConfigs(next);
    await refresh();
  }
  const [history, setHistory] = React.useState<any[]>([]);
  React.useEffect(() => {
    apiFns.getPinHistory(route).then((r: any) => setHistory(r.history || []));
  }, [route]);

  return (
    <div className="space-y-3 rounded-2xl border bg-white p-3">
      <h2 className="font-medium">Auto-Rollback Watchdog</h2>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!cfg.enabled}
          onChange={(e) =>
            setCfg((x: any) => ({ ...x, enabled: e.target.checked }))
          }
        />{' '}
        Enable watchdog
      </label>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <input
          className="rounded border px-2 py-1"
          aria-label="Route"
          value={route}
          onChange={(e) => setRoute(e.target.value)}
        />
        <label className="flex items-center gap-2">
          Enabled
          <input
            type="checkbox"
            checked={!!cur.enabled}
            onChange={(e) => {
              cur.enabled = e.target.checked;
              setCfg({ ...cfg });
            }}
          />
        </label>
        <label className="flex items-center gap-2">
          Max cost z
          <input
            type="number"
            className="w-24 rounded border px-2 py-1"
            value={cur.maxCostZ}
            onChange={(e) => {
              cur.maxCostZ = Number(e.target.value);
              setCfg({ ...cfg });
            }}
          />
        </label>
        <label className="flex items-center gap-2">
          Max DLQ (10m)
          <input
            type="number"
            className="w-24 rounded border px-2 py-1"
            value={cur.maxDLQ10m}
            onChange={(e) => {
              cur.maxDLQ10m = Number(e.target.value);
              setCfg({ ...cfg });
            }}
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          className="rounded bg-blue-600 px-3 py-2 text-white"
          onClick={save}
        >
          Save
        </button>
        <button
          className="rounded border px-3 py-2"
          onClick={() => apiFns.postRollback(route, 'manual rollback')}
        >
          Rollback now
        </button>
      </div>
      <div className="rounded-2xl border p-3">
        <div className="mb-2 text-sm font-medium">Pin history ({route})</div>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>From</th>
              <th>To</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h: any) => (
              <tr key={h.ts}>
                <td>{new Date(h.ts).toLocaleString()}</td>
                <td>{h.action}</td>
                <td>{h.prevModel || '-'}</td>
                <td>{h.newModel}</td>
                <td>{h.note || '-'}</td>
              </tr>
            ))}
            {!history.length && (
              <tr>
                <td colSpan={5} className="p-3 text-center text-gray-500">
                  No history
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="rounded-2xl border p-3">
        <div className="mb-2 text-sm font-medium">Watchdog events</div>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Time</th>
              <th>Route</th>
              <th>Kind</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {(events || []).map((e: any) => (
              <tr key={e.ts}>
                <td>{new Date(e.ts).toLocaleString()}</td>
                <td>{e.route}</td>
                <td>{e.kind}</td>
                <td>{e.reason}</td>
              </tr>
            ))}
            {!events.length && (
              <tr>
                <td colSpan={4} className="p-3 text-center text-gray-500">
                  No events
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
