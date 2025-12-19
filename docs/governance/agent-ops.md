# Agent Operations Framework

This document is the canonical operating procedure for AI and human agents working within the Jules governance framework. It codifies how agents are provisioned, run, monitored, and retired so that every execution remains auditable, reversible, and aligned to Tier-4 controls.

## Objectives
- Provide a single source of truth for day-to-day agent operations.
- Ensure actions are bounded by explicit permissions, logged with provenance, and recoverable through change management.
- Standardize coordination across engineering, security, and governance stakeholders.

## Roles and Responsibilities
- **Agent Owner:** Accountable for outcomes, safety, and alignment to mandates; maintains runbooks and validation suites.
- **Operator:** Executes runs, monitors health signals, and halts activity on any policy breach.
- **Approver:** Grants execution approval for Tier-3+ scopes; verifies safeguards and rollbacks are in place.
- **Governance Steward:** Confirms compliance with the Constitution, Rulebook, and Permission Tiers; ensures evidence is captured.
- **Incident Commander (on-call):** Leads incident response for any agent-caused impact (see `agent-incident-response.md`).

## Operating Lifecycle
1. **Request:** Define scope, inputs, data boundaries, and success criteria; map to a Permission Tier.
2. **Plan:** Select model/tooling, risk mitigations, and observability. For Tier-3+ include rollback plan and dry-run proof.
3. **Approval:** Obtain documented approval per `permission-tiers.md` before execution. Attach evidence to the change record.
4. **Execute:** Run in the least-privilege context with immutable logging enabled. Prefer pre-production environments first.
5. **Validate:** Compare outputs against acceptance criteria; perform policy and safety checks (PII, data residency, redaction).
6. **Publish:** Promote results through change management, ensuring artifacts are versioned and reproducible.
7. **Retire:** Close the run record, archive logs/telemetry, and update lessons-learned in the service inventory.

## Guardrails and Controls
- **Least Privilege:** Every agent must operate with the minimal permissions necessary, scoped by data domain and time-bound tokens.
- **Provenance:** Capture full input/output traces, model versions, prompts, and tool calls. Store in tamper-evident audit storage.
- **Safety Filters:** Enforce content and policy filters on ingress/egress, including PII redaction, classification, and DLP checks.
- **Separation of Duties:** Approver and Operator cannot be the same person for Tier-3+ runs.
- **Change Windows:** Tier-4 changes restricted to approved windows with on-call coverage and rollback readiness.
- **Data Residency:** Respect dataset residency and contractual constraints; document any cross-region access.

## Execution Checklist
- [ ] Scope mapped to Permission Tier and noted in the run ticket.
- [ ] Dependencies validated (model versions, connectors, credentials) with expirations documented.
- [ ] Observability configured: traces, metrics, structured logs with correlation IDs.
- [ ] Dry-run executed in pre-production with expected vs. actual comparison.
- [ ] Rollback/kill-switch tested; owners and on-call rotations notified.
- [ ] Security review completed for new tools or plugins.
- [ ] Post-run validation and evidence archived.

## Change Management
- **Records:** Every run must reference a ticket/change request capturing scope, risk rating, approvals, and links to artifacts.
- **Versioning:** Store prompts, code, and configuration in version control; tag releases with semantic versions.
- **Rollbacks:** Maintain reversible migrations, configuration snapshots, and feature toggles for rapid disablement.
- **Approvals:** Follow the matrix in `permission-tiers.md` for who must approve and how evidence is logged.

## Observability and Reporting
- **Health Signals:** Monitor latency, error rate, tool-call failure rate, and guardrail hits per run.
- **Anomalies:** Auto-page on unusual access patterns, elevated redaction counts, or divergence from baseline output quality.
- **Run Reports:** Summaries must include scope, duration, data touched, deviations, mitigations, and approvals.
- **Escalation:** Any policy breach triggers the workflow in `agent-incident-response.md`.

## Continuous Improvement
- Conduct quarterly retros on agent incidents, near-misses, and false positives.
- Update playbooks to reflect new tools or governance requirements.
- Validate detectors and guardrails against adversarial inputs and drift scenarios.
- Track and publish KPIs: change success rate, MTTR for agent faults, and guardrail coverage.
