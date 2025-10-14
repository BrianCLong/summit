# Threat Model Checklist

- Map data flows for `/evidence`, `/export`, `/er/*`, and sandbox execution.
- Authentication: enforce OIDC with WebAuthn step-up for export and merge operations.
- Authorization: ABAC via OPA, including field-level GraphQL rules.
- Secrets management: Kubernetes secrets (prefer sealed secrets where available).
- Telemetry hygiene: redact identifiers in traces.
- Supply chain: enable Dependabot; commit Go and Node lockfiles.
