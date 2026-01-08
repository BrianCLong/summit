# Secrets Rotation Playbook

This document outlines the procedures for rotating secrets to enhance security and mitigate risks associated with compromised credentials.

## 1. Classes of Secrets

Secrets are categorized based on their usage and criticality.

| **Class**             | **Description**                                                             | **Examples**                                                  |
| :-------------------- | :-------------------------------------------------------------------------- | :------------------------------------------------------------ |
| **CI/CD**             | Secrets used in Continuous Integration and Continuous Deployment pipelines. | `GITHUB_TOKEN`, `NPM_TOKEN`, `SONAR_TOKEN`, `WEBHOOK_URLS`    |
| **Infrastructure**    | Secrets for accessing and managing infrastructure components.               | `KUBECONFIG`, `SSH_KEY`, `DB_PASSWORD`                        |
| **API Keys**          | Keys for accessing third-party services and internal APIs.                  | `MC_API_TOKEN`, `DATADOG_API_KEY`, `OPENAI_KEY`               |
| **Local Development** | Secrets used for local development environments.                            | Database credentials and API keys in `server/config/app.yaml` |

## 2. Recommended Rotation Cadence

| **Class**             | **Cadence**    | **Rationale**                                                              |
| :-------------------- | :------------- | :------------------------------------------------------------------------- |
| **CI/CD**             | Every 90 days  | Limits the window of opportunity for attackers if a secret is compromised. |
| **Infrastructure**    | Every 90 days  | Reduces the risk of unauthorized access to critical infrastructure.        |
| **API Keys**          | Every 180 days | Balances security with the operational overhead of updating keys.          |
| **Local Development** | As needed      | Secrets are for non-production environments and can be rotated on-demand.  |

## 3. Rotation Procedures

### 3.1. CI/CD Secrets (GitHub Actions)

1.  **Generate a new secret:** Create a new token or key from the respective service (e.g., npm, SonarQube).
2.  **Update the secret in GitHub:**
    - Navigate to the repository's **Settings > Secrets and variables > Actions**.
    - Click **New repository secret**.
    - Add the new secret with a temporary name (e.g., `NPM_TOKEN_NEW`).
3.  **Update workflows:**
    - In a new branch, update the relevant `.github/workflows/` files to use the new secret.
    - Open a pull request with the changes.
4.  **Verify the new secret:**
    - Merge the pull request and monitor the CI/CD pipelines to ensure they run successfully.
5.  **Remove the old secret:**
    - Once the new secret is verified, delete the old one from GitHub Actions secrets.

**Rollback:**

- If a workflow fails, revert the pull request or update the workflow to use the old secret.

### 3.2. Infrastructure Secrets (Kubernetes)

This procedure focuses on secrets managed via `SealedSecrets` or a similar Kubernetes secrets management solution.

1.  **Generate a new secret:**
    - Create a new password or key.
2.  **Encrypt the new secret:**
    - Use `kubeseal` to create a new `SealedSecret` manifest.
3.  **Apply the new secret:**
    - Apply the new `SealedSecret` manifest to the cluster: `kubectl apply -f new-secret.yaml`.
4.  **Trigger a rolling restart:**
    - Update the deployment to use the new secret and trigger a rolling restart of the affected pods.
5.  **Verify the new secret:**
    - Monitor the application logs to ensure there are no authentication errors.
6.  **Remove the old secret:**
    - If the old secret is stored in a version control system, remove it.

**Rollback:**

- Revert the deployment to the previous version to use the old secret.

### 3.3. API Keys

The process for rotating API keys is similar to CI/CD secrets.

1.  **Generate a new API key** from the service provider.
2.  **Update the key in the secret store** (e.g., AWS Secrets Manager, GitHub Actions secrets).
3.  **Deploy the application** to use the new key.
4.  **Verify** that the application functions correctly with the new key.
5.  **Decommission the old key** once the new key is verified.

### 3.4. Local Development Secrets

Local development secrets are managed in the `server/config/app.yaml` file, which is not checked into version control.

- To rotate a secret, update the value in your local `app.yaml` file.
- Distribute the new secret to the team through a secure channel (e.g., a password manager).

## 4. Verification

- **Monitor application logs** for authentication or connection errors after a secret has been rotated.
- **Run integration tests** that specifically target the functionality using the rotated secret.
- **Check the status of CI/CD pipelines** to ensure they are running successfully.

## 5. Rollback

- If a service breaks after a secret rotation, immediately revert the change that introduced the new secret.
- This may involve reverting a pull request, redeploying a previous version of the application, or updating a secret in a secret store to its previous value.
- Investigate the root cause of the failure before attempting to rotate the secret again.
