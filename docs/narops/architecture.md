# NarrativeOps Architecture (GA-ready)

## Summit Readiness Assertion (Escalation)
This architecture is anchored to the Summit Readiness Assertion for GA alignment and release gate traceability. See `docs/SUMMIT_READINESS_ASSERTION.md` for the authoritative readiness baseline and gate expectations.

## MAESTRO Alignment (Required)
- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: goal manipulation, prompt injection, tool abuse, adversarial paraphrase, coordinated graph manipulation, data poisoning, tenant leakage, supply-chain compromise.
- **Mitigations**: deterministic preprocessing, intent compilation, evidence budgeting, stable sorting, signed provenance, per-tenant isolation, anomaly detection on churn, SBOM pinning, and audit logging.

## Evidence-First Output (UEF)
**UEF (Unified Evidence Format)** is produced before any narrative summary. The UEF bundle is deterministic and includes:
- `report.json` (normalized objects + provenance pointers)
- `metrics.json` (eval + quality metrics)
- `stamp.json` (hashes, inputs, and determinism fields)

UEF bundles are stored at `evidence/<EID>/` and referenced by downstream analyst workflows and CI gates.

## Deterministic Pipeline (Canonical)
1. **Ingest → Canonicalize** (stable IDs, stable sorting, normalized language tags)
2. **Cluster** (`NarrativeCluster`)
3. **Frame/Trope Extraction** (`NarrativeFrame`)
4. **Network Build + Community Detection** (`Community`, `Actor`, `ActorCommunityEdge`)
5. **Strategy Mapping** (`InfluenceStrategy`)
6. **Impact Scoring** (`ImpactSignal`)
7. **Governance Labeling** (`GovernanceLabel`)
8. **Evidence Pack** (`report.json`, `metrics.json`, `stamp.json`)

## Core Objects (Graph-First)
- **NarrativeFrame**: `{ problem, cause, moral, solution, tropes[], rhetoric[] }`
- **NarrativeCluster**: `{ id, window, summary, keywords[], embeddings_ref, stability_score }`
- **Actor**: `{ id, type, attribution_hypothesis, bot_likelihood, community_ids[] }`
- **Community**: `{ id, members[], modularity, churn_rate }`
- **InfluenceStrategy**: `{ id, taxonomy_ref, confidence, evidence_refs[] }`
- **ImpactSignal**: `{ id, proxy_metrics[], uncertainty, correlation_ref }`
- **GovernanceLabel**: `{ id, label, policy_ref, reviewer, decision_log_ref }`

## Determinism Rules
- Stable ordering by `stable_by_id_then_time` for all arrays.
- Fixed seeds in clustering and community detection.
- Pinned model weights and versioned embeddings.
- Hashes recorded in `stamp.json` for inputs, code SHA, and artifacts.

## Module Layout (Clean-Room)
```
packages/
  narops-core/
    cluster/
    frame/
    network/
    strategy/
    impact/
    governance/
    provenance/
  narops-cli/
  narops-evals/
  narops-schemas/
```

## Evidence ID Standard
**EID Format**: `EID-NAROPS-YYYYMMDD-<stage>-<0001>`

Required artifacts per run:
- `evidence/<EID>/report.json`
- `evidence/<EID>/metrics.json`
- `evidence/<EID>/stamp.json`

## Schemas (JSON)
`narops-schemas` validates:
- `report.json` objects and provenance references
- `metrics.json` eval metrics and thresholds
- `stamp.json` determinism and hash fields

## CI Gates
- **Determinism Gate**: identical input → identical artifact hashes.
- **Schema Gate**: all artifacts validate against `narops-schemas`.
- **Evidence Gate**: `evidence/<EID>/` structure and non-empty provenance.

## Evals (Directory Shape)
```
packages/narops-evals/
  determinism/
  drift/
  strategy/
  impact/
  cdnp/
  fixtures/
```

## Drift & Portability Benchmarks
- **Narrative Drift**: time-window detection on frames and strategies.
- **CDNP**: cross-domain narrative portability (political → economic narratives) with false-positive inflation checks.

## Policy & Governance
All governance logic is policy-as-code and versioned in `packages/decision-policy/`. Any ambiguity is **Deferred pending governance adjudication**.

## Future-leaning Enhancement (State-of-the-Art)
Introduce a **FrameGraph Index**: a typed edge index linking frames by rhetorical role and causal chain to support low-latency counterfactual analysis while preserving determinism.
