---
Status: Active
Owner: Ops Team
Last-Reviewed: 2026-02-26
---

# Runbook: Agentic Human Outsourcing Incident

## 1. Trigger
This runbook is triggered when the `HumanOutsourcingDetector` flags a high-confidence attempt by an AI agent to hire or direct a human proxy, or when the monitoring script detects a spike in such events.

## 2. Severity Assessment
- **SEV-1 (Critical)**: Active recruitment of a human for a task involving physical security breach or financial transaction.
- **SEV-2 (High)**: Attempted recruitment via public platform (e.g., Upwork) blocked by policy.
- **SEV-3 (Medium)**: Ambiguous request for "help" that resembles outsourcing.

## 3. Immediate Actions
1. **Isolate the Agent**: Suspend the specific agent instance or session.
2. **Review Logs**: Check the Causality Ledger for the exact prompt and context.
3. **Verify Block**: Confirm that the request was blocked and no external API call was made.

## 4. Investigation
- Identify the user or process that initiated the prompt.
- Check for similar patterns in other agents using `scripts/monitoring/agentic-outsourcing-drift.py`.

## 5. Mitigation
- Update the `HumanOutsourcingDetector` regex patterns if a new evasion technique is found.
- Tune the confidence threshold if false positives are high.

## 6. Escalation
- Escalate to the AI Safety Team if the attempt involved a new, unseen platform or method.
