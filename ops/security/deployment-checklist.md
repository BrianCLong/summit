# Secure Deployment Checklist

This checklist captures the hardening controls implemented in `ops/helm` and the steps to validate them before promoting a release. It aligns with restricted Pod Security Standards, mesh mTLS, cert-manager TLS, RBAC separation of duties, external-secrets, and audited operations.

## Control definitions

- **Namespace isolation**: optional namespace creation with Pod Security `restricted` labels, Istio revision pinning, and owner annotations to scope everything to a single trust domain.
- **RBAC separation**: dedicated Ops (`ops-admin`) and CI (`ci-deployer`) Roles/Bindings plus per-workload ServiceAccounts (`gateway`, `ui`, and `external-secrets`). Subjects can be scoped per namespace to avoid broad rights.
- **Service account hardening**: workloads default to non-root, read-only root filesystems, dropped capabilities, and shared `imagePullSecrets` for private registry access without embedding credentials.
- **Network isolation**: default-deny NetworkPolicy with limited ingress from same namespace and explicit monitoring/ingress namespaces.
- **mTLS enforcement**: namespace-wide `PeerAuthentication` set to `STRICT` with service-level DestinationRules pinned to ISTIO_MUTUAL.
- **Ingress TLS**: cert-manager annotations with configurable Issuer/ClusterIssuer, TLS secret name, and explicit host routing.
- **External-secrets**: ClusterSecretStore plus ExternalSecret objects referencing remote secret keys via the `external-secrets` service account; no inline secret material is stored in the chart.
- **Audit logging**: ConfigMap with API audit policy, retention, and size limits carried via annotations for downstream log processors.

## Controls delivered by the chart

- **Namespace isolation**: optional namespace creation with Pod Security `restricted` labels, Istio revision pinning, and owner annotations.
- **RBAC separation**: dedicated Ops (`ops-admin`) and CI (`ci-deployer`) Roles/Bindings plus per-workload ServiceAccounts (`gateway`, `ui`, and `external-secrets`).
- **Network isolation**: default-deny NetworkPolicy with limited ingress from same namespace and explicit monitoring/ingress namespaces.
- **mTLS enforcement**: namespace-wide `PeerAuthentication` set to `STRICT` with service-level DestinationRules pinned to ISTIO_MUTUAL.
- **Ingress TLS**: cert-manager annotations with configurable Issuer/ClusterIssuer, TLS secret name, and explicit host routing.
- **Secure pod defaults**: restricted securityContexts (non-root, read-only root FS, capabilities dropped) and plumbed `imagePullSecrets`.
- **External secrets**: `ClusterSecretStore` plus `ExternalSecret` objects referencing remote secret keys; no inline secret material is stored in the chart.
- **Audit logging**: ConfigMap with API audit policy, retention, and size limits carried via annotations for downstream log processors.

## Preflight validation steps

- [ ] **Render and lint**: `helm template ops/helm --namespace intelgraph-secure | kubeval --strict` (ensure API compatibility and namespace labels). The template now fails fast if inline secret values are present, guaranteeing chart-sourced YAML cannot leak credentials.
- [ ] **Namespace safety**: `kubectl get ns intelgraph-secure -o jsonpath='{.metadata.labels}' | jq` verifies PodSecurity and Istio labels; apply only with `--create-namespace` when desired.
- [ ] **ServiceAccount hardening**: `kubectl get sa gateway ui -n intelgraph-secure -o jsonpath='{.items[*].automountServiceAccountToken}'` should return `false false` (workloads) while `external-secrets` can remain `true` for provider auth.
- [ ] **RBAC bindings**: `kubectl auth can-i --as=system:serviceaccount:tekton-pipelines:ci-deployer create deployment -n intelgraph-secure` (CI) and equivalent for ops subjects.
- [ ] **Network policy**: `kubectl describe networkpolicy default-deny -n intelgraph-secure` confirms default-deny with explicit namespace allowances.
- [ ] **mTLS**: `istioctl authn tls-check gateway.intelgraph-secure.svc.cluster.local` (expect STRICT) and `istioctl x describe pod <pod>` to confirm sidecar injection.
- [ ] **Ingress TLS**: `kubectl describe ingress gateway -n intelgraph-secure` confirms cert-manager issuer annotation and bound TLS secret.
- [ ] **External-secrets wiring**: `kubectl get externalsecrets.gateway-config -n intelgraph-secure -o yaml | yq '.spec.secretStoreRef'` ensures remote references are used and no plaintext data exists; the rendered manifest requires `remoteRef.key` for every item.
- [ ] **Audit policy load**: `kubectl get configmap audit-policy -n intelgraph-secure -o yaml | yq '.metadata.annotations'` validates retention annotations and rule presence.
- [ ] **Logging retention**: ensure downstream log pipeline honors `audit.summit.dev/retention-days` and `audit.summit.dev/max-file-size-mb` annotations when shipping API audit logs.

## Compliance posture and expectations

- Pod Security: `restricted` level enforced via namespace labels; workloads run as non-root with immutable root filesystems.
- Identity and access: per-service ServiceAccounts bound to scoped Roles; ops has full namespace administration while CI is constrained to deployments and service wiring. ServiceAccount tokens are not automounted for workloads to minimize credential exposure.
- Data in transit: mTLS enforced by Istio; ingress TLS certificates issued by cert-manager with explicit issuers.
- Secrets management: exclusive use of external-secrets with JWT/IAM-backed auth; charts intentionally avoid embedding static secrets and will fail render if inline values are supplied.
- Auditability: Kubernetes audit policy and retention metadata published for downstream log shipping/rotation controls, with explicit annotations for retention and log sizing.

## Operational runbook fragments

- Rotate TLS issuer or secret name via `ingress.tls` values and re-run `helm upgrade --install`.
- Override external-secrets provider (e.g., GCP or Vault) by swapping the `secretStore.provider` block without chart code changes.
- Tighten network isolation by trimming `networkPolicy.allowedNamespaces` to the minimum ingress/monitoring namespaces in your cluster.
- Increase audit retention by editing `auditLogging.retentionDays` and syncing ConfigMap consumers (API server or log pipeline).
