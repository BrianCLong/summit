# Agent Contract (Human-Readable)

This document summarizes the machine-readable `agent-contract.json` and highlights guardrails agents must follow.

## Zones and permissions

- **Allowed zones:** Documentation (`docs/`, `docs/ga/`) and verification scripts (`scripts/ga/`, `testing/ga-verification/`) remain the safest change areas.
- **Stop conditions:** Tooling instability, requests to bypass legacy-mode guardrails, or attempts to change Jest/pnpm global config. Escalate to `security-council` if hit.
- **Verification rules:** GA-critical work must cite Tier A/B/C artifacts; provenance must be referenced in PR summaries.

## Restricted areas

The following areas are protected and enforced by CI. Do not touch them without an override:

- `secrets/`
- `security-hardening/`, `security/`
- `trust/`
- `sealed-secrets/`
- `terraform/prod/`

To override, add the `restricted-area-override` label **or** include `"restricted_override": true` in the PR's agent metadata block. Document the rationale in the PR description.

## Activity tracking

- Log every agent pickup or status change in `AGENT_ACTIVITY.md` (task ID, branch, PR link, agent, status).
- Keep `TASK_BACKLOG.md` synchronized: update `status`, `priority`, and `agent_owner` when work moves.

## Metadata and scope

- PRs must include the fenced JSON metadata block from `.github/PULL_REQUEST_TEMPLATE.md` and declare accurate `paths` and `allowed_operations`.
- If touching restricted areas with an override, explicitly list those paths in `declared_scope.paths`.
- Run `scripts/ci/validate-pr-metadata.ts` and `scripts/ci/verify-prompt-integrity.ts` locally before opening a PR.

## Human review

- Agents cannot self-approve. All merges require human CODEOWNER review.
- Human owners may mark tasks as `human-only` in `TASK_BACKLOG.md`; agents must not pick those up.
