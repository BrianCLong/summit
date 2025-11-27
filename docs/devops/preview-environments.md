# Preview Environments Hardening

## 1. Purpose

This document outlines the hardening strategies for ephemeral preview environments, ensuring they are secure, cost-effective, and provide accurate representations of production.

## 2. Seeded Data

- **Strategy**: Use a subset of anonymized production data or synthetic data for seeding preview environments.
- **Implementation**:
  - Automated data seeding scripts as part of the environment provisioning process.
  - Ensure data is consistent across preview deployments for reliable testing.

## 3. Masked Secrets

- **Strategy**: Prevent sensitive information (e.g., production API keys, database credentials) from being exposed in preview environments.
- **Implementation**:
  - Use environment-specific secrets management (e.g., Kubernetes Secrets, Vault) with strict access controls.
  - Automated secret masking/redaction during deployment to preview environments.
  - Never hardcode secrets in configuration files.

## 4. Auto-TTL Cleanup

- **Strategy**: Automatically de-provision preview environments after a defined Time-To-Live (TTL) to manage costs and resource consumption.
- **Implementation**:
  - Configure TTLs (e.g., 24 hours, 7 days) for each preview environment.
  - Implement a cron job or a serverless function to periodically check and terminate expired environments.
  - Notify PR authors before environment expiration.

## 5. Per-PR URLs

- **Strategy**: Provide unique, stable URLs for each preview environment, making it easy to share and access.
- **Implementation**:
  - Dynamic DNS or ingress controllers to generate URLs based on PR number or branch name (e.g., `pr-123.intelgraph.com`).
  - Update PR comments with the live URL upon successful deployment.

## 6. Playwright Smoke Suite Integration

- **Strategy**: Automatically run a Playwright smoke test suite against each newly deployed preview environment.
- **Implementation**:
  - CI pipeline triggers the smoke tests after environment provisioning.
  - Report test results back to the PR for quick feedback.

## 7. Security Considerations

- Isolate preview environments from production networks.
- Implement network policies to restrict inbound/outbound traffic.
- Regularly scan preview environments for vulnerabilities.

## 8. PR Preview Workflow (Design)

- **Goal**: Provide ephemeral, per-PR previews with strict namespace isolation, TTL enforcement for stale previews, and automatic teardown on PR close/merge.
- **Scope**: GitHub PRs targeting `main` and `release/*` branches. Runs on self-hosted runners with access to the preview cluster.

### Workflow Triggers

- `pull_request` events (`opened`, `synchronize`, `reopened`):
  - Create/update a Kubernetes namespace named `pr-<number>-<short-sha>`.
  - Apply RBAC scoped to that namespace; service accounts cannot list/watch other namespaces.
  - Deploy app stack via Helm/Argo CD using PR image tags.
  - Post the preview URL as a PR comment and set a PR status/check with the link.
- `pull_request` event (`closed`) and `push` to `refs/heads/main` with merged PR metadata:
  - Trigger teardown job to delete the namespace, DNS entry, secrets, and any cloud resources.
  - Remove PR comment badge/status for the preview.

### GitHub Actions Implementation (deterministic)

- **Workflow split**: one workflow for provisioning (`pr-preview.yaml`) and one for teardown/TTL (`pr-preview-cleanup.yaml`) to keep responsibilities isolated and cache-free. Example skeletons:

  ```yaml
  # .github/workflows/pr-preview.yaml
  name: PR Preview
  on:
    pull_request:
      types: [opened, reopened, synchronize]
  concurrency: preview-pr-${{ github.event.pull_request.number }}
  permissions:
    id-token: write
    contents: read
    pull-requests: write
    statuses: write
  jobs:
    provision:
      runs-on: [self-hosted, linux, preview]
      if: github.repository == 'summit/summit' &&
        github.event.pull_request.head.repo.full_name == github.repository
      steps:
        - uses: actions/checkout@v4
          with:
            fetch-depth: 1
            submodules: false
        - name: Configure kubelogin
          run: ./scripts/preview/configure_kubelogin.sh
        - name: Build & push images
          run: ./scripts/preview/build_and_push.sh "${{ github.event.pull_request.number }}"
        - name: Deploy stack
          run: ./scripts/preview/deploy.sh "${{ github.event.pull_request.number }}"
        - name: Comment with URL
          run: ./scripts/preview/comment.sh "${{ github.event.pull_request.number }}"
  ```

  ```yaml
  # .github/workflows/pr-preview-cleanup.yaml
  name: PR Preview Cleanup
  on:
    pull_request:
      types: [closed]
    schedule:
      - cron: '0 * * * *'
  concurrency: preview-cleanup
  permissions:
    id-token: write
    contents: read
    pull-requests: write
    statuses: write
  jobs:
    cleanup:
      runs-on: [self-hosted, linux, preview]
      if: github.repository == 'summit/summit'
      steps:
        - uses: actions/checkout@v4
          with:
            fetch-depth: 1
            submodules: false
        - name: Configure kubelogin
          run: ./scripts/preview/configure_kubelogin.sh
        - name: Cleanup namespace(s)
          run: ./scripts/preview/cleanup.sh "${{ github.event.pull_request.number || '' }}"
  ```
