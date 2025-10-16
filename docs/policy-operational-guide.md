# Policy Operational Guide

## Installing Gatekeeper vs Kyverno

- Choose one. If Gatekeeper installed, apply `k8s/policy/gatekeeper/*`.
- If Kyverno, apply `k8s/policy/kyverno/*` and remove Gatekeeper templates.

## Rollout Strategy

1. Start with `dry-run` (audit) by setting `enforcement_action: dryrun` (Gatekeeper) or `validationFailureAction: Audit` (Kyverno).
2. Monitor `gatekeeper_violations` (or Kyverno metrics) for 48h.
3. Switch to `enforce` and add Prometheus alert `GatekeeperViolations`.

## Exceptions

- Use `docs/policy-exceptions.md` with expiry ≤7 days.
- Label exception namespaces/pods; update alert rules to page on presence of exceptions > 0.
