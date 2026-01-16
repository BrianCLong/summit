import { normalizeSql, sha256Hex } from "./normalize-sql.js";
import type { DatasetRef, ExtractConfig, ExtractResult, LineageEdge, GovernanceVerdict } from "./types.js";

/**
 * MVP SQL lineage extractor for Postgres-ish SQL.
 * Supported:
 * - CREATE VIEW <name> AS SELECT ... FROM <sources>
 * - INSERT INTO <name> ... SELECT ... FROM <sources>
 * - UPDATE <name> SET ... FROM <sources>
 * - WITH <cte> AS (...) SELECT ... FROM <sources>
 *
 * This is intentionally conservative: when ambiguous, it emits WARN with notes.
 */
export function extractSqlLineage(sql: string, cfg: ExtractConfig): ExtractResult {
  const normalizedSql = normalizeSql(sql);
  const sqlHash = sha256Hex(normalizedSql);

  const notes: string[] = [];
  const verdict: GovernanceVerdict = cfg.verdict ?? "ALLOW";

  const op = detectOperation(normalizedSql, notes);
  const outputs = detectOutputs(normalizedSql, op, cfg, notes);
  const inputs = detectInputs(normalizedSql, op, notes);

  // Dedup + stable sort
  const inputsNorm = uniqDatasets(inputs).sort(datasetCmp);
  const outputsNorm = uniqDatasets(outputs).sort(datasetCmp);

  const edges: LineageEdge[] = [];
  for (const out of outputsNorm) {
    for (const inp of inputsNorm) {
      edges.push({ from: inp, to: out, operation: op, notes: notes.length ? [...notes] : undefined });
    }
  }

  // Heuristic warnings
  if (normalizedSql.includes("execute ") || normalizedSql.includes("format(")) {
    notes.push("possible dynamic sql detected (execute/format); lineage may be incomplete");
  }
  if (op === "UNKNOWN") notes.push("unrecognized statement form; outputs/inputs may be incomplete");

  return {
    normalizedSql,
    sqlHash,
    inputs: inputsNorm,
    outputs: outputsNorm,
    edges: edges.sort(edgeCmp),
    verdict,
    notes: uniqStrings(notes)
  };
}

type Op = ExtractResult["edges"][number]["operation"];

function detectOperation(s: string, notes: string[]): Op {
  if (s.startsWith("create view ")) return "CREATE_VIEW";
  if (s.startsWith("create or replace view ")) return "CREATE_VIEW";
  if (s.startsWith("insert into ")) return "INSERT_SELECT";
  if (s.startsWith("update ")) return "UPDATE_FROM";
  // also allow leading WITH for insert/update/create view
  if (s.startsWith("with ")) {
    // try to infer later
    notes.push("leading cte detected (with ...); operation inferred from following statement where possible");
    if (s.includes(" create view ")) return "CREATE_VIEW";
    if (s.includes(" insert into ")) return "INSERT_SELECT";
    if (s.includes(" update ")) return "UPDATE_FROM";
  }
  return "UNKNOWN";
}

