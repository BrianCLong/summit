# Sprint 12 Plan — Secure the Railhead (Feb 23-Mar 6, 2026, America/Denver)

**Theme:** Convert reliability and supply-chain controls from best effort to enforced by default, while shipping one customer-visible trust win.

## North-Star Alignment

- Track A (Now-Value, next 90 days): Canary Manager v1 and Release Evidence Pack.
- Track B (Moat, 12-24 months): deterministic supply chain as the default paved road (SBOM + signatures + provenance + CVE budget gate).

## Capacity and Outcomes

- Capacity: 10 engineers (6 platform, 2 SRE, 1 security, 1 product ops).
- Outcome 1: 100% of Golden Path services emit `SBOM + signature + provenance` in CI.
- Outcome 2: CVE budget gate blocks promotion when High vulnerabilities exceed budget.
- Outcome 3: Canary Manager supports 1-click red/black and auto-rollback on SLO breach.
- Outcome 4: First signed customer Evidence Pack published.

## Epic A — Deterministic Supply Chain Gate (P0)

Objective: Every Golden Path build is reproducible, signed, and policy-gated.

Deliverables:

1. CycloneDX SBOM generation at build and artifact attachment.
2. Sigstore/cosign image signing and deploy-time verification.
3. SLSA-aligned provenance attestation with pinned builder digest.
4. CVE budget gate with default `max_high=0`.
5. OPA gate in CI for license policy, residency tags, and PII annotation presence.

Acceptance Criteria:

- CI required checks include secret scan, SAST, license scan, SBOM, sign+verify, and OPA pass.
- Release artifacts include `SBOM.json`, `attestation.json`, and `vuln_report.json`.
- Evidence retained immutably for >=30 days.

## Epic B — Canary Manager v1 (P0)

Objective: Reduce change-fail rate and MTTR through red/black automation.

Deliverables:

1. Red/black deploy toggle in Helm chart flow.
2. Synthetic probes for HTTP and authenticated user flow.
3. Auto-rollback when:
- error rate breaches threshold for 5 minutes, or
- p95 latency exceeds 2x baseline for 10 minutes.
4. Slack/Pager alert payload includes trace IDs.

Acceptance Criteria:

- Deploy starts at 10% and promotes to 100% after 30 healthy minutes.
- One-click rollback available through UI/CLI surface.
- Post-deploy verification checklist generated automatically.

KPI Targets:

- Change-fail rate reduction: 30%.
- MTTR in canary failures: under 20 minutes.

## Epic C — Release Evidence Pack (P1)

Objective: Ship trust as a product feature.

Deliverables:

1. Admin UI "Download Evidence Pack" action.
2. Pack output in JSON and PDF.
3. Signed and timestamped pack with verification section.
4. Sprint sample archived under `/releases/v12/`.

Acceptance Criteria:

- Pack includes SBOM, signature verification result, CVE vs budget, residency assertion, PII summary, and audit snapshot.
- Customer can verify pack signature from included instructions.

## Epic D — Observability First Kit (P1)

Objective: Require standard telemetry for service readiness.

Deliverables:

1. SDK emits `request_count`, `error_rate`, `p95_latency`, and trace propagation.
2. Golden Grafana dashboard template.
3. Lint rule that blocks deploy if metrics endpoint is missing.

Acceptance Criteria:

- Two pilot services migrated.
- Synthetic probe integrated.
- Alert path tested in staging.

## Tech Debt Retirement (P2)

- Remove 3 unpinned GitHub Actions references.
- Reduce CI runtime by 15% through parallel test sharding and cache tuning.
- Archive 2 unused feature flags with cleanup PRs.

## Prioritized Backlog

| Priority | Item | ROI | Risk Reduced |
| --- | --- | --- | --- |
| P0 | SBOM + Cosign + CVE Gate | High | Supply-chain compromise |
| P0 | Canary auto-rollback | High | Change-fail rate |
| P1 | Evidence Pack | Medium-High | Enterprise trust |
| P1 | Observability SDK | High (compounding) | Blind deploys |
| P2 | CI runtime reduction | Medium | Dev velocity drag |

## Definition of Ready (Top 3 Stories)

- ROI statement with target metric delta.
- Signed ADR draft (ADR-042/ADR-043).
- Test plan plus synthetic probe definition.
- Data classification annotations present.
- Rollout and scripted rollback defined.

## Definition of Done

- All required CI gates green.
- SLO dashboard updated.
- Runbook updated.
- Release notes and migration notes published.
- Post-deploy verification artifact archived.

## Weekly Battle Rhythm

- Monday: Portfolio allocation and SBOM key unblock.
- Wednesday: Supply-chain threat model review and canary chaos test.
- Friday: Evidence review for signed artifact coverage, SLO deltas, and CVE burn-down.

## Exit Criteria

- 100% of new Golden Path builds signed and verified.
- One production release shipped through Canary Manager with zero manual rollback.
- First signed Evidence Pack delivered.
- CI runtime increase held to <=5% above baseline despite additional gates.

## MAESTRO Mapping

- MAESTRO Layers: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- Threats Considered: artifact tampering, policy bypass, canary flap loops, CVE false-positive blockade, telemetry blind spots.
- Mitigations: policy-as-code deny defaults, timeboxed waivers, rolling-window smoothing, synthetic probes, immutable evidence retention.
