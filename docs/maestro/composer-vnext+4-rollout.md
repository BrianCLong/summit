Composer vNext+4 Rollout Playbook

Scope: 2-week sprint focused on ML-assisted scheduling/speculation, Plugin SDK v1 + signing, multi-tenancy fairness, secrets/redaction guardrails, IDE LSP MVP, and CAS resilience.

Teams & Ownership

- Platform/Orchestrator: Tenancy, WFQ, speculation hooks, CAS DR.
- Security/Compliance: Signing/verification, OSV/license gates, redaction.
- DX/Tooling: LSP server + IDE clients; docs and wizard polish.
- Data/ML: Features/labels export; inference service; telemetry.
- Observability: Dashboards for throughput, waste, fairness, secrets, LSP.
- UI/Graph: Minimal incident surfaces (as needed).

Week 1

- Baseline KPIs: throughput, spend/build, queue p50/p95 by tenant; export 14-day training set.
- Prototype inference service and speculation hooks (guarded behind flag).
- Tenancy primitives (namespaces/quotas/priorities) + WFQ; seed dashboards.
- Signing + verification path; sandbox defaults; convert one in-house plugin.
- LSP server skeleton with impacted targets + run-tests; VS Code client.
- CAS read-through mirror; snapshot job.

Week 2

- Safe-cancel path + telemetry; cap speculative concurrency.
- Enforce quotas/budgets; fairness load test; alerts.
- Finalize signing; reject unsigned/incompatible with actionable hints.
- IntelliJ client; cache stats in LSP; docs.
- DR drill (snapshot/restore ≤30m) with integrity check.
- Hardening: timeouts, retries, resource limits; flags; demo prep.

KPIs / SLOs

- Throughput ↑ ≥20%; spend/build ↓ ≥15% on peak repos.
- Speculation: ≥65% used; waste <5%.
- Fairness: p95 queue gap top/bottom tenants ↓ ≥40%.
- Secrets: 0 leaks; TTL ≤15min; redaction ≥95% in seeded tests.
- LSP: impacted targets < 800ms warm; two IDEs functional.
- CAS DR: restore drill ≤30m with integrity verified.

Risks & Mitigations

- Model drift / low precision → sliding-window retraining; cap speculative concurrency; rollback flag.
- Plugin breakages → strict semver; canary load; migration hints.
- Fair-share starvation → minimum slices; burst credits; backpressure.
- Secret regressions → contract tests; deny on missing redaction; red-team checks.
- DR complexity → scheduled drills; checksum validation; runbooks.

Rollout Flags

- ml.speculation.enabled (default: off)
- scheduler.wfq.enabled (default: on in dev, off in prod)
- plugins.signing.enforce (default: warn for 48h, then enforce)
- secrets.redaction.enforce (default: enforce)
- lsp.enabled (default: pilot repos only)
- cas.mirror.enabled (default: on)

Verification Checklist

- Speculation dashboards show hit/miss and waste <5% under pilot load.
- Fairness dashboards show ≥40% p95 gap reduction during synthetic load.
- Unsigned plugin load attempt blocked with actionable error and audit entry.
- OIDC/Vault TTL verified ≤15m; log/artifact redaction contract tests pass.
- LSP responses < 800ms warm on pilot repos; run-tests path works.
- CAS restore drill completes ≤30m; integrity hash matches.

Demo Script

1. Live PR triggers prediction → prefetch/speculate; show hit.
2. Fair-share view under mixed-tenant load.
3. Install a signed plugin; attempt unsigned (blocked with hint).
4. Rotate secrets; show redaction in logs/artifacts.
5. IDE: impacted targets + run tests; show critical path/cache stats.
6. Execute CAS restore drill; show before/after metrics.
