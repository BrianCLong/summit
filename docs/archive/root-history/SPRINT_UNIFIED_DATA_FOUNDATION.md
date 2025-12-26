## Unified Data Foundation + Data Quality (Imperfect Data) + KYC/Forensics + Agentic Case Builder | IntelGraph Advisory Report | GitHub Branch: feature/unified-foundation-sprint-4

As Chair, I present the findings of the IntelGraph Advisory Committee on Sprint #4. Consensus is noted where unanimous; dissents are highlighted.

### Consensus Summary

**Unanimous View:** Convert the next-lowest-coverage seams in the competitor matrix into a cohesive “data foundation” release: **Data Federation v1 (1.22%)**, **Tools for Imperfect Data v1 (3.66%)**, **Digital Forensics v0 (3.66%)**, **KYC Processes v1 (3.66%)**, and an initial **Agentic Case Builder v0 (1.22%)** that orchestrates multi-step investigations over our graph core. Also showcase **Index-Free Adjacency (0.61%)** with measurable performance wins.
**Dissents:** 🛰 **Starkey** warns of cross-border data routing and evidentiary chain-of-custody gaps; 🛡 **Foster** requires redaction-first defaults, warrant/authority binding, and export-time disclosure bundles.

---

### Individual Commentaries

### 🪄 Elara Voss

- _“By the runes of Scrum…”_ This sprint is a **four-lane** highway: **Federation**, **Imperfect Data**, **KYC/Forensics**, **Agentic Builder**—each with a golden-path demo and a one-click disclosure export.
- Ship a **Data Catalog & Federation Console**: register sources, preview schemas, map fields, and run test joins with live policy verdicts.

### 🛰 Starkey

- _Reality check:_ <span style="color:#c00;font-weight:700">**Bold red dissent:** Federation without jurisdiction routing = breach bait.</span> Tag every source with **country of origin, residency, TLP, license**. Enforce **ABAC/OPA** at compile **and** export time.
- Chain-of-custody: for forensics, hash all artifacts at ingest; log handlers; require two-person approval for destructive ops.

### 🛡 Foster

- _Operational vectors indicate…_ **redaction-first** for PII/biometrics; for KYC, **no face recognition**—document metadata only; strong consent records.
- **[RESTRICTED]**: enable **k-anonymity thresholds** in exports; block unlicensed cross-border transfers; disclosure bundles must include **model/rule versions** and **policy decisions**.

### ⚔ Oppie (11-persona consensus)

- _We decree unanimously:_ the **Agentic Case Builder** must be **explainable**—every agent step logs prompts, compiled Cypher, and **counterfactuals** (“what change flips the plan?”).
- Dissent (Beria): <span style="color:#c00;font-weight:700">**purge any** endpoint/EDR scope creep</span>—stay in intel orchestration; integrate with SIEM/XDR if needed.

### 📊 Magruder

- For executive traction: competitors barely cover **Data Federation (1.22%)**, **Agentic AI (1.22%)**, **Imperfect Data (3.66%)**, **KYC (3.66%)**, **Forensics (3.66%)**. Own these with **provenance-first** execution and measurable **Index-Free Adjacency** speedups.

### 🧬 Stribol

- Cross-source analysis reveals repo primitives ready to wire: **GraphQL**, **NL→Cypher**, **Graph-XAI**, **Prov-ledger**, **tri-pane UI**. Add a **federated query router**, **schema-mapping DSL**, and a **forensics sidecar** (EXIF, hashes).
- Black-swan: **policy-aware join planner** that prunes edges by label/jurisdiction _before_ plan enumeration—cheaper and court-safer.

---

## Chair Synthesis — **Sprint Prompt (paste this whole section into your tracker as the full brief)**

### Sprint Goal (2 weeks)

Deliver a **Unified Data Foundation**: **Federation v1** (governed, licensed sources), **Imperfect-Data Toolkit v1** (schema mapping, dedupe, fuzzy transforms), **KYC v1 + Forensics v0** (documents metadata + EXIF/chain-of-custody), and **Agentic Case Builder v0** (explainable, policy-aware orchestration). Demonstrate **Index-Free Adjacency** performance wins in the tri-pane.

### Why Now (competitor-matrix deltas)

- **Data Federation 1.22%**, **Agentic AI 1.22%**, **Index-Free Adjacency 0.61%**, **Tools for Imperfect Data 3.66%**, **Digital Forensics 3.66%**, **KYC 3.66%** → clear seams we convert into visible differentiation with what’s already in the repo.

### Scope & Deliverables

1. **Data Federation v1 (governed joins over licensed sources)**
   - **Catalog:** register sources (Postgres, S3/Parquet, REST APIs, STIX/TAXII, RSS), capture **license & jurisdiction**.
   - **Query Router:** NL→Cypher compiles to **federated plans**; per-source **OPA/ABAC** verdicts; cost estimates.
   - **Preview/Join Test:** run sample joins with **policy verdicts** + rationale; save as named contexts.

