# Non-Capabilities Register

This register documents capabilities the platform does **not** provide or intentionally restricts. It must be maintained alongside the API change log and refreshed whenever a limitation changes.

## Current Non-Capabilities

- **Model training on customer data**: Foundation models are not trained or fine-tuned on customer datasets without explicit opt-in and DPA coverage.
- **Autonomous infrastructure changes**: No self-directed scaling, provisioning, or configuration drift remediation without human-approved plans.
- **Unsecured outbound data egress**: No transmission of customer or operational data to unapproved domains, regions, or storage classes.
- **Probabilistic identity resolution in regulated tenants**: Identity matching uses deterministic rules only; probabilistic or ML-based matching is disabled in regulated environments.
- **Offline token issuance**: Access tokens cannot be generated or refreshed without live issuance flows and policy checks.

## Governance

- Owners: Risk & Safety (primary), with Security and Platform Eng as reviewers.
- Update cadence: Monthly review or immediately after any architectural/feature change that alters limitations.
- Publication: Synced to the public documentation portal and referenced from release notes and API change-log entries.
