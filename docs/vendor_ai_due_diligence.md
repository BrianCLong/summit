# Vendor AI Due Diligence (Summit)

This kit provides the required artifacts and checklists for evaluating AI vendors and features, aligning with Verdantix adoption and trust framework.

## Required artifacts (deny-by-default if missing)
- **Model Card**: Based on `templates/model_card.md`.
- **Audit Log Spec**: Must define structured events and sample exports.
- **Sandbox Statement**: Documentation of containment for agentic functions.
- **Human Oversight Controls**: Explicit definition of approval checkpoints.
- **Data Handling**: Specification of "never-log" fields and retention policy.

## Evidence IDs
- `EVD-VERDANTIX-EHS-AI-GOV-001`: Vendor artifacts complete and verified.

## Procurement Checklist
1. [ ] Risk assessment (`governance/risk.json`) completed for the use case.
2. [ ] Vendor provides a sandboxed evaluation environment.
3. [ ] Audit events are compatible with `summit/governance/audit.py`.
4. [ ] Discrimination risk assessment (`governance/discrimination_risk.json`) completed if applicable.
