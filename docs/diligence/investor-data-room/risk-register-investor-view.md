# Risk Register & Heatmaps (Investor View)

This is a **curated, top-tier** risk register for investors. It is aligned to the internal risk ledger and threat modeling artifacts. No risk is minimized for optics.

**Evidence pointers**

- [Risk ledger](../../RISK_LEDGER.md)
- [Threat model](../../THREAT_MODEL.md)
- [Security action plan](../../SECURITY_ACTION_PLAN.md)

## Heatmap Key

- **Likelihood**: Low / Medium / High
- **Impact**: Low / Medium / High
- **Status**: Accepted / Mitigated / Tracking

## Top-Tier Risk Register (Curated)

| Risk                                                                                     | Likelihood | Impact | Status    | Evidence / Notes                                                                                                                          |
| ---------------------------------------------------------------------------------------- | ---------- | ------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Data quality variance across sources can degrade analytical outcomes.                    | Medium     | High   | Tracking  | Data governance and ingestion controls in [DATA_GOVERNANCE](../../DATA_GOVERNANCE.md) and ingestion guidance.                             |
| Regulatory and compliance scope shifts (e.g., sector requirements) can introduce rework. | Medium     | High   | Tracking  | Compliance mappings in [COMPLIANCE_CONTROLS](../../COMPLIANCE_CONTROLS.md) and [COMPLIANCE_SOC_MAPPING](../../COMPLIANCE_SOC_MAPPING.md). |
| Security posture must keep pace with threat evolution; residual risk remains.            | Medium     | High   | Mitigated | Controls and actions in [SECURITY.md](../../SECURITY.md) and [SECURITY_ACTION_PLAN](../../SECURITY_ACTION_PLAN.md).                       |
| Performance at scale may require continued optimization as usage patterns grow.          | Medium     | Medium | Tracking  | Performance and observability plans in [OBSERVABILITY.md](../../OBSERVABILITY.md) and [PERFORMANCE_BUDGET](../../PERFORMANCE_BUDGET.md).  |
| Availability incidents can erode trust if response is slow.                              | Low        | High   | Mitigated | Response standards in [RUNBOOK.md](../../RUNBOOK.md) and [INCIDENT_SIGNAL_MAP](../../INCIDENT_SIGNAL_MAP.md).                             |
| Model and automation misuse or over-reliance can create analytical error risk.           | Medium     | High   | Tracking  | Governance guardrails in [AI_GOVERNANCE_AGENT_FLEET](../../AI_GOVERNANCE_AGENT_FLEET.md) and [AI-PRODUCTION](../../AI-PRODUCTION.md).     |

## Accepted vs. Mitigated Risks

- **Accepted**: Risks labeled as accepted are documented in the risk ledger with rationale and monitoring posture.
- **Mitigated**: Risks labeled as mitigated have controls in place; mitigation does not imply elimination.

## Notes on Risk Transparency

- This register is intentionally conservative.
- If a mitigation depends on future work, the risk remains **Tracking**.
- Any delta with the internal risk ledger must be reconciled before sharing externally.
