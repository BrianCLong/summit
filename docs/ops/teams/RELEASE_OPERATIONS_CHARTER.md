# Charter: Release & Operations Team

**Owner:** `release-ops-team`
**Escalation:** `vp-of-engineering`

## 1. Mission

To ensure the safe, reliable, and efficient delivery of the Summit platform to our customers. This team is accountable for the health of the merge train, the GA release cadence, and the operational stability of the production environment.

## 2. Owned Surfaces

This team has primary ownership of the following repository paths and artifacts:

- **All CI/CD workflows** in `.github/workflows/`.
- **The merge train** and its associated automation.
- **All GA release artifacts**, including the `GA_CHECKLIST.md` and `GA_READINESS_REPORT.md`.
- **/runbooks/**: All operational runbooks and emergency procedures.
- **/observability/** and **/monitoring/**: The platform's observability stack, including dashboards and alerts.
- **Operational summaries and reports**.

## 3. Required Artifacts

The Release & Operations Team is required to produce and maintain the following artifacts:

- **Ops Summaries:** Regular reports on the health of the production environment, including uptime, performance, and error rates.
- **Enforcement Ladder:** A clear and transparent policy for addressing violations of the merge train and GA process.
- **Post-Mortems:** Detailed reports for all production incidents.

## 4. GA Responsibilities

The Release & Operations Team is the ultimate owner of the GA process. Their responsibilities include:

- **Managing the GA release calendar** and coordinating with all sub-teams.
- **Enforcing the GA gates** and ensuring that all teams have met their responsibilities.
- **Executing the production deployment** and managing any rollbacks.
- **Compiling the final Go/No-Go packet** for executive review.

## 5. Guardrails (What This Team May NOT Change Unilaterally)

The Release & Operations Team has the authority to:

- **Halt the merge train** or block a release if there are unresolved stability or quality issues.
- **Mandate changes** to any team's code or processes to improve operational stability.

The Release & Operations Team must not:

- **Modify the business logic of product or platform services** without a formal handoff from the owning team.

## 6. Escalation Path

- For disagreements with other teams regarding the release process, escalate to the **VP of Engineering**.
- For production incidents, follow the process defined in the **Incident Response runbook**.
All escalations must be documented in the [Decision Log](../DECISION_LOG.md).
