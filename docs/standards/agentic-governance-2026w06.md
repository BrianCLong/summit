# Agentic Governance 2026w06 (Item Subsumption)

## Summary

This standard captures the subsumption plan for “this week’s developments” into Summit, focusing on agent firewalling, incident journaling, security-agent workflows, and multi-model cost observability. It emphasizes compliance-enabling artifacts rather than compliance claims and keeps enforcement feature-flagged by default.

## Scope

* Agent Firewall + Incident Journal as product surfaces for governance and auditability.
* Security Agent reference workflow for SOC-style OSINT/SYNINT triage into IntelGraph.
* Model/cost/energy-budget observability for multi-model routing.
* Documentation positioning for “agent-native OSINT/graph platform.”

## Claim Registry (Planned Elements)

| Planned element | Claim linkage |
| --- | --- |
| Agent Firewall (deny-by-default tool/data policy) | ITEM:CLAIM-02/04/06 + Summit-original |
| Incident Journal + exportable incident report bundle | ITEM:CLAIM-02/03/04 |
| Confined agent network sandbox mode + influence traces | ITEM:CLAIM-01 + Summit-original |
| Security Agent reference workflow (OSINT/SYNINT triage → IntelGraph) | Summit-original |
| Model/cost/energy-budget observability + multi-model routing hooks | ITEM:CLAIM-06 + Summit-original |
| Branch-protection drift detector extension | ITEM:CLAIM-08 + Summit-original |
| Docs: agent-native positioning + compliance narrative | ITEM:CLAIM-05/06/07 |

## Interop & Export Matrix

* Import: OSINT/SYNINT feeds → Switchboard (existing).
* Internal: Maestro workflow events → Incident Journal.
* Export: incident bundle JSON/JSONL + policy snapshot YAML (portable to GRC tooling).

## Non-goals

* Replacing a full SIEM/SOAR stack.
* Automated remediation against customer systems in v1.
* Claims of out-of-the-box legal compliance.

## Minimal Winning Slice (MWS)

“Summit can run a multi-agent workflow with a deny-by-default policy, produce an immutable incident journal (exportable bundle), and ship a security-agent reference playbook that writes auditable findings into IntelGraph.”

## Threat-Informed Requirements

1. **Tool abuse / unintended data exfiltration**
   * Mitigation: Agent Firewall allowlist with default deny.
   * Gate: policy regression tests.
   * Test: forbidden tool attempt is blocked and journaled.
2. **Untraceable agent actions**
   * Mitigation: append-only Incident Journal with `provenance.evidence_id` per action.
   * Gate: journal schema completeness checks.
   * Test: golden journal schema validation.
3. **Governance drift**
   * Mitigation: drift detector comparing required checks policy to branch protection.
   * Gate: scheduled workflow opens issue/PR or fails on drift.
   * Test: mocked mismatch unit test.

## Performance & Cost Budgets

* Journaling overhead: p95 < 25ms per action (JSONL append).
* Journal size: < 5MB per 1k actions (compact JSON).
* Observability: `metrics.json` must include model calls, token usage, estimated cost, and budget caps.

## Compliance-Enabling Artifacts

* Incident bundle export (summary + evidence + policy snapshot + deterministic stamp).
* Never-log list and redaction hooks for payloads.
* Deterministic evidence IDs for cross-system traceability.
