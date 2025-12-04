# Canary Gates & CI/CD Configuration

This directory contains validation scripts used in the Golden Path CI/CD pipeline.

## Scripts

- `health-check.sh`: Verifies that the deployed service is responding (e.g., HTTP 200 OK on /health).
- `security-baseline.sh`: Runtime security checks (e.g., header configuration, TLS).
- `smoke-test.sh`: Runs basic end-to-end user flows to verify core functionality.

## GitHub Actions Configuration

The pipeline defined in `.github/workflows/golden-path-ci.yml` requires the following GitHub Secrets to be configured in the repository settings:

| Secret Name | Description |
|-------------|-------------|
| `KUBE_CONFIG` | The kubeconfig file content for accessing your Kubernetes cluster. |
| `SLACK_WEBHOOK_URL` | Webhook URL for sending notifications to a Slack channel. |

### Enabling the Workflow

1. Go to **Settings** > **Secrets and variables** > **Actions**.
2. Click **New repository secret**.
3. Add the secrets listed above.

For more information on using secrets in GitHub Actions, see [Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions).
