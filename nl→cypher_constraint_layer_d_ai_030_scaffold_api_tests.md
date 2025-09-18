# NL→Cypher Constraint Layer (D‑AI‑030) — Scaffold, API & Tests

**Repo paths (proposed):**
```
services/gateway/
  src/nl2cypher/
    guardrails/
      constraints.ts        # static limits, thresholds, whitelists
      explain.ts            # reason codes → user/help text
      index.ts              # main guardrail entrypoint (analyze, enforce, patch LIMIT)
    translator/
      interface.ts          # adapter contract for NL→Cypher provider(s)
    executor/
      neo4j.ts              # preview/execute wrappers; read‑only transaction; timeout hooks
  src/graphql/
    schema/nlq.graphql      # SDL additions (preview/execute + types)
    resolvers/nlq.ts        # Apollo resolvers wiring guardrails + OPA simulate
  __tests__/nlq-guardrails.test.ts  # unit + golden smoke for 4 canonical intents
config/nlq.guardrails.yaml         # defaults (limits, whitelists)
```

> **Principles:**
> 1) **Safety‑first**: read‑only Cypher only; any write keyword/procedure → deny with actionable reasons.  
> 2) **Bounded work**: LIMIT required (auto‑inject default) + path length caps + complexity budget.  
> 3) **Explainability**: machine‑readable `reasons[]` + human text; surfaced in UI and logs.  
> 4) **Rollback guarantee**: execute path constrained to read‑only → trivial undo; write attempts require explicit non‑NLQ flow.

---

## `schema/nlq.graphql` (SDL)
```graphql
scalar JSON

type NLQReason { code: String!, message: String! }

type NLQPreview {
  allowed: Boolean!
  cypher: String
  params: JSON
  reasons: [NLQReason!]!
  cost: Int!
  limitApplied: Int
}

type NLQExecuteResult {
  allowed: Boolean!
  reasons: [NLQReason!]!
  cost: Int!
  rows: Int
}

input NLQRequest {
  text: String!
  params: JSON
  maxHops: Int = 3
  limit: Int = 100
}

extend type Mutation {
  nlqPreview(input: NLQRequest!): NLQPreview! @opa(policy: "nlq.preview")
  nlqExecute(input: NLQRequest!): NLQExecuteResult! @opa(policy: "nlq.execute")
}
```

---

## `guardrails/constraints.ts`
```ts
export type GuardConfig = {
  maxLimit: number;               // hard cap for LIMIT
  defaultLimit: number;           // applied if missing
  maxVarLength: number;           // e.g., 3 for *..3
  bannedKeywords: string[];       // ["CREATE","MERGE","DELETE","SET","REMOVE","CALL IN TRANSACTIONS","LOAD CSV","PERIODIC COMMIT"]
  bannedFunctions: string[];      // e.g., apoc.* unless whitelisted
  allowedProcedures: string[];    // safe read‑only calls if needed
  costWeights: { node: number; rel: number; varStep: number; returnProp: number };
  maxCost: number;                // budget units
};

export const DEFAULTS: GuardConfig = {
  maxLimit: 500,
  defaultLimit: 100,
  maxVarLength: 3,
  bannedKeywords: [
    'CREATE','MERGE','DELETE','DETACH DELETE','SET','REMOVE','CALL {','CALL IN TRANSACTIONS','LOAD CSV','PERIODIC COMMIT','COPY'
  ],
  bannedFunctions: ['apoc.', 'dbms.'],
  allowedProcedures: ['db.index.fulltext.queryNodes'],
  costWeights: { node: 1, rel: 1, varStep: 3, returnProp: 0 },
  maxCost: 1500
};
```

---

