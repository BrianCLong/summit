# Summit v2.0.0 GA Release Manifest

**Release Date:** 2025-10-25
**Version:** 2.0.0 (General Availability)
**Codename:** Discernment

## Artifacts

| Component             | Version | Image/Package                                      | SHA256 (Snippet) |
| :-------------------- | :------ | :------------------------------------------------- | :--------------- |
| **IntelGraph Server** | 4.2.3   | `us-west-2.docker.pkg.dev/summit/ga/server:4.2.3`  | `e3b0c44...`     |
| **IntelGraph UI**     | 2.1.0   | `us-west-2.docker.pkg.dev/summit/ga/ui:2.1.0`      | `a1b2c3d...`     |
| **Maestro Engine**    | 1.5.0   | `us-west-2.docker.pkg.dev/summit/ga/maestro:1.5.0` | `f9e8d7c...`     |
| **Terraform Modules** | 1.0.0   | `s3://summit-releases/tf/summit-ga-pack-v1.tgz`    | `881273a...`     |

## Gate Verification

- [x] **CI/CD:** Green build (Build ID: 1024)
- [x] **Security:** ZERO critical CVEs (Trivy Scan #992)
- [x] **Legal:** All licenses compliant (FOSSA Report)
- [x] **QA:** 100% Core Features Pass (TestRail Run #55)
- [x] **Docs:** Published to https://docs.summit.internal/v2

## Known Issues

- **High Latency in Graph Writes:** Bulk ingestion > 100MB may cause temporary latency spikes (Fix scheduled for v2.0.1).
- **IE11 Support:** Deprecated and removed.

## Rollback Plan

Run `helm rollback summit -n prod` to revert to v1.9.5.
See runbook: `docs/runbooks/ROLLBACK.md`.
