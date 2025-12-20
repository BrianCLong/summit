# ADR-2024-12-06 — Ship Disclosure Packager

- Context: Auditors require tenant-scoped disclosure bundles with audit trails, SBOMs, attestations, and policy evidence delivered within strict SLOs.
- Decision: Add an async `/disclosures/export` job that signs bundles, streams large payloads, and instruments adoption analytics; expose a React front-end for operators.
- Consequences: Requires background job lifecycle management, webhook hardening, and new observability dashboards + policies to enforce cosign verification.
