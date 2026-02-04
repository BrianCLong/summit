# Evidence Traceability Demonstration

**Scenario:** A security analyst asks, "Why is the 'Payment Gateway' flagged as high risk?"

This document traces the **Path-Native Evidence** flow from query to explanation.

---

## 1. The Query (User Intent)
**Input:** "Why is Payment Gateway high risk?"
**Intent:** Causal explanation of risk attribution.

## 2. Graph Retrieval (Cypher)

**Strategy:** Path search from 'Payment Gateway' upstream to risks.

```cypher
MATCH path = (asset:Asset {name: "Payment Gateway"})<-[:AFFECTS]-(vuln:Vulnerability)<-[:EXPLOITS]-(threat:ThreatActor)
RETURN path
ORDER BY threat.sophistication DESC
LIMIT 3
```

## 3. The Evidence (Path-Native Context)

The system retrieves ordered paths. Note the preservation of direction and structure.

```markdown
[Path 1]
(ThreatActor: "Lazarus Group")
  --[EXPLOITS {method: "Zero-Day"}]-->
(Vulnerability: "Log4Shell")
  --[AFFECTS {severity: "CRITICAL"}]-->
(Asset: "Payment Gateway")
```

## 4. The Prompt (LLM Input)

```markdown
## GRAPH CONTEXT
The following evidence consists of validated traversal paths...

[Path 1] (Confidence: 0.99)
(ThreatActor: "Lazarus Group") --[EXPLOITS {method: "Zero-Day"}]--> (Vulnerability: "Log4Shell") --[AFFECTS {severity: "CRITICAL"}]--> (Asset: "Payment Gateway")

## INSTRUCTION
Explain why the asset is high risk using the provided paths. Cite your sources.
```

## 5. The Answer (LLM Output)

> The **Payment Gateway** is classified as high risk because it is affected by the **Log4Shell** vulnerability (Severity: CRITICAL) [[Path 1]]. Intelligence indicates this vulnerability is actively exploited by the **Lazarus Group** using Zero-Day methods [[Path 1]].

## 6. The Explanation (Traceability)

*   **Assertion:** "Affected by Log4Shell" -> **Evidence:** Path 1, Segment 2 (`AFFECTS`).
*   **Assertion:** "Exploited by Lazarus Group" -> **Evidence:** Path 1, Segment 1 (`EXPLOITS`).

---

# Merge Readiness Checklist

- [x] **Path-Native Prompt Spec**: `docs/ai/graphrag/path_native_prompt.md` created.
- [x] **LLM-Friendly Cypher Guide**: `docs/graph/llm_friendly_cypher.md` created.
- [x] **Retrieval Implementation**: `packages/intelgraph/graphrag/` created with `path_assembler.ts` and `retrieval.ts`.
- [x] **Tests**: `packages/intelgraph/graphrag/tests/retrieval.test.ts` passes and proves determinism.
- [x] **Offline GNN Strategy**: `docs/graph/gnn_offline_enrichment.md` documented.
- [x] **Evidence Demo**: This document created.
