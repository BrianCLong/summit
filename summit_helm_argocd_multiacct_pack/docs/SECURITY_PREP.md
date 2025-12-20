# Summit Helm Security & Compliance Playbook

This guide captures the hardening defaults added to the Summit Helm chart and the steps to validate them before every deployment. The intent is to keep workloads isolated per namespace, enforce TLS everywhere, protect secrets with external stores, and document auditability for compliance.

## Controls Overview

- **Namespace isolation & Pod Security**: The chart can create and label dedicated namespaces with Pod Security Admission set to `restricted` and mesh/ingress labels applied automatically.
- **Service accounts & RBAC**: Separate service accounts for the application, operations, and CI delivery pipelines with least-privilege Roles/Bindings.
- **mTLS everywhere**: Istio `PeerAuthentication` and `DestinationRule` enforce STRICT/ISTIO_MUTUAL traffic for in-mesh communication.
- **Ingress TLS**: NGINX ingress backed by cert-manager `Certificate` objects to guarantee HTTPS entrypoints.
- **Secure runtime defaults**: Non-root execution, `RuntimeDefault` seccomp, read-only root filesystems, and explicit imagePullSecrets wiring.
- **External secrets only**: External Secrets operator wiring for AWS Secrets Manager (fail-fast on unsupported providers) with no inline secrets permitted for sensitive env vars.
- **Audit logging**: Opinionated audit policy ConfigMap with retention knobs to feed control-plane or sidecar collectors.

## Preflight Validation Checklist

- **Prereqs**
  - External CRDs present: `kubectl get crd externalsecrets.external-secrets.io secretstores.external-secrets.io certificates.cert-manager.io peerauthentications.security.istio.io destinationrules.networking.istio.io`.
  - Mesh sidecar injector and cert-manager webhooks are healthy.
  - Namespace target exists or is allowed to be created by the release service account.

- **Chart config**
  - `values.yaml` or env overrides set `namespace.name`, `ingress.hosts[*].host`, and `ingress.tls.clusterIssuer` per environment.
  - RBAC service account names are unique per env (`summit-*-ops`, `summit-*-ci`) to avoid binding collisions.
  - If using AWS Secrets Manager, `externalSecrets.enabled=true` with a non-empty `secretStore.roleArn`; otherwise disable External Secrets until credentials are in place.
  - Validate no inline sensitive env vars: the chart fails if env names containing `secret|token|password|key` are paired with `value` instead of `valueFrom`/ExternalSecret.

- **Security controls**
  - `kubectl get ns <target>` shows PSA labels `pod-security.kubernetes.io/enforce=restricted`.
  - `kubectl get peerauthentication -n <target>` returns STRICT mode.
  - `kubectl describe certificate summit-*-tls -n <target>` shows a ready status before cutting traffic.
  - Audit ConfigMap `summit-audit-policy` rendered in the target namespace with the desired retention settings.

## Deployment Steps with Validation Gates

1. `helm lint` and `helm template` with the environment values to ensure no schema failures (inline secret guardrails and provider validation will hard fail templating).
2. Apply/verify namespace creation and PSA labels: `kubectl apply -f <(helm template ... --show-only templates/namespace.yaml)`.
3. Deploy cert-manager issuers/ClusterIssuers ahead of the Helm release; confirm issuance with `kubectl get certificate`.
4. Roll out Helm release; check service mesh mTLS status via `istioctl authn tls-check <pod> <service>.<namespace>.svc.cluster.local`.
5. Validate ExternalSecret sync: `kubectl describe externalsecret summit-external-secret -n <target>` shows `Synced=True` without storing any secret material in values files.
6. Confirm audit log forwarding: mount/use `summit-audit-policy` in control-plane audit pipelines or sidecar collectors and verify retention matches policy.

## Compliance Posture (summary)

- **Identity & access**: Namespaced RBAC and distinct service accounts for app/ops/CI align with separation of duties and least privilege.
- **Network security**: Mandatory mTLS in the mesh and HTTPS ingress satisfy encryption-in-transit requirements.
- **Data protection**: Secrets only flow from external secret stores; charts fail on suspected inline secret usage.
- **Platform hardening**: PSA restricted, seccomp `RuntimeDefault`, non-root pods, and no privilege escalation meet container baseline controls.
- **Auditability**: Kubernetes audit policy with configurable retention supports SOC2/ISO 27001 evidence generation.

Keep this document with release runbooks so security sign-off can be completed alongside functional verification.
