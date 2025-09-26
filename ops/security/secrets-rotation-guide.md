# Secrets Rotation Guide

This guide documents how Summit rotates application secrets using HashiCorp Vault in Kubernetes
and Docker secrets for local development environments.

## Prerequisites

- Vault server deployed with the Kubernetes auth method enabled and the policy in
  [`vault-policy.hcl`](./vault-policy.hcl) applied to the `intelgraph-prod` role.
- The Kubernetes objects defined in [`vault/intelgraph-vault-setup.yaml`](./vault/intelgraph-vault-setup.yaml)
  have been applied. These configure the agent injector config map, Vault CA, and the
  `vault-auth` service account bindings.
- Helm 3.12+ and `kubectl` configured for the target cluster.

## Rotating Production Secrets in Vault

1. **Write the new secret version** using Vault's KV v2 API. Versioning allows the
   existing pods to continue using the prior value until they are restarted.

   ```bash
   vault kv put secret/intelgraph/prod/api-gateway \
     postgres_uri="postgresql://app:NEWPASS@db.prod:5432/intelgraph" \
     postgres_user="app" \
     postgres_password="NEWPASS" \
     redis_uri="rediss://cache.prod:6379" \
     redis_password="CACHEPASS" \
     api_token="API-NEW-TOKEN"
   ```

2. **Force a rollout** of the workloads so that the Vault agent re-renders the injected
   templates. The Helm chart automatically annotates pods with
   `vault.hashicorp.com/agent-inject-status=update`, so restarting the deployment triggers
   the agent to download the latest version.

   ```bash
   helm upgrade intelgraph deploy/helm/intelgraph \
     --namespace intelgraph \
     --reuse-values
   ```

3. **Verify the new version** using Vault's metadata endpoint before removing previous
   versions.

   ```bash
   vault kv metadata get secret/intelgraph/prod/api-gateway
   ```

4. **Trim historical versions** after validation to limit blast radius and to comply with
   data retention requirements.

   ```bash
   vault kv metadata delete --versions=1 secret/intelgraph/prod/api-gateway
   ```

## Automating Rotation with Leases

- Configure short TTLs (e.g., 24 hours) on database credentials so that Vault automatically
  rotates the secrets. Update the backing database user or integrate Vault's dynamic database
  secrets engine to remove manual steps.
- Use Vault's `vault write sys/leases/renew` endpoint for long-lived sessions to avoid
  unexpected expirations during maintenance windows.
- Monitor the `vault_audit_log` for access anomalies and integrate alerts when rotations fail.

## Local Development Fallback with Docker Secrets

For engineers running services via `ops/docker-compose.yml`, Docker secrets provide a lightweight
stand-in when Vault is unavailable.

1. Create secret files under `ops/secrets/` (ignored by git) and populate the credentials:

   ```bash
   mkdir -p ops/secrets
   printf 'postgresql://dev:devpass@localhost:5432/intelgraph' > ops/secrets/postgres_uri
   printf 'bolt://neo4j:7687' > ops/secrets/neo4j_uri
   printf 'apikey-dev-token' > ops/secrets/api_token
   ```

2. Start the stack with the secrets overlay:

   ```bash
   docker compose -f ops/docker-compose.yml -f ops/docker-compose.secrets.yml up -d
   ```

   The overlay mounts the secrets at `/run/secrets/*` and exposes file-based environment
   hints (e.g., `POSTGRES_URI_FILE`) that mirror the Vault-injected files in Kubernetes.

3. When credentials change, update the files in `ops/secrets/` and restart the affected
   services:

   ```bash
   docker compose -f ops/docker-compose.yml -f ops/docker-compose.secrets.yml \
     restart prov-ledger sandbox
   ```

## Validation

- Run [`trivy-scan.sh`](./trivy-scan.sh) after rotations to ensure no hard-coded secrets or
  misconfigurations were accidentally introduced in manifests.
- Inspect pods with `kubectl describe pod` to confirm Vault annotations, injected files, and
  service account bindings.
