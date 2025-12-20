# Kubernetes Hardening Guide

This guide documents the security controls baked into the Summit Helm chart (`ops/helm`) to deliver namespace isolation, strict service identity, encrypted transport, externalized secrets, and auditable operations.

## Namespace isolation and secure defaults

- **Dedicated namespace**: The chart can create the release namespace with `pod-security.kubernetes.io/enforce=restricted` and Istio revision labels to ensure restricted admission and sidecar injection boundaries.
- **Image provenance**: `imagePullSecrets` are plumbed into every workload so that private registries are consumed without leaking credentials into manifests.
- **Pod hardening**: Deployments default to non-root user/group IDs, drop all Linux capabilities, and enable read-only root filesystems to meet restricted Pod Security Standards.

## Identity, RBAC, and service accounts

- **Service accounts per workload**: `gateway`, `ui`, and `external-secrets` service accounts are created to bind workload identity to the minimal surface needed by each component.
- **Ops vs CI duties**: The `ops-admin` Role allows full namespace administration and is only bound to configured ops subjects. The `ci-deployer` Role limits CI pipelines to deployment and service wiring while allowing read access to supporting objects.
- **Cross-namespace bindings**: Subjects can be specified by kind/name/namespace to bind Tekton or GitHub Actions service accounts without broadening privileges.

## Mutual TLS and ingress encryption

- **Service mesh policy**: `PeerAuthentication` enforces `STRICT` mTLS for all workloads in the namespace; `DestinationRule` resources pin clients to `ISTIO_MUTUAL`.
- **Ingress TLS**: Ingress resources carry cert-manager issuer annotations and TLS secrets, ensuring edge traffic is encrypted and automatically rotated via your chosen Issuer/ClusterIssuer.

## External secrets and access policies

- **ClusterSecretStore**: A cluster-scoped store defines the upstream provider (AWS Secrets Manager by default) and the auth mechanism (JWT via the `external-secrets` service account), keeping access policies centralized.
- **Remote references only**: `ExternalSecret` definitions map remote keys/properties to Kubernetes secrets on demand; no inline secret material exists in chart templates.
- **Provider isolation**: Swap `secretStore.provider` to Vault/GCP while retaining the same access pattern to enforce least privilege.

## Audit logging and retention

- **Configurable policy**: An `audit-policy` ConfigMap ships audit stages, rule levels, and verb/resource filters, allowing cluster operators to load it directly into API server configs or log pipelines.
- **Retention metadata**: Annotations publish `retentionDays` and `maxFileSizeMB` so downstream collectors can honor rotation and storage policies.

## Compliance posture

- **Pod Security**: Restricted defaults enforced via namespace labels and pod-level securityContext settings.
- **Identity and access**: Per-service accounts with scoped Roles/Bindings separate ops administration from CI deployments.
- **Data in transit**: Service mesh mTLS and cert-manager-backed ingress TLS encrypt all east-west and north-south flows.
- **Secrets handling**: External-secrets mandates remote secret resolution; Helm renders no static secrets.
- **Auditability**: Audit policy and retention metadata ensure sensitive operations are captured and retained per policy.

## Preflight validation helpers

Run `ops/security/preflight-validate.sh` before promoting a release to verify mTLS, RBAC, ingress TLS annotations, Pod Security labels, audit logging metadata, and absence of inlined secrets in rendered manifests.
