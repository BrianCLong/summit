# Repository Assumptions (Software Factory Subsumption)

Status: Intentionally constrained pending verification.

## Verify (grounded checks)

- Language mix (Python/Go/TypeScript) and primary runtime targets.
- Current agent runner entrypoints and where they live (CLI, service, or scripts).
- Existing test harness style (unit/integration/e2e) and naming conventions.
- CI system and job names (GitHub Actions or equivalent workflows).
- Evidence folder conventions and artifact retention patterns.
- Logging and telemetry approach (structured logs, metrics, traces).

## Must-not-touch (until verified)

- Release workflow files.
- Security policy files.
- Anything under `infra/` or production deployment manifests.

## Checklist (to run before implementation)

- `rg -n "evidence|eval|scenario|harness|agent"` to map existing primitives.
- List CI jobs and required checks for baseline policy gates.
- Confirm license and contribution rules.

## Default constraints (if verification is blocked)

- Feature flags default OFF for any new pipeline.
- Deny-by-default for external network calls in tests.
- Only additive modules and minimal wiring changes.
