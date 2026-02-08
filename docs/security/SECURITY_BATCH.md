# Security Batch Runbook

**Purpose:** Standardize recurring security batch sprints for dashboard triage, CIS benchmark
validation, and remediation intake.

## References

- Primary playbook: [SECURITY_BATCH_1_PLAYBOOK.md](SECURITY_BATCH_1_PLAYBOOK.md)
- CIS benchmark guidance: [SECURITY_CIS.md](SECURITY_CIS.md)
- Security pipeline controls: [security-pipeline.md](security-pipeline.md)

## Execution Steps

1. **Open the Security Batch issue** using the `Security Batch` issue template.
2. **Review GitHub Security Dashboard** (`/security/code`):
   - Triage all high/critical alerts.
   - Link each alert to a follow-on issue labeled `lane:security`.
3. **Run CIS benchmark validation** using the CIS runbook and capture evidence artifacts.
4. **Verify CI health** for `.github/workflows/ci.yml` on touched components.
5. **Record outcomes** in the batch issue:
   - Evidence links
   - Exceptions (if any) as governed exceptions
   - Follow-on issue links

## Acceptance Criteria

- No open high/critical alerts in GitHub `security/code` view.
- Latest CIS benchmark run ≤ 7 days old and archived.
- CI green for `ci.yml` on touched components.
- Follow-on issues created and labeled `lane:security`.

## Escalation

Escalate unresolved high/critical alerts to Security Leadership and Release Captain per
[SECURITY_OPERATIONS.md](SECURITY_OPERATIONS.md).
