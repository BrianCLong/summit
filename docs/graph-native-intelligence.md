# Graph-Native Intelligence Strategy

## Objective

Flip the typical LLM-app pattern by making the graph the system of record for entities, events, claims, evidence, and provenance. Use LLMs as constrained compilers that translate messy inputs into graph updates and executable investigation plans. The goal is higher accuracy, explainability, and controllability with differentiated IP around graph models, compilers, and plan executors.

## Design Principles

- **Graph-first substrate:** Treat the knowledge graph as the primary data plane and transaction boundary; every ingestion, mutation, or explanation is expressed as graph deltas with provenance.
- **LLM as compiler, not oracle:** LLMs emit typed graph mutations plus plan DSL steps under schema, policy, and safety constraints; execution engines handle side effects.
- **Evidence-centric reasoning:** Claims are backed by evidence nodes and provenance edges; contradiction/support edges are first-class with confidence and temporal bounds.
- **Deterministic execution:** Plans run via deterministic operators (graph queries, validators, fetchers) with checkpointed state to guarantee repeatability and auditability.
- **Defense in depth:** Validation, deduplication, redaction, and policy checks occur before commits; every update is journaled to the provenance ledger.

## Target Architecture

### Data Plane (Graph)

- **Node types:** `Entity`, `Event`, `Claim`, `Assertion`, `Source`, `Evidence`, `Agent`, `Investigation`, `Hypothesis`, `Task`.
- **Edge types:** `participated_in`, `caused`, `associated_with`, `supports`, `contradicts`, `derived_from`, `cites`, `generated_by`, `part_of`, `depends_on`.
- **Versioning & temporality:** Bitemporal stamps on nodes/edges; soft-deletes via validity windows; immutable history stored in provenance ledger.
- **Confidence & quality:** Confidence scores, source reliability, and adjudication state on nodes/edges; quality gates block low-trust mutations.

### Control Plane

- **Schema registry:** Canonical types, constraints, and validation rules (shape, allowed predicates, required provenance).
- **Policy-as-code:** OPA/rego policies for who/what can mutate specific node/edge classes; redaction rules for sensitive fields.
- **Provenance ledger:** Append-only log of mutations, inputs, policies applied, model versions, and evaluation artifacts.

### Intelligence Compilers (LLM-Facing)

- **Input normalization:** Chunking, entity/event span detection, and canonicalization before model calls.
- **Structured prompting:** Models are prompted to emit JSON-LD/GraphQL-style mutations plus plan steps in a constrained DSL; decoding enforces schema via JSON schema or function calling.
- **Safety filters:** PII scrubbing, hallucination guards (e.g., retrieval-grounded checks), and contradiction detection against existing graph context.

### Execution Layer

- **Plan DSL:** Operations such as `match`, `expand`, `fetch_source`, `score_claim`, `compare_paths`, `summarize_subgraph`, `propose_merge`, and `write_delta` with explicit inputs/outputs.
- **Planner:** LLM-assisted but validator-enforced planner generates executable DAGs referencing graph IDs and predicates; plans carry success criteria and observability hooks.
- **Executor:** Deterministic runtime that executes operators, records artifacts, and commits graph deltas only after validation + policy checks; supports retries and partial rollbacks via ledger snapshots.

### Data Lifecycle

1. **Ingest:** Raw text/feeds/files → preprocessing (dedupe, PII scrub, language ID) → schema-aware compiler prompts.
2. **Propose:** LLM emits candidate mutations + plan; structural validator enforces schema and policy compatibility.
3. **Validate:** Entity resolution, conflict detection, contradiction/support scoring, and quality thresholds; unsafe mutations are rejected or quarantined.
4. **Commit:** Approved deltas are written to the graph store and provenance ledger with signatures, timestamps, and model metadata.
5. **Explain:** Every claim surfaces the supporting evidence subgraph and the plan execution trace.

## Investigation Plans (Executable)

- **Plan structure:** DAG with typed steps, explicit inputs/outputs, guardrails (max fan-out, max depth), and expected artifacts.
- **Query operators:** Graph pattern matchers (e.g., path, motif), hypothesis testing (supports/contradicts thresholds), timeline reconstruction, and counterfactual pivots.
- **Tooling:** Integrate connectors (STIX/TAXII, RSS, file drops) as plan primitives; each primitive returns graph deltas plus provenance bundles.
- **Adjudication:** Conflicting claims trigger automatic adjudication tasks with consensus scoring and reviewer assignment; results recorded as new claim/evidence edges.

## Differentiated IP Surface

- **Schema + ontology:** Domain-specific entity/event/claim schema with temporal/provenance semantics as reusable packages.
- **Compilers:** Prompt/program templates that turn noisy inputs into policy-compliant graph deltas; tunable by domain and secrecy level.
- **Plan library:** Curated, versioned library of investigation playbooks with measurable precision/recall and replayability.
- **Quality signals:** Graph-native correctness metrics (support/contradiction ratios, provenance diversity, temporal consistency) used to tune compilers and executors.

## Rollout Plan

- **Phase 1 (Foundations):** Finalize schema registry + policy set; implement validator + provenance ledger integration; ship compiler MVP for text ingestion.
- **Phase 2 (Plans):** Introduce plan DSL + executor; add path/timeline operators; ship adjudication workflows and evidence-first explanations.
- **Phase 3 (Optimization):** Adaptive planner that replays historical plans for evaluation; active learning loops to improve entity resolution and contradiction detection.
- **Phase 4 (Productization):** Multi-tenant hardening, RBAC policy packs, connector marketplace integration, and SLO-backed observability dashboards.

## Observability & Evaluation

- **Metrics:** Mutation acceptance rate, contradiction/support detection accuracy, resolution precision/recall, provenance completeness, plan success/failure rates.
- **Tracing:** Per-step spans for planner + executor; correlation IDs linked to provenance ledger entries.
- **Testing:** Golden-path plan replays, regression suites on entity resolution + contradiction detection, fuzzing on plan DSL inputs, and data quality smoke tests on ingestion batches.

## Security & Governance

- **Access controls:** RBAC/ABAC policies on node/edge classes; least-privilege tokens for planners/executors; private-graph per tenant.
- **Data handling:** PII scrubbing, redaction-on-read, and field-level encryption for sensitive attributes; export controls enforced at connector + query layers.
- **Model governance:** Track model versions, prompts, and safety filters in provenance; require human approvals for high-impact mutations or policy exceptions.

## Integration Hooks

- **Existing assets:** Align with provenance schema (`PROVENANCE_SCHEMA.md`), policy engine (`services/authz-gateway`), and conductor/orchestrator packages in `ga-graphai`.
- **Interfaces:** Expose compiler + executor as services with gRPC/GraphQL endpoints emitting graph deltas and plan traces; support offline batch ingestion via jobs.
- **Interoperability:** STIX/TAXII import/export, Neo4j/PG graph backends, and search connectors via existing ingestion mesh.

## Next Steps

1. Ratify schema + plan DSL in `schema/` and `ga-graphai/packages/knowledge-graph`.
2. Implement compiler service that outputs validated deltas + plans with provenance bundles.
3. Build executor runtime with replay + adjudication hooks; integrate with audit/provenance ledgers.
4. Ship plan library (top 10 investigative playbooks) with coverage + evaluation artifacts.
