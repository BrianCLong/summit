# Supply Chain Artifacts Runbook

## Runbooks
* **Schema Validation Failure**: An artifact failed JSON schema validation due to invalid structure or an unsupported enum. Triage by testing schema output locally against AJV or equivalent.
* **Artifact Rendering Mismatch**: A new structure is generated that violates the evidence IDs requirement.
* **Deterministic Diff Regression**: A byte-stable schema test fails, suggesting timestamps or UUIDs slipped into `report.json` or `metrics.json`.
* **Policy Reason-Code Drift**: An unexpected or unrecognized reason-code returned in summary decisions or trust paths.

## Alerts
* Repeated invalid `report.json` output in CI.
* Missing `evidence_ids` properties in evaluation output.
* Sudden spikes in "unknown" trust policy decisions.
* Artifact emission latency regression crossing 20% compared to baseline.

## SLO Assumptions
* **99%** successful deterministic generation across valid inputs.
* Byte-stable artifacts for repeated and identical tests.
