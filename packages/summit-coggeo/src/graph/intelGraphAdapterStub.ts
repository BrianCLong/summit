import fs from "node:fs";
import path from "node:path";

export interface IntelGraphWriteResult {
  accepted: boolean;
  written_nodes: number;
  written_edges: number;
  outPath: string;
}

export class IntelGraphAdapterStub {
  constructor(private opts: { outDir: string }) {}

  async writeArtifacts(envelope: any): Promise<IntelGraphWriteResult> {
    const outDir = this.opts.outDir;
    fs.mkdirSync(outDir, { recursive: true });

    const file = path.join(outDir, `intelgraph-write-${Date.now()}.jsonl`);
    const lines: string[] = [];
    lines.push(JSON.stringify({ kind: "writeset-envelope", ts: new Date().toISOString(), id: envelope?.id ?? null }));

    const nodes = envelope?.nodes ?? [];
    const edges = envelope?.edges ?? [];

    for (const n of nodes) lines.push(JSON.stringify({ kind: "node", ...n }));
    for (const e of edges) lines.push(JSON.stringify({ kind: "edge", ...e }));

    // If CogGeo embedded:
    if (envelope?.coggeo) {
      lines.push(JSON.stringify({ kind: "coggeo", ...envelope.coggeo }));
    }

    fs.writeFileSync(file, lines.join("\n") + "\n", "utf8");

    return { accepted: true, written_nodes: nodes.length, written_edges: edges.length, outPath: file };
  }
}
