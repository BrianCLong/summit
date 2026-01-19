import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

type Args = {
  baseline: string;
  current: string;
  out: string;
  failOnDrift?: boolean;
};

type Node = { id: string; kind: string; namespace: string; name: string };
type Edge = { id: string; kind: string; from: string; to: string; facets?: any };

type Graph = { version: number; nodes: Node[]; edges: Edge[] };

type Diff = {
  version: 1;
  baseline_exists: boolean;
  node_added: Node[];
  node_removed: Node[];
  edge_added: Edge[];
  edge_removed: Edge[];
};

export function main(argv = process.argv.slice(2)): number {
  const args = parseArgs(argv);

  const baselineExists = existsSync(args.baseline);
  const base: Graph = baselineExists ? JSON.parse(readFileSync(args.baseline, "utf8")) : { version: 1, nodes: [], edges: [] };
  const cur: Graph = JSON.parse(readFileSync(args.current, "utf8"));

  const diff = computeDiff(base, cur, baselineExists);

  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, stableStringify(diff) + "\n", "utf8");

  if (args.failOnDrift) {
    const drift = diff.node_added.length || diff.node_removed.length || diff.edge_added.length || diff.edge_removed.length;
    if (drift) return 4;
  }
  return 0;
}

export function computeDiff(base: Graph, cur: Graph, baselineExists: boolean): Diff {
  const bNodes = new Map(base.nodes.map((n) => [n.id, n]));
  const cNodes = new Map(cur.nodes.map((n) => [n.id, n]));
  const bEdges = new Map(base.edges.map((e) => [e.id, e]));
  const cEdges = new Map(cur.edges.map((e) => [e.id, e]));

  const node_added: Node[] = [];
  const node_removed: Node[] = [];
  const edge_added: Edge[] = [];
  const edge_removed: Edge[] = [];

  for (const [id, n] of cNodes) if (!bNodes.has(id)) node_added.push(n);
  for (const [id, n] of bNodes) if (!cNodes.has(id)) node_removed.push(n);
  for (const [id, e] of cEdges) if (!bEdges.has(id)) edge_added.push(e);
  for (const [id, e] of bEdges) if (!cEdges.has(id)) edge_removed.push(e);

  node_added.sort(objCmp);
  node_removed.sort(objCmp);
  edge_added.sort(objCmp);
  edge_removed.sort(objCmp);

  return { version: 1, baseline_exists: baselineExists, node_added, node_removed, edge_added, edge_removed };
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
  const failOnDrift = m.get("failOnDrift");
  return {
    baseline: required("baseline"),
    current: required("current"),
    out: required("out"),
    failOnDrift: failOnDrift === "true"
  };
}

function dirname(p: string): string {
  const idx = p.replace(/\\/g, "/").lastIndexOf("/");
  return idx >= 0 ? p.slice(0, idx) : ".";
}

function objCmp(a: any, b: any): number {
  const sa = stableStringify(a);
  const sb = stableStringify(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
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
