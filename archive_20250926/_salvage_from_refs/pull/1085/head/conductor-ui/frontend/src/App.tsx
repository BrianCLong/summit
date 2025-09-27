import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Symphony UI — Wired Single-File React + Tailwind Scaffold
 * ---------------------------------------------------------
 * - Reads endpoints from:
 *     1) window.__SYMPHONY_CFG__ = { LITELLM_BASE, OLLAMA_BASE, PROXY_BASE }
 *     2) URL params: ?litellm=...&ollama=...&proxy=...
 * - Wires to real endpoints when available, degrades gracefully otherwise.
 * - Polling: health(2s), burndown(5s), models(30s).
 * - SSE: logs stream, Neo4j Guard run stream.
 * - LOA/Kill gating applied to risky actions.
 *
 * Panels: Dashboard, Routing Studio, RAG Console, Neo4j Guard,
 *         Budgets & Burndown, Policies & LOA, Logs, CI & Chaos, Docs.
 */

// --------------------------- Small Utilities ---------------------------
const cn = (...xs) => xs.filter(Boolean).join(" ");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getURLParam(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name) || undefined;
}

function getENV() {
  const cfg = (window.__SYMPHONY_CFG__ || {});
  const fromURL = {
    LITELLM_BASE: getURLParam("litellm"),
    OLLAMA_BASE: getURLParam("ollama"),
    PROXY_BASE: getURLParam("proxy"),
  };
  const env = {
    LITELLM_BASE: fromURL.LITELLM_BASE || cfg.LITELLM_BASE || "http://127.0.0.1:4000",
    OLLAMA_BASE: fromURL.OLLAMA_BASE || cfg.OLLAMA_BASE || "http://127.0.0.1:11434",
    PROXY_BASE:  fromURL.PROXY_BASE  || cfg.PROXY_BASE  || "",
  };
  // Normalize trailing slashes
  for (const k of Object.keys(env)) {
    if (env[k] && typeof env[k] === 'string') env[k] = env[k].replace(/\/$/, "");
  }
  return env;
}

