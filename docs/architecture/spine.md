# Summit Operational Spine

**Status:** Draft (PR4)
**Owner:** Architecture & Engineering
**Last Updated:** 2026-03-01

## Executive Summary

The Summit Operational Spine is the canonical source of truth for the end-to-end execution path of a single mission (e.g., `org-mesh-twin`). It maps the flow of data and control points from initial ingestion through the IntelGraph, Maestro orchestration, and final CI/CD validation.

## Capability Map

The execution path consists of five primary stages:

1. **Ingestion:** Data is gathered via connectors (CSV, S3, REST) and pre-processed into a standard format.
2. **IntelGraph:** Data is modeled into the IntelGraph Core Schema v1 (entities, edges, evidence).
3. **Maestro:** The multi-agent orchestrator executes a sequence of tasks (e.g., `pattern-miners`) based on the ingested graph.
4. **Switchboard:** Receipts and evidence bundles are packaged and formatted.
5. **CI/Protected Merge:** The final artifacts are subjected to deterministic assertions and governance checks before merging to the protected `main` branch.

## Control Points & Governance

The integrity of this path is enforced by several automated guardrails:

- **Branch Protection on `main`:** Managed via policy-as-code and validated by `.github/workflows/branch-protection-drift.yml`.
- **Environment Config Gate:** Strict schema validation during service startup (e.g., preventing missing keys or tracked secrets).
- **IntelGraph Contract Validation:** Artifacts must conform to `intelgraph/schema/core-v1.json`.
- **GA Slice E2E Test:** A dedicated CI workflow (`.github/workflows/ga-slice-org-mesh-twin.yml`) ensures the entire pipeline runs successfully on every relevant PR.
- **Evidence Formatting:** All outputs adhere to the `report.json`, `metrics.json`, and `stamp.json` structure with deterministic identifiers (e.g., `EVID:CIV:...`).

## Interoperability Assumptions

| Component | Assumption/Constraint | Source |
| :--- | :--- | :--- |
| Ingestion | Payloads are CSV, S3, or REST compatible | Assumed from repo context |
| IntelGraph | Outputs conform to `entities`, `edges`, `evidence` | Documented in `docs/standards/intelgraph-core-schema-v1.md` |
| Maestro | Relies on valid Core Schema v1 as input | Assumed from task definition |
| Switchboard | Generates deterministic receipt bundles | Documented in release automation |
| CI/CD | GitHub Actions is the primary runtime for gates | Verified in `.github/workflows` |

## Non-Goals

This defined spine explicitly excludes the following scope to maintain focus and stability:

- Real-time video or unified communications (e.g., the original scope of #141 War Rooms).
- Dynamic ontology redesign during runtime.
- Complex, interactive graph visualization tools.
- Enterprise-wide IAM or SCIM integrations outside of GitHub repository policy.
