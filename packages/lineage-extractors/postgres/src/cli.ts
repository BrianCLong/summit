import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { extractSqlLineage } from "./extract-sql-lineage.js";
import { stableStringify } from "./normalize-sql.js";
import type { ExtractConfig } from "./types.js";

type Args = {
  input: string;
  outDir: string;
  jobNamespace: string;
  jobName: string;
  actor: string;
  sourceSha: string;
  policyHash: string;
  datasetNamespace: string;
  verdict?: "ALLOW" | "WARN" | "BLOCK";
  ciRunId?: string;
};

export function main(argv = process.argv.slice(2)): number {
  const args = parseArgs(argv);
  const cfg: ExtractConfig = {
    jobNamespace: args.jobNamespace,
    jobName: args.jobName,
    actor: args.actor,
    sourceSha: args.sourceSha,
    policyHash: args.policyHash,
    ciRunId: args.ciRunId,
    datasetNamespace: args.datasetNamespace,
    verdict: args.verdict
  };

  const sqlFiles = collectSqlFiles(args.input);
  mkdirSync(args.outDir, { recursive: true });

  const events: unknown[] = [];
  for (const f of sqlFiles) {
    const sql = readFileSync(f, "utf8");
    const r = extractSqlLineage(sql, cfg);

    const event = toOpenLineageEvent(r, cfg);
    events.push(event);
  }

  // Deterministic ordering: sort events by output dataset + sqlHash
  const sorted = events.slice().sort((a: any, b: any) => {
    const ao = (a.outputs?.[0]?.namespace ?? "") + "." + (a.outputs?.[0]?.name ?? "");
    const bo = (b.outputs?.[0]?.namespace ?? "") + "." + (b.outputs?.[0]?.name ?? "");
    if (ao !== bo) return ao < bo ? -1 : 1;
    const ah = a.run?.facets?.["summit.postgres"]?.sqlHash ?? "";
    const bh = b.run?.facets?.["summit.postgres"]?.sqlHash ?? "";
    if (ah !== bh) return ah < bh ? -1 : 1;
    return 0;
  });

  const outPath = join(args.outDir, "events.json");
  writeFileSync(outPath, stableStringify(sorted) + "\n", "utf8");
  return 0;
}

function parseArgs(argv: string[]): Args {
  const m = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    const v = argv[i + 1] ?? "";
    m.set(k, v);
    i++;
  }

  const required = (k: string) => {
    const v = m.get(k);
    if (!v) throw new Error(`missing --${k}`);
    return v;
  };

  const verdict = m.get("verdict") as Args["verdict"] | undefined;

  return {
    input: required("input"),
    outDir: required("outDir"),
    jobNamespace: required("jobNamespace"),
    jobName: required("jobName"),
    actor: required("actor"),
    sourceSha: required("sourceSha"),
    policyHash: required("policyHash"),
    datasetNamespace: required("datasetNamespace"),
    verdict,
    ciRunId: m.get("ciRunId")
  };
}

function collectSqlFiles(p: string): string[] {
  const root = resolve(p);
  const st = statSync(root);
  if (st.isFile()) return extname(root).toLowerCase() === ".sql" ? [root] : [];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const ent of readdirSync(dir)) {
      const fp = join(dir, ent);
      const s = statSync(fp);
      if (s.isDirectory()) walk(fp);
      else if (s.isFile() && extname(fp).toLowerCase() === ".sql") out.push(fp);
    }
  };
  walk(root);
  return out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)); // deterministic
}

function toOpenLineageEvent(r: any, cfg: ExtractConfig): unknown {
  // eventTime required by OpenLineage; for deterministic build artifacts we keep it constant.
  // Consumers should bind real timestamps in audit stamp, not the lineage payload.
  const eventTime = "1970-01-01T00:00:00.000Z";

  return {
    eventType: "OTHER",
    eventTime,
    producer: "summit-lineage-extractor-postgres",
    schemaURL: "https://openlineage.io/spec/1-0-0/OpenLineage.json",
    job: { namespace: cfg.jobNamespace, name: cfg.jobName },
    run: {
      runId: r.sqlHash,
      facets: {
        "summit.audit": {
          actor: cfg.actor,
          sourceSha: cfg.sourceSha,
          policyHash: cfg.policyHash,
          ciRunId: cfg.ciRunId
        },
        "summit.governanceVerdict": { verdict: r.verdict, reasons: r.notes },
        "summit.postgres": { sqlHash: r.sqlHash, dialect: "postgres", notes: r.notes }
      }
    },
    inputs: r.inputs.map((d: any) => ({ namespace: d.namespace, name: d.name })),
    outputs: r.outputs.map((d: any) => ({ namespace: d.namespace, name: d.name }))
  };
}

// If executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exit(main());
  } catch (e: any) {
    console.error(String(e?.message ?? e));
    process.exit(2);
  }
}
