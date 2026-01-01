# Runbook: Secret Rotation

This runbook outlines the process for rotating secrets and keys for tokens and connectors.

## 1. Identify the Secret to Rotate

- **Secret Name:** [e.g., `KAFKA_BROKER_API_KEY`]
- **Service(s) Affected:** [e.g., `streaming-ingest`, `auth-service`]
- **Reason for Rotation:** [e.g., `Quarterly rotation policy`, `Potential compromise`]

## 2. Generate a New Secret

- Use the appropriate tool (e.g., Vault, AWS Secrets Manager) to generate a new secret.
- **New Secret Version/ID:** [e.g., `v2`, `arn:aws:secretsmanager:...`]

## 3. Deploy the New Secret

- Deploy the new secret to the environment, but do not yet activate it.
- This may involve updating Kubernetes secrets, environment variables, or a configuration service.
- **Verification:** Ensure the new secret is present in the environment and accessible by the affected services.

## 4. Activate the New Secret (Staggered Rollout)

- Use the secret rotation API to activate the new secret for one or more services.
- **API Call:**
  ```bash
  curl -X POST https://api.intelgraph.com/v1/admin/secrets/rotate \
    -H "Authorization: Bearer <ADMIN_TOKEN>" \
    -d '{
          "secretName": "KAFKA_BROKER_API_KEY",
          "newVersion": "v2",
          "services": ["streaming-ingest"]
        }'
  ```
- **Health Checks:** Monitor the health of the affected services closely after activating the new secret.
- **Rollback:** If any issues are detected, immediately roll back to the previous secret version using the API.

## 5. Decommission the Old Secret

- Once the new secret has been active for a sufficient period (e.g., 24 hours) and all services are stable, decommission the old secret.
- This may involve deleting the old secret from the secret store or marking it as inactive.
- **Verification:** Ensure the old secret is no longer in use and cannot be accessed.
