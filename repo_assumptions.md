# Repository Assumptions Validation — github-copilot-pr-metrics-2026

## Verified

- `connectors/github/copilot_metrics/` already exists and provides authenticated Copilot metrics client scaffolding, so PR metrics support was added as a package extension instead of a parallel connector tree.
- `evidence/schemas/` is the canonical schema directory for evidence artifacts.
- `scripts/monitoring/` is the established location for drift detectors.
- `.github/workflows/` already includes dedicated, scoped CI workflows, so a new targeted workflow was added for this item.

## Assumed

- Evidence IDs in this lane may use deterministic string IDs where existing schema does not enforce a single global format.
- CI check labels for this lane can be represented as step names (`metrics-schema-validate`, `deterministic-output-check`, and `no-unstable-fields`) before a wider gate aggregator is introduced.
- GitHub auth will be supplied through existing connector mechanisms (`GITHUB_TOKEN` or GitHub App token broker), with production token strategy finalized in API integration phase.

## Must-Not-Touch Files

- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/governance/CONSTITUTION.md`
- `docs/governance/META_GOVERNANCE.md`
- `agent-contract.json`

## Deferred Pending PR2

- Live endpoint verification for the new Copilot PR throughput and time-to-merge fields.
- Final endpoint contract if GitHub introduces a dedicated PR metrics subresource.
- Production secret-path decision (GitHub App installation token service vs direct PAT fallback).
