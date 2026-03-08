"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptActivityMonitor = PromptActivityMonitor;
exports.default = SymphonyOperatorConsole;
const react_1 = __importStar(require("react"));
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const input_1 = require("@/components/ui/input");
const textarea_1 = require("@/components/ui/textarea");
const Tabs_1 = require("@/components/ui/Tabs");
const Badge_1 = require("@/components/ui/Badge");
const switch_1 = require("@/components/ui/switch");
const label_1 = require("@/components/ui/label");
const slider_1 = require("@/components/ui/slider");
const separator_1 = require("@/components/ui/separator");
const lucide_react_1 = require("lucide-react");
const recharts_1 = require("recharts");
const mermaid_1 = __importDefault(require("mermaid"));
/**
 * Symphony Operator Console — single-file preview component
 *
 * Goals
 * - Fine-grained routing controls (weights, fallbacks, LOA, time windows)
 * - Real-time visibility (latency/error/budget charts, SSE log stream)
 * - Pre-planning (run plans with acceptance, schedule heavy jobs in model windows)
 * - GitHub integration (issues/PRs pane) + lightweight ticketing board
 * - Token/context meters and request composer for fast probes
 *
 * Assumptions
 * - Proxy exposes: /status/health.json, /status/burndown.json, /models, /route/plan, /route/execute
 * - Optional: /route/policy (GET/PUT), /route/schedule (GET/PUT), /logs/stream (SSE), /status/events (SSE)
 * - Optional RAG: /rag/status or /rag/index/status (returns last_indexed_at)
 *
 * Style
 * - Tailwind + shadcn/ui; grid-based layout; accessible labels; neutral theme
 */