function useStableENV() {
  const [env, setEnv] = useState(getENV());
  useEffect(() => {
    const onPop = () => setEnv(getENV());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return env;
}

async function fetchJson(url, init) {
  const r = await fetch(url, init);
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status}: ${text || r.statusText}`);
  }
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/json")) return r.json();
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { raw: t }; }
}

async function postJson(url, body, init={}) {
  return fetchJson(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(init.headers||{}) },
    body: JSON.stringify(body||{}),
    ...init,
  });
}

function useInterval(cb, ms, deps=[]) {
  useEffect(() => {
    let t;
    function tick(){ cb(); t = setTimeout(tick, ms); }
    tick();
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function useSSE(url, { onMessage, onError, onOpen }) {
  const esRef = useRef(null);
  useEffect(() => {
    if (!url) return;
    const es = new EventSource(url);
    esRef.current = es;
    if (onOpen) es.addEventListener('open', onOpen);
    if (onMessage) es.addEventListener('message', (e) => onMessage(e.data));
    if (onError) es.addEventListener('error', onError);
    return () => { es.close(); esRef.current = null; };
  }, [url]);
  return esRef;
}

const fmt = {
  num: (n, d=0) => (n==null? '—' : Number(n).toFixed(d).replace(/\.0+$/,'')),
  ms: (n) => (n==null? '—' : `${Math.round(n)} ms`),
  pct: (x) => (x==null? '—' : `${Math.round(x*100)}%`),
  money: (x) => (x==null? '—' : `$${Number(x).toFixed(6).replace(/0+$/,'').replace(/\.$/,'')}`),
  time: (s) => s? new Date(s).toLocaleTimeString() : '—',
};

// --------------------------- API Layer ---------------------------
function makeAPI(ENV) {
  const hasProxy = !!ENV.PROXY_BASE;

  const api = {
    ENV,
    async health() {
      // Prefer proxy
      if (hasProxy) {
        try {
          return await fetchJson(`${ENV.PROXY_BASE}/status/health.json`);
        } catch(e) { /* fallthrough */ }
      }
      // Compose basic health by probing services
      const status = { env: 'dev', loa: 1, kill: 0, services: { ollama:false, litellm:false, neo4j:false, federation:false }, clock_utc: new Date().toISOString() };
      try { const m = await fetchJson(`${ENV.LITELLM_BASE}/v1/models`); if (m) status.services.litellm = true; } catch {}
      try { const o = await fetchJson(`${ENV.OLLAMA_BASE}/api/tags`); if (o) status.services.ollama = true; } catch {}
      // Neo4j/federation unknown without proxy
      return status;
    },

    async burndown() {
      const tryUrls = [];
      if (hasProxy) tryUrls.push(`${ENV.PROXY_BASE}/status/burndown.json`);
      tryUrls.push(`${window.location.origin}/status/burndown.json`);
      for (const u of tryUrls) {
        try { return await fetchJson(u); } catch(e) { /* try next */ }
      }
      return { generated_at:new Date().toISOString(), perf:{}, windows:{ m1:{per_model:{}, totals:{}}, h1:{per_model:{}, totals:{}}, d1:{per_model:{}, totals:{}} } };
    },

    async models() {
      // Prefer single merged endpoint
      if (hasProxy) {
        try { return await fetchJson(`${ENV.PROXY_BASE}/models`); } catch (e) { /* fallthrough */ }
      }
      // Merge LiteLLM + Ollama results locally
      const items = [];
      try {
        const r = await fetchJson(`${ENV.LITELLM_BASE}/v1/models`);
        const arr = r.data || r.models || [];
        arr.forEach(m => items.push({ id: m.id || m.name || m.model || 'unknown', provider: 'litellm' }));
      } catch {}
      try {
        const o = await fetchJson(`${ENV.OLLAMA_BASE}/api/tags`);
        const arr = o.models || [];
        arr.forEach(m => items.push({ id: `ollama/${m.name}`, provider: 'ollama' }));
      } catch {}
      return { items };
    },

    async routePlan(payload) {
      if (hasProxy) return postJson(`${ENV.PROXY_BASE}/route/plan`, payload);
      // Fallback: naive local plan — choose first litellm model if any, else first ollama
      const mods = await api.models();
      const choice = mods.items[0]?.id || 'unknown';
      return { decision:{ model: choice, confidence: 0.5, reason: 'proxy off: chose first discovered model' }, candidates: mods.items.map(m=>({ model:m.id, score: 0.5 })), prompt_preview:{ system: 'You are Symphony local route.', user: payload?.input||'' }, policy:{ allow: true, reason: 'proxy off', max_loa: 3, hosted_allowed: true } };
    },

    async routeExecute({ task, input, env, loa, meta }) {
      if (hasProxy) return postJson(`${ENV.PROXY_BASE}/route/execute`, { task, input, env, loa, meta });
      // Fallback: call LiteLLM chat completions if available
      let text = "(no output)"; let usage = {}; let latency_ms = null; const cost_usd = 0; const audit_id = `local-${Date.now()}`;
      const t0 = performance.now();
      try {
        const r = await postJson(`${ENV.LITELLM_BASE}/v1/chat/completions`, {
          model: 'gpt-4o-mini', // LiteLLM will map/route if configured; otherwise may error
          messages: [ { role:'system', content:'You are a helpful assistant.' }, { role:'user', content: input||'' } ]
        });
        latency_ms = performance.now() - t0;
        text = r.choices?.[0]?.message?.content || JSON.stringify(r).slice(0, 2000);
        usage = r.usage || {};
      } catch (e) {
        latency_ms = performance.now() - t0;
        text = `Error calling LiteLLM: ${e.message}`;
      }
      return { audit_id, latency_ms, usage, cost_usd, text };
    },

    async ragStats() {
      if (hasProxy) return fetchJson(`${ENV.PROXY_BASE}/rag/stats`);
      return { files: 0, last_indexed_at: null };
    },

    async ragQuery(q, k=5) {
      if (hasProxy) return postJson(`${ENV.PROXY_BASE}/rag/query`, { q, k });
      // Fallback: answer via LLM, flagging that RAG is off
      const r = await api.routeExecute({ task:'qa', input:q, env:'dev', loa:1 });
      return { answer: r.text, cites: [], usage: r.usage || {}, cost_usd: 0, _no_rag:true };
    },

    async guardRun(keep_db) {
      if (!hasProxy) throw new Error('Proxy not configured; cannot run guard');
      return postJson(`${ENV.PROXY_BASE}/neo4j/guard`, { keep_db });
    },
    guardStreamURL(run_id) {
      if (!hasProxy) return null;
      return `${ENV.PROXY_BASE}/neo4j/guard/stream?run_id=${encodeURIComponent(run_id)}`;
    },
    async guardReport(run_id) {
      if (!hasProxy) throw new Error('Proxy not configured');
      return fetchJson(`${ENV.PROXY_BASE}/neo4j/guard/report?run_id=${encodeURIComponent(run_id)}`);
    },

    async policyGet() {
      if (!hasProxy) return { text: '# Policy (proxy off)\nmax_loa:\n  dev: 3\n  staging: 2\n  prod: 1\n', version: 'local', updated_at: new Date().toISOString() };
      return fetchJson(`${ENV.PROXY_BASE}/policy`);
    },
    async policyPut(text) {
      if (!hasProxy) throw new Error('Proxy not configured');
      const r = await fetch(`${ENV.PROXY_BASE}/policy`, { method:'PUT', headers:{ 'content-type':'text/plain' }, body:text });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },

    logsStreamURL(params='') {
      if (!hasProxy) return null;
      return `${ENV.PROXY_BASE}/logs/stream${params?`?${params}`:''}`;
    },

    async runCmd(cmd) {
      if (!hasProxy) throw new Error('Proxy not configured');
      return postJson(`${ENV.PROXY_BASE}/run`, { cmd });
    }
  };
  return api;
}

// --------------------------- Global Store Hook ---------------------------
function useStore() {
  const ENV = useStableENV();
  const api = useMemo(()=>makeAPI(ENV), [ENV]);

  const [env, setEnv] = useState('dev');
  const [loa, setLoa] = useState(1);
  const [kill, setKill] = useState(0);
  const [services, setServices] = useState({ ollama:false, litellm:false, neo4j:false, federation:false });
  const [models, setModels] = useState([]);
  const [health, setHealth] = useState(null);
  const [burndown, setBurndown] = useState(null);

  // Poll health
  useInterval(async () => {
    try {
      const h = await api.health();
      setHealth(h);
      if (h?.services) setServices({
        ollama: h.services.ollama === true || h.services.ollama === 'UP',
        litellm: h.services.litellm === true || h.services.litellm === 'UP',
        neo4j: h.services.neo4j === true || h.services.neo4j === 'UP',
        federation: h.services.federation === true || h.services.federation === 'READY',
      });
      if (h.env) setEnv(h.env);
      if (typeof h.loa === 'number') setLoa(h.loa);
      if (typeof h.kill === 'number') setKill(h.kill);
    } catch (e) {
      // keep previous
    }
  }, 2000, [api]);

  // Poll burndown
  useInterval(async () => {
    try { setBurndown(await api.burndown()); } catch {}
  }, 5000, [api]);

  // Refresh models occasionally
  useEffect(() => { (async()=>{ const m = await api.models(); setModels(m.items||[]); })(); }, [api]);
  useInterval(async () => { try { const m = await api.models(); setModels(m.items||[]); } catch {} }, 30000, [api]);

  return {
    api, ENV,
    env, setEnv,
    loa, setLoa,
    kill, setKill,
    services,
    models,
    health,
    burndown,
  };
}

// --------------------------- UI Primitives ---------------------------
function StatChip({ ok, label }) {
  return (
    <span className={cn("px-2 py-1 rounded text-xs font-semibold", ok?"bg-green-100 text-green-700":"bg-gray-200 text-gray-700")}>{label}{" "}{ok?"UP":"DOWN"}</span>
  );
}

function EnvBadge({ env }) {
  return (
    <span className={cn("px-2 py-1 rounded text-xs font-medium",
      env === "prod" ? "bg-red-100 text-red-700" : env === "staging" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800")}>{env}
    </span>
  );
}

function Card({ title, right, children, className }) {
  return (
    <div className={cn("bg-white border rounded-2xl p-4 shadow-sm", className)}>
      {(title || right) && (
        <div className="flex items-center mb-3">
          <div className="text-sm font-semibold">{title}</div>
          <div className="ml-auto">{right}</div>
        </div>
      )}
      {children}
    </div>
  );
}

function ProgressBar({ value, max, caption }) {
  const frac = max > 0 ? Math.min(1, value/max) : 0;
  const w = Math.round(frac*100);
  return (
    <div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div style={{width:`${w}%`}} className="h-full bg-indigo-600"/></div>
      {caption && <div className="text-xs text-gray-600 mt-1">{caption}</div>}
    </div>
  );
}

function Skeleton({ className }) {
  return <div className={cn("animate-pulse bg-gray-200 rounded", className)} />
}

// --------------------------- Panels ---------------------------
function Header({ store }) {
  const { ENV } = store;
  return (
    <div className="flex items-center gap-3 p-3 border-b bg-white sticky top-0 z-10">
      <div className="text-lg font-semibold">🎼 Symphony</div>
      <div className="ml-2 flex items-center gap-3 text-sm">
        <EnvBadge env={store.env} />
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <label>Env</label>
          <select value={store.env} onChange={e=>store.setEnv(e.target.value)} className="rounded border-gray-300">
            <option>dev</option><option>staging</option><option>prod</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <label>LOA</label>
          <input type="range" min={0} max={3} value={store.loa} onChange={e=>store.setLoa(Number(e.target.value))} />
          <span className="font-medium">{store.loa}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <label>Kill</label>
          <button onClick={()=>store.setKill(store.kill?0:1)} className={cn("px-2 py-1 rounded", store.kill?"bg-red-600 text-white":"bg-gray-200")}>{store.kill?"ON":"OFF"}</button>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2 text-xs">
        <StatChip ok={store.services.ollama} label="Ollama" />
        <StatChip ok={store.services.litellm} label="LiteLLM" />
        <StatChip ok={store.services.neo4j} label="Neo4j" />
        <StatChip ok={store.services.federation} label="Federation" />
      </div>
      <div className="text-[10px] text-gray-500 ml-3">
        {ENV.PROXY_BASE?`Proxy: ${ENV.PROXY_BASE}`:"Proxy: (not set)"}
      </div>
    </div>
  );
}

function Sidebar({ active, setActive }) {
  const TABS = [
    { id: "dash", label: "Dashboard" },
    { id: "route", label: "Routing Studio" },
    { id: "rag", label: "RAG Console" },
    { id: "guard", label: "Neo4j Guard" },
    { id: "budgets", label: "Budgets & Burndown" },
    { id: "policies", label: "Policies & LOA" },
    { id: "logs", label: "Logs" },
    { id: "ci", label: "CI & Chaos" },
    { id: "docs", label: "Docs & Runbooks" },
  ];
  return (
    <div className="w-full md:w-64 border-r bg-white">
      <div className="p-3 text-sm text-gray-500">Navigation</div>
      <nav className="px-2 pb-4 flex md:flex-col gap-2 overflow-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setActive(t.id)} className={cn("text-left px-3 py-2 rounded-md text-sm",
            active===t.id?"bg-indigo-600 text-white":"hover:bg-gray-100 text-gray-800")}>{t.label}</button>
        ))}
      </nav>
    </div>
  );
}

function Dashboard({ store }) {
  const h = store.health; const b = store.burndown;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card title="Health">
        {!h ? (
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-6"/><Skeleton className="h-6"/>
            <Skeleton className="h-6"/><Skeleton className="h-6"/>
          </div>
        ) : (
          <div className="text-sm grid grid-cols-2 gap-3">
            <div><span className="font-semibold">ENV:</span> {store.env}</div>
            <div><span className="font-semibold">LOA:</span> {store.loa}</div>
            <div><span className="font-semibold">Kill:</span> {store.kill?"ON":"OFF"}</div>
            <div><span className="font-semibold">Clock:</span> {fmt.time(h.clock_utc || new Date().toISOString())}</div>
          </div>
        )}
      </Card>

      <Card title="Instant Perf (last 60s)">
        {!b ? <Skeleton className="h-6"/> : (
          <div className="text-sm">
            <div>RPS: <span className="font-mono">{fmt.num(b?.perf?.rps_last_60s, 3)}</span></div>
            <div>p50: <span className="font-mono">{fmt.ms(b?.perf?.p50_ms_last_60s)}</span> · p95: <span className="font-mono">{fmt.ms(b?.perf?.p95_ms_last_60s)}</span></div>
            <div className="text-xs text-gray-500">Updated {fmt.time(b?.generated_at)}</div>
          </div>
        )}
      </Card>

      <Card title="RAG Freshness">
        {/* Minimal: show from burndown time as proxy if rag stats not wired */}
        <div className="text-sm text-gray-600">Use Docs panel for onboarding; RAG stats will appear here when /rag/stats is enabled.</div>
      </Card>

      <Card title="Burndown (1 minute)"><ModelWindow win="m1" burndown={b} /></Card>
      <Card title="Burndown (1 hour)"><ModelWindow win="h1" burndown={b} /></Card>
      <Card title="Queue & Errors">
        <div className="text-sm text-gray-600">Hook to your queue depth & error rate metrics if available.</div>
      </Card>

      <div className="xl:col-span-2">
        <Card title="Recent Routes (sample)">
          <div className="text-xs text-gray-500">Wire to /logs or /route history.</div>
        </Card>
      </div>
      <Card title="Recent Logs (tail)"><LogsTailMini store={store} /></Card>
    </div>
  );
}

function ModelWindow({ win, burndown }) {
  if (!burndown) return <Skeleton className="h-24"/>;
  const W = burndown?.windows?.[win];
  if (!W) return <div className="text-sm text-gray-500">No data.</div>;
  const per = W.per_model || {}; const names = Object.keys(per).sort();
  return (
    <div>
      <div className="text-xs text-gray-500 mb-2">Resets at {fmt.time(W.reset_at)}</div>
      <div className="space-y-3">
        {names.length===0 && <div className="text-sm text-gray-500">No data.</div>}
        {names.map(m => {
          const v = per[m];
          const cap = v?.caps?.minute_rpm_cap || 0;
          const caption = `p50 ${fmt.ms(v.p50_ms)} · p95 ${fmt.ms(v.p95_ms)} · tok ${fmt.num(v.tokens)}`;
          return (
            <div key={m}>
              <div className="flex items-center justify-between text-sm"><div className="font-medium">{m}</div>{cap? <div className="text-xs text-gray-500">cap {cap}</div>:null}</div>
              <ProgressBar value={v.req||0} max={cap||100} caption={caption} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LogsTailMini({ store }) {
  const [out, setOut] = useState("");
  const [enabled, setEnabled] = useState(false);
  const url = store.api.logsStreamURL();
  useSSE(enabled ? url : null, { onMessage: (data) => setOut((s)=> (s + (s?"\n":"") + data).split("\n").slice(-200).join("\n")) });
  return (
    <div>
      {url ?
        <div className="mb-2"><button onClick={()=>setEnabled(!enabled)} className={cn("px-2 py-1 rounded text-xs border", enabled?"bg-gray-900 text-white":"bg-white")}>{enabled?"Stop":"Start"} streaming</button></div>
      : <div className="text-xs text-amber-600 mb-2">Proxy not configured; streaming disabled.</div>}
      <pre className="text-xs whitespace-pre-wrap min-h-[140px] max-h-[220px] overflow-auto">{out || "(no output)"}</pre>
    </div>
  );
}

function RoutingStudio({ store }) {
  const [task, setTask] = useState("nl2cypher");
  const [input, setInput] = useState("");
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const disabled = store.kill===1;

  async function doPlan(){ setBusy(true); setRes(null); try{ const p = await store.api.routePlan({ task, env:store.env, loa:store.loa }); setPlan(p); }catch(e){ setPlan({ error: e.message }); } finally{ setBusy(false);} }
  async function doExec(){ setBusy(true); try{ const r = await store.api.routeExecute({ task, input, env:store.env, loa:store.loa }); setRes(r);}catch(e){ setRes({ error:e.message }); } finally{ setBusy(false);} }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Task Meta" right={<div className="flex gap-2">
        <button onClick={doPlan} className="px-3 py-1.5 rounded-xl border disabled:opacity-50" disabled={busy}>Run Dry-Run</button>
        <button onClick={doExec} className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white disabled:opacity-50" disabled={busy || disabled}>{disabled?"Blocked (Kill)":"Execute Now"}</button>
      </div>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <label className="text-xs text-gray-600">Task</label>
            <select value={task} onChange={e=>setTask(e.target.value)} className="w-full border rounded-xl p-2">
              <option>nl2cypher</option>
              <option>qa</option>
              <option>code</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Model Candidates</label>
            <div className="text-xs text-gray-800 border rounded-xl p-2 h-[40px] overflow-auto">
              {store.models.length? store.models.map(m=>m.id).join(", ") : "(discovering…)"}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-600">Input</label>
            <textarea value={input} onChange={e=>setInput(e.target.value)} rows={6} className="w-full border rounded-xl p-3 font-mono text-xs" placeholder="Describe the task or question…"/>
          </div>
        </div>
      </Card>

      <Card title="Plan & Policy">
        {!plan? <div className="text-sm text-gray-500">Run a Dry-Run to preview routing and policy.</div> : (
          plan.error? <div className="text-sm text-red-600">{String(plan.error)}</div> : (
            <div className="text-sm space-y-2">
              <div><span className="font-medium">Decision:</span> {plan.decision?.model} · Conf {fmt.num(plan.decision?.confidence,2)}</div>
              <div className="text-xs text-gray-600">Reason: {plan.decision?.reason || '(none)'}
                <div className="mt-1">Policy: {plan.policy?.allow?"allow":"deny"} · max_loa {plan.policy?.max_loa} · hosted {String(plan.policy?.hosted_allowed)}</div>
              </div>
              <div>
                <div className="font-medium text-sm mt-2">Candidates</div>
                <div className="text-xs bg-gray-50 border rounded-xl p-2 max-h-[140px] overflow-auto">
                  {(plan.candidates||[]).map(c=>`${c.model} (score ${fmt.num(c.score,2)}${c.p50_ms?`, p50 ${fmt.ms(c.p50_ms)}`:''})`).join("\n") || "(none)"}
                </div>
              </div>
              <div>
                <div className="font-medium text-sm mt-2">Prompt Preview</div>
                <pre className="text-xs bg-gray-50 border rounded-xl p-2 whitespace-pre-wrap">{`[system]\n${plan.prompt_preview?.system || ''}\n\n[user]\n${plan.prompt_preview?.user || ''}`}</pre>
              </div>
            </div>
          )
        )}
      </Card>

      <div className="lg:col-span-2">
        <Card title="Run Result">
          {!res? <div className="text-sm text-gray-500">Execute to see results.</div> : (
            res.error? <div className="text-sm text-red-600">{String(res.error)}</div> : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div><span className="font-medium">Audit:</span> {res.audit_id || '—'}</div>
                <div><span className="font-medium">Latency:</span> {fmt.ms(res.latency_ms)}</div>
                <div><span className="font-medium">Cost:</span> {fmt.money(res.cost_usd)}</div>
                <div className="md:col-span-3">
                  <div className="text-xs text-gray-600">Output</div>
                  <pre className="text-xs bg-gray-50 border rounded-xl p-3 whitespace-pre-wrap">{res.text || '(no text)'}</pre>
                </div>
              </div>
            )
          )}
        </Card>
      </div>
    </div>
  );
}

function RagConsole({ store }) {
  const [q, setQ] = useState("");
  const [ans, setAns] = useState(null);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => { (async()=>{ try{ setStats(await store.api.ragStats()); }catch{ setStats(null);} })(); }, [store.api]);

  async function ask(){ setBusy(true); setAns(null); try{ const r = await store.api.ragQuery(q, 5); setAns(r); }catch(e){ setAns({ error: e.message }); } finally{ setBusy(false);} }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Query">
        <div className="flex gap-2 mb-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Ask a question…" className="flex-1 border rounded-xl px-3 py-2"/>
          <button onClick={ask} disabled={busy || !q} className="px-3 py-2 rounded-xl bg-indigo-600 text-white disabled:opacity-50">Ask</button>
        </div>
        <div className="text-xs text-gray-500">Index: {stats?`${stats.files} files`:'—'} · Updated: {fmt.time(stats?.last_indexed_at)}</div>
      </Card>
      <Card title="Answer">
        {!ans ? <div className="text-sm text-gray-500">No answer yet.</div> : ans.error ? <div className="text-sm text-red-600">{String(ans.error)}</div> : (
          <div>
            {ans._no_rag && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">RAG proxy is not configured. Answering via model only (no citations).</div>}
            <div className="text-sm whitespace-pre-wrap">{ans.answer}</div>
            <div className="mt-3">
              <div className="text-xs font-semibold">Citations</div>
              {(ans.cites||[]).length? (
                <ol className="list-decimal ml-5 text-xs">
                  {ans.cites.map((c,i)=>(<li key={i}><a className="text-indigo-700 underline" href={c.uri} target="_blank" rel="noreferrer">{c.title||c.id}</a><span className="text-gray-500"> — {c.snippet||''}</span></li>))}
                </ol>
              ) : <div className="text-xs text-gray-500">(none)</div>}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Neo4jGuard({ store }) {
  const [keep, setKeep] = useState(false);
  const [run, setRun] = useState(null);
  const [log, setLog] = useState("");
  const [status, setStatus] = useState("idle");

  async function start(){
    try {
      setStatus('starting');
      const r = await store.api.guardRun(keep);
      setRun(r); setStatus('running');
    } catch (e) { setStatus('error'); setLog(String(e.message)); }
  }

  const streamURL = run? store.api.guardStreamURL(run.run_id) : null;
  useSSE(streamURL, { onMessage: (d)=> setLog(s=> (s + (s?"\n":"") + d).split("\n").slice(-400).join("\n")) });

  async function finalize(){
    if (!run) return;
    try{ const rep = await store.api.guardReport(run.run_id); setStatus(rep.status||'done'); setLog(s => s + "\n\n---" + "-" + "report ---" + "\n" + (rep.log_tail||'')); }catch(e){ setStatus('error'); setLog(s=> s+"\n"+String(e.message)); }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Controls" right={<div className="flex gap-2">
        <label className="text-xs text-gray-600 flex items-center gap-1"><input type="checkbox" checked={keep} onChange={e=>setKeep(e.target.checked)} /> KEEP_DB</label>
        <button onClick={start} disabled={!store.ENV.PROXY_BASE || store.kill===1} className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white disabled:opacity-50">Run Guard</button>
        <button onClick={finalize} disabled={!run} className="px-3 py-1.5 rounded-xl border disabled:opacity-50">Finalize</button>
      </div>}>
        {!store.ENV.PROXY_BASE && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">Proxy not configured. To enable Guard runs, set <code>PROXY_BASE</code> and start the proxy.</div>}
        {store.kill===1 && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 mt-2">Kill switch is ON. Actions are disabled.</div>}
        <div className="text-xs text-gray-500 mt-2">Status: {status}</div>
        {run && <div className="text-xs text-gray-500">Run ID: {run.run_id}</div>}
      </Card>
      <Card title="Console">
        <pre className="text-xs whitespace-pre-wrap min-h-[260px] max-h-[380px] overflow-auto">{log || "(no output)"}</pre>
      </Card>
    </div>
  );
}

function Budgets({ store }) {
  const b = store.burndown;
  const budgets = b?.budgets || {};
  const names = Object.keys(budgets);
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card title="Minute Window"><ModelWindow win="m1" burndown={b} /></Card>
      <Card title="Hour Window"><ModelWindow win="h1" burndown={b} /></Card>
      <div className="xl:col-span-2">
        <Card title="Daily Window"><ModelWindow win="d1" burndown={b} /></Card>
      </div>
      <div className="xl:col-span-2">
        <Card title="Daily Budgets">
          {names.length===0 ? <div className="text-sm text-gray-500">No budgets configured.</div> : (
            <div className="space-y-3">
              {names.map(p => {
                const x = budgets[p];
                return (
                  <div key={p}>
                    <div className="flex items-center justify-between text-sm"><div className="font-medium">{p}</div><div className="text-xs text-gray-500">resets {fmt.time(x.resets_at)}</div></div>
                    <ProgressBar value={x.spent_usd||0} max={x.daily_budget_usd||0} caption={`${fmt.money(x.spent_usd)} / ${fmt.money(x.daily_budget_usd)} (${fmt.pct(x.fraction_used)})`} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Policies({ store }) {
  const [text, setText] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(()=>{ (async()=>{ try{ const r = await store.api.policyGet(); setText(r.text||''); setDetails(`v${r.version||'—'} · ${r.updated_at?new Date(r.updated_at).toLocaleString():''}`);}catch(e){ setText(`# Unable to load policy\n${e.message}`); } })(); }, [store.api]);

  async function save(){ setBusy(true); try{ const r = await store.api.policyPut(text); setDetails(`v${r.version||'—'}`); }catch(e){ alert(`Save failed: ${e.message}`);} finally{ setBusy(false);} }

  return (
    <div className="max-w-3xl">
      <Card title="Policy Editor" right={
        <div className="flex items-center gap-3">
          <div className="text-slate-500 text-sm">{details}</div>
          <button onClick={save} disabled={busy || !store.ENV.PROXY_BASE} className="px-3 py-1.5 rounded-xl bg-slate-900 text-white disabled:opacity-50">Save</button>
        </div>
      }> 
        {store.ENV.PROXY_BASE ? null : (
          <div className="text-xs text-amber-600 mb-2">Proxy not configured; editor is read-only.</div>
        )}
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={18} className="w-full border rounded-xl p-3 font-mono text-xs" />
        <div className="text-xs mt-2 text-slate-500">{busy ? "Working…" : ""}</div>
      </Card>
    </div>
  );
}

function Logs({ store }) {
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [streamOn, setStreamOn] = useState(false);

  const url = store.api.logsStreamURL();
  useSSE(streamOn ? url : null, { onMessage: (d)=> setOut(s=> (s + (s?"\n":"") + d).split("\n").slice(-1000).join("\n")) });

  const pull = async () => {
    setBusy(true);
    setOut("");
    try {
      const r = await store.api.runCmd("tail -n 200 /tmp/litellm.log");
      setOut(r.stdout || r.stderr || "");
    } catch (e) {
      setOut(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="LiteLLM Logs" right={
      <div className="flex gap-2">
        <button onClick={()=>setStreamOn(!streamOn)} disabled={!store.ENV.PROXY_BASE} className="px-3 py-1.5 rounded-xl border disabled:opacity-50">{streamOn?"Stop":"Start"} Stream</button>
        <button onClick={pull} disabled={busy || !store.ENV.PROXY_BASE} className="px-3 py-1.5 rounded-xl border disabled:opacity-50">One-shot</button>
      </div>
    }>
      {store.ENV.PROXY_BASE ? (
        <pre className="text-xs whitespace-pre-wrap min-h-[240px]">{out || (busy ? "Loading…" : "(no output)")}</pre>
      ) : (
        <div className="text-sm text-slate-600">Proxy not configured. Logs available on host at <code>/tmp/litellm.log</code>.</div>
      )}
    </Card>
  );
}

function CIChaos({ store }) {
  const [busy, setBusy] = useState(false);
  async function run(cmd){
    if (!store.ENV.PROXY_BASE) return alert('Proxy not configured');
    if (store.kill===1) return alert('Kill switch is ON');
    setBusy(true);
    try { const r = await store.api.runCmd(cmd); alert(`Started: pid ${r.pid||'?'}\n${r.stdout||''}${r.stderr||''}`); } catch (e) { alert(`Error: ${e.message}`); } finally { setBusy(false); }
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="Config Validate"><button onClick={()=>run("just validate-config")} disabled={busy || !store.ENV.PROXY_BASE || store.kill===1} className="px-3 py-2 rounded-xl bg-indigo-600 text-white disabled:opacity-50">Run</button></Card>
      <Card title="Smoke Test"><button onClick={()=>run("just smoke-test")} disabled={busy || !store.ENV.PROXY_BASE || store.kill===1} className="px-3 py-2 rounded-xl bg-indigo-600 text-white disabled:opacity-50">Run</button></Card>
      <Card title="Chaos Drill"><button onClick={()=>run("just chaos-drill")} disabled={busy || !store.ENV.PROXY_BASE || store.kill===1} className="px-3 py-2 rounded-xl bg-red-600 text-white disabled:opacity-50">Run</button></Card>
      <Card title="Notes"><div className="text-sm text-gray-600">Commands must be allow-listed by the proxy. LOA/Kill gates apply.</div></Card>
    </div>
  );
}

function Docs() {
  return (
    <div className="prose max-w-none">
      <h2>Docs & Runbooks</h2>
      <ul className="list-disc pl-6">
        <li>Onboarding: how to configure LiteLLM, Ollama, and the Proxy.</li>
        <li>Incident Playbooks: rate-limit storms, provider outages, policy regressions.</li>
        <li>Release Checklist: smoke tests, policy diff, LOA audit, rollback plan.</li>
      </ul>
      <p className="text-sm text-gray-600">Wire these to your internal docs when ready.</p>
    </div>
  );
}

// --------------------------- App ---------------------------
export default function App() {
  const store = useStore();
  const [active, setActive] = useState("dash");

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header store={store} />
      <div className="flex">
        <Sidebar active={active} setActive={setActive} />
        <main className="flex-1 p-4">
          {active === "dash" && <Dashboard store={store} />}
          {active === "route" && <RoutingStudio store={store} />}
          {active === "rag" && <RagConsole store={store} />}
          {active === "guard" && <Neo4jGuard store={store} />}
          {active === "budgets" && <Budgets store={store} />}
          {active === "policies" && <Policies store={store} />}
          {active === "logs" && <Logs store={store} />}
          {active === "ci" && <CIChaos store={store} />}
          {active === "docs" && <Docs />}
        </main>
      </div>
    </div>
  );
}