2. **Imperfect-Data Toolkit v1 (quality & transforms)**
   - **Schema-mapping DSL** + interactive “Map Fields” wizard; fuzzy normalizers (names, phones, addresses, dates).
   - **Dedup/Canonicalize:** rule-based + probabilistic entity consolidation with **reversible** merges and **XAI scorecards**.

3. **KYC Processes v1 (workflow, no biometrics)**
   - **Document intake** (PDF/JSON/CSV); extract **metadata only** (issuer, number patterns, dates); sanctions list checks via licensed APIs.
   - **Workflow:** Reviewer approvals with rationale; **policy reasons** surfaced on denials; disclosure export includes KYC steps.

4. **Digital Forensics v0 (document/image metadata + chains)**
   - **EXIF/metadata** extraction; **SHA-256** hashing; chain-of-custody log (who/when/source).
   - **Evidence Locker:** immutable storage pointers; export includes hash manifest and handler timeline.

5. **Agentic Case Builder v0 (explainable orchestration)**
   - **Task Graphs:** multi-step sequences (ingest → ER → paths → RAG narrative → disclosure).
   - **Explainability:** Each step stores **prompt**, **compiled Cypher**, **policy decision**, **counterfactual**.
   - **Guardrails:** no raw exhibits to LLM; jurisdiction filters; retry policies; budget caps.

6. **Index-Free Adjacency Showcase (performance)**
   - Progressive neighborhood expansion, **virtualized rendering**, K-shortest with **label exclusions**, and p95 latency targets.

### Out of Scope

- Face/voice biometrics; generic scraping without explicit license; endpoint telemetry; cross-border transfers that fail policy.

### User Stories

- As an analyst, I register **Postgres\:FinCrime** and **S3\:BankCSV** with jurisdictions; the federation console shows **policy verdicts** before joins.
- As a data steward, I map dissimilar schemas with the **DSL** and run a **dedupe** that explains why two records collapsed—and I can **undo** it.
- As a KYC reviewer, I approve a case with **document metadata** and sanctions checks; export yields a **disclosure bundle** with hashes and policy logs.
- As a case lead, I run the **Agentic Builder** to assemble the case narrative; each step has **Explain** and a **counterfactual**.

### Acceptance Criteria

- **Federation:** `compileFederated(nl, sources[])` returns `{plan,cost,perSourcePolicy{allow,reason},cypher[]}`; blocked plans show appeal path.
- **Imperfect Data:** mapping DSL compiles; dedupe API returns `score`, `salient_features[]`, `counterfactual`, with **reversible merges**.
- **KYC:** workflow persists approver, rationale, versioned rules; **no biometric inference**; exports include license & jurisdiction info.
- **Forensics:** every artifact has EXIF (if present), hash, and a chain-of-custody record; export passes **external hash verifier**.
- **Agentic:** step logs include prompt, compiled Cypher, policy verdict, and counterfactual; budget & jurisdiction respected.
- **Performance:** p95 3-hop expand < **1.2 s** on 50k-node graphs; fed-join preview < **700 ms**; dedupe 10k records < **5 m** E2E.

### Engineering Tasks (repo-mapped)

- `services/federation/` (new): **query router** + source registry; per-source **OPA/ABAC**; plan visualizer.
- `services/nlq/`: emit **federated plans** and cost estimates; integrate source constraints and jurisdiction tags.
- `server/src/graphql/`: schemas for `Federation`, `Mappings`, `KYC`, `Forensics`, `Agentic`.
- `graph-xai/`: `/explain/dedupe` (salient features + counterfactuals), `/explain/agentStep`.
- `prov-ledger/`: extend disclosure bundles with **plan**, **hash manifests**, **policy decisions**, **handler timeline**.
- `client/apps/web/`: **Federation Console**, **Mapping Wizard**, **KYC Workflow UI**, **Evidence Locker**, **Agentic Builder** canvas.
- `ingestion/`: S3/Parquet and REST connectors; STIX/TAXII refinements; license manifests per source.
- `infra/helm|terraform/`: OPA bundles; **two-person control** for destructive ops; budgets for agent runs.

### Instrumentation & SLOs

- Federated plan compile p95 < **300 ms**; per-source policy checks p95 < **120 ms**.
- Dedupe throughput ≥ **2k recs/min** with ROC-AUC ≥ **0.85** on validation set.
- KYC workflow completion (demo path) ≤ **3 min** median.
- Forensics hash/EXIF on 500 files ≤ **60 s** total.
- Agentic Builder end-to-narrative ≤ **90 s** for demo dataset.

### Risk Matrix

