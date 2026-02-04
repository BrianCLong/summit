# Kubernetes Admission Threats

## Bypass
- **Unlabeled Namespace**: Attackers can deploy to non-enforced namespaces.
  - Mitigation: Use Gatekeeper to enforce label presence or default deny.
- **Sidecars**: Policy Controller validates pods. Sidecars are images too, so they are checked if they match the glob.

## Resilience
If Policy Controller is down, `failurePolicy: Fail` (default in our values) prevents pod creation.
Ensure HA deployment for production.
