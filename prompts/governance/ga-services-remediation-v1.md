# GA Services Remediation Prompt (v1)

Objective: complete GA-required checks with evidence, remediate failures, and ensure smoke runs without
network downloads while maintaining the Summit Readiness Assertion posture.

Scope:

- Paths: services/, Makefile, scripts/ga/, scripts/ci/, evidence/ga/, artifacts/agent-runs/, docs/roadmap/STATUS.json
- Domains: governance, quality, verification, ci

Execution Requirements:

- Capture GA evidence logs for each command using a deterministic runner.
- Remediate test failures with minimal, correct changes and AAA tests.
- Enforce a focused-test guard for new changes (.only/.skip).
- Keep regulatory logic in policy-as-code if applicable; log decisions.
- Update roadmap status and PR metadata with evidence references.
