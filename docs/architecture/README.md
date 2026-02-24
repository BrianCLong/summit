# Summit Architecture Repository (Minimal)

This directory is the canonical, versioned architecture repository for Summit. It is intentionally
constrained to the minimum viable set of machine-readable artifacts required to model Summit as a
system-of-systems while keeping governance and agent operations queryable and auditable.

## Contents

- `system-index.json`: Machine-readable architecture index (components, contracts, flows, and
  authority links).
- `system-index.schema.json`: JSON Schema for validating `system-index.json`.
- `system-index.md`: Human-readable summary generated from the same canonical definitions.
- `summit-graph.schema.json`: Graph schema that standardizes nodes, edges, and provenance fields
  for the Summit world model.

## Authority Alignment

All architecture entries must reference governing authority documents and contracts. The primary
sources of authority include:

- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/governance/CONSTITUTION.md`
- `docs/governance/META_GOVERNANCE.md`
- `docs/governance/AGENT_MANDATES.md`
- `agent-contract.json`

## Update Protocol

1. Edit `system-index.json` and `system-index.md` together so the human and machine views stay
   aligned.
2. Validate `system-index.json` against `system-index.schema.json` before commit.
3. Extend `summit-graph.schema.json` only when a new node or edge type is required.
4. Record the change in `docs/roadmap/STATUS.json` with a short revision note.

## Query Use

`system-index.json` is the authoritative, minimal inventory. Queries should resolve through the
`queries` block so governance and agent orchestration can answer “who can change what” without
diverging definitions. When adding a query, define its response shape and attach authority links.

This repository does not replace `ARCHITECTURE_MAP.generated.yaml`; it anchors the canonical
system-of-systems index while generated artifacts remain governed derivatives.
