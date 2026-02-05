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

## 2026-02-05
- Action: Update
- Package: pnpm (10.0.0)
- Reason: Align with platform standard and resolve CI version mismatch errors.

- Action: Update
- Package: @intelgraph/golden-path
- Reason: Convert template dependency to workspace reference.
