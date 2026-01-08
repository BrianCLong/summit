# Drift Detection & Remediation Runbook

## Detection Pipeline

1. **IaC Diff**: nightly `terraform plan -detailed-exitcode` + `kubectl diff` for Kubernetes resources.
2. **Runtime Snapshot**: export config from running pods (`/config/runtime.json`) and compare to git-tracked desired state.
3. **Severity**:
   - Info: non-prod only, harmless labels/annotations.
   - Warn: config deltas that don’t change security posture (e.g., log level) → ticket.
   - Critical: security controls, network policies, data retention; triggers PagerDuty.

## Response Steps

1. **Triage**: confirm drift is real (exclude expected changes) and classify severity.
2. **Containment**: for critical drift, freeze deployments in affected namespace via ArgoCD pause.
3. **Remediation**:
   - Apply IaC to re-converge using `terraform apply` or `kubectl apply --prune`.
   - If runtime change intentional, update source of truth and open PR referencing drift ID.
4. **Validation**: run smoke tests + health checks; verify metrics stabilized.
5. **Postmortem**: capture root cause, add guardrail (e.g., policy check) if needed.

## Controlled Drift Drill

- Staging introduces a mismatched `ConfigMap` value; detector should raise a warning within one cycle (<1h) and produce diff artifact.

## Contacts

- On-call: `#platform-oncall`
- Escalation: SRE manager after 2 hours unresolved critical drift
