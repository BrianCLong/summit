# 2026 H2 Exit Readiness Playbook

This playbook operationalizes the H2 goal of reaching $10M ARR across 100+ customers while preparing for a $100M+ acquisition or $25M Series B. It translates the GTM plan, technical exit gates, and risk controls into execution-ready tracks with measurable checkpoints.

## Objectives
- **Revenue**: Grow ARR from $2.5M in Q3 to $10M+ in Q4 across DoD/IC, F500, and SMB segments.
- **Readiness**: Achieve FedRAMP High ATO, SOC2 Type II, and AI GovCloud (IL5) milestones to unlock acquisition or Series B optionality.
- **Exit Options**: Maintain dual-track posture for Palantir/Anduril acquisition and Series B at $150M pre-money.

## Targets & Milestones
| Quarter | ARR | Customers | Hiring | Capability Milestones |
| --- | --- | --- | --- | --- |
| **Q3 (Jul–Sep)** | $2.5M | 50 | 15 | FedRAMP High control completion, Palantir bridge PoC, IL5 design freeze, SOC2 Type II audit kickoff |
| **Q4 (Oct–Dec)** | $10M+ | 100+ | 40 | FedRAMP High ATO, AI GovCloud IL5 pilot, Gotham/Foundry bi-directional sync GA, SOC2 Type II attestation |

## Execution Tracks
### Compliance & Security
- **FedRAMP High ATO**
  - Control coverage: finalize SSP, POA&M remediation burndown, weekly CISO sign-offs.
  - Infrastructure: EKS FedRAMP clusters scaled via Terraform with hardened baselines (cosign/SLSA level 3, FIPS 140-3 crypto).
  - Evidence factory: automated control attestation in trust portal; quarterly 3PAO readiness scans.
- **SOC2 Type II**
  - Quarterly audits with continuous evidence collection, change management enforcement, and trust portal publication.

### Product & Platform
- **AI GovCloud (IL5)**
  - Air-gapped deployment path with secure supply chain (cosign verify for airgap images) and KMS/HSM-backed secrets.
  - Data labeling/storage segregation for classified workloads and FIPS 140-3 validated crypto libraries.
- **Palantir/Foundry Bridge**
  - Gotham import adapters, Foundry bi-directional sync, and authorization handoff to customer IdP via AuthN/Z gateway.
  - Joint PoC timeline: design complete by Jul 31, PoC in Aug, bridge contract in Sep.

### Go-to-Market
- **Channel mix**: Carahsoft (60% DoD pipeline), Palantir resell (30% F500), In-Q-Tel showcase (10% IC).
- **ACV focus**: DoD/IC ($500k ACV), F500 ($250k), SMB ($25k) totaling $13.75M modeled ARR across 180 customers.
- **Customer success**: renewal guardrails (95% target) via SOC2 trust portal, FedRAMP status updates, and QBRs.

### Organization & Ops
- **Headcount ramp**: Hire to 15 in Q3 and 40 in Q4; blend 40 engineer-equivalent via AI copilots for velocity.
- **Program rhythm**: 24-week sprints under the "Scale-100" project with weekly exit-critical labels for blockers.
- **Observability**: SLOs for availability and deployment frequency; FedRAMP/SOC2 audit trails integrated into dashboards.

## Technical Exit Gates
| Gate | Proof | Owner | Due |
| --- | --- | --- | --- |
| FedRAMP High ATO | SSP signed, POA&M closed, 3PAO letter | CISO | Sep 30 |
| AI GovCloud IL5 | Air-gapped deploy validated, FIPS 140-3 crypto verified | Platform Lead | Oct 31 |
| Palantir Bridge GA | Gotham import + Foundry sync GA, shared runbook | Integrations Lead | Oct 15 |
| SOC2 Type II | Final auditor report + trust portal publication | Security Lead | Dec 15 |

## Risks & Killswitches
- **No FedRAMP by Q3**: pivot to commercial-only, conserve burn by 50%, prioritize F500/SMB upsell.
- **<50 customers by Q3**: pause hiring, seek bridge financing only, re-evaluate channel mix.
- **Palantir competition**: harden air-gap + IL5 differentiation and emphasize data residency controls.

## Operating Cadence
- **Weekly**: track exit-critical issues, control burndown, pipeline coverage, and ARR attainment.
- **Monthly**: milestone reviews (compliance evidence, Palantir bridge status, IL5 pilot readiness) and risk reassessment.
- **Quarterly**: board-ready exit readiness update summarizing ARR, control posture, and dual-track status.

## Decision Framework
- **Track A (Acquisition)**: secure Palantir bridge contract in Q3; target LOI in Q4 after IL5 pilot and FedRAMP ATO.
- **Track B (Series B)**: raise $10M bridge from gov-focused VCs in Q3; close $25M Series B at $150M pre in Q4 contingent on $10M ARR and compliance gates.

## Metrics & Reporting
- **Revenue**: ARR progression, ACV mix, pipeline-to-close conversion by channel.
- **Product**: deployment frequency, MTTR, SLO adherence, security control coverage %, supply chain verification success.
- **Compliance**: evidence currency, audit findings aging, POA&M closure velocity, trust portal freshness.

## Next Actions (Week of Jul 7)
1. Create milestone `H2-Exit` and roadmap project `Scale-100` in GitHub for cross-functional visibility.
2. Apply `exit-critical` label to all FedRAMP, Palantir bridge, IL5, and SOC2 issues.
3. Kick off Palantir PoC scoping; finalize IL5 design freeze and FedRAMP control verification schedule.
4. Stand up weekly exit readiness review with finance, compliance, and product leads.
