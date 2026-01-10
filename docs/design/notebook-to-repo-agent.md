# Notebook → Repo Multi-Agent Workflow (Codelevate-inspired)

## Goals

Transform exploratory notebooks into production-ready repositories using specialized agents, a
shared dependency tree artifact, and safety controls that preserve semantics and prevent unsafe
execution.

## Roles

- **Architect**: Plans target package structure, defines dependency tree, and identifies safety
  gates.
- **Developer**: Converts notebook cells into modules/functions, writes tests, and aligns with
  dependency tree.
- **Structure (Release)**: Assembles repository layout, entrypoints, and packaging metadata;
  ensures lint/test hooks.
- **Critic/QA (optional)**: Validates semantic equivalence and safety constraints, proposes
  repairs.

## Shared Dependency Tree Artifact

- JSON artifact (`schemas/agent/notebook-tree.schema.json` target) containing:
  - `notebook_id`, `source_hash`
  - `nodes`: cells/modules with ids, types (`ingest`, `transform`, `model`, `viz`), dependencies,
    and outputs
  - `requirements`: pinned packages; environment markers
  - `safety_flags`: cells requiring sandboxing or manual review
  - `tests`: suggested assertions per node
- Stored in run ledger; updated by Architect, consumed by Developer/Structure.

## Workflow

1. **Intake & Scan**: Static analysis of notebook to detect imports, side effects, and risky
   operations (network, filesystem, shell). Mark `safety_flags` and block execution by default.
2. **Architect Plan**: Emit dependency tree + target package layout (e.g.,
   `src/<project>/<module>.py`, `tests/`), including entrypoint contract.
3. **Developer Transform**: Convert cells to functions/classes, create modules per plan, generate
   tests from `tests` hints, and produce diffs.
4. **Structure Assemble**: Build repository skeleton (setup/pyproject, README, entrypoint script),
   wire Makefile/CI hooks, and ensure lint/test commands present.
5. **Critic Validate**: Run semantic checks (snapshot comparison, checksum of outputs if safe),
   ensure diffs align with assumptions/constraints, and log repairs.
6. **Publish Artifacts**: Emit final repo tree, dependency lockfile, and ledger entries for each
   step with hashes.

## Safety Constraints

- **No untrusted execution**: Default to non-execution; sandbox or mock for cells marked risky.
  Require human approval for executing unvetted code or network calls (policy-as-code gate).
- **Redaction**: Strip secrets/tokens from notebooks; replace with placeholders and hashes.
- **Semantic preservation**: Track mapping from cell outputs to generated functions; store diffs
  and equivalence checks (hash of sample outputs when safe).
- **Governance hooks**: Policy gate before writing to sensitive directories; ARL records approvals.

## Outputs

- Package structure with modules/tests, runnable entrypoint, and docs (`HOW_TO_RUN.md`).
- Dependency tree artifact and ledger records for each role.
- Transformation report summarizing changes, safety actions, and equivalence status.

## How to Use + How to Extend

- **Use**: Generate the dependency tree, then run Architect → Developer → Structure with ledger
  entries per role.
- **Extend**: Add role specializations (e.g., Data QA, Security Review) or add cell type handlers;
  version schemas and update acceptance tests accordingly.

## Acceptance Tests

- Schema validation for dependency tree artifact.
- Integration test: convert fixture notebook → repo scaffold; verify entrypoint runs
  (`python -m <entrypoint>`) and tests pass.
- Safety test: notebook with dangerous cell is blocked without human gate; ledger marks `gated`
  status and redaction.
