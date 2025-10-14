# Intelgraph Helm Security Hardening Guide

This guide documents the production-grade security controls that back the `deploy/helm/intelgraph` chart and how to operate them.

## Service Accounts and RBAC

- Each enabled workload receives a dedicated Kubernetes ServiceAccount with automounting disabled by default.
- Namespaced Roles bind to those ServiceAccounts with the minimum verbs required to read configuration (`get`/`list` `ConfigMaps` and `Endpoints`).
- RBAC configuration is customisable per service through `.Values.common.serviceAccount` and individual `services.<name>.serviceAccount` overrides, including support for optional ClusterRoles when needed.

## Pod Security and Execution Context

- Pods run as non-root (`runAsUser`/`runAsGroup` `10001`), drop all Linux capabilities, and enforce read-only root filesystems with scratch `emptyDir` mounts for writable paths.
- A namespace labelling template enables Kubernetes Pod Security Standards at the `restricted` level for enforce/audit/warn gates.
- Security contexts propagate to canary rollouts to ensure staging workloads honour the same guardrails as production deployments.

## Network Policies

- Default deny ingress/egress policies isolate the namespace.
- Service-specific rules allow ingress only from explicitly configured ingress controller namespaces and optional same-namespace workloads.
- Inter-service communication is limited to declared application ports with room for additional overrides.
- Managed egress permits traffic solely to declared dependencies (PostgreSQL, Neo4j, Redis, OpenSearch, OTEL collector) plus optional HTTPS destinations.
- DNS egress to `kube-dns` is automatically configured; further destinations can be added through `networkPolicy.externalDestinations`.

## TLS and Certificate Management

- When ingress TLS is enabled and a cert-manager issuer is configured, the chart provisions a `Certificate` resource with configurable `duration`, `renewBefore`, and DNS Subject Alternative Names.

## Secret Management

- Optional integration with External Secrets Operator allows synchronising secrets from external stores. Configure `.Values.secretManagement.externalSecrets` to declare target secrets, secret stores, and refresh cadence.
- Container environment variables reference Kubernetes Secrets by name; no secret literals are baked into manifests.

## Resource Controls

- Every container has configurable CPU/memory requests and limits defined globally (`common.resources`) with service-level overrides where heavier workloads demand more capacity.

## Continuous Security Validation

- The Helm CI workflow installs and runs `kube-linter` against rendered manifests (default, dev, prod values) enforcing security checks for non-root execution, dropped capabilities, and immutable filesystems.

## Operational Recommendations

1. Review and, if necessary, tighten service-specific RBAC rules before deployment.
2. Align `networkPolicy.externalDestinations` with your cluster topology; remove the broad HTTPS rule once concrete CIDRs or selectors are known.
3. Configure External Secrets entries for every credential referenced in `.Values.external` to avoid manual secret provisioning.
4. Keep TLS issuer references in sync with the cluster's cert-manager installation.
5. Regularly inspect kube-linter reports surfaced in CI to catch regressions before promotion.

Refer to `values.yaml` for exhaustive configuration examples.
