# Kubernetes Compliance Policies

These Rego policies back the automated Conftest checks in the security compliance
workflow. They enforce a minimal security baseline across rendered Helm
manifests:

- Containers must run as non-root, either via a pod-level security context or
  container-specific settings.
- Containers must set `readOnlyRootFilesystem: true` to harden the runtime
  surface area.
- Images must be pinned to a non-`latest` tag or digest to ensure immutability
  and repeatable deployments.

Extend this package with additional rules to meet workload-specific
requirements. Every rule emits human-readable `deny` messages consumed by the CI
pipeline.
