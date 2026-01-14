# Dependency & Supply-Chain Risk Gate (GA)

Implement and wire a GA-grade dependency risk gate that evaluates direct and transitive
workspace dependencies for vulnerabilities and license compliance, emits deterministic
artifacts, and blocks CI when policy thresholds are exceeded. The gate must remain
policy-as-code, produce audit-ready evidence, and integrate into CI as a required check.

Constraints:

- Prefer zero new dependencies; reuse pnpm audit and existing tooling.
- Deterministic, stable report ordering and hashing.
- CI-safe by default (no secrets), network only when policy allows.

Deliverables:

- Policy file, canonical schema doc, and runbook.
- CI wiring and scripts for deterministic evidence output.
- Package script entry for local/CI execution.
