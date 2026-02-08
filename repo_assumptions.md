# Repo Assumptions & Validation (AgentApp Recon)

## Summit Readiness Assertion (preemptive)

- Reference: `docs/SUMMIT_READINESS_ASSERTION.md` (governs absolute readiness and must stay aligned).

## VERIFIED (from repo scan)

### CLI & Control Plane
- `summitctl` exists under `tools/summitctl/` with command docs in `tools/summitctl/README.md`.
- `summitctl` is referenced in multiple runbooks and governance docs as the primary CLI.

### Evidence / Artifact Conventions
- Governance evidence locations are defined in `docs/governance/EVIDENCE.md`.
- Evidence schema registry exists under `evidence/schemas/`, including RAG schemas (`rag_report.schema.json`, `rag_metrics.schema.json`, `rag_stamp.schema.json`).

### Connectors / Ingestion SDK
- Connector SDK lives in `connectors/` with a manifest schema (`connectors/SDK_MANIFEST_SCHEMA.yaml`) and registry (`connectors/registry.json`).
- Multiple connector implementations exist, including RSS/Atom and STIX/TAXII connectors.

### Graph / RAG Modules
- GraphRAG service exists in `services/graphrag/src/kg2rag/` with tests.
- Server GraphRAG routes and schema exist under `server/src/routes/graphrag.ts` and `server/src/graphql/schema/graphrag.graphql`.
- RAG tooling scripts exist under `tools/` (e.g., `rag_ingest.py`, `rag_query.py`, `rag_index.py`).

### CI / Governance Checks
- Primary PR gate is defined in `.github/workflows/pr-quality-gate.yml`.
- Evidence validation workflows exist (e.g., `evidence-id-consistency.yml`, `evidence-validate.yml`).
- Governance gates are defined under `.github/workflows/governance-*.yml`.

## ASSUMED (Deferred pending validation)

- AgentApp runtime does **not** currently exist; new module paths for `agentapps/` will need to be created under a verified service or package location. (Deferred pending explicit owner sign-off and target runtime selection.)
- Evidence writer for AgentApp outputs should align with existing evidence schemas or require new schemas. (Deferred pending schema ownership review.)
- CLI surface for `summit agentapp run` should live in `summitctl` unless a Python CLI already exists. (Deferred pending CLI ownership review.)

## PATH FINALIZATION (recommended anchors)

| Capability | Verified Anchor | Notes |
| --- | --- | --- |
| CLI entrypoint | `tools/summitctl/` | Preferred platform CLI. Extend with `agentapp` subcommands. |
| Evidence output conventions | `docs/governance/EVIDENCE.md` + `evidence/schemas/` | Reuse evidence bundle paths + schema registry. |
| Connector packaging | `connectors/` | Use registry + manifest schema for marketplace-style bundles. |
| Graph/RAG substrate | `services/graphrag/`, `server/src/ai/rag/` | Keep RAG policy gates aligned with existing graphrag controls. |
| CI checks | `.github/workflows/pr-quality-gate.yml` + evidence workflows | Align new checks with existing quality gate. |

## GOVERNED EXCEPTIONS (if required)

- Any deviation from the verified anchors must be logged as a **Governed Exception** with explicit authority references and rollback steps.

## NEXT ACTIONS (constrained)

1. Draft AgentApp spec schema in a new module under the verified CLI + evidence anchors.
2. Propose a minimal `summitctl agentapp run --dry-run` stub that emits evidence artifacts.
3. Submit an evidence schema update only if the existing `rag_*` / `report` schemas cannot cover AgentApp outputs.
