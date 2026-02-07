# Dependency Delta Log

Use this file to document changes to project dependencies.

## Format
- Date: YYYY-MM-DD
- Action: Add/Remove/Update
- Package: <name>
- Reason: <reason>

## 2026-01-31
- Action: Add
- Package: jsonschema, PyYAML
- Reason: Foundational requirements for the CodeData Framework (deterministic configuration generation and evidence validation).

- Action: Add
- Package: @summit/sgf-schema, @summit/sgf-ledger, @summit/sgf-evidence, @summit/sgf-evals
- Reason: Initial implementation of Summit Governance Fabric (SGF) components.

## 2026-02-07
- Action: Add
- Package: @intelgraph/openlineage, @intelgraph/summit-attest, @intelgraph/summit-verify
- Reason: Implement Unified Lineage and Attestation protocol with UUIDv7 and SLSA provenance.

- Action: Update
- Package: uuid (to ^13.0.0), zod (to ^4.2.1)
- Reason: Workspace-wide version standardization.
