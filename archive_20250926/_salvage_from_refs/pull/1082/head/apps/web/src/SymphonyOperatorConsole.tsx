
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Activity, GitBranch, Github, Gauge, Network, Play, Save, Shield, Square, Triangle, Zap } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, Bar, BarChart } from "recharts";
import { motion } from "framer-motion";
import mermaid from "mermaid";

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
  const ls = typeof window !== "undefined" ? localStorage.getItem("symphony:proxyBase") : null;
  return ls || "http://127.0.0.1:8787";
};

async function getJSON<T = any>(path: string, init?: RequestInit): Promise<T> {
  const base = getProxyBase();
  const r = await fetch(`${base}${path}`, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

function useInterval(callback: () => void, delay: number) {
  const savedRef = useRef<() => void>();
  useEffect(() => { savedRef.current = callback; }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedRef.current && savedRef.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

function useSSE(paths: string[]) {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    let es: EventSource | null = null;
    let closed = false;
    const base = getProxyBase();
    function connect(idx = 0) {
      if (idx >= paths.length) return;
      try {
        es = new EventSource(`${base}${paths[idx]}`);
        es.onmessage = (ev) => setLines((l) => [...l.slice(-999), ev.data]);
        es.onerror = () => {
          es?.close();
          if (!closed) setTimeout(() => connect(idx + 1), 500);
        };
      } catch {
        if (!closed) setTimeout(() => connect(idx + 1), 500);
      }
    }
    connect();
    return () => { closed = true; es?.close(); };
  }, [paths.join(",")]);
  return lines;
}

// ---------- Types (lightweight) ----------
interface HealthService { name: string; status: "ok" | "warn" | "error"; details?: any }
interface Health { services: Record<string, HealthService> }
interface BurndownWin { count: number; latency_ms_p95?: number; errors?: number }
interface Burndown { generated_at: string; windows: { m1: BurndownWin; h1: BurndownWin; d1: BurndownWin } }

// ---------- Small helpers ----------
function Stat({ label, value, suffix, warn }: { label: string; value: string | number; suffix?: string; warn?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xl font-semibold ${warn ? "text-amber-600" : ""}`}>{value}{suffix || ""}</span>
    </div>
  );
}

// ---------- KPI Bar ----------
function KPIBar() {
  const [bd, setBd] = useState<Burndown | null>(null);
  const [hl, setHl] = useState<Health | null>(null);

  const refresh = async () => {
    try { setBd(await getJSON<Burndown>("/status/burndown.json")); } catch {}
    try { setHl(await getJSON<Health>("/status/health.json")); } catch {}
  };

  useEffect(() => { refresh(); }, []);
  useInterval(refresh, 10_000);

  const p95 = bd?.windows?.m1?.latency_ms_p95 ?? bd?.windows?.h1?.latency_ms_p95 ?? 0;
  const errRate = useMemo(() => {
    if (!bd) return 0;
    const w = bd.windows.m1 || bd.windows.h1;
    const errors = (w?.errors || 0);
    const total = (w?.count || 0);
    return total ? (errors / total) * 100 : 0;
  }, [bd]);

  const avail = useMemo(() => {
    const ok = hl && Object.values(hl.services || {}).every((s) => s.status === "ok");
    return ok ? 99.99 : 99.0;
  }, [hl]);

  return (
    <Card className="col-span-12">
      <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="p95 route/execute" value={Math.round(p95)} suffix=" ms" warn={p95 > 2500} />
        <Stat label="error rate (m1)" value={errRate.toFixed(2)} suffix="%" warn={errRate > 1} />
        <Stat label="availability" value={avail.toFixed(2)} suffix="%" />
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1"><Activity className="w-3 h-3" /> live</Badge>
          <span className="text-xs text-muted-foreground">proxy: {getProxyBase()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Live Charts ----------
function useBurndownSeries() {
  const [series, setSeries] = useState<Array<{ time: number; p95: number; errors: number; count: number }>>([]);
  const tick = async () => {
    try {
      const bd = await getJSON<Burndown>("/status/burndown.json");
      const w = bd.windows.m1 || bd.windows.h1;
      const p95 = w?.latency_ms_p95 || 0;
      const errors = w?.errors || 0;
      const count = w?.count || 0;
      setSeries((s) => [...s.slice(-120), { time: Date.now(), p95, errors, count }]);
    } catch {}
  };
  useEffect(() => { tick(); }, []);
  useInterval(tick, 5000);
  return series;
}

function LatencyChart() {
  const data = useBurndownSeries();
  return (
    <Card className="col-span-12 lg:col-span-8">
      <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="w-4 h-4"/>Latency & Throughput</CardTitle></CardHeader>
      <CardContent className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <XAxis dataKey="time" tickFormatter={(t) => new Date(t).toLocaleTimeString()} hide />
            <YAxis hide />
            <Tooltip formatter={(v: any, n: any) => [v, n]} labelFormatter={(t) => new Date(t).toLocaleTimeString()} />
            <Area type="monotone" dataKey="p95" fillOpacity={0.2} />
            <Line type="monotone" dataKey="count" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ErrorChart() {
  const data = useBurndownSeries();
  return (
    <Card className="col-span-12 lg:col-span-4">
      <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="w-4 h-4"/>Errors/min</CardTitle></CardHeader>
      <CardContent className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <XAxis dataKey="time" tickFormatter={(t) => new Date(t).toLocaleTimeString()} hide />
            <YAxis hide />
            <Tooltip />
            <Bar dataKey="errors" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ---------- Routing Matrix (weights + allow + fallback) ----------
interface RoutePolicyModel { name: string; weight: number; allow: boolean; loa_max?: number; rpm_cap?: number; tpm_cap?: number; window?: string }

function RoutingMatrix() {
  const [models, setModels] = useState<RoutePolicyModel[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const current = await getJSON<{ items: { id: string }[] }>("/models");
      const base = (current.items || []).map((m) => ({ name: m.id, weight: 1, allow: true }));
      // Merge from /route/policy if present
      try {
        const pol = await getJSON<{ models: RoutePolicyModel[] }>("/route/policy");
        const merged = base.map((b) => pol.models.find((p) => p.name === b.name) || b);
        setModels(merged);
      } catch { setModels(base); }
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await getJSON("/route/policy", { method: "PUT", body: JSON.stringify({ models }) });
    } catch {}
    setSaving(false);
  };

  return (
    <Card className="col-span-12">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Network className="w-4 h-4"/>Routing Matrix</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {models.map((m, i) => (
          <div key={m.name} className="grid grid-cols-12 items-center gap-3">
            <div className="col-span-12 md:col-span-3 truncate"><code className="text-sm">{m.name}</code></div>
            <div className="col-span-12 md:col-span-3 flex items-center gap-3">
              <Label className="text-xs">weight</Label>
              <Slider value={[m.weight]} onValueChange={(v) => setModels((arr) => arr.map((x, idx) => idx === i ? { ...x, weight: v[0] } : x))} min={0} max={10} step={0.5} className="w-40"/>
              <span className="text-xs w-8">{m.weight}</span>
            </div>
            <div className="col-span-6 md:col-span-2 flex items-center gap-2">
              <Label className="text-xs">allow</Label>
              <Switch checked={m.allow} onCheckedChange={(v) => setModels((arr) => arr.map((x, idx) => idx === i ? { ...x, allow: v } : x))} />
            </div>
            <div className="col-span-6 md:col-span-2">
              <Input placeholder="rpm cap" value={m.rpm_cap ?? ""} onChange={(e) => setModels((arr) => arr.map((x, idx) => idx === i ? { ...x, rpm_cap: Number(e.target.value) || undefined } : x))} />
            </div>
            <div className="col-span-6 md:col-span-2">
              <Input placeholder="tpm cap" value={m.tpm_cap ?? ""} onChange={(e) => setModels((arr) => arr.map((x, idx) => idx === i ? { ...x, tpm_cap: Number(e.target.value) || undefined } : x))} />
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-2"/>Save Policy</Button>
          <Button variant="outline" onClick={load}>Reload</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Model Usage Windows (scheduler) ----------
function UsageWindows() {
  const [rows, setRows] = useState<Array<{ name: string; window: string; overflow_to?: string }>>([]);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    try {
      const pol = await getJSON<{ windows: Array<{ name: string; window: string; overflow_to?: string }> }>("/route/schedule");
      setRows(pol.windows);
    } catch { setRows([]); }
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    setSaving(true);
    try { await getJSON("/route/schedule", { method: "PUT", body: JSON.stringify({ windows: rows }) }); } catch {}
    setSaving(false);
  };
  return (
    <Card className="col-span-12">
      <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="w-4 h-4"/>High‑Value Model Windows</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Define daily/weekly time windows (CRON or iCal syntax) when costly models are eligible. Outside windows, requests overflow to local/cheaper models.</p>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <Input className="col-span-12 md:col-span-4" placeholder="model name (e.g., gemini/1.5-pro)" value={r.name} onChange={(e) => setRows((arr) => arr.map((x, idx) => idx===i? {...x, name:e.target.value}:x))} />
            <Input className="col-span-12 md:col-span-6" placeholder="window (e.g., Mon-Fri 09:00-14:00 MT)" value={r.window} onChange={(e) => setRows((arr) => arr.map((x, idx) => idx===i? {...x, window:e.target.value}:x))} />
            <Input className="col-span-12 md:col-span-2" placeholder="overflow→" value={r.overflow_to||""} onChange={(e) => setRows((arr) => arr.map((x, idx) => idx===i? {...x, overflow_to:e.target.value}:x))} />
          </div>
        ))}
        <div className="flex gap-2">
          <Button onClick={() => setRows((r) => [...r, { name: "", window: "", overflow_to: "local/ollama" }])}>Add Window</Button>
          <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-2"/>Save Schedule</Button>
          <Button variant="outline" onClick={load}>Reload</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Request Composer (token/context meter) ----------
function RequestComposer() {
  const [task, setTask] = useState("qa");
  const [input, setInput] = useState("say hello");
  const [model, setModel] = useState("");
  const [result, setResult] = useState<any>(null);
  const [lat, setLat] = useState<number | null>(null);

  const send = async () => {
    const t0 = performance.now();
    try {
      const r = await getJSON("/route/execute", { method: "POST", body: JSON.stringify({ task, input, env: "dev", loa: 1, model }) });
      setResult(r);
    } catch (e: any) { setResult({ error: String(e.message||e) }); }
    setLat(performance.now()-t0);
  };

  return (
    <Card className="col-span-12">
      <CardHeader><CardTitle className="flex items-center gap-2"><Play className="w-4 h-4"/>Request Composer</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-12 gap-2 items-center">
          <Input className="col-span-12 md:col-span-2" placeholder="task" value={task} onChange={(e) => setTask(e.target.value)} />
          <Input className="col-span-12 md:col-span-4" placeholder="model (optional)" value={model} onChange={(e) => setModel(e.target.value)} />
          <Textarea className="col-span-12 md:col-span-6" placeholder="input" value={input} onChange={(e) => setInput(e.target.value)} />
        </div>
        <div className="flex gap-2 items-center">
          <Button onClick={send}><Triangle className="w-4 h-4 mr-2"/>Execute</Button>
          {lat !== null && <Badge variant="secondary">TTFB ~ {Math.round(lat)} ms</Badge>}
        </div>
        {result && (
          <pre className="p-3 bg-muted rounded-lg overflow-auto text-xs max-h-64">{JSON.stringify(result, null, 2)}</pre>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Live Logs (SSE) ----------
function LiveLogs() {
  const lines = useSSE(["/logs/stream", "/status/events"]);
  return (
    <Card className="col-span-12">
      <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-4 h-4"/>Live Events</CardTitle></CardHeader>
      <CardContent>
        <div className="h-48 overflow-auto rounded bg-muted p-2 text-xs font-mono">
          {lines.slice(-500).map((l, i) => <div key={i} className="whitespace-pre-wrap">{l}</div>)}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Mermaid Plan/Decision Trace ----------
function MermaidTrace({ spec }: { spec: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" }); }, []);
  useEffect(() => { if (ref.current) mermaid.run({ querySelector: ".mermaid" }); }, [spec]);
  return (
    <Card className="col-span-12">
      <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-4 h-4"/>Explain Route</CardTitle></CardHeader>
      <CardContent>
        <figure>
          <div ref={ref} className="mermaid">
{spec}
          </div>
          <figcaption className="text-xs text-muted-foreground mt-2">Route plan → decision → execute (securityLevel=strict; sanitized spec)</figcaption>
        </figure>
      </CardContent>
    </Card>
  );
}

// ---------- GitHub Pane (simple) ----------
function GitHubPane() {
  const [token, setToken] = useState<string>(typeof window !== "undefined" ? (localStorage.getItem("gh:token") || "") : "");
  const [owner, setOwner] = useState<string>(typeof window !== "undefined" ? (localStorage.getItem("gh:owner") || "") : "");
  const [repo, setRepo] = useState<string>(typeof window !== "undefined" ? (localStorage.getItem("gh:repo") || "") : "");
  const [issues, setIssues] = useState<any[]>([]);
  const save = () => { localStorage.setItem("gh:token", token); localStorage.setItem("gh:owner", owner); localStorage.setItem("gh:repo", repo); };
  const load = async () => {
    if (!token || !owner || !repo) return;
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?per_page=20`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
    if (r.ok) setIssues(await r.json());
  };
  useEffect(() => { load(); }, [token, owner, repo]);
  return (
    <Card className="col-span-12">
      <CardHeader><CardTitle className="flex items-center gap-2"><Github className="w-4 h-4"/>GitHub Issues</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-12 gap-2 items-center">
          <Input className="col-span-12 md:col-span-3" placeholder="owner" value={owner} onChange={(e)=>setOwner(e.target.value)} />
          <Input className="col-span-12 md:col-span-3" placeholder="repo" value={repo} onChange={(e)=>setRepo(e.target.value)} />
          <Input className="col-span-12 md:col-span-6" placeholder="gh token (repo scope)" value={token} onChange={(e)=>setToken(e.target.value)} />
        </div>
        <Button variant="outline" onClick={save}><Save className="w-4 h-4 mr-2"/>Save</Button>
        <Separator className="my-2"/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {issues.map((it) => (
            <div key={it.id} className="p-3 rounded-xl border bg-card">
              <div className="flex items-center gap-2"><GitBranch className="w-4 h-4"/><a className="font-medium underline" href={it.html_url} target="_blank" rel="noreferrer">#{it.number} {it.title}</a></div>
              <div className="text-xs text-muted-foreground mt-1">{it.user?.login} • {it.state} • {it.labels?.map((l:any)=>l.name).join(", ")}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Ticket Board (lightweight, local) ----------
function TicketBoard() {
  type T = { id: string; title: string; status: "todo" | "doing" | "done" };
  const [items, setItems] = useState<T[]>(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("symphony:tickets") : null;
    return raw ? JSON.parse(raw) : [];
  });
  useEffect(() => { localStorage.setItem("symphony:tickets", JSON.stringify(items)); }, [items]);
  const add = () => setItems((arr) => [...arr, { id: Math.random().toString(36).slice(2,7), title: "New ticket", status: "todo" }]);
  const move = (id: string, status: T["status"]) => setItems((arr) => arr.map((t) => t.id===id? { ...t, status }: t));
  return (
    <Card className="col-span-12">
      <CardHeader><CardTitle>Tickets (local demo; integrate with Jira/ServiceNow if desired)</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {["todo","doing","done"].map((col) => (
            <div key={col} className="rounded-2xl border p-2">
              <div className="text-sm font-medium capitalize mb-2">{col}</div>
              <div className="space-y-2">
                {items.filter((t)=>t.status===col).map((t)=> (
                  <div key={t.id} className="rounded-xl border bg-card p-2">
                    <Input value={t.title} onChange={(e)=>setItems((arr)=>arr.map((x)=>x.id===t.id?{...x,title:e.target.value}:x))} />
                    <div className="flex gap-2 mt-2">
                      {col!=="todo" && <Button size="sm" variant="outline" onClick={()=>move(t.id,"todo")}>To Do</Button>}
                      {col!=="doing" && <Button size="sm" variant="outline" onClick={()=>move(t.id,"doing")}>Doing</Button>}
                      {col!=="done" && <Button size="sm" variant="outline" onClick={()=>move(t.id,"done")}>Done</Button>}
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="secondary" onClick={add}>Add</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Main ----------
export default function SymphonyOperatorConsole() {
  const [activeTab, setActiveTab] = useState("observe");
  const [proxyBase, setProxyBase] = useState(getProxyBase());
  const [traceSpec, setTraceSpec] = useState(`sequenceDiagram
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
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("symphony:proxyBase", proxyBase); }, [proxyBase]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-semibold">Symphony Operator Console</span>
          <Badge variant="secondary" className="rounded-full">pro</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="proxy" className="text-xs">PROXY_BASE</Label>
          <Input id="proxy" className="w-[320px]" value={proxyBase} onChange={(e)=>setProxyBase(e.target.value)} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="observe">Observe</TabsTrigger>
          <TabsTrigger value="route">Route</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="work">Work</TabsTrigger>
        </TabsList>

        {/* Observe */}
        <TabsContent value="observe" className="space-y-4">
          <div className="grid grid-cols-12 gap-4">
            <KPIBar />
            <LatencyChart />
            <ErrorChart />
            <LiveLogs />
          </div>
        </TabsContent>

        {/* Route */}
        <TabsContent value="route" className="space-y-4">
          <RoutingMatrix />
          <MermaidTrace spec={traceSpec} />
          <Card className="col-span-12">
            <CardHeader><CardTitle>Mermaid Spec (sanitized)</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={traceSpec} onChange={(e)=>setTraceSpec(e.target.value)} className="font-mono" rows={6} />
              <p className="text-xs text-muted-foreground mt-2">Security: Mermaid initialized with <code>securityLevel="strict"</code>. Do not paste untrusted content without sanitization.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule */}
        <TabsContent value="schedule" className="space-y-4">
          <UsageWindows />
        </TabsContent>

        {/* Compose */}
        <TabsContent value="compose" className="space-y-4">
          <RequestComposer />
        </TabsContent>

        {/* Work */}
        <TabsContent value="work" className="space-y-4">
          <GitHubPane />
          <TicketBoard />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader><CardTitle>Setup Notes</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li>Wire alerts from <code>/status/burndown.json</code> and <code>/status/health.json</code>. This console polls every 5–10s; add SSE to <code>/status/events</code> for immediate updates.</li>
            <li>Enable CORS only for known origins; set CSP: <code>default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'</code>; add your Mermaid CDN if used.</li>
            <li>LOA/kill enforcement must be server-side; UI toggles are UX only.</li>
            <li>For GitHub pane, paste a short-lived token (repo scope). Nothing leaves the browser.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
