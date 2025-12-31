# Auditability and Explainability Retention

This policy ensures every decision made by a learning artifact is traceable, explainable, and retained for the required period without jeopardizing privacy or compliance.

## Decision Traceability

Each decision record must capture:

- **Artifact version**: `artifact_id`, semantic version, and Git tag (`learning/<artifact_id>@<version>`).
- **Execution context**: Timestamp, environment, feature/prompt inputs (with PII minimization), and caller identity.
- **Outputs and confidence**: Predicted class/score/text, confidence or uncertainty estimates, and guardrail actions taken (e.g., refusals, truncations).
- **Policy path**: Which policies and guardrails were evaluated, including allow/deny decisions.
- **Human oversight**: Reviewer/approver identity for action-eligible flows; escalation ticket if overrides occur.

## Retention Rules

- **Evidence retention**: Keep evaluation reports, drift analyses, and promotion history for **minimum 24 months** or longer if mandated by contractual obligations.
- **Decision log retention**: Maintain actionable decision traces for **12 months** with privacy controls; aggregate/hashed views may extend longer for trend analysis.
- **Deletion handling**: When deletion is required, maintain a cryptographic tombstone with hash of the removed record, deletion rationale, requester, and approver.

## Explainability Expectations

- Provide model/prompt-level feature importances or salient factors when applicable; record the method used (e.g., SHAP, counterfactuals, rationale extraction).
- For prompts, capture the final rendered prompt, tool calls, and refusal reasoning.
- Ensure explanations are stored alongside the decision trace to enable auditor reconstruction without rerunning the model.

## Storage & Access Controls

- Store audit artifacts in append-only or write-ahead storage with integrity checksums; align with `decision-audit-retention.md`.
- Access requires role-based authorization with least privilege; sensitive inputs must be redacted or tokenized where possible.
- Periodic integrity scans compare stored checksums with recomputed hashes from retained artifacts; discrepancies trigger an incident per `agent-incident-response.md`.
