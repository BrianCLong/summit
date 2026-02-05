# Gate Failure Catalog

**Authority:** Summit Readiness Assertion at `/Users/brianlong/Developer/summit/docs/SUMMIT_READINESS_ASSERTION.md`
**Scope:** CI/CD governance, GA gates, and evidence enforcement
**Related:** `/Users/brianlong/Developer/summit/docs/ga/GATE_POLICY.md`, `/Users/brianlong/Developer/summit/docs/ga/GA_DEFINITION.md`, `/Users/brianlong/Developer/summit/docs/ga/TESTING-STRATEGY.md`, `/Users/brianlong/Developer/summit/docs/ga/EVIDENCE_BUNDLES.md`, `/Users/brianlong/Developer/summit/docs/CI_STANDARDS.md`

## Purpose

This catalog standardizes GA gate failure diagnosis and remediation. Each gate lists deterministic triggers, required evidence, and a single remediation path. Exceptions are governed, not improvised.

## Operating Posture

- All failures map to the Readiness Assertion and GA Definition.
- Remediation is the default response. Exceptions are governed and audited.
- Break-glass policy is **Deferred pending** `/Users/brianlong/Developer/summit/docs/ga/BREAK_GLASS.md`.

## Failure Classes

### GATE-PR-METADATA

Trigger: Missing or invalid PR metadata block between `<!-- AGENT-METADATA:START -->` and `<!-- AGENT-METADATA:END -->`.
Evidence: `node /Users/brianlong/Developer/summit/scripts/ci/validate-pr-metadata.ts` output.
Remediation: Add required metadata block in `.github/PULL_REQUEST_TEMPLATE.md` format and re-run validation.
Owner: Release Captain (Jules)

### GATE-PROMPT-INTEGRITY

Trigger: Prompt hash mismatch against `prompts/registry.yaml`.
Evidence: `node /Users/brianlong/Developer/summit/scripts/ci/verify-prompt-integrity.ts` output.
Remediation: Update prompt or registry entry, re-hash, and ensure the diff aligns with allowed operations.
Owner: Governance (Aegis)

### GATE-EVIDENCE-BUNDLE

Trigger: Missing or malformed evidence artifacts for agent-run changes.
Evidence: `artifacts/agent-runs/{task_id}.json` and `agent-metrics.json`.
Remediation: Emit evidence artifacts per `/Users/brianlong/Developer/summit/docs/ga/EVIDENCE_BUNDLES.md` and re-run the gate.
Owner: Codex (Engineer)

### GATE-DETERMINISM

Trigger: Non-deterministic query or missing ORDER BY / LIMIT in graph logic.
Evidence: `node /Users/brianlong/Developer/summit/scripts/ci/verify_query_determinism.ts` output.
Remediation: Add LIMIT, ORDER BY, and evidence budget validation in the IntentCompiler path.
Owner: Codex (Engineer)

### GATE-GOLDEN-PATH

Trigger: Golden Path smoke tests fail.
Evidence: `make smoke` output and associated CI logs.
Remediation: Fix failing step or revert the change. Re-run `make smoke` to verify 100% pass rate.
Owner: Release Captain (Jules)

### GATE-SECURITY-VULNS

Trigger: High-severity vulnerabilities detected in production dependencies.
Evidence: Security scan reports (Trivy/Snyk) in CI artifacts.
Remediation: Upgrade dependency or add governed exception with evidence in `/Users/brianlong/Developer/summit/docs/ga/`.
Owner: Aegis (Guardian)

### GATE-OPENAPI-COVERAGE

Trigger: API endpoint missing OpenAPI specification entry.
Evidence: CI spec validation output.
Remediation: Add or update OpenAPI spec entry and re-run validation.
Owner: Codex (Engineer)

### GATE-GOVERNANCE-LINKAGE

Trigger: PR is not linked to a certified Roadmap Item or Issue.
Evidence: PR metadata validation output and roadmap status in `/Users/brianlong/Developer/summit/docs/roadmap/STATUS.json`.
Remediation: Link PR to certified item or update roadmap status in the same PR.
Owner: Release Captain (Jules)

### GATE-QUALITY-LINT

Trigger: Lint/format/typecheck failures.
Evidence: `pnpm lint`, `pnpm format:check`, `pnpm typecheck` outputs.
Remediation: Fix lint/type errors, ensure formatting, and re-run checks.
Owner: Codex (Engineer)

## Resolution Protocol

1. Identify gate failure ID and map to this catalog.
2. Capture evidence output and attach to the PR.
3. Apply the single remediation path for that gate.
4. Re-run the gate and record results in evidence artifacts.

## Governance Notes

- No gate is bypassed without a governed exception.
- All deviations must be logged as exceptions, not defects.
- Changes that affect gate behavior must update this catalog and the evidence map.
