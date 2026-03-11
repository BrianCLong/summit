# ISO 42001 + EU AI Act Checklist (Summit Field Artifact)

**Version:** 2026-03-10
**Owner:** Governance + Product Security
**Status:** Active checklist for regulated opportunities

---

## Purpose

This checklist is the go-to sales and solution-engineering artifact for proving Summit alignment to:

- ISO/IEC 42001 AI management-system expectations.
- EU AI Act high-risk operational obligations (pre-August 2026 readiness posture).

---

## Checklist

| Control Theme | Buyer Question | Summit Evidence Requirement | Summit Evidence Path | Status |
|---|---|---|---|---|
| AI governance system | Do you operate a defined AI governance framework? | Governance model, policy ownership, review cadence | `docs/governance/` + policy registry | Required |
| Risk management lifecycle | How are AI risks identified, assessed, and tracked? | Risk taxonomy, scoring method, mitigation traceability | `docs/governance/RULEBOOK.md` + risk artifacts | Required |
| Data governance | How do you control data quality, lineage, and retention? | Data lineage model and retention controls | Provenance and data-handling docs | Required |
| Human oversight | Where can humans intervene in high-risk decisions? | Explicit override/escalation points and role matrix | Agent mandates + runbooks | Required |
| Transparency and explainability | Can outputs be explained and replayed? | Evidence-linked explanation path and replay capability | GraphRAG evidence and provenance docs | Required |
| Accuracy and robustness | How do you validate quality and drift? | Test strategy, monitoring signals, drift/quality thresholds | GA testing strategy + observability signals | Required |
| Security resilience | How are misuse, abuse, and exfiltration addressed? | Threat model, controls, incident procedures | Security framework + runbooks | Required |
| Supplier/model dependency risk | How do you manage model/vendor policy changes? | Multi-model fallback and dependency governance policy | Positioning + governance docs | Required |
| Auditability | Can you produce verifiable decision records? | Immutable evidence/logging and retrieval path | Evidence signal maps and ledgers | Required |
| Post-market monitoring | How are field incidents detected and remediated? | Monitoring coverage + response protocol | Ops runbooks + alerting standards | Required |

---

## Opportunity Qualification Gate

Mark opportunity as **Governance-Qualified** only when all checklist rows have:

1. A mapped Summit artifact.
2. An owner assigned for evidence refresh.
3. A dated validation timestamp.

If any row is missing, status is **Deferred pending evidence completion**.
