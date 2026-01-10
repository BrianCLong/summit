# Build-Layer Agent Security Evaluation Plan

## Objectives

- Operationalize build-layer security for agent tooling with deterministic evaluation harness, adversarial scenarios, and CI enforcement.
- Guard Agent Action Gateway, tool routers/executors, and prompt/config pipelines against unsafe behaviors.
- Ship developer ergonomics: simple CLI, reproducible scenarios, and evidence artifacts.

## Repository Placement

- **Evaluation library:** `server/src/security/evals/` (types, runner, simulated gateway/tool router, assertions).
- **Scenario pack (YAML):** `server/security/scenarios/` with `schema.json` and category substructure.
- **CLI entrypoint:** `server/scripts/security-eval.ts` (wired via `pnpm security:eval`).
- **Documentation:**
  - `docs/security/scenario-pack.md` (scenario taxonomy and contribution guide).
  - `docs/security/agent-security-ci.md` (CI gate behavior and local workflow).
  - `docs/security/evidence/agent-security-evals.md` (evidence + control mapping).
- **CI workflow:** `.github/workflows/ci-security-evals.yml` using pnpm + Node 18.

## Commands & Golden Path

- **Install:** `pnpm install` (root) to hydrate workspaces.
- **Run all security evals:** `pnpm security:eval` (from repo root) → exit codes: 0 pass, 1 scenario failure, 2 harness error.
- **Filter by category:** `pnpm security:eval --category prompt-injection`.
- **Machine-readable:** `pnpm security:eval --json > security-evals.json`.
- **Unit tests:** `pnpm --filter intelgraph-server test -- --runTestsByPath src/security/evals/__tests__/scenarioRunner.test.ts`.

## CI Integration

- New workflow `ci-security-evals.yml` executes after checkout + pnpm install:
  1. `pnpm test` (root smoke parity).
  2. `pnpm security:eval --json` (enforces scenarios, strict mode default).
  3. Coverage check ensures ≥3 scenarios per category (prompt-injection, tool-misuse, attribution, redaction).
  4. Artifacts: JSON results + junit (from harness) uploaded for evidence.
- Workflow is mandatory on PRs to main/develop; failure blocks merges.

## Determinism & Safety

- Harness uses in-repo stubs only (no network calls, seeded deterministic evaluation).
- Tool/router/gateway simulations respect policy modes (strict/permissive) and enforce attribution + allowlists.
- Redaction utilities sanitize secret-like tokens before trace emission.

## Future Extensions (post-merge)

- Add fuzzed scenario generation feeding harness seeds.
- Integrate real Agent Action Gateway implementation as driver once merged.
- Expand policy regression corpus and integrate with provenance ledger for richer traces.
