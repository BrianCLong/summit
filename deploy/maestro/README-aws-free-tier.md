Maestro — Zero-Cost AWS Free Tier Deployment (Option A)

This guides you to deploy dev, staging, and production using the existing one-shot script while staying at $0 using AWS Free/Always-Free tiers.

Prerequisites

- Tools: `aws`, `kubectl`, `helm`, `docker`, `git`, `jq`, `curl`, `openssl`.
- AWS: `aws configure` with a free-tier account.
- GHCR: Personal Access Token with `write:packages` scope.

Quick Start

1. Log in to GHCR

```
echo $GHCR_PAT | docker login ghcr.io -u <github_user> --password-stdin
```

2. Export environment variables

```
export ROOT_DOMAIN=intelgraph.io                # or your domain
export GITHUB_USERNAME=<your_gh_username>
export GITHUB_REPO=intelgraph
```

3. Pre-create K8s secrets (idempotent)

```
bash deploy/maestro/bootstrap-secrets.sh
# Optionally provide fixed tokens:
# MAESTRO_API_TOKEN_DEV=... MAESTRO_API_TOKEN_STAGE=... MAESTRO_API_TOKEN_PROD=... \
#   bash deploy/maestro/bootstrap-secrets.sh
```

4. Launch dev → staging → production

```
bash deploy/go-live-now.sh
```

Outputs and Next Steps

- Dev access: `kubectl port-forward svc/maestro-dev 8080:8080 -n maestro-dev`
- Staging URL: `https://staging.$ROOT_DOMAIN`
- Prod URL: `https://maestro.$ROOT_DOMAIN`
- If prompted, validate ACM DNS records for CloudFront; then point your DNS to the distribution per the script’s output.

Troubleshooting

- Missing tools: install via `brew` (macOS) or `apt` (Ubuntu); the script prints exact commands.
- Helm fails on missing secrets: re-run step (3) to ensure `maestro-secrets` exists in `maestro-staging` and `maestro-prod`.
- Ingress pending: wait for the LB to provision; verify `kubectl get ingress -A` and security group rules allow 80/443.

Notes

- The Helm chart reads `maestro-secrets` for `MAESTRO_API_TOKEN` and optional `BASE_URL`.
- Resource requests/limits are tuned for free-tier instance sizes; scale via `kubectl scale` as needed.
