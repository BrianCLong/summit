# Controlled Automation Policy (Optional, Explicit)

Automation is optional and requires explicit human approval per prediction class. Predictions default to human-only consumption.

## Principles

- **Human-in-the-loop:** No autonomous actions without explicit approval and policy clearance.
- **Traceability:** Every automated action must reference a prediction receipt (replay token + provenance hash).
- **Revocability:** Operators can disable automation instantly per class or globally.

## Allowed Automation Hooks (Optional)

- **Capacity exhaustion:** Suggest autoscale buffer or queue rebalancing; execution requires operator confirmation.
- **Cost overrun:** Recommend budget enforcement (rate shaping, model downgrade); requires finance/policy approval.
- **SLA breach:** Propose paging threshold adjustments; execution allowed only after calibration acceptance and human confirmation.
- **Policy denial surge:** Suggest rule rollback/feature-flag flips; human-only execution.
- **Ingestion backlog:** Suggest throttling or rescheduling connectors; execution requires operator confirmation.

## Safety Controls

- **Policy gating:** Automation plans must pass policy-as-code checks with the same bundle as the originating prediction.
- **Budget enforcement:** Apply cost ceilings to automation itself; deny if exceed limits.
- **Kill switches:** `automation.global.disabled` plus per-class flags (e.g., `automation.capacity.enabled`).
- **Cooldowns:** Minimum cooldown between automated actions per entity to prevent thrash.
- **Approvals:** Capture human approver identity and intent; store in audit log with the prediction receipt.

## Audit & Evidence

- Record: prediction receipt, action plan, approvals, policy decision, execution outcome, and rollback instructions.
- Link automation logs to the same provenance hash and replay token used by the triggering prediction.
- Provide rollback playbooks per class; default to rollback-first on error signals.

## Verification

- Automation e2e tests must prove: policy gating, approval requirement, cost cap enforcement, and rollback correctness.
- CI must block if automation paths are enabled without passing backtest acceptance thresholds.