## `guardrails/explain.ts`
```ts
export type Reason = { code: string; message: string };

export const messages: Record<string, string> = {
  'unsafe.write_keyword': 'Query contains write keywords not allowed for NL→Cypher (CREATE/MERGE/DELETE/SET/REMOVE).',
  'unsafe.apoc': 'Use of APOC or restricted functions is not allowed.',
  'limit.missing': 'Query had no LIMIT — default applied.',
  'limit.too_high': 'Requested LIMIT exceeds maximum and was reduced.',
  'path.too_long': 'Variable‑length path exceeds configured maximum hops.',
  'cost.too_high': 'Estimated query cost exceeds configured safety budget.',
};

export const reason = (code: keyof typeof messages): Reason => ({ code, message: messages[code] });
```

---

## `guardrails/index.ts`
```ts
import { DEFAULTS, GuardConfig } from './constraints';
import { reason, Reason } from './explain';

export type Analysis = { allowed: boolean; cypher: string; reasons: Reason[]; cost: number; limitApplied?: number };

export function analyzeAndPatch(inputCypher: string, cfg: GuardConfig = DEFAULTS): Analysis {
  const text = inputCypher.trim();
  const reasons: Reason[] = [];
  const upper = text.toUpperCase();

  // 1) ban writes / dangerous constructs
  for (const k of cfg.bannedKeywords) {
    if (upper.includes(k)) return { allowed: false, cypher: text, reasons: [reason('unsafe.write_keyword')], cost: 0 };
  }
  for (const f of cfg.bannedFunctions) {
    if (upper.includes(f.toUpperCase())) return { allowed: false, cypher: text, reasons: [reason('unsafe.apoc')], cost: 0 };
  }

  // 2) require LIMIT; down‑cap if needed
  let cypher = text;
  const limitRegex = /\bLIMIT\s+(\d+)/i;
  const m = cypher.match(limitRegex);
  if (!m) {
    reasons.push(reason('limit.missing'));
    cypher = `${cypher}\nLIMIT ${cfg.defaultLimit}`;
  } else {
    const requested = parseInt(m[1], 10);
    if (requested > cfg.maxLimit) {
      reasons.push(reason('limit.too_high'));
      cypher = cypher.replace(limitRegex, `LIMIT ${cfg.maxLimit}`);
    }
  }

  // 3) cap variable‑length paths "*..N"
  const varLen = /\*\s*\.\.\s*(\d+)/g;
  let match;
  while ((match = varLen.exec(upper)) !== null) {
    const hops = parseInt(match[1], 10);
    if (hops > cfg.maxVarLength) reasons.push(reason('path.too_long'));
  }

  // 4) naive cost model: count nodes, rels, varSteps
  const nodeCount = (cypher.match(/\([^)]+\)/g) || []).length;
  const relCount = (cypher.match(/-\[[^\]]*\]-/g) || []).length;
  const varSteps = (cypher.match(/\*\s*\.\.\s*\d+/g) || []).length;
  const cost = nodeCount*cfg.costWeights.node + relCount*cfg.costWeights.rel + varSteps*cfg.costWeights.varStep;
  if (cost > cfg.maxCost) return { allowed: false, cypher, reasons: [reason('cost.too_high')], cost };

  return { allowed: true, cypher, reasons, cost, limitApplied: extractLimit(cypher) };
}

function extractLimit(c: string): number | undefined {
  const m = c.match(/\bLIMIT\s+(\d+)/i); return m ? parseInt(m[1], 10) : undefined;
}
```

---

## `translator/interface.ts`
```ts
export interface Translator {
  toCypher(naturalLanguage: string, options?: { maxHops?: number; limit?: number }): Promise<{ cypher: string; params?: Record<string, unknown> }>;
}
```

---

## `executor/neo4j.ts`
```ts
import neo4j, { Driver } from 'neo4j-driver';
import { analyzeAndPatch } from '../nl2cypher/guardrails';

export async function preview(driver: Driver, cypher: string, params: any) {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  const analysis = analyzeAndPatch(cypher);
  return analysis;
}

export async function execute(driver: Driver, cypher: string, params: any, timeoutMs = 3000) {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  const analysis = analyzeAndPatch(cypher);
  if (!analysis.allowed) return { allowed: false, reasons: analysis.reasons, cost: analysis.cost, rows: 0 };
  // Guard: enforce server timeout
  const tx = session.beginTransaction({ timeout: timeoutMs });
  try {
    const res = await tx.run(analysis.cypher, params || {});
    await tx.commit();
    return { allowed: true, reasons: analysis.reasons, cost: analysis.cost, rows: res.records.length };
  } finally {
    await session.close();
  }
}
```

