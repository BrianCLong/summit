# Rollback Runbook

## Overview

This runbook defines the production rollback sequence for release changes. Use this together with `docs/runbooks/release-rc-readiness.md` for pre-cut rehearsal and evidence requirements.

## Rollback Triggers

- Canary SLO violation (error rate > 1% or latency p95 > 1s).
- Synthetic probe failure in canary environment.
- Critical defect confirmed by release captain or incident commander.

## Immediate Actions

1. Stop active promotion pipeline.
2. Shift traffic to stable version.
3. Validate stable service health.
4. Capture rollback evidence and incident references.

## Execution Steps

1) Pause promotion and identify stable target revision.

2) Perform rollback:

```bash
bash scripts/rollback_deployment.sh <release> <namespace>
```

3) If canary controls are in use, execute canary rollback playbook:

```bash
bash scripts/release/canary-rollback-playbook.sh --help
```

4) Validate rollback:

```bash
bash scripts/validate-rollback.sh --verify-service-health --confirm-customer-access --detailed
```

## Post-Rollback Evidence (required)

- rollback command transcript
- validation output from `scripts/validate-rollback.sh`
- proof that stable revision is serving production traffic
- incident timeline entry referencing rollback start and completion

## Exit Criteria

Rollback is complete only when all criteria are met:

- traffic fully restored to stable revision
- health checks are green for 15 minutes
- critical-path smoke checks pass
- incident commander confirms customer impact is mitigated

## Follow-through

- Open or update incident report with root-cause hypothesis.
- Mark bad release version as blocked from promotion.
- Schedule remediation and re-release validation.
