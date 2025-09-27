Harel (Protective Ops) Runbook

Scope: disruption of harmful networks (legal), rapid shields, case bundles.

Prechecks
- FEATURE_AGENT_HAREL=true
- Redaction rule server/redaction/rules/harel.json loaded
- Partner contacts and reporting templates updated

Workflow
1) Raise RiskSignal (severity HIGH/CRITICAL) when abuse patterns emerge.
2) Create IncidentBundle; auto‑attach preservation requests & shield rules.
3) Notify stakeholders; coordinate with Trust & Safety partners.
4) Track remediation; close with evidence bundle and audit log.

Rollout Gates
- Halt risky deployments on evidenceOk=false for impacted services.

KPIs
- Time‑to‑shield; repeat abuse reduction; false positive control

Backout
- Roll back shields that over‑block; whitelist critical flows.

