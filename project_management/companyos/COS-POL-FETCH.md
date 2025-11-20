# COS-POL-FETCH — Policy Pack Consumer + OPA Hot-Reload

## Goal
Continuously pull and verify the `policy-pack-v0` bundle, validate integrity with SHA256 + Sigstore, and hot-reload OPA without causing customer-impacting errors.

## Key Outcomes
- Deterministic polling loop with conditional requests and resilient backoff.
- Verified policy bundles stored atomically and rolled back to last-known-good on failures.
- OPA reload events complete within 30 seconds and are observable via health endpoints.
- Operational playbooks covering troubleshooting, manual rollbacks, and alert response.

## Architecture Overview
| Component | Responsibility |
| --- | --- |
| Policy Fetcher Service | Polls `/v1/policy/packs/policy-pack-v0`, handles verification, writes bundles. |
| Sigstore Verifier | Validates signatures against trusted roots and transparency log. |
| Bundle Store | Persistent volume or config map storing active and last-known-good bundles. |
| OPA Sidecar/Embedded | Consumes bundles and exposes decision APIs + health metrics. |
| Metrics Exporter | Publishes fetch latency, digest age, and reload success metrics. |

### Fetch Flow
1. Scheduler triggers fetch; sends conditional GET with cached ETag.
2. Response verified (status 200/304). If new digest, compute SHA256 and verify Sigstore signature.
3. Write bundle to temp location, fsync, then atomically move to `active` path while preserving previous version under `lkg/`.
4. Notify OPA via control API or filesystem watch; wait for confirmation.
5. Emit metrics and logs; on failure revert to previous bundle and raise alerts.

## Implementation Plan
### Phase 0 — Setup (Week 1)
- Import `clients/cos-policy-fetcher` and configure base environment variables (poll interval, endpoints, trust roots).
- Define configuration CRD (if Kubernetes) or environment config file for bundle locations.

### Phase 1 — Polling & Verification (Week 1)
- Implement conditional GET with `If-None-Match` and jittered interval to avoid thundering herd.
- Add SHA256 checksum verification, Sigstore bundle validation, and failure telemetry.
- Build fallback logic retaining last-known-good bundle and raising structured alerts on mismatch.

### Phase 2 — Storage & Hot Reload (Week 2)
- Implement atomic write flow (temp → fsync → rename) with cleanup of stale temporary files.
- Integrate with OPA reload API (sidecar: HTTP POST; embedded: library call) and await success acknowledgment.
- Expose `/healthz` endpoint reporting bundle version, digest age, and last reload timestamp.

### Phase 3 — Observability & Docs (Week 2)
- Wire Prometheus metrics (`bundle_digest_age_seconds`, `bundle_reload_failures_total`).
- Create Grafana dashboards and alert rules (stale bundle >15m, reload failure rate >3 in 10m, 5xx spike >0.5%).
- Produce troubleshooting guide and runbook for manual rollback.

## Work Breakdown Structure
| Task | Owner | Duration | Dependencies |
| --- | --- | --- | --- |
| Configure fetcher library and environment | App Eng | 2d | Setup |
| Implement conditional GET + jitter | App Eng | 1d | Library configured |
| Add signature verification | App Eng | 2d | Conditional GET |
| Atomic storage + fallback | App Eng | 2d | Verification |
| OPA reload integration | App Eng | 2d | Storage |
| Metrics & dashboards | App Eng + SRE | 2d | Reload integration |
| Runbook authoring | App Eng | 1d | Metrics |

## Testing Strategy
- **Unit**: Signature verification, conditional GET caching behavior, atomic write logic.
- **Contract**: Simulate digest mismatch to ensure fetcher fails closed and retains last-known-good.
- **E2E**: Swap policy pack in staging; verify OPA decisions change within 30s without >0.5% error spike.
- **Load**: Inject network latency/failure scenarios to ensure backoff and fallback operate correctly.

## Observability & Operations
- Metrics: `policy_fetch_duration_seconds`, `policy_digest_age_seconds`, `policy_reload_success_total`, `policy_reload_failure_total`.
- Alerts: Stale bundle >15m, consecutive reload failures (>=3), HTTP 5xx error rate >0.5% during reload windows.
- Dashboard panels: Current digest, last reload, fallback activations, Sigstore validation status.

## Security & Compliance
- Trust root and Sigstore key material stored via External Secrets with rotation schedule.
- Fetcher uses mTLS to connect to policy endpoint; audit fetch requests with correlation IDs.

## Documentation & Enablement
- Update policy loader README with configuration examples and failure handling matrix.
- Provide FAQ for common errors (ETag mismatch, signature expiration, OPA reload failures).
- Conduct knowledge transfer session with MC and SRE teams.

## Operational Readiness Checklist
- [ ] Staging dry run demonstrating automatic rollback to last-known-good.
- [ ] Alerts integrated with on-call rotations.
- [ ] Runbook reviewed and approved by Security.
- [ ] Health endpoint registered with platform monitoring.

## Dependencies
- Policy pack endpoint and attestation pipeline already live.

## Risks & Mitigations
- **Reload race conditions**: Use file locks and sequential reload queue to prevent overlapping updates.
- **Policy regression**: Stage canary reload; monitor decision metrics before promoting.

## Acceptance Criteria
- New digest triggers reload within ≤30 seconds and updates policy version metric.
- No sustained >0.5% 5xx spike during controlled reload tests.
- Unsigned or mismatched packs rejected with alerts to App Engineering and Security.
- Last-known-good bundle remains active when fetch fails.