---

## `resolvers/nlq.ts`
```ts
import { GraphQLResolveInfo } from 'graphql';
import { Translator } from '../nl2cypher/translator/interface';
import { preview, execute } from '../nl2cypher/executor/neo4j';

export default (deps: { translator: Translator, driver: any }) => ({
  Mutation: {
    async nlqPreview(_: any, { input }: any, ctx: any, info: GraphQLResolveInfo) {
      const { cypher, params } = await deps.translator.toCypher(input.text, { maxHops: input.maxHops, limit: input.limit });
      const analysis = await preview(deps.driver, cypher, params);
      return { ...analysis, params };
    },
    async nlqExecute(_: any, { input }: any, ctx: any) {
      const { cypher, params } = await deps.translator.toCypher(input.text, { maxHops: input.maxHops, limit: input.limit });
      const res = await execute(deps.driver, cypher, params);
      return res;
    }
  }
});
```

---

## `config/nlq.guardrails.yaml`
```yaml
maxLimit: 500
defaultLimit: 100
maxVarLength: 3
bannedKeywords: [CREATE, MERGE, DELETE, "DETACH DELETE", SET, REMOVE, "CALL IN TRANSACTIONS", "LOAD CSV", "PERIODIC COMMIT", COPY]
bannedFunctions: ["apoc.", "dbms."]
allowedProcedures: ["db.index.fulltext.queryNodes"]
costWeights: { node: 1, rel: 1, varStep: 3, returnProp: 0 }
maxCost: 1500
```

---

## Tests — `__tests__/nlq-guardrails.test.ts`
```ts
import { analyzeAndPatch } from '../src/nl2cypher/guardrails';

describe('NL→Cypher guardrails', () => {
  it('injects default LIMIT and allows read queries', () => {
    const cypher = 'MATCH (i:Indicator {value: $value})-[:RELATED_TO]->(n) RETURN n';
    const a = analyzeAndPatch(cypher);
    expect(a.allowed).toBe(true);
    expect(a.cypher).toMatch(/LIMIT 100/);
  });
  it('caps excessive LIMIT', () => {
    const cypher = 'MATCH (n) RETURN n LIMIT 9999';
    const a = analyzeAndPatch(cypher);
    expect(a.allowed).toBe(true);
    expect(a.cypher).toMatch(/LIMIT 500/);
    expect(a.reasons.map(r=>r.code)).toContain('limit.too_high');
  });
  it('denies write operations', () => {
    const cypher = 'MATCH (n) DELETE n';
    const a = analyzeAndPatch(cypher);
    expect(a.allowed).toBe(false);
    expect(a.reasons[0].code).toBe('unsafe.write_keyword');
  });
  it('flags long var‑length paths', () => {
    const cypher = 'MATCH p=()-[:R*..5]->() RETURN nodes(p)';
    const a = analyzeAndPatch(cypher);
    expect(a.allowed).toBe(true);
    expect(a.reasons.map(r=>r.code)).toContain('path.too_long');
  });
});
```

---

## Wiring Notes
- Add SDL to gateway’s schema loader; expose resolvers via dependency‑injection of `translator` + `driver`.
- Pipe **OPA** policies: `nlq.preview` should always allow but record reasons; `nlq.execute` enforces ABAC + scopes.
- Log `reasons[]`, `cost`, `policy_version` for audit.
- Timeouts align with **E‑OPS‑040**; server configurable.

## PR Description Snippet
```
feat(nlq): add guardrail layer + preview/execute endpoints (D-AI-030)
- Read-only enforcement, LIMIT auto-injection, path/cost caps
- Explainable reasons returned to UI & audit
- Unit tests for safety scenarios
```

