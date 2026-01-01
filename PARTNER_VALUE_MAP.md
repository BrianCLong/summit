# Partner Value Map (Strategic Partnerships & Ecosystem Leverage)

## Archetypes and Value

| Archetype                   | Customer Problem Solved                                                                   | Supported Patterns                                  | Non-Goals                                                                          | Owner |
| --------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------- | ----- |
| Independent Software Vendor | Embed Summit insights in downstream tools while keeping residency and auditability intact | Read-only Insight API; Sandboxed Plug-in            | No database writes; no bespoke runtimes; no partner-key defaults                   | Jules |
| Systems Integrator          | Package onboarding/mapping without privileged tenant access                               | Sidecar Adapter; Event Listener (no mutation)       | No policy-engine bypass; no long-lived credentials; no tenant admin rights         | Jules |
| Data Provider               | Enrich investigations with curated data while preserving provenance and residency         | Sidecar Adapter; Read-only Insight API              | No cross-tenant mixing; no exfiltration; no unverified lineage                     | Jules |
| Compliance & GRC Tool       | Observe controls/evidence without mutation or data scope creep                            | Event Listener (no mutation); Read-only Insight API | No policy overrides; no remediation writes; no direct access beyond evidence scope | Jules |
| Observability Platform      | Provide metrics/traces without changing execution paths or secrets                        | Event Listener (no mutation); Read-only Insight API | No config mutation; no secret scraping; no cross-tenant visibility                 | Jules |

## Pattern Guardrails (Authoritative)

- **Read-only Insight API**: Read/list/filter only; rate limits (<=600 rpm, 500MB/day), JWT audience pinning, OPA bundle enforcement, tenant-pinned stateless workers, kill-switch.
- **Event Listener (No Mutation)**: Subscribe/filter only; capped at 1200 epm, 500ms delivery lag; ACL-gated topics; webhook mTLS; replay protection; no stateful transforms.
- **Sandboxed Plug-in**: UI embed and render in wasm; syscall allowlist; no local storage or unbounded network; 500 cpu_millis/256MB/1.5s caps; mesh-only egress; registry kill-switch.
- **Sidecar Adapter**: Ingest/normalize/forward only; read-only tokens; 750 cpu_millis/512MB/2.5s and <=2GB/day throughput; orchestrator scale-to-zero; residency pinned per tenant; token revoke kill-switch.

## Explicit Non-Goals

1. No partner-specific privileges or custom runtimes beyond approved patterns.
2. No mutation paths, policy overrides, or credential elevation for any partner.
3. No deviations from residency, isolation, or audit guarantees—drift is a failure condition.

## Enforcement & Proof

- Patterns and guardrails are machine-checked via `scripts/ci/check_partner_model.js` against `partners/*.json`.
- Claims must map to an approved pattern and include evidence links; unsupported claims fail CI.
- Lifecycle includes revocation mechanics (access removal, data separation, artifact cleanup) validated by the same check script.

## Negative Controls

- Scope creep tests are encoded in the claims registry (mutation, replay, cross-tenant fetch attempts) and enforced by the CI check.
- Any pattern drift or missing evidence automatically fails the partner check script, blocking CI.
