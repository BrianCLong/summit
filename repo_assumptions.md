Verified
Repo exists and is public: BrianCLong/summit.
Root contains agents, agentic, artifacts, scripts, docs, server, .github, apps, packages, config, configs.
Root package manager is pnpm@10.0.0; repo uses Node ESM and has root scripts for lint, typecheck, tests, coverage, security evidence, and verification.
Golden path exists as ./scripts/golden-path.sh.
Branch-protection policy file exists at docs/ci/REQUIRED_CHECKS_POLICY.yml with required checks including meta-gate, CI Core Gate ✅, Unit Tests, gate, Release Readiness Gate, SOC Controls, test (20.x), and Workflow Validity Check.

Assumed
Internal conventions inside agents/ for runtime composition are not verified.
Existing evidence schema for new agent-runtime artifacts is not verified.
Existing queue abstraction for burst execution is not verified.
Existing feature-flag system path is not verified.
Existing alerting path for runtime-specific alerts is not verified.
new runtime should live under agents/runtime/
CLI entry should live under scripts/agent-runtime/
docs should live under docs/ops/, docs/security/, docs/standards/
tests should use Node test/Jest style already present at repo root

Must-not-touch
docs/ci/REQUIRED_CHECKS_POLICY.yml
scripts/golden-path.sh
server/src/graphql/schema*
release/governance scripts already tied to branch protection
unrelated production auth / OPA policy paths until runtime is isolated

Validation before PR-1:
confirm whether agents/ already has a scheduler or runner
confirm whether feature flags live under config/, configs/, or server/config
confirm whether artifacts are expected under artifacts/ root or per-package temp dirs
confirm whether Jest or Node test runner is preferred for new runtime unit tests
