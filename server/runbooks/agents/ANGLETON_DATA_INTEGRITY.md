Angleton (Data Integrity) Runbook

Scope: counter‑deception, anomaly mapping, trust scoring. Defensive only.

Prechecks
- Confirm FEATURE_AGENT_ANGLETON=true for the environment.
- Verify policy pack v0 loaded and signature valid.
- Ensure redaction rule server/redaction/rules/angleton.json is present.

Workflow
1) Receive RiskSignal (kind=anomaly) via GraphQL or ingest.
2) Auto‑create IncidentBundle with evidence pointers.
3) Redact inputs per Angleton rule; quarantine high‑risk items.
4) Request corroboration from independent sources; attach to bundle.
5) Publish Evidence bundle (publishEvidence) with SLO snapshot and reasons.

Rollout Gates
- evidenceOk must be true for affected services before promotion.

KPIs
- Precision/recall of anomaly flags; false negative trend
- Time‑to‑quarantine; percent redacted

Backout
- If high false positives: dampen sensitivity, require 2‑source corroboration.