- **Inputs + gating**:
  - Require `concurrency: preview-pr-${{ github.event.pull_request.number }}` to serialize deployments per PR and avoid race conditions on namespace updates.
  - Guard on `if: github.repository == 'summit/summit'` and `github.event.pull_request.head.repo.full_name == github.repository` to prevent forks from writing cluster secrets.
- **Provisioning steps**:
  - `actions/checkout` with `fetch-depth: 1` and `submodules: false` to reduce runtime and prevent stale manifests.
  - Build/push PR images with unique tags (`pr-<number>-<short-sha>`), publish SBOM, and sign images before deployment.
  - Authenticate to the preview cluster via GitHub OIDC → short-lived cloud IAM role → `kubelogin`/`kubectl`.
  - Apply `Namespace`, `NetworkPolicy`, `ResourceQuota`, `LimitRange`, and a `ServiceAccount` bound to a namespaced `Role`.
  - Deploy via Helm/Argo CD with values overrides for PR images, domain (`pr-<number>.preview.summit.ai`), and feature flags.
  - Post status + sticky PR comment containing URL, TTL expiry timestamp, health endpoint, and last deployment SHA.
- **Teardown/TTL steps (shared runner)**:
  - Idempotent `scripts/preview/cleanup.sh <pr-number>` invoked from both the `pull_request.closed` handler and the hourly cron.
  - Script resolves namespaces by label (`preview.summit.ai/pr=<number>`), deletes the namespace, DNS record, PR secret(s), and any cloud resources (DBs/buckets) listed in `preview-resources.json` stored as a namespace annotation.
  - Emit structured log lines (`{action, pr, namespace, actor, status, duration_ms}`) to stdout for ingestion by centralized logging.
  - Exit cleanly when no namespaces match to ensure cron runs do not fail noise-fully.

### Namespace Isolation

- Namespace naming: `pr-<number>-<short-sha>` to ensure uniqueness per commit while retaining PR traceability.
- Enforce [NetworkPolicies](https://kubernetes.io/docs/concepts/services-networking/network-policies/) that only allow ingress from the ingress controller and egress to approved services (e.g., stubbed data APIs, object storage bucket for artifacts).
- Use per-namespace quotas (CPU/memory/PVC count) and LimitRanges to prevent noisy-neighbor impact.
- Create per-namespace secrets from PR-specific GitHub Action OIDC token exchange; never reuse production secrets.
  - Prefer per-PR service accounts bound to narrowly scoped roles; deny wildcard verbs/resources.

### TTL / Auto-Expiry Policy

- Annotate namespaces with `preview.summit.ai/ttl-hours=<n>` and `preview.summit.ai/last-updated=<timestamp>` on every deployment.
- Run a scheduled cleanup job (e.g., GitHub Action on cron or a cluster CronJob) hourly to:
  - List preview namespaces with TTL annotations.
  - Delete namespaces whose `(now - last-updated) > ttl-hours`.
  - Post a courtesy comment to the PR when marking for deletion and again after cleanup succeeds.
- Default TTL: 72 hours after the last deployment; override to 24 hours for high-churn branches if costs spike.
  - Include a dry-run mode in the cleanup job (e.g., `DRY_RUN=true ./scripts/preview/cleanup.sh <pr>`) for debugging without affecting namespaces.

### Teardown on PR Close/Merge

- GitHub Action workflow listens for `pull_request` `closed` events:
  - Look up namespaces matching the PR number (label `preview.summit.ai/pr=<number>`).
  - Delete the namespace, external DNS entry, CloudSQL/RDS databases (if provisioned), and any per-PR object storage prefixes.
  - Revoke temporary credentials issued via OIDC (e.g., short-lived IAM roles).
- Add an idempotent `cleanup.sh` script invoked by both the cron TTL job and the PR close handler to avoid drift between paths.
- Ensure teardown removes PR status contexts and comments to avoid dangling preview references after deletion.
  - Persist cleanup outcomes in a tiny state file or ConfigMap to track last-run timestamp and prevent duplicate notifications when cleanup is re-invoked within a short window.

### Observability and Guardrails

- Emit events to an audit log index (e.g., Loki/Elastic) for provision/teardown actions with PR number, actor, and timestamps.
- Expose a lightweight status endpoint per namespace (health + version) and include it in the PR comment for quick verification.
- Alerting: page the owning team when cleanup fails twice in a row or when namespace age exceeds `ttl-hours + 4`.
- Add SLOs: 95th percentile provision time <15 minutes; successful teardown within 10 minutes of PR close or TTL expiry.
- Metrics to ship: provision/teardown latency histograms, success rates per action, count of active namespaces, and TTL expirations.
