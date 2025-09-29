# Data Spine Governance Toolkit

The Data Spine service provides a lightweight schema registry with data residency enforcement hooks and provenance capture tailored for multi-region governance. Key capabilities include:

- **Schema lifecycle management** with SemVer directories stored in Git. CLI commands `init`, `validate`, `bump`, and `compat` ensure backwards compatible evolution.
- **Classification-aware policies** embedded via `x-data-spine` metadata so every contract declares residency, transformation, and PII handling posture.
- **Runtime policy hooks** (`applyPolicies`, `enforceResidency`) that redact or tokenize sensitive fields for lower environments while guaranteeing deterministic, reversible transforms.
- **Lineage sink** that translates event bus emissions into a graph-friendly JSON snapshot with full who/what/when/where/why context and drop-rate telemetry.
- **Residency audits** generated through `data-spine audit residency --output <file>` suitable for compliance evidence.

## Usage

```bash
npm install
npm exec --workspace=@summit/data-spine data-spine validate --all
npm exec --workspace=@summit/data-spine data-spine compat customer-profile
npm exec --workspace=@summit/data-spine data-spine audit residency --output services/data-spine/reports/residency-audit.json
```

The CLI will exit non-zero on breaking schema changes or residency violations, enabling compatibility gates in CI.
