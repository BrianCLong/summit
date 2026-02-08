# Vercel v0 “90% Problem” Subsumption Standard

## Summit Readiness Assertion
This standard is governed by the Summit Readiness Assertion and inherits its enforcement posture. See `docs/SUMMIT_READINESS_ASSERTION.md` for the authoritative readiness mandate.

## ITEM Identification
- **Item slug:** `vercel-v0-90-problem`
- **Primary claim:** The hard 90% is production integration (repo wiring, governance, secure execution), not prototype generation.
- **Scope:** Repo-connected, governed agent change flow with sandboxed execution and first-class PR workflows.

## Claim Registry (Plan Elements ↔ Ground Truth)
| Planned Summit capability                                         | Claim mapping                       |
| ----------------------------------------------------------------- | ----------------------------------- |
| Repo-connected “workspace” that can open PRs/branches             | ITEM:CLAIM-03                       |
| Sandbox runner for generated code/tests                           | ITEM:CLAIM-02, DOC:SANDBOX-07       |
| Secrets + env sync via allowlisted config manifest                | ITEM:CLAIM-01, ITEM:CLAIM-04        |
| Policy gates + audit trail artifacts                              | ITEM:CLAIM-02, ITEM:CLAIM-04        |
| Optional MCP server for Summit tooling access                     | DOC:API-05                          |
| Optional generative UI guardrails via schema/catalog approach     | DOC:UI-08 *(optional, later slice)* |

## Minimal Winning Slice (MWS)
Add a governed “Repo-Connected Agent Change” flow: an agent proposes changes against an existing Git repo, runs in an isolated sandbox, and opens a PR with deterministic evidence plus policy-gate results—without exposing secrets in prompts.

### Acceptance Tests (deterministic)
1. `pnpm test` includes `tests/agents/repo_workflow/*.test.ts`.
2. A fixture repo is cloned into a sandbox and a trivial change is made:
   - creates branch `summit/agent/<slug>`
   - generates commit
   - produces `artifacts/evidence/<EVID>/report.json` (no timestamps)
3. Policy gate fails if changes touch files matching deny patterns.
4. Policy gate fails if evidence artifact missing required fields.
5. PR open is simulated by default; real GitHub integration stays feature-flagged OFF.

### Evidence Artifacts
- `artifacts/evidence/<EVID>/report.json`
- `artifacts/evidence/<EVID>/metrics.json`
- `artifacts/evidence/<EVID>/stamp.json` (no unstable timestamps; include git SHA + policy versions)

## Interop & Standards Mapping
### Import
- Git repo URL + ref (local path initially; GitHub later).
- Policy bundle (OPA-like JSON or custom rules).
- Sandbox profile (CPU/mem/time limits).

### Export
- Evidence artifacts (`report.json`, `metrics.json`, `stamp.json`).
- Patch set / git commit.
- Policy decision log (structured).

## Non-Goals
- Hosting/deployment platform.
- UI builder.
- Long-running sandboxes (keep ephemeral).

## Threat-Informed Requirements (MAESTRO-Aligned)
- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered:** prompt leakage, tool abuse, untrusted code execution, policy bypass, shadow IT drift.
- **Mitigations:** deny-by-default secrets, sandbox isolation, policy hashes in evidence stamps, deterministic artifacts, and required policy decision logs.

## Roll-Forward Plan
- Ship with `SUMMIT_REPOFLOW_ENABLED=0` by default.
- Enable only in controlled environments after logs and drift detector remain green.

## PR Stack (≤6) — Governing Sequence
1. Evidence + policy gate skeleton.
2. Sandbox runner with network deny-by-default.
3. Git workspace + PR simulation.
4. End-to-end repo flow.
5. CI verify gate + artifact checks.
6. Drift detector + runbook + data handling docs.