| Risk                                     | Severity | Likelihood | Mitigation                                                                |
| :--------------------------------------- | -------: | ---------: | :------------------------------------------------------------------------ |
| Cross-border violations via federation   |     High |     Medium | Per-source jurisdiction tags; OPA pre-check; export blocks with reasons   |
| Dedupe false merges                      |     High |     Medium | **XAI scorecards**, reversible merges, human adjudication queue           |
| Chain-of-custody gaps                    |     High |    Low-Med | Hash on ingest; handler logs; two-person control; external verifier       |
| Agentic mis-execution / prompt injection |   Medium |     Medium | Guardrails, sandboxed tool use, budget caps, prompt sanitizer, audit logs |
| Performance regressions                  |   Medium |     Medium | Cost-based planner; cached neighborhood expansions; virtualization        |

### Code Snippets (Guy IG)

```ts
// server/src/graphql/federation.ts — compile NL→Federated plan with policy
import { gql } from 'graphql-tag';
export const typeDefs = gql`
  type SourcePolicy {
    source: String!
    allow: Boolean!
    reason: String!
  }
  type FedPlan {
    steps: [String!]!
    cypher: [String!]!
    cost: Float!
    perSourcePolicy: [SourcePolicy!]!
  }
  extend type Query {
    compileFederated(nl: String!, sources: [String!]!): FedPlan!
  }
`;
export const resolvers = {
  Query: {
    compileFederated: async (_: any, { nl, sources }, ctx) => {
      const sanitized = ctx.guardrails.sanitize(nl);
      const plan = await ctx.nlq.compileFederated(sanitized, { sources });
      const cypher = plan.steps.map((s) => ctx.transpile.toCypher(s));
      const perSourcePolicy = await Promise.all(
        sources.map(async (s) => {
          const v = await ctx.policy.checkSource(s, ctx.user, plan);
          return { source: s, allow: v.allow, reason: v.reason };
        }),
      );
      const cost = await ctx.cost.estimate(cypher);
      return { steps: plan.steps, cypher, cost, perSourcePolicy };
    },
  },
};
```

```python
# services/imperfect/mapping_dsl.py — lightweight schema-mapping DSL
import re
def compile_mapping(dsl:str):
    """
    name: Person
    map:
      given_name <- anyOf(["first","fname"])
      family_name <- anyOf(["last","lname"])
      phone <- normalize(phone_e164)
      dob <- parse(date_formats=["%Y-%m-%d","%m/%d/%Y"])
    """
    rules=[]
    for line in dsl.splitlines():
        m=re.match(r"\s*([\w_]+)\s*<-\s*(.+)", line)
        if m: rules.append((m.group(1), m.group(2)))
    return rules
```

```python
# services/forensics/extract.py — EXIF + hash with chain-of-custody
import hashlib, json, piexif, datetime, os
def hash_file(p):
    h=hashlib.sha256()
    with open(p,"rb") as f:
        for b in iter(lambda:f.read(1<<20), b""): h.update(b)
    return h.hexdigest()
def extract_exif(p):
    try: return {k:str(v) for k,v in piexif.load(p).get("0th",{}).items()}
    except Exception: return {}
def process_artifact(path, handler, source):
    return {
        "path": path, "sha256": hash_file(path),
        "exif": extract_exif(path),
        "chain": [{"handler":handler, "source":source, "ts":datetime.datetime.utcnow().isoformat()+"Z"}]
    }
```

```ts
// client/apps/web/AgenticBuilder.tsx — step-logged orchestration (simplified)
type StepLog = {
  name: string;
  prompt: string;
  cypher: string;
  policy: string;
  counterfactual: string;
};
export async function runAgenticPlan(
  steps: string[],
  ctx: any,
): Promise<StepLog[]> {
  const logs: StepLog[] = [];
  for (const name of steps) {
    const { prompt, cypher, policy, counterfactual } =
      await ctx.agent.run(name);
    logs.push({ name, prompt, cypher, policy: policy.reason, counterfactual });
  }
  return logs;
}
```

```rego
# policy/federation.rego — per-source jurisdiction rule (OPA)
package ig.federation
default allow = false
allow {
  input.user.clearance >= data.sources[input.source].required_clearance
  data.sources[input.source].jurisdiction == input.user.jurisdiction
  not data.sources[input.source].license_expired
}
reason = msg {
  allow
  msg := "allowed"
} else = msg {
  msg := "blocked: jurisdiction/clearance/license"
}
```

---

### Attachments (OKRs)

- **KR1:** 100% federated plans carry per-source policy verdicts and cost estimates.
- **KR2:** Dedupe ROC-AUC ≥ **0.85**; 100% merges reversible with XAI explanations.
- **KR3:** 100% KYC exports include license/jurisdiction + reviewer rationale; **0 biometrics**.
- **KR4:** Forensics exports pass external hash verification.
- **KR5:** Index-Free Adjacency demo: p95 3-hop expand < **1.2 s**; fed-join preview < **700 ms**.

---

**The Committee stands ready to advise further. End transmission.**
