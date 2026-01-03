# SOC Copilot

The SOC Copilot is an experimental service designed to assist security analysts by automating the initial phases of incident triage and response. It consumes security and audit signals from the Summit platform, correlates them into incident candidates, and proposes remediation playbooks.

## How it Works

1.  **Event Consumption**: The SOC Copilot consumes events from the append-only audit log, which is a tamper-evident and structured source of security-significant events.
2.  **Correlation**: A deterministic correlation engine groups related events into **Incident Candidates** based on factors like `trace_id`, `actor_id`, and time windows.
3.  **Recommendation**: For each Incident Candidate, a **Playbook Registry** recommends one or more remediation playbooks based on the nature of the incident.
4.  **Approval**: All recommendations are **proposal-only** by default. A security analyst must manually approve a recommendation via the API before any action can be taken.

## API Usage

The SOC Copilot API is available at `/api/soc`.

*   `GET /api/soc/incidents`: List all incident candidates.
*   `GET /api/soc/incidents/:id`: Get the details of a single incident candidate.
*   `GET /api/soc/incidents/:id/recommendations`: List the proposed recommendations for an incident.
*   `POST /api/soc/recommendations/:id/approve`: Approve a recommendation.

## Enabling Execution

By default, the SOC Copilot **cannot execute** any remediations. To enable execution, the `SOC_COPILOT_EXECUTION_ENABLED` environment variable must be set to `true`. Even when enabled, all executions are still subject to the standard policy and killswitch mechanisms of the Summit platform.
