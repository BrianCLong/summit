# Project 19 Normalization Plan

**Source:** `docs/roadmap/STATUS.json`, `docs/ga/MVP4_GA_EVIDENCE_MAP.md`
**Generated:** 2026-01-15
**Owner:** Jules (Roadmap Execution Captain)

## Roadmap Items Normalized for Project 19

| Title | Priority | Effort | Risk | Milestone | Owner | Status | Dependencies | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Secure LLM Copilot & Retrieval** | P0 | L | High | MVP-4 GA | Jules | In Progress | - | `server/src/lib/data-platform/ingest/service.ts`, `server/src/services/CopilotIntegrationService.ts` |
| **Federation + Ingestion Mesh** | P1 | M | Med | Post-GA | Jules | Partial | - | `workers/ingest/src/connectors/BaseConnector.ts` |
| **Policy-as-Code Engine** | P0 | M | Med | MVP-4 GA | Jules | RC Ready | - | `server/src/data-governance/policy/PolicyEngine.ts` |
| **Immutable Audit Log** | P0 | M | High | MVP-4 GA | Jules | RC Ready | - | `server/src/security/zero-trust/ImmutableAuditService.ts` |
| **Counterfactual Context Reassembly** | P2 | L | High | Post-GA | Jules | Not Started | - | `docs/adr/0010-counterfactual-context.md` |
| **KTOON Core Libraries** | P1 | M | Low | MVP-4 GA | Amp | In Progress | - | - |
| **Graph-XAI Research Publications** | P3 | XL | Low | Q3 | Jules | Not Started | - | `docs/ga-graphai/docs/explainability.md` |
| **Accessibility + Keyboard Gate** | P0 | S | Low | MVP-4 GA | Jules | Verified | - | `e2e/a11y-keyboard/a11y-gate.spec.ts` |
| **SOC Control Tests into CI** | P0 | S | Med | MVP-4 GA | Jules | In Progress | #14700 | `scripts/test-soc-controls.sh`, `.github/workflows/soc-control-verification.yml` |
| **PR #16364 Atomicity Fix** | P0 | S | Low | MVP-4 GA | Jules | In Progress | #16364 | `PR_16364_AUDIT_NOTE.md` |

## Normalization Report

*   **Sources Used:** `docs/roadmap/STATUS.json`, `docs/ga/MVP4_GA_EVIDENCE_MAP.md`.
*   **Items Created/Updated:** 10 items fully populated.
*   **Top Priorities:**
    1.  **Secure LLM Copilot & Retrieval** (Core functionality)
    2.  **Policy-as-Code Engine** (Governance requirement)
    3.  **Immutable Audit Log** (Security requirement)
    4.  **SOC Control Tests into CI** (Compliance gate)
    5.  **Accessibility + Keyboard Gate** (UX/Compliance)

## Next Steps

1.  Sync these items to GitHub Project 19 (simulated).
2.  Execute P0 items immediately (SOC tests, PR fix).