function detectOutputs(s: string, op: Op, cfg: ExtractConfig, notes: string[]): DatasetRef[] {
  const out: DatasetRef[] = [];
  if (op === "CREATE_VIEW") {
    // create [or replace] view <ident> as
    const m = s.match(/create(?:\s+or\s+replace)?\s+view\s+([a-z0-9_".]+)\s+as\s+/);
    if (m) out.push(parseDatasetIdent(m[1], cfg.datasetNamespace));
    else notes.push("failed to parse CREATE VIEW target");
  } else if (op === "INSERT_SELECT") {
    // insert into <ident>
    const m = s.match(/insert\s+into\s+([a-z0-9_".]+)\b/);
    if (m) out.push(parseDatasetIdent(m[1], cfg.datasetNamespace));
    else notes.push("failed to parse INSERT INTO target");
  } else if (op === "UPDATE_FROM") {
    // update <ident> set ...
    const m = s.match(/update\s+([a-z0-9_".]+)\s+set\b/);
    if (m) out.push(parseDatasetIdent(m[1], cfg.datasetNamespace));
    else notes.push("failed to parse UPDATE target");
  } else {
    notes.push("no output detection rule for operation=UNKNOWN");
  }
  return out;
}

function detectInputs(s: string, op: Op, notes: string[]): DatasetRef[] {
  // Extract table refs after FROM and JOIN and UPDATE ... FROM.
  // Conservative: skip CTE names by recording them and excluding.
  const cteNames = extractCteNames(s);
  const candidates: string[] = [];

  // FROM <ident> , <ident> ...
  for (const m of s.matchAll(/\bfrom\s+([a-z0-9_".]+)\b/g)) candidates.push(m[1]);
  for (const m of s.matchAll(/\bjoin\s+([a-z0-9_".]+)\b/g)) candidates.push(m[1]);

  // UPDATE ... FROM <ident>
  if (op === "UPDATE_FROM") {
    for (const m of s.matchAll(/\bfrom\s+([a-z0-9_".]+)\b/g)) candidates.push(m[1]);
  }

  // Filter obvious non-table tokens
  const filtered = candidates.filter((x) => !isKeywordish(x)).filter((x) => !cteNames.has(stripQuotes(x)));

  // If no inputs found and statement has select, warn
  if (!filtered.length && s.includes("select ")) notes.push("no input tables detected; statement may reference only functions/values/ctes");

  // Parse datasets with optional schema qualification
  const parsed = filtered.map((x) => parseDatasetIdent(x, ""));
  // Remove empties
  return parsed.filter((d) => d.name.length > 0);
}

function extractCteNames(s: string): Set<string> {
  // WITH cte AS (...), cte2 AS (...)
  const names = new Set<string>();
  // Simple scanning: after "with", capture identifier preceding " as"
  // This will miss complex cases; acceptable for MVP.
  const withIdx = s.indexOf("with ");
  if (withIdx < 0) return names;
  const segment = s.slice(withIdx, Math.min(s.length, withIdx + 2000)); // bound parsing
  for (const m of segment.matchAll(/\bwith\s+([a-z0-9_".]+)\s+as\s*\(/g)) names.add(stripQuotes(m[1]));
  for (const m of segment.matchAll(/,\s*([a-z0-9_".]+)\s+as\s*\(/g)) names.add(stripQuotes(m[1]));
  return names;
}

function parseDatasetIdent(ident: string, defaultNamespace: string): DatasetRef {
  const raw = stripQuotes(ident);
  const parts = raw.split(".").filter(Boolean);
  if (parts.length === 1) return { namespace: defaultNamespace || "public", name: parts[0] };
  if (parts.length === 2) return { namespace: parts[0], name: parts[1] };
  // db.schema.table => namespace=db.schema, name=table
  if (parts.length >= 3) return { namespace: parts.slice(0, parts.length - 1).join("."), name: parts[parts.length - 1] };
  return { namespace: defaultNamespace || "public", name: raw };
}

function stripQuotes(s: string): string {
  return s.replaceAll('"', "");
}

function isKeywordish(x: string): boolean {
  const t = stripQuotes(x);
  return (
    t === "select" ||
    t === "where" ||
    t === "group" ||
    t === "order" ||
    t === "limit" ||
    t === "offset" ||
    t === "on"
  );
}

function uniqDatasets(ds: DatasetRef[]): DatasetRef[] {
  const seen = new Set<string>();
  const out: DatasetRef[] = [];
  for (const d of ds) {
    const k = `${d.namespace}::${d.name}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(d);
    }
  }
  return out;
}

function uniqStrings(xs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) if (!seen.has(x)) (seen.add(x), out.push(x));
  return out;
}

function datasetCmp(a: DatasetRef, b: DatasetRef): number {
  if (a.namespace !== b.namespace) return a.namespace < b.namespace ? -1 : 1;
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  return 0;
}

function edgeCmp(a: LineageEdge, b: LineageEdge): number {
  const fa = `${a.from.namespace}.${a.from.name}`;
  const fb = `${b.from.namespace}.${b.from.name}`;
  if (fa !== fb) return fa < fb ? -1 : 1;
  const ta = `${a.to.namespace}.${a.to.name}`;
  const tb = `${b.to.namespace}.${b.to.name}`;
  if (ta !== tb) return ta < tb ? -1 : 1;
  if (a.operation !== b.operation) return a.operation < b.operation ? -1 : 1;
  return 0;
}
