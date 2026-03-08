import { createHash } from "node:crypto";
import fs from "node:fs";

export type CompilerPolicy = {
  token_budget: number;
  excerpt_chars?: number;
  per_kind_caps?: Record<string, number>;
  include_provenance_chain?: boolean;
  include_contradictions?: boolean;
  sort?: "score_desc_then_id" | "id_only";
};

function nfkc(s: string): string {
  return s.normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function canonicalJson(obj: any): string {
  // Deterministic stringify: stable key order + stable array order assumed.
  const sortKeys = (x: any): any => {
    if (Array.isArray(x)) return x.map(sortKeys);
    if (x && typeof x === "object") {
      const out: any = {};
      Object.keys(x).sort().forEach(k => (out[k] = sortKeys(x[k])));
      return out;
    }
    return x;
  };
  return JSON.stringify(sortKeys(obj));
}

export function compileContext(retrieval: any, policy: CompilerPolicy) {
  const excerptCap = policy.excerpt_chars ?? 800;
  const sortMode = policy.sort ?? "score_desc_then_id";
  const perKindCaps = policy.per_kind_caps ?? {};
  const tokenBudget = policy.token_budget;

  const all = [...(retrieval.seeds ?? []), ...(retrieval.expanded ?? [])];

  // Normalize + compute dedupe key.
  const normalized = all.map((e: any) => {
    const excerpt = nfkc(String(e.excerpt ?? "")).slice(0, excerptCap);
    const uri = e.uri ? nfkc(String(e.uri)) : undefined;
    const evidence_id = nfkc(String(e.evidence_id));
    const kind = nfkc(String(e.kind ?? "unknown"));
    const score = typeof e.score === "number" ? e.score : 0;
    const dedupe_key = sha256Hex(`${excerpt}\n${uri ?? ""}\n${evidence_id}`);
    return {
      evidence_id,
      kind,
      title: e.title ? nfkc(String(e.title)) : undefined,
      excerpt,
      uri,
      score,
      digest: e.digest?.sha256 ? { sha256: String(e.digest.sha256) } : { sha256: sha256Hex(excerpt) },
      provenance: e.provenance ?? {},
      dedupe_key
    };
  });

  // Dedupe: keep best score; tie-break on evidence_id.
  const byKey = new Map<string, any>();
  for (const e of normalized) {
    const prev = byKey.get(e.dedupe_key);
    if (!prev) byKey.set(e.dedupe_key, e);
    else {
      if (e.score > prev.score) byKey.set(e.dedupe_key, e);
      else if (e.score === prev.score && e.evidence_id < prev.evidence_id) byKey.set(e.dedupe_key, e);
    }
  }

  let uniq = Array.from(byKey.values());

  // Stable sort
  uniq.sort((a, b) => {
    if (sortMode === "id_only") return a.evidence_id.localeCompare(b.evidence_id);
    if (b.score !== a.score) return b.score - a.score;
    return a.evidence_id.localeCompare(b.evidence_id);
  });

  // Apply caps + token budget (deterministic greedy)
  const capsUsed: Record<string, number> = {};
  const blocks: any[] = [];
  let budgetUsed = 0;

  const estimateTokens = (s: string) => Math.ceil(s.length / 4); // deterministic approx

  for (const e of uniq) {
    const cap = perKindCaps[e.kind];
    const used = capsUsed[e.kind] ?? 0;
    if (typeof cap === "number" && used >= cap) continue;

    const cost = estimateTokens(e.excerpt) + 20; // overhead
    if (budgetUsed + cost > tokenBudget) continue;

    capsUsed[e.kind] = used + 1;
    budgetUsed += cost;
    blocks.push({
      evidence_id: e.evidence_id,
      kind: e.kind,
      excerpt: e.excerpt,
      uri: e.uri,
      provenance: e.provenance,
      score: e.score,
      digest: e.digest
    });
  }

  // Emit compiled context
  const compiled = {
    contract_version: "v1",
    header: {
      query_hash: retrieval?.request?.query_hash ?? "unknown",
      policy_hash: retrieval?.request?.policy_hash ?? "unknown",
      graph_ref: retrieval?.request?.graph_ref ?? "unknown"
    },
    evidence_blocks: blocks,
    edge_refs: (retrieval.edges ?? []).slice(0, 200).map((x: any) => ({
      from: String(x.from),
      to: String(x.to),
      type: String(x.type)
    })),
    compiler_stats: {
      input_count: all.length,
      uniq_count: uniq.length,
      output_count: blocks.length,
      caps_used: capsUsed,
      token_budget: tokenBudget,
      token_used_est: budgetUsed
    }
  };

  const context_digest = sha256Hex(canonicalJson(compiled));
  return { ...compiled, context_digest };
}

export function loadJson(path: string) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

export function saveJson(path: string, obj: any) {
  fs.mkdirSync(new URL(".", `file://${path}`).pathname, { recursive: true });
  fs.writeFileSync(path, JSON.stringify(obj, null, 2) + "\n", "utf8");
}
