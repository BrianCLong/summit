import React, { useMemo, useRef, useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, Search, PackageOpen, FileJson, Upload, Gauge, FileSpreadsheet, Layers, Hash, ScanSearch, CircleDot } from "lucide-react";

/**
 * Evidence UI — single-file React component
 * - Drop into apps/observability or run in a playground.
 * - Tailwind styles. Uses shadcn/ui-like minimal primitives (rolled in).
 * - No network calls; loads evidence from uploaded JSON files.
 *
 * Supported files (optional):
 *  - manifest.json         { images: [{ name, digest }] } OR array of {name,digest}
 *  - sbom.spdx.json        Syft/Anchore SPDX JSON
 *  - provenance.json       SLSA predicate JSON
 *  - unit-cost.json        { unit_cost_events_per_1k, unit_cost_graphql_per_1M }
 *  - k6-summary.json       k6 JSON summary (if exported) or JUnit XML (not parsed here)
 *  - lighthouse.json       Lighthouse result JSON
 */

// Minimal shadcn-like Card/Button/Input primitives
const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
  <div className={`rounded-2xl shadow-sm border border-gray-200 bg-white ${className || ""}`}>{children}</div>
);
const CardHeader: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
  <div className={`px-5 pt-5 ${className || ""}`}>{children}</div>
);
const CardContent: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
  <div className={`px-5 pb-5 ${className || ""}`}>{children}</div>
);
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, children, ...props }) => (
  <button className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 border bg-gray-50 hover:bg-gray-100 active:bg-gray-200 ${className || ""}`} {...props}>{children}</button>
);
const Badge: React.FC<React.PropsWithChildren<{ intent?: "ok" | "warn" | "bad" | "info" }>> = ({ intent = "info", children }) => {
  const map = {
    ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    bad: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
  } as const;
  return <span className={`px-2 py-1 rounded-xl text-xs border ${map[intent]} whitespace-nowrap`}>{children}</span>;
};

// Types
type ImageRef = { name: string; digest: string };

function normalizeManifest(json: any): ImageRef[] {
  if (!json) return [];
  if (Array.isArray(json)) return json.map((x) => ({ name: x.name || x.image || "", digest: x.digest || "" }));
  if (Array.isArray(json.images)) return json.images.map((x: any) => ({ name: x.name || x.image || "", digest: x.digest || "" }));
  // Helm values style
  if (json.image?.repository && json.image?.digest) return [{ name: json.image.repository, digest: json.image.digest }];
  return [];
}

function safeGet(obj: any, path: string, dflt?: any) {
  try { return path.split(".").reduce((a, k) => (a ? a[k] : undefined), obj) ?? dflt; } catch { return dflt; }
}

function Metric({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col p-4 rounded-2xl border bg-slate-50">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-3 min-w-0">{left}</div>
      <div className="flex items-center gap-3">{right}</div>
    </div>
  );
}

export default function EvidenceDashboard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [manifest, setManifest] = useState<ImageRef[]>([]);
  const [sbom, setSbom] = useState<any | null>(null);
  const [prov, setProv] = useState<any | null>(null);
  const [unitCost, setUnitCost] = useState<any | null>(null);
  const [k6, setK6] = useState<any | null>(null);
  const [lh, setLh] = useState<any | null>(null);
  const [q, setQ] = useState("");

  const packageCount = useMemo(() => {
    // Syft SPDX JSON: spdxID + packages array
    const pkgs = safeGet(sbom, "packages", []) || safeGet(sbom, "SPDXID", []) || [];
    return Array.isArray(pkgs) ? pkgs.length : 0;
  }, [sbom]);

  const images = useMemo(() => manifest.filter((m) => (q ? m.name.includes(q) || m.digest.includes(q) : true)), [manifest, q]);

  const k6p95 = safeGet(k6, "metrics.http_req_duration.p(95)");
  const k6err = safeGet(k6, "metrics.http_req_failed.rate");
  const lhPerf = safeGet(lh, "categories.performance.score") ?? safeGet(lh, "audits.metrics.details.items.0.performance");

  const okP95 = typeof k6p95 === "number" ? k6p95 < 700 : undefined;
  const okErr = typeof k6err === "number" ? k6err < 0.01 : undefined;
  const perfOk = typeof lhPerf === "number" ? lhPerf >= 0.8 : undefined;

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files; if (!files) return;
    for (const f of Array.from(files)) {
      const text = await f.text();
      try {
        const json = JSON.parse(text);
        if (/manifest/i.test(f.name)) setManifest(normalizeManifest(json));
        else if (/sbom/i.test(f.name)) setSbom(json);
        else if (/prov|slsa|prove/i.test(f.name)) setProv(json);
        else if (/unit[-]?cost/i.test(f.name)) setUnitCost(json);
        else if (/k6|summary/.test(f.name)) setK6(json);
        else if (/lighthouse|lhr/.test(f.name)) setLh(json);
      } catch {
        // ignore non-JSON files
      }
    }
  }

  const signed = useMemo(() => {
    // Very basic: presence of provenance object and builder suggests attestation exists
    const builder = safeGet(prov, "predicate.builder.id") || safeGet(prov, "predicate.buildType") || safeGet(prov, "builder.id");
    return Boolean(builder);
  }, [prov]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-emerald-600" />
          <h1 className="text-2xl font-semibold">Release Evidence Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => inputRef.current?.click()} className="bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700">
            <Upload className="w-4 h-4"/> Load Evidence
          </Button>
          <input ref={inputRef} type="file" multiple className="hidden" accept="application/json" onChange={onFiles} />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Metric label="Images" value={<div className="flex items-center gap-2"><Layers className="w-5 h-5"/> {images.length}</div>} sub="from manifest.json" />
        <Metric label="SBOM Packages" value={<div className="flex items-center gap-2"><PackageOpen className="w-5 h-5"/> {packageCount}</div>} sub={sbom ? "SPDX" : "upload sbom.spdx.json"} />
        <Metric label="k6 p95 (ms)" value={<div className="flex items-center gap-2"><Gauge className="w-5 h-5"/> {typeof k6p95 === "number" ? k6p95.toFixed(0) : "—"}</div>} sub={okP95===undefined?"upload k6-summary.json": okP95?"within ≤700":"over budget"} />
        <Metric label="Lighthouse Perf" value={<div className="flex items-center gap-2"><CircleDot className="w-5 h-5"/> {typeof lhPerf === "number" ? (lhPerf*100).toFixed(0)+"%" : "—"}</div>} sub={perfOk===undefined?"upload lighthouse.json": perfOk?"≥ 0.80":"below 0.80"} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700">
              <FileJson className="w-5 h-5"/>
              <h2 className="text-lg font-medium">Images & Signatures</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                <input className="pl-9 pr-3 py-2 rounded-2xl border bg-white" placeholder="search images or digests" value={q} onChange={(e)=>setQ(e.target.value)} />
              </div>
              {signed ? <Badge intent="ok"><div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> attestations found</div></Badge> : <Badge intent="bad"><div className="flex items-center gap-1"><XCircle className="w-4 h-4"/> no attestations</div></Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {images.length === 0 && (
              <div className="py-8 text-center text-slate-500">Upload <code>manifest.json</code> to list release images.</div>
            )}
            {images.map((im, i) => (
              <Row key={im.digest + i}
                left={<>
                  <div className="flex items-center gap-3 min-w-0">
                    <Hash className="w-4 h-4 text-slate-400"/>
                    <div className="truncate"><div className="font-mono text-sm truncate">{im.name}</div>
                    <div className="font-mono text-xs text-slate-500 truncate">{im.digest}</div></div>
                  </div>
                </>}
                right={<>
                  {signed ? <Badge intent="ok">signed</Badge> : <Badge intent="bad">unsigned</Badge>}
                  {packageCount ? <Badge intent="info">SBOM {packageCount}</Badge> : null}
                </>} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-slate-700"><ScanSearch className="w-5 h-5"/><h2 className="text-lg font-medium">k6 Canary</h2></div>
          </CardHeader>
          <CardContent>
            {k6 ? (
              <div className="space-y-3">
                <Row left={<div className="text-sm text-slate-600">p95 (ms)</div>} right={<div className="font-mono">{typeof k6p95 === "number" ? k6p95.toFixed(0) : "—"}</div>} />
                <Row left={<div className="text-sm text-slate-600">error rate</div>} right={<div className={`font-mono ${okErr?"text-emerald-600":"text-rose-600"}`}>{typeof k6err === "number" ? (k6err*100).toFixed(2)+"%" : "—"}</div>} />
              </div>
            ) : (
              <div className="text-slate-500">Upload <code>k6-summary.json</code> to view thresholds.</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-slate-700"><FileSpreadsheet className="w-5 h-5"/><h2 className="text-lg font-medium">Unit Costs</h2></div>
          </CardHeader>
          <CardContent>
            {unitCost ? (
              <div className="grid grid-cols-2 gap-3">
                <Metric label="$/1k events" value={`$${safeGet(unitCost, "unit_cost_events_per_1k", "—")}`} />
                <Metric label="$/1M GraphQL" value={`$${safeGet(unitCost, "unit_cost_graphql_per_1M", "—")}`} />
              </div>
            ) : (
              <div className="text-slate-500">Upload <code>unit-cost.json</code> from the budget workflow.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-slate-700"><ShieldCheck className="w-5 h-5"/><h2 className="text-lg font-medium">Provenance (SLSA)</h2></div>
        </CardHeader>
        <CardContent>
          {prov ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Metric label="Builder" value={<span className="text-sm break-all">{safeGet(prov, "predicate.builder.id", safeGet(prov, "builder.id", "unknown"))}</span>} />
              <Metric label="Build Type" value={<span className="text-sm break-all">{safeGet(prov, "predicate.buildType", "—")}</span>} />
              <Metric label="Materials" value={Array.isArray(safeGet(prov, "predicate.materials")) ? safeGet(prov, "predicate.materials").length : "—"} />
            </div>
          ) : (
            <div className="text-slate-500">Upload <code>provenance.json</code> to display attestation basics.</div>
          )}
        </CardContent>
      </Card>

      <footer className="text-xs text-slate-500 text-center py-6">
        Evidence UI • drag in JSON artifacts from CI to populate • built for IntelGraph
      </footer>
    </div>
  );
}
