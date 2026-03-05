# Repo Assumptions and Validation

## Verified vs Assumed Folder Map

* **ASSUMED:** `packages/` contains TS/JS modules.
  * **VERIFIED:** Yes, `packages/` is the core location for TS/JS libraries and contains packages like `@intelgraph/genui`.
* **ASSUMED:** `packages/genui/` exists or needs to be created.
  * **VERIFIED:** `packages/genui/` already exists. It contains a React-independent GenUI core schema (`src/schema.ts`), evidence helpers (`src/evidence.ts`), and policy filters (`src/policy.ts`).
* **ASSUMED:** `packages/summit-os/` needs to be created.
  * **VERIFIED:** It does not exist currently. We will create this to house the OS layer (kernel, IO, policy, MCP).
* **ASSUMED:** GraphRAG module exists somewhere.
  * **VERIFIED:** GraphRAG logic is distributed. TypeScript integrations exist in `server/src/services/graphrag`, `server/src/config/graphrag.ts`, and `server/src/ai/copilot/graphrag-provenance.service.ts`. Python equivalents are in the root `summit/` or `services/` folder.
* **ASSUMED:** Agent orchestration exists.
  * **VERIFIED:** Agent logic spans multiple places including `server/src/maestro/agent_service.ts`, `summit/agents/`, and `packages/cli/src/commands/agents.ts`.

## CI Check Names (Real)

* `ci-core.yml`
* `ci-python.yml`
* `ci-rust.yml`
* `build.yml`
* `pr-gate.yml`
* `pr-quality-gate.yml`
* `budget-guard.yml`
* `governance-check.yml`
* `prompt-evidence-guard.yml`
* `evidence-pack.yml`

## Evidence Schema Location (Real)

* `packages/genui/src/schema.ts` (contains the `UiPlanSchema` and component schemas)
* `packages/genui/src/evidence.ts` (contains `EvidenceBundle` and deterministic hashing `createEvidenceBundle`)

## "Must-Not-Touch" Files List

* `package.json` and `tsconfig.json` (unless explicitly instructed, to avoid breaking global builds).
* `DEPENDENCY_DELTA.md` and `deps/DEPENDENCY_DELTA.md` (critical for governance tracking).
* Governance files: `docs/compliance/CONTROL_REGISTRY.md`, `docs/governance/GOVERNANCE_RULES.md`, `docs/security/security-ledger.yml`, `docs/governance/evidence-map.yml`.
* Global CI configuration like `.github/workflows/ai-firewall.yml` (do not modify unrelated CI checks to "fix" pre-existing failures).
