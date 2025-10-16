# Maestro One-Click Deploys

This guide documents one-click commands to deploy Maestro to staging or production with pinned images, admission policies, rollout gating, and witness evidence.

## Prerequisites

- Cluster access configured for your shell (`kubectl` points at the target cluster)
- Controllers installed: `make prereqs` (Argo Rollouts, Gatekeeper, Kyverno)
- Policies applied: `make gatekeeper-apply` (and `make kyverno-apply` if Kyverno installed)
- Registry access: If GHCR is private, create a pull secret in `maestro` and set `imagePullSecrets` in Helm values
- Secrets configured: `maestro-secrets` in namespace `maestro` (DB/Redis, OIDC, API keys, PD key)

## One-Click Commands

- Staging (provide image `TAG` or `IMMUTABLE_REF`):

```
make oneclick-staging TAG=<git-or-image-tag>
# or
make oneclick-staging IMMUTABLE_REF=ghcr.io/brianclong/maestro-control-plane@sha256:...
```

- Production (same digest as staging):

```
make oneclick-prod TAG=<git-or-image-tag>
# or
make oneclick-prod IMMUTABLE_REF=ghcr.io/brianclong/maestro-control-plane@sha256:...
```

The command sequence:

- Installs/validates controllers (Rollouts, Gatekeeper, Kyverno)
- Applies Gatekeeper constraints and Kyverno verify policy
- Resolves digest from `TAG` (or uses `IMMUTABLE_REF`)
- Applies Argo Rollout services/ingress and sets the rollout image to the pinned digest
- Waits for rollout and runs a witness bundle (policy deny evidence, rollout snapshot, optional Grafana/PD)

## CI/CD

- Auto-pin and deploy orchestrator: `.github/workflows/auto-pin-and-deploy.yml`
- CD pipeline: `.github/workflows/cd.yml` supports `no_op=true` for safe dry runs and renders the Rollout analysis PROM address per environment.
- Strict cosign verify: Enabled in CD; Kyverno admission also verifies signed images.

## OIDC

- Provide OIDC values as GitHub secrets/vars (staging/prod) to have CD render and apply `infra/k8s/auth/oidc-auth.tmpl.yaml`.
- For manual apply: render with `envsubst` using your OIDC envs and apply to the cluster.

## Troubleshooting

- Gatekeeper denies unpinned or missing annotations: check `kubectl -n gatekeeper-system logs deploy/gatekeeper-controller-manager`.
- Cosign verify failures in CD: confirm you are signing in the build and subjects match Kyverno attestors.
- Rollout analysis stalls: verify Prometheus address and query labels.
