"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileContext = compileContext;
exports.loadJson = loadJson;
exports.saveJson = saveJson;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = __importDefault(require("node:fs"));
function nfkc(s) {
    return s.normalize("NFKC")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
function sha256Hex(s) {
    return (0, node_crypto_1.createHash)("sha256").update(s, "utf8").digest("hex");
}
function canonicalJson(obj) {
    // Deterministic stringify: stable key order + stable array order assumed.
    const sortKeys = (x) => {
        if (Array.isArray(x))
            return x.map(sortKeys);
        if (x && typeof x === "object") {
            const out = {};
            Object.keys(x).sort().forEach(k => (out[k] = sortKeys(x[k])));
            return out;
        }
        return x;
    };
    return JSON.stringify(sortKeys(obj));
}
function compileContext(retrieval, policy) {
    const excerptCap = policy.excerpt_chars ?? 800;
    const sortMode = policy.sort ?? "score_desc_then_id";
    const perKindCaps = policy.per_kind_caps ?? {};
    const tokenBudget = policy.token_budget;
    const all = [...(retrieval.seeds ?? []), ...(retrieval.expanded ?? [])];
    // Normalize + compute dedupe key.
    const normalized = all.map((e) => {
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
    const byKey = new Map();
    for (const e of normalized) {
        const prev = byKey.get(e.dedupe_key);
        if (!prev)
            byKey.set(e.dedupe_key, e);
        else {
            if (e.score > prev.score)
                byKey.set(e.dedupe_key, e);
            else if (e.score === prev.score && e.evidence_id < prev.evidence_id)
                byKey.set(e.dedupe_key, e);
        }
    }
    let uniq = Array.from(byKey.values());
    // Stable sort
    uniq.sort((a, b) => {
        if (sortMode === "id_only")
            return a.evidence_id.localeCompare(b.evidence_id);
        if (b.score !== a.score)
            return b.score - a.score;
        return a.evidence_id.localeCompare(b.evidence_id);
    });
    // Apply caps + token budget (deterministic greedy)
    const capsUsed = {};
    const blocks = [];
    let budgetUsed = 0;
    const estimateTokens = (s) => Math.ceil(s.length / 4); // deterministic approx
    for (const e of uniq) {
        const cap = perKindCaps[e.kind];
        const used = capsUsed[e.kind] ?? 0;
        if (typeof cap === "number" && used >= cap)
            continue;
        const cost = estimateTokens(e.excerpt) + 20; // overhead
        if (budgetUsed + cost > tokenBudget)
            continue;
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
        edge_refs: (retrieval.edges ?? []).slice(0, 200).map((x) => ({
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
function loadJson(path) {
    return JSON.parse(node_fs_1.default.readFileSync(path, "utf8"));
}
function saveJson(path, obj) {
    node_fs_1.default.mkdirSync(new URL(".", `file://${path}`).pathname, { recursive: true });
    node_fs_1.default.writeFileSync(path, JSON.stringify(obj, null, 2) + "\n", "utf8");
}
