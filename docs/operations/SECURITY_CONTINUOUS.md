# Security & Compliance Maintenance

Security hygiene is routine, measurable, and auditable. Controls are expressed as policy-as-code,
and evidence is regenerated on cadence to prevent drift.

## Routine Security Hygiene

| Cadence | Activity                | Evidence                               | Owner      |
| ------- | ----------------------- | -------------------------------------- | ---------- |
| Weekly  | Dependency review       | Vulnerability report + mitigation plan | SecOps DRI |
| Monthly | Secrets rotation checks | Rotation logs + stale secret count     | Infra DRI  |
| Monthly | Access review           | RBAC diff + dormant account list       | IAM DRI    |
| Monthly | Surface reduction       | Disabled endpoints + CSP/CORS checks   | AppSec DRI |

## Compliance Refresh

- **Evidence regeneration (monthly):** Re-run control checks, collect attestations/logs, and store
  in evidence catalog with timestamps.
- **Drift alerts on controls:** Use policy-as-code to alert on config drift (IaC diff, failed evals).
- **Runbook alignment:** Each control has an owner, test, and remediation play; update runbooks on change.

## Policy-as-Code Expectations

- Controls must be machine-readable with pass/fail outcomes.
- Any exception requires an approval record with expiry.
- Evidence references must include timestamp, control ID, and owner.

## Reporting & Escalation

- Weekly summary of findings, remediations, and exceptions sent to the security council.
- High/critical findings trigger immediate advisory with containment steps and rollback guidance.
- Track Mean Time to Remediate (MTTR) with quarterly improvement targets.
