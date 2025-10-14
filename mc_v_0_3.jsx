import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle, AlertTriangle, Lock, Activity, Shield, SlidersHorizontal, Gauge, GitBranch, LineChart, Upload, Database, Server, Settings, Eye, GitCommit, LockKeyhole, Globe2, ScrollText, Binary, Cloud, Brain, Rocket, RefreshCw } from "lucide-react";
import { ResponsiveContainer, LineChart as RLineChart, Line, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Area, AreaChart, Legend } from "recharts";
import { motion } from "framer-motion";

// ────────────────────────────────────────────────────────────────────────────────
// MC v0.3.9 — Sovereign Console
// Single-file preview UI wiring: Admin controls, granular knobs, observability tiles,
// evidence actions, and policy/attestation/BFT/CSE/GreenOps/DR controls.
// NOTE: Wire API_BASE to your MC Gateway; all writes must be persisted-only + audit-logged.
// ────────────────────────────────────────────────────────────────────────────────

const API_BASE = "/api/mc"; // replace via .env / ingress rewrite

// Utility: fetch wrapper with persisted-only header & provenance capture
async function mcFetch(path: string, opts: any = {}) {
  const headers = {
    "content-type": "application/json",
    "x-persisted-only": "true",
    "x-provenance-capture": "true",
    ...(opts.headers || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// Mock metrics for preview (replace by live Prometheus adapter route)
const now = Date.now();
const mk = (n: number, base: number, jitter = 10) => Array.from({ length: n }, (_, i) => ({
  t: new Date(now - (n - i) * 60000).toLocaleTimeString(),
  v: Math.max(0, base + (Math.sin(i / 5) * jitter))
}));

const tiles = {
  p95: mk(30, 285, 30),
  score: mk(30, 0.91, 0.03).map((d) => ({ ...d, v: Number((d.v).toFixed(3)) })),
  jwsFail: mk(30, 0.03, 0.02),
  budgetNoise: mk(30, 2.2, 1.1),
  aaLag: mk(30, 28, 12),
};

function Stat({ label, value, suffix = "", ok = true }: { label: string; value: string | number; suffix?: string; ok?: boolean }) {
  return (
    <Card className={`rounded-2xl shadow-sm ${ok ? "border-green-500/30" : "border-red-500/30"}`}>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold flex items-center gap-2 mt-1">
          {ok ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
          <span>{value}{suffix}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Tile({ title, data, unit = "", threshold }: { title: string; data: any[]; unit?: string; threshold?: number }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4">
        <div className="text-sm font-medium mb-2">{title}</div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="t" hide />
              <YAxis hide />
              <RTooltip formatter={(v: any) => `${v}${unit}`} />
              {threshold !== undefined && (
                <Line type="monotone" dataKey={() => threshold} stroke="#ef4444" dot={false} strokeDasharray="6 6" />
              )}
              <Area type="monotone" dataKey="v" stroke="#60a5fa" fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function Knob({ label, value, onChange, min = 0, max = 1, step = 0.01, help }: any) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{label}</div>
          <TooltipProvider><Tooltip><TooltipTrigger><Eye className="w-4 h-4 text-muted-foreground" /></TooltipTrigger><TooltipContent>{help}</TooltipContent></Tooltip></TooltipProvider>
        </div>
        <div className="flex items-center gap-4">
          <Slider min={min} max={max} step={step} value={[value]} onValueChange={(v) => onChange(v[0])} className="w-full" />
          <Input className="w-20" value={value} onChange={(e) => onChange(Number(e.target.value))} />
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, icon, children }: any) {
  const Icon = icon || Settings;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-lg font-semibold"><Icon className="w-5 h-5" /> {title}</div>
      <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-3">{children}</div>
    </div>
  );
}

export default function App() {
  const { toast } = useToast();
  const [tenant, setTenant] = useState("ALL");
  const [featureFlags, setFlags] = useState({
    attestJWS: true,
    attestPQ: false,
    adaptiveCanary: true,
    budgetV2: true,
    bftEco: true,
    zkProofs: true,
    cse: true,
  });
  const [weights, setWeights] = useState({ p95: 0.5, error: 0.3, cost: 0.15, p99: 0.05 });
  const [thresholds, setThresholds] = useState({ composite: 0.85, jwsFail: 0.001, budgetNoise: 0.05, graphqlP95: 350, aaLag: 120 });
  const scoreOK = tiles.score.at(-1)!.v >= thresholds.composite;

  const saveFlags = async () => {
    // Persist changes (persisted-only, audit-logged) — replace endpoint
    try {
      await mcFetch(`/config/flags`, { method: "POST", body: JSON.stringify({ tenant, featureFlags }) });
      toast({ title: "Flags updated", description: `Saved for ${tenant}.` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const saveWeights = async () => {
    try {
      await mcFetch(`/canary/weights`, { method: "POST", body: JSON.stringify({ tenant, weights }) });
      toast({ title: "Composite weights updated" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const saveThresholds = async () => {
    try {
      await mcFetch(`/slo/thresholds`, { method: "POST", body: JSON.stringify({ tenant, thresholds }) });
      toast({ title: "SLO thresholds updated" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const enactRemediation = async (type: string) => {
    try {
      await mcFetch(`/remediator/propose`, { method: "POST", body: JSON.stringify({ tenant, type, hitl: true }) });
      toast({ title: "Remediation proposed", description: `${type} awaiting HITL` });
    } catch (e: any) {
      toast({ title: "Remediation failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur bg-white/70 border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5" />
            <div className="font-semibold">MC Sovereign Console — v0.3.9</div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">LIVE</span>
          </div>
          <div className="flex items-center gap-3">
            <Select value={tenant} onValueChange={setTenant}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tenant" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ALL TENANTS</SelectItem>
                <SelectItem value="TENANT_001">TENANT_001</SelectItem>
                <SelectItem value="TENANT_002">TENANT_002</SelectItem>
                <SelectItem value="TENANT_003">TENANT_003</SelectItem>
                <SelectItem value="TENANT_004">TENANT_004</SelectItem>
                <SelectItem value="TENANT_005">TENANT_005</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => window.location.reload()}><RefreshCw className="w-4 h-4 mr-2"/>Refresh</Button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Top KPIs */}
        <div className="grid xl:grid-cols-5 lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-3">
          <Stat label="Composite Score" value={tiles.score.at(-1)!.v.toFixed(3)} ok={scoreOK} />
          <Stat label="GraphQL p95 (ms)" value={tiles.p95.at(-1)!.v.toFixed(1)} ok={Number(tiles.p95.at(-1)!.v) <= thresholds.graphqlP95} />
          <Stat label="A/A Lag p95 (s)" value={tiles.aaLag.at(-1)!.v.toFixed(1)} ok={Number(tiles.aaLag.at(-1)!.v) <= thresholds.aaLag} />
          <Stat label="JWS Fail % (15m)" value={(tiles.jwsFail.at(-1)!.v).toFixed(2)} ok={Number(tiles.jwsFail.at(-1)!.v) < (thresholds.jwsFail * 100)} />
          <Stat label="Budget Noise FP% (15m)" value={(tiles.budgetNoise.at(-1)!.v).toFixed(2)} ok={Number(tiles.budgetNoise.at(-1)!.v) < (thresholds.budgetNoise * 100)} />
        </div>

        {/* Observability tiles */}
        <Section title="Observability" icon={LineChart}>
          <Tile title="Composite Canary Score (thr)" data={tiles.score} unit="" threshold={thresholds.composite} />
          <Tile title="GraphQL p95 (ms)" data={tiles.p95} unit="ms" threshold={thresholds.graphqlP95} />
          <Tile title="JWS Failure % (15m)" data={tiles.jwsFail} unit="%" threshold={thresholds.jwsFail * 100} />
          <Tile title="Budget v2 Noise FP%" data={tiles.budgetNoise} unit="%" threshold={thresholds.budgetNoise * 100} />
          <Tile title="A/A Lag p95 (s)" data={tiles.aaLag} unit="s" threshold={thresholds.aaLag} />
        </Section>

        {/* Controls & knobs */}
        <Section title="Controls & Knobs" icon={SlidersHorizontal}>
          <Card className="rounded-2xl shadow-sm lg:col-span-2">
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">Feature Flags</div>
              <div className="grid md:grid-cols-3 grid-cols-2 gap-3">
                {Object.entries(featureFlags).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border rounded-xl p-3">
                    <div className="text-sm">{k}</div>
                    <Switch checked={v} onCheckedChange={(c) => setFlags((f) => ({ ...f, [k]: c }))} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <Button onClick={saveFlags}><Shield className="w-4 h-4 mr-2"/>Save Flags</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm lg:col-span-1">
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">Composite Score Weights</div>
              <Knob label="p95 weight" value={weights.p95} onChange={(v: number) => setWeights({ ...weights, p95: v })} help="Latency importance" />
              <Knob label="error weight" value={weights.error} onChange={(v: number) => setWeights({ ...weights, error: v })} help="Error rate importance" />
              <Knob label="cost/1k weight" value={weights.cost} onChange={(v: number) => setWeights({ ...weights, cost: v })} help="Cost importance" />
              <Knob label="p99 weight" value={weights.p99} onChange={(v: number) => setWeights({ ...weights, p99: v })} help="Tail latency importance" />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setWeights({ p95: 0.5, error: 0.3, cost: 0.15, p99: 0.05 })}>Reset</Button>
                <Button onClick={saveWeights}><Gauge className="w-4 h-4 mr-2"/>Save Weights</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm lg:col-span-3">
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">SLO / Safety Thresholds</div>
              <div className="grid md:grid-cols-3 grid-cols-1 gap-3">
                <Knob label="Composite threshold" value={thresholds.composite} min={0.5} max={1} step={0.01} onChange={(v: number) => setThresholds({ ...thresholds, composite: v })} help=">= 0.85 recommended" />
                <Knob label="JWS fail % (15m)" value={thresholds.jwsFail} min={0} max={0.02} step={0.0005} onChange={(v: number) => setThresholds({ ...thresholds, jwsFail: v })} help="Page at >0.1%" />
                <Knob label="Budget noise % (15m)" value={thresholds.budgetNoise} min={0} max={0.2} step={0.005} onChange={(v: number) => setThresholds({ ...thresholds, budgetNoise: v })} help="Warn at >5%" />
                <Knob label="GraphQL p95 ms" value={thresholds.graphqlP95} min={150} max={500} step={5} onChange={(v: number) => setThresholds({ ...thresholds, graphqlP95: v })} help=">=350ms roll back" />
                <Knob label="A/A lag p95 s" value={thresholds.aaLag} min={30} max={240} step={5} onChange={(v: number) => setThresholds({ ...thresholds, aaLag: v })} help=">=120s page" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button onClick={saveThresholds}><Settings className="w-4 h-4 mr-2"/>Save Thresholds</Button>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* Policy / Attestation / Compliance */}
        <Section title="Policy · Attestation · Compliance" icon={LockKeyhole}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium flex items-center gap-2"><ScrollText className="w-4 h-4"/> Signed Response Tokens</div>
              <div className="text-xs text-muted-foreground">All agentic responses JWS-signed (PQ optional), verified via Verifier API. Toggle enforcement per-tenant below.</div>
              <div className="flex gap-2"><Button variant="outline" onClick={() => enactRemediation("rotate-jwks")}><GitCommit className="w-4 h-4 mr-2"/>Rotate JWKS</Button><Button onClick={() => enactRemediation("force-attest-required")}><Lock className="w-4 h-4 mr-2"/>Enforce Attest Required</Button></div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium flex items-center gap-2"><Globe2 className="w-4 h-4"/> Residency / Purpose</div>
              <div className="text-xs text-muted-foreground">OPA‑backed policies applied at gateway. Use staged change with proof gate.</div>
              <Button variant="outline" onClick={() => enactRemediation("policy-simulate")}>Policy Simulation</Button>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium flex items-center gap-2"><Binary className="w-4 h-4"/> zk‑Proofs</div>
              <div className="text-xs text-muted-foreground">Enable zk‑provenance / fairness proofs; attach to responses and nightly audits.</div>
              <Button onClick={() => enactRemediation("zk-reindex")}>Reindex Circuits</Button>
            </CardContent>
          </Card>
        </Section>

        {/* Autonomy, Canary & Remediation */}
        <Section title="Autonomy · Canary · Remediator" icon={Brain}>
          <Card className="rounded-2xl shadow-sm lg:col-span-2">
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium flex items-center gap-2"><Activity className="w-4 h-4"/> Adaptive Canary Controller</div>
              <div className="text-xs text-muted-foreground">Composite score PROMOTE/HOLD; HITL override logged with reason codes.</div>
              <div className="flex gap-2">
                <Button onClick={() => mcFetch(`/canary/promote`, { method: "POST", body: JSON.stringify({ tenant }) })}>Force PROMOTE</Button>
                <Button variant="outline" onClick={() => mcFetch(`/canary/hold`, { method: "POST", body: JSON.stringify({ tenant }) })}>Force HOLD</Button>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm lg:col-span-1">
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium flex items-center gap-2"><Server className="w-4 h-4"/> Remediator</div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => enactRemediation("bias-glb-blue")}>Bias GLB → Blue</Button>
                <Button variant="outline" onClick={() => enactRemediation("raise-budget-cap")}>Raise Budget Cap</Button>
                <Button variant="outline" onClick={() => enactRemediation("tighten-hpa")}>Tighten HPA</Button>
                <Button variant="outline" onClick={() => enactRemediation("disable-autotune")}>Disable Auto‑Tune</Button>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* Evidence & Exports */}
        <Section title="Evidence & Exports" icon={Upload}>
          <Card className="rounded-2xl shadow-sm lg:col-span-2">
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium flex items-center gap-2"><ScrollText className="w-4 h-4"/> Evidence Bundle</div>
              <div className="text-xs text-muted-foreground">Create & sign evidence bundle; verify cryptographic integrity; export regulator‑grade packs.</div>
              <div className="flex gap-2">
                <Button onClick={() => mcFetch(`/evidence/pack`, { method: "POST", body: JSON.stringify({ version: "v0.3.9" }) })}>Pack & Sign</Button>
                <Button variant="outline" onClick={() => mcFetch(`/evidence/verify`, { method: "POST" })}>Verify</Button>
                <Button variant="outline" onClick={() => mcFetch(`/exports/regulator`, { method: "POST", body: JSON.stringify({ tenant, profile: "soc2" }) })}>Export SOC2</Button>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm lg:col-span-1">
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium flex items-center gap-2"><Cloud className="w-4 h-4"/> DR Proofs</div>
              <div className="text-xs text-muted-foreground">Run DR drill proof (PoDR) and attach RPO/RTO traces.</div>
              <Button onClick={() => mcFetch(`/podr/run`, { method: "POST", body: JSON.stringify({ tenant }) })}>Run DR Drill</Button>
            </CardContent>
          </Card>
        </Section>

        {/* Footer */}
        <div className="text-xs text-muted-foreground py-6">
          All operations are persisted-only, OPA‑gated, provenance‑logged, and emit cryptographically signed evidence. UI v0.3.9.
        </div>
      </div>
    </div>
  );
}
