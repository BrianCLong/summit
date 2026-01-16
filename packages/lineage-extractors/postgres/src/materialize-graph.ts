import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

type Args = {
  events: string;
  out: string;
};

export type GraphNode = {
  id: string; // stable: "dataset:<ns>.<name>" or "job:<ns>.<name>"
  kind: "dataset" | "job";
  namespace: string;
  name: string;
};

export type GraphEdge = {
  id: string; // stable: sha256-ish but here: "edge:<from>-><to>:<type>"
  kind: "consumes" | "produces";
  from: string; // node.id
  to: string; // node.id
  // facets carried through deterministically for audit + governance
  facets: {
    sqlHash?: string;
    sourceSha?: string;
    policyHash?: string;
    verdict?: "ALLOW" | "WARN" | "BLOCK";
  };
};

export type LineageGraph = {
  version: 1;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export function main(argv = process.argv.slice(2)): number {
  const args = parseArgs(argv);
  const events = JSON.parse(readFileSync(args.events, "utf8"));
  if (!Array.isArray(events)) throw new Error("events must be an array");

  const graph = materialize(events);
  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, stableStringify(graph) + "\n", "utf8");
  return 0;
}

export function materialize(events: any[]): LineageGraph {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();

  const upsertNode = (n: GraphNode) => nodes.set(n.id, n);
  const upsertEdge = (e: GraphEdge) => edges.set(e.id, e);

  for (const ev of events) {
    const jobNs = String(ev?.job?.namespace ?? "");
    const jobName = String(ev?.job?.name ?? "");
    if (jobNs && jobName) {
      const jobId = `job:${jobNs}.${jobName}`;
      upsertNode({ id: jobId, kind: "job", namespace: jobNs, name: jobName });

      const sqlHash = ev?.run?.facets?.["summit.postgres"]?.sqlHash;
      const sourceSha = ev?.run?.facets?.["summit.audit"]?.sourceSha;
      const policyHash = ev?.run?.facets?.["summit.audit"]?.policyHash;
      const verdict = ev?.run?.facets?.["summit.governanceVerdict"]?.verdict;

      const inputs = Array.isArray(ev?.inputs) ? ev.inputs : [];
      const outputs = Array.isArray(ev?.outputs) ? ev.outputs : [];

      for (const d of inputs) {
        const ns = String(d?.namespace ?? "");
        const name = String(d?.name ?? "");
        if (!ns || !name) continue;
        const dsId = `dataset:${ns}.${name}`;
        upsertNode({ id: dsId, kind: "dataset", namespace: ns, name });

        // job consumes dataset
        const eId = `edge:${jobId}->${dsId}:consumes`;
        upsertEdge({
          id: eId,
          kind: "consumes",
          from: jobId,
          to: dsId,
          facets: { sqlHash, sourceSha, policyHash, verdict }
        });
      }

      for (const d of outputs) {
        const ns = String(d?.namespace ?? "");
        const name = String(d?.name ?? "");
        if (!ns || !name) continue;
        const dsId = `dataset:${ns}.${name}`;
        upsertNode({ id: dsId, kind: "dataset", namespace: ns, name });

        // job produces dataset
        const eId = `edge:${jobId}->${dsId}:produces`;
        upsertEdge({
          id: eId,
          kind: "produces",
          from: jobId,
          to: dsId,
          facets: { sqlHash, sourceSha, policyHash, verdict }
        });
      }
    }
  }

  const nodeList = Array.from(nodes.values()).sort(nodeCmp);
  const edgeList = Array.from(edges.values()).sort(edgeCmp);

  return { version: 1, nodes: nodeList, edges: edgeList };
}

function parseArgs(argv: string[]): Args {
  const m = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    m.set(a.slice(2), argv[i + 1] ?? "");
    i++;
  }
  const required = (k: string) => {
    const v = m.get(k);
    if (!v) throw new Error(`missing --${k}`);
    return v;
  };
  return { events: required("events"), out: required("out") };
}

function dirname(p: string): string {
  const idx = p.replace(/\\/g, "/").lastIndexOf("/");
  return idx >= 0 ? p.slice(0, idx) : ".";
}

function nodeCmp(a: GraphNode, b: GraphNode): number {
  if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
  if (a.namespace !== b.namespace) return a.namespace < b.namespace ? -1 : 1;
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  return 0;
}

function edgeCmp(a: GraphEdge, b: GraphEdge): number {
  if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
  if (a.from !== b.from) return a.from < b.from ? -1 : 1;
  if (a.to !== b.to) return a.to < b.to ? -1 : 1;
  return 0;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableNormalize(value));
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = stableNormalize(obj[k]);
    return out;
  }
  return value;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exit(main());
  } catch (e: any) {
    console.error(String(e?.message ?? e));
    process.exit(2);
  }
}
