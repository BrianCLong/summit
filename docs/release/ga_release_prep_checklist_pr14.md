# GA Release Prep (PR-14) – Checklist

- RC cut: tag `v1.0.0-rc.1` and changelog snapshot
- Security review: dependency audit, secrets scan, OPA policies review
- Packaging: Docker images for api, graphql/ui, copilot; SBOMs attached
- Perf pass: budget checks, slow query logs on, k6 smoke profiles
- Notes: release notes draft and upgrade guide