// ---------- Utilities ----------
const getProxyBase = () => {
    const ls = typeof window !== 'undefined'
        ? localStorage.getItem('symphony:proxyBase')
        : null;
    return ls || 'http://127.0.0.1:8787';
};
async function getJSON(path, init) {
    const base = getProxyBase();
    const r = await fetch(`${base}${path}`, {
        headers: { 'content-type': 'application/json' },
        ...init,
    });
    if (!r.ok) {
        throw new Error(`${path} ${r.status}`);
    }
    return r.json();
}
function useInterval(callback, delay) {
    const savedRef = (0, react_1.useRef)(undefined);
    (0, react_1.useEffect)(() => {
        savedRef.current = callback;
    }, [callback]);
    (0, react_1.useEffect)(() => {
        if (delay === null) {
            return;
        }
        const id = setInterval(() => savedRef.current && savedRef.current(), delay);
        return () => clearInterval(id);
    }, [delay]);
}
function useSSE(paths) {
    const [lines, setLines] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        let es = null;
        let closed = false;
        const base = getProxyBase();
        function connect(idx = 0) {
            if (idx >= paths.length) {
                return;
            }
            try {
                es = new EventSource(`${base}${paths[idx]}`);
                es.onmessage = ev => setLines(l => [...l.slice(-999), ev.data]);
                es.onerror = () => {
                    es?.close();
                    if (!closed) {
                        setTimeout(() => connect(idx + 1), 500);
                    }
                };
            }
            catch {
                if (!closed) {
                    setTimeout(() => connect(idx + 1), 500);
                }
            }
        }
        connect();
        return () => {
            closed = true;
            es?.close();
        };
    }, [paths.join(',')]);
    return lines;
}
// ---------- Small helpers ----------
function Stat({ label, value, suffix, warn, }) {
    return (<div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xl font-semibold ${warn ? 'text-amber-600' : ''}`}>
        {value}
        {suffix || ''}
      </span>
    </div>);
}
// ---------- KPI Bar ----------
function KPIBar() {
    const [bd, setBd] = (0, react_1.useState)(null);
    const [hl, setHl] = (0, react_1.useState)(null);
    const refresh = async () => {
        try {
            setBd(await getJSON('/status/burndown.json'));
        }
        catch {
            // Silently ignore burndown fetch errors
        }
        try {
            setHl(await getJSON('/status/health.json'));
        }
        catch {
            // Silently ignore health fetch errors
        }
    };
    (0, react_1.useEffect)(() => {
        refresh();
    }, []);
    useInterval(refresh, 10_000);
    const p95 = bd?.windows?.m1?.latency_ms_p95 ?? bd?.windows?.h1?.latency_ms_p95 ?? 0;
    const errRate = (0, react_1.useMemo)(() => {
        if (!bd) {
            return 0;
        }
        const w = bd.windows.m1 || bd.windows.h1;
        const errors = w?.errors || 0;
        const total = w?.count || 0;
        return total ? (errors / total) * 100 : 0;
    }, [bd]);
    const avail = (0, react_1.useMemo)(() => {
        const ok = hl && Object.values(hl.services || {}).every(s => s.status === 'ok');
        return ok ? 99.99 : 99.0;
    }, [hl]);
    return (<Card_1.Card className="col-span-12">
      <Card_1.CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="p95 route/execute" value={Math.round(p95)} suffix=" ms" warn={p95 > 2500}/>
        <Stat label="error rate (m1)" value={errRate.toFixed(2)} suffix="%" warn={errRate > 1}/>
        <Stat label="availability" value={avail.toFixed(2)} suffix="%"/>
        <div className="flex items-center gap-2">
          <Badge_1.Badge variant="outline" className="flex items-center gap-1">
            <lucide_react_1.Activity className="w-3 h-3"/> live
          </Badge_1.Badge>
          <span className="text-xs text-muted-foreground">
            proxy: {getProxyBase()}
          </span>
        </div>
      </Card_1.CardContent>
    </Card_1.Card>);
}
function PromptActivityMonitor({ active }) {
    const [prompts, setPrompts] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [expanded, setExpanded] = (0, react_1.useState)(null);
    const pollerRef = (0, react_1.useRef)(null);
    const fetchPrompts = async () => {
        setLoading(true);
        try {
            const data = await getJSON('/api/ai/activity');
            if (data && data.history) {
                setPrompts(data.history);
            }
        }
        catch (e) {
            console.error('Failed to fetch prompt history', e);
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        if (!active) {
            if (pollerRef.current) {
                clearInterval(pollerRef.current);
            }
            pollerRef.current = null;
            return;
        }
        fetchPrompts();
        pollerRef.current = setInterval(fetchPrompts, 5000);
        return () => {
            if (pollerRef.current) {
                clearInterval(pollerRef.current);
            }
            pollerRef.current = null;
        };
    }, [active]);
    return (<Card_1.Card className="col-span-12">
      <Card_1.CardHeader>
        <Card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Bot className="w-4 h-4"/>
          Agent Prompt Activity
        </Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent>
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button_1.Button size="sm" variant="outline" onClick={fetchPrompts} disabled={loading}>
                Refresh
            </Button_1.Button>
          </div>
          <div className="space-y-2">
            {prompts.length === 0 ? (<div className="text-sm text-muted-foreground text-center py-8">
                    No prompt activity recorded yet.
                </div>) : (prompts.map((p) => (<div key={p.id} className="border rounded-md p-3 text-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <Badge_1.Badge variant={p.status === 'success' ? 'default' : 'destructive'}>
                                    {p.status}
                                </Badge_1.Badge>
                                <span className="font-mono text-xs">{new Date(p.timestamp).toLocaleTimeString()}</span>
                                <span className="text-muted-foreground">via {p.provider} / {p.model}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{Math.round(p.latency)}ms</span>
                                {p.tokens && <span>{p.tokens.total_tokens} tokens</span>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="bg-muted p-2 rounded cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                                <div className="font-semibold text-xs mb-1 text-muted-foreground">PROMPT</div>
                                <div className={`font-mono text-xs whitespace-pre-wrap ${expanded === p.id ? '' : 'line-clamp-2'}`}>
                                    {p.messages ? JSON.stringify(p.messages, null, 2) : p.prompt}
                                </div>
                            </div>

                            {p.response && (<div className="bg-slate-50 dark:bg-slate-900 p-2 rounded">
                                    <div className="font-semibold text-xs mb-1 text-muted-foreground">RESPONSE</div>
                                    <div className={`font-mono text-xs whitespace-pre-wrap ${expanded === p.id ? '' : 'line-clamp-3'}`}>
                                        {p.response}
                                    </div>
                                </div>)}

                            {p.error && (<div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-2 rounded">
                                    <div className="font-semibold text-xs mb-1">ERROR</div>
                                    <div className="font-mono text-xs">{p.error}</div>
                                </div>)}
                        </div>
                    </div>)))}
          </div>
        </div>
      </Card_1.CardContent>
    </Card_1.Card>);
}
// ---------- Live Charts ----------
function useBurndownSeries() {
    const [series, setSeries] = (0, react_1.useState)([]);
    const tick = async () => {
        try {
            const bd = await getJSON('/status/burndown.json');
            const w = bd.windows.m1 || bd.windows.h1;
            const p95 = w?.latency_ms_p95 || 0;
            const errors = w?.errors || 0;
            const count = w?.count || 0;
            setSeries(s => [
                ...s.slice(-120),
                { time: Date.now(), p95, errors, count },
            ]);
        }
        catch {
            // Silently ignore telemetry fetch errors
        }
    };
    (0, react_1.useEffect)(() => {
        tick();
    }, []);
    useInterval(tick, 5000);
    return series;
}
function LatencyChart() {
    const data = useBurndownSeries();
    return (<Card_1.Card className="col-span-12 lg:col-span-8">
      <Card_1.CardHeader>
        <Card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Gauge className="w-4 h-4"/>
          Latency & Throughput
        </Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent className="h-56">
        <recharts_1.ResponsiveContainer width="100%" height="100%">
          <recharts_1.AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <recharts_1.XAxis dataKey="time" tickFormatter={t => new Date(t).toLocaleTimeString()} hide/>
            <recharts_1.YAxis hide/>
            <recharts_1.Tooltip formatter={(v, n) => [v, n]} labelFormatter={(t) => new Date(t).toLocaleTimeString()}/>
            <recharts_1.Area type="monotone" dataKey="p95" fillOpacity={0.2}/>
            <recharts_1.Line type="monotone" dataKey="count" dot={false}/>
          </recharts_1.AreaChart>
        </recharts_1.ResponsiveContainer>
      </Card_1.CardContent>
    </Card_1.Card>);
}
function ErrorChart() {
    const data = useBurndownSeries();
    return (<Card_1.Card className="col-span-12 lg:col-span-4">
      <Card_1.CardHeader>
        <Card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.AlertCircle className="w-4 h-4"/>
          Errors/min
        </Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent className="h-56">
        <recharts_1.ResponsiveContainer width="100%" height="100%">
          <recharts_1.BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <recharts_1.XAxis dataKey="time" tickFormatter={t => new Date(t).toLocaleTimeString()} hide/>
            <recharts_1.YAxis hide/>
            <recharts_1.Tooltip />
            <recharts_1.Bar dataKey="errors"/>
          </recharts_1.BarChart>
        </recharts_1.ResponsiveContainer>
      </Card_1.CardContent>
    </Card_1.Card>);
}
function RoutingMatrix() {
    const [models, setModels] = (0, react_1.useState)([]);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const load = async () => {
        try {
            const current = await getJSON('/models');
            const base = (current.items || []).map(m => ({
                name: m.id,
                weight: 1,
                allow: true,
            }));
            // Merge from /route/policy if present
            try {
                const pol = await getJSON('/route/policy');
                const merged = base.map(b => pol.models.find(p => p.name === b.name) || b);
                setModels(merged);
            }
            catch {
                setModels(base);
            }
        }
        catch {
            // Silently ignore model config fetch errors
        }
    };
    (0, react_1.useEffect)(() => {
        load();
    }, []);
    const save = async () => {
        setSaving(true);
        try {
            await getJSON('/route/policy', {
                method: 'PUT',
                body: JSON.stringify({ models }),
            });
        }
        catch {
            // Silently ignore policy save errors
        }
        setSaving(false);
    };
    return (<Card_1.Card className="col-span-12">
      <Card_1.CardHeader>
        <Card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Network className="w-4 h-4"/>
          Routing Matrix
        </Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent className="space-y-3">
        {models.map((m, i) => (<div key={m.name} className="grid grid-cols-12 items-center gap-3">
            <div className="col-span-12 md:col-span-3 truncate">
              <code className="text-sm">{m.name}</code>
            </div>
            <div className="col-span-12 md:col-span-3 flex items-center gap-3">
              <label_1.Label className="text-xs">weight</label_1.Label>
              <slider_1.Slider value={[m.weight]} onValueChange={v => setModels(arr => arr.map((x, idx) => idx === i ? { ...x, weight: v[0] } : x))} min={0} max={10} step={0.5} className="w-40"/>
              <span className="text-xs w-8">{m.weight}</span>
            </div>
            <div className="col-span-6 md:col-span-2 flex items-center gap-2">
              <label_1.Label className="text-xs">allow</label_1.Label>
              <switch_1.Switch checked={m.allow} onCheckedChange={v => setModels(arr => arr.map((x, idx) => (idx === i ? { ...x, allow: v } : x)))}/>
            </div>
            <div className="col-span-6 md:col-span-2">
              <input_1.Input placeholder="rpm cap" value={m.rpm_cap ?? ''} onChange={e => setModels(arr => arr.map((x, idx) => idx === i
                ? { ...x, rpm_cap: Number(e.target.value) || undefined }
                : x))}/>
            </div>
            <div className="col-span-6 md:col-span-2">
              <input_1.Input placeholder="tpm cap" value={m.tpm_cap ?? ''} onChange={e => setModels(arr => arr.map((x, idx) => idx === i
                ? { ...x, tpm_cap: Number(e.target.value) || undefined }
                : x))}/>
            </div>
          </div>))}
        <div className="flex gap-2">
          <Button_1.Button onClick={save} disabled={saving}>
            <lucide_react_1.Save className="w-4 h-4 mr-2"/>
            Save Policy
          </Button_1.Button>
          <Button_1.Button variant="outline" onClick={load}>
            Reload
          </Button_1.Button>
        </div>
      </Card_1.CardContent>
    </Card_1.Card>);
}
// ---------- Model Usage Windows (scheduler) ----------
function UsageWindows() {
    const [rows, setRows] = (0, react_1.useState)([]);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const load = async () => {
        try {
            const pol = await getJSON('/route/schedule');
            setRows(pol.windows);
        }
        catch {
            setRows([]);
        }
    };
    (0, react_1.useEffect)(() => {
        load();
    }, []);
    const save = async () => {
        setSaving(true);
        try {
            await getJSON('/route/schedule', {
                method: 'PUT',
                body: JSON.stringify({ windows: rows }),
            });
        }
        catch {
            // Silently ignore schedule save errors
        }
        setSaving(false);
    };
    return (<Card_1.Card className="col-span-12">
      <Card_1.CardHeader>
        <Card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Zap className="w-4 h-4"/>
          High‑Value Model Windows
        </Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Define daily/weekly time windows (CRON or iCal syntax) when costly
          models are eligible. Outside windows, requests overflow to
          local/cheaper models.
        </p>
        {rows.map((r, i) => (<div key={i} className="grid grid-cols-12 gap-2 items-center">
            <input_1.Input className="col-span-12 md:col-span-4" placeholder="model name (e.g., gemini/1.5-pro)" value={r.name} onChange={e => setRows(arr => arr.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}/>
            <input_1.Input className="col-span-12 md:col-span-6" placeholder="window (e.g., Mon-Fri 09:00-14:00 MT)" value={r.window} onChange={e => setRows(arr => arr.map((x, idx) => idx === i ? { ...x, window: e.target.value } : x))}/>
            <input_1.Input className="col-span-12 md:col-span-2" placeholder="overflow→" value={r.overflow_to || ''} onChange={e => setRows(arr => arr.map((x, idx) => idx === i ? { ...x, overflow_to: e.target.value } : x))}/>
          </div>))}
        <div className="flex gap-2">
          <Button_1.Button onClick={() => setRows(r => [
            ...r,
            { name: '', window: '', overflow_to: 'local/ollama' },
        ])}>
            Add Window
          </Button_1.Button>
          <Button_1.Button onClick={save} disabled={saving}>
            <lucide_react_1.Save className="w-4 h-4 mr-2"/>
            Save Schedule
          </Button_1.Button>
          <Button_1.Button variant="outline" onClick={load}>
            Reload
          </Button_1.Button>
        </div>
      </Card_1.CardContent>
    </Card_1.Card>);
}
// ---------- Request Composer (token/context meter) ----------
function RequestComposer() {
    const [task, setTask] = (0, react_1.useState)('qa');
    const [input, setInput] = (0, react_1.useState)('say hello');
    const [model, setModel] = (0, react_1.useState)('');
    const [result, setResult] = (0, react_1.useState)(null);
    const [lat, setLat] = (0, react_1.useState)(null);
    const send = async () => {
        const t0 = performance.now();
        try {
            const r = await getJSON('/route/execute', {
                method: 'POST',
                body: JSON.stringify({ task, input, env: 'dev', loa: 1, model }),
            });
            setResult(r);
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            setResult({ error: errorMessage });
        }
        setLat(performance.now() - t0);
    };
    return (<Card_1.Card className="col-span-12">
      <Card_1.CardHeader>
        <Card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Play className="w-4 h-4"/>
          Request Composer
        </Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent className="space-y-2">
        <div className="grid grid-cols-12 gap-2 items-center">
          <input_1.Input className="col-span-12 md:col-span-2" placeholder="task" value={task} onChange={e => setTask(e.target.value)}/>
          <input_1.Input className="col-span-12 md:col-span-4" placeholder="model (optional)" value={model} onChange={e => setModel(e.target.value)}/>
          <textarea_1.Textarea className="col-span-12 md:col-span-6" placeholder="input" value={input} onChange={e => setInput(e.target.value)}/>
        </div>
        <div className="flex gap-2 items-center">
          <Button_1.Button onClick={send}>
            <lucide_react_1.Triangle className="w-4 h-4 mr-2"/>
            Execute
          </Button_1.Button>
          {lat !== null && (<Badge_1.Badge variant="secondary">TTFB ~ {Math.round(lat)} ms</Badge_1.Badge>)}
        </div>
        {result && (<pre className="p-3 bg-muted rounded-lg overflow-auto text-xs max-h-64">
            {JSON.stringify(result, null, 2)}
          </pre>)}
      </Card_1.CardContent>
    </Card_1.Card>);
}
// ---------- Live Logs (SSE) ----------
function LiveLogs() {
    const lines = useSSE(['/logs/stream', '/status/events']);
    return (<Card_1.Card className="col-span-12">
      <Card_1.CardHeader>
        <Card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Activity className="w-4 h-4"/>
          Live Events
        </Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent>
        <div className="h-48 overflow-auto rounded bg-muted p-2 text-xs font-mono">
          {lines.slice(-500).map((l, i) => (<div key={i} className="whitespace-pre-wrap">
              {l}
            </div>))}
        </div>
      </Card_1.CardContent>
    </Card_1.Card>);
}
// ---------- Mermaid Plan/Decision Trace ----------
function MermaidTrace({ spec }) {
    const ref = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        mermaid_1.default.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: 'neutral',
        });
    }, []);
    (0, react_1.useEffect)(() => {
        if (ref.current) {
            mermaid_1.default.run({ querySelector: '.mermaid' });
        }
    }, [spec]);
    return (<Card_1.Card className="col-span-12">
      <Card_1.CardHeader>
        <Card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Shield className="w-4 h-4"/>
          Explain Route
        </Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent>
        <figure>
          <div ref={ref} className="mermaid">
            {spec}
          </div>
          <figcaption className="text-xs text-muted-foreground mt-2">
            Route plan → decision → execute (securityLevel=strict; sanitized
            spec)
          </figcaption>
        </figure>
      </Card_1.CardContent>
    </Card_1.Card>);
}
// ---------- GitHub Pane (simple) ----------
function GitHubPane() {
    const [token, setToken] = (0, react_1.useState)(typeof window !== 'undefined' ? localStorage.getItem('gh:token') || '' : '');
    const [owner, setOwner] = (0, react_1.useState)(typeof window !== 'undefined' ? localStorage.getItem('gh:owner') || '' : '');
    const [repo, setRepo] = (0, react_1.useState)(typeof window !== 'undefined' ? localStorage.getItem('gh:repo') || '' : '');
    const [issues, setIssues] = (0, react_1.useState)([]);
    const save = () => {
        localStorage.setItem('gh:token', token);
        localStorage.setItem('gh:owner', owner);
        localStorage.setItem('gh:repo', repo);
    };
    const load = async () => {
        if (!token || !owner || !repo) {
            return;
        }
        const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?per_page=20`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
            },
        });
        if (r.ok) {
            setIssues(await r.json());
        }
    };
    (0, react_1.useEffect)(() => {
        load();
    }, [token, owner, repo]);
    return (<Card_1.Card className="col-span-12">
      <Card_1.CardHeader>
        <Card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Github className="w-4 h-4"/>
          GitHub Issues
        </Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent className="space-y-2">
        <div className="grid grid-cols-12 gap-2 items-center">
          <input_1.Input className="col-span-12 md:col-span-3" placeholder="owner" value={owner} onChange={e => setOwner(e.target.value)}/>
          <input_1.Input className="col-span-12 md:col-span-3" placeholder="repo" value={repo} onChange={e => setRepo(e.target.value)}/>
          <input_1.Input className="col-span-12 md:col-span-6" placeholder="gh token (repo scope)" value={token} onChange={e => setToken(e.target.value)}/>
        </div>
        <Button_1.Button variant="outline" onClick={save}>
          <lucide_react_1.Save className="w-4 h-4 mr-2"/>
          Save
        </Button_1.Button>
        <separator_1.Separator className="my-2"/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {issues.map(it => (<div key={it.id} className="p-3 rounded-xl border bg-card">
              <div className="flex items-center gap-2">
                <lucide_react_1.GitBranch className="w-4 h-4"/>
                <a className="font-medium underline" href={it.html_url} target="_blank" rel="noreferrer">
                  #{it.number} {it.title}
                </a>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {it.user?.login} • {it.state} •{' '}
                {it.labels?.map((l) => l.name).join(', ')}
              </div>
            </div>))}
        </div>
      </Card_1.CardContent>
    </Card_1.Card>);
}
// ---------- Ticket Board (lightweight, local) ----------
function TicketBoard() {
    const [items, setItems] = (0, react_1.useState)(() => {
        const raw = typeof window !== 'undefined'
            ? localStorage.getItem('symphony:tickets')
            : null;
        return raw ? JSON.parse(raw) : [];
    });
    (0, react_1.useEffect)(() => {
        localStorage.setItem('symphony:tickets', JSON.stringify(items));
    }, [items]);
    const add = () => setItems(arr => [
        ...arr,
        {
            id: Math.random().toString(36).slice(2, 7),
            title: 'New ticket',
            status: 'todo',
        },
    ]);
    const move = (id, status) => setItems(arr => arr.map(t => (t.id === id ? { ...t, status } : t)));
    return (<Card_1.Card className="col-span-12">
      <Card_1.CardHeader>
        <Card_1.CardTitle>
          Tickets (local demo; integrate with Jira/ServiceNow if desired)
        </Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent>
        <div className="grid grid-cols-3 gap-3">
          {['todo', 'doing', 'done'].map(col => (<div key={col} className="rounded-2xl border p-2">
              <div className="text-sm font-medium capitalize mb-2">{col}</div>
              <div className="space-y-2">
                {items
                .filter(t => t.status === col)
                .map(t => (<div key={t.id} className="rounded-xl border bg-card p-2">
                      <input_1.Input value={t.title} onChange={e => setItems(arr => arr.map(x => x.id === t.id
                    ? { ...x, title: e.target.value }
                    : x))}/>
                      <div className="flex gap-2 mt-2">
                        {col !== 'todo' && (<Button_1.Button size="sm" variant="outline" onClick={() => move(t.id, 'todo')}>
                            To Do
                          </Button_1.Button>)}
                        {col !== 'doing' && (<Button_1.Button size="sm" variant="outline" onClick={() => move(t.id, 'doing')}>
                            Doing
                          </Button_1.Button>)}
                        {col !== 'done' && (<Button_1.Button size="sm" variant="outline" onClick={() => move(t.id, 'done')}>
                            Done
                          </Button_1.Button>)}
                      </div>
                    </div>))}
                <Button_1.Button size="sm" variant="secondary" onClick={add}>
                  Add
                </Button_1.Button>
              </div>
            </div>))}
        </div>
      </Card_1.CardContent>
    </Card_1.Card>);
}
// ---------- Main ----------
function SymphonyOperatorConsole() {
    const [activeTab, setActiveTab] = (0, react_1.useState)('observe');
    const [proxyBase, setProxyBase] = (0, react_1.useState)(getProxyBase());
    const [traceSpec, setTraceSpec] = (0, react_1.useState)(`sequenceDiagram
  autonumber
  participant UI
  participant Proxy as Symphony Proxy
  participant Router as Policy/Router
  participant Model as Model
  UI->>Proxy: route/plan {task: qa, loa:1}
  Proxy->>Router: evaluate policy
  Router-->>Proxy: decision allow=true, model=local/ollama
  UI->>Proxy: route/execute {input:"say hello"}
  Proxy->>Model: chat
  Model-->>Proxy: stream
  Proxy-->>UI: audit_id, latency_ms`);
    // persist proxy base
    (0, react_1.useEffect)(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('symphony:proxyBase', proxyBase);
        }
    }, [proxyBase]);
    return (<div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-semibold">
            Symphony Operator Console
          </span>
          <Badge_1.Badge variant="secondary" className="rounded-full">
            pro
          </Badge_1.Badge>
        </div>
        <div className="flex items-center gap-2">
          <label_1.Label htmlFor="proxy" className="text-xs">
            PROXY_BASE
          </label_1.Label>
          <input_1.Input id="proxy" className="w-[320px]" value={proxyBase} onChange={e => setProxyBase(e.target.value)}/>
        </div>
      </div>

      <Tabs_1.Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <Tabs_1.TabsList className="grid grid-cols-6 w-full">
          <Tabs_1.TabsTrigger value="observe">Observe</Tabs_1.TabsTrigger>
          <Tabs_1.TabsTrigger value="prompts">Prompts</Tabs_1.TabsTrigger>
          <Tabs_1.TabsTrigger value="route">Route</Tabs_1.TabsTrigger>
          <Tabs_1.TabsTrigger value="schedule">Schedule</Tabs_1.TabsTrigger>
          <Tabs_1.TabsTrigger value="compose">Compose</Tabs_1.TabsTrigger>
          <Tabs_1.TabsTrigger value="work">Work</Tabs_1.TabsTrigger>
        </Tabs_1.TabsList>

        {/* Observe */}
        <Tabs_1.TabsContent value="observe" className="space-y-4">
          <div className="grid grid-cols-12 gap-4">
            <KPIBar />
            <LatencyChart />
            <ErrorChart />
            <LiveLogs />
          </div>
        </Tabs_1.TabsContent>

        {/* Prompts */}
        <Tabs_1.TabsContent value="prompts" className="space-y-4">
            <PromptActivityMonitor active={activeTab === 'prompts'}/>
        </Tabs_1.TabsContent>

        {/* Route */}
        <Tabs_1.TabsContent value="route" className="space-y-4">
          <RoutingMatrix />
          <MermaidTrace spec={traceSpec}/>
          <Card_1.Card className="col-span-12">
            <Card_1.CardHeader>
              <Card_1.CardTitle>Mermaid Spec (sanitized)</Card_1.CardTitle>
            </Card_1.CardHeader>
            <Card_1.CardContent>
              <textarea_1.Textarea value={traceSpec} onChange={e => setTraceSpec(e.target.value)} className="font-mono" rows={6}/>
              <p className="text-xs text-muted-foreground mt-2">
                Security: Mermaid initialized with{' '}
                <code>securityLevel="strict"</code>. Do not paste untrusted
                content without sanitization.
              </p>
            </Card_1.CardContent>
          </Card_1.Card>
        </Tabs_1.TabsContent>

        {/* Schedule */}
        <Tabs_1.TabsContent value="schedule" className="space-y-4">
          <UsageWindows />
        </Tabs_1.TabsContent>

        {/* Compose */}
        <Tabs_1.TabsContent value="compose" className="space-y-4">
          <RequestComposer />
        </Tabs_1.TabsContent>

        {/* Work */}
        <Tabs_1.TabsContent value="work" className="space-y-4">
          <GitHubPane />
          <TicketBoard />
        </Tabs_1.TabsContent>
      </Tabs_1.Tabs>

      <Card_1.Card>
        <Card_1.CardHeader>
          <Card_1.CardTitle>Setup Notes</Card_1.CardTitle>
        </Card_1.CardHeader>
        <Card_1.CardContent className="text-sm text-muted-foreground space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Wire alerts from <code>/status/burndown.json</code> and{' '}
              <code>/status/health.json</code>. This console polls every 5–10s;
              add SSE to <code>/status/events</code> for immediate updates.
            </li>
            <li>
              Enable CORS only for known origins; set CSP:{' '}
              <code>
                default-src 'self'; script-src 'self'; style-src 'self'
                'unsafe-inline'
              </code>
              ; add your Mermaid CDN if used.
            </li>
            <li>
              LOA/kill enforcement must be server-side; UI toggles are UX only.
            </li>
            <li>
              For GitHub pane, paste a short-lived token (repo scope). Nothing
              leaves the browser.
            </li>
          </ul>
        </Card_1.CardContent>
      </Card_1.Card>
    </div>);
}
