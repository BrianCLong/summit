# PR Preview Environment Workflow

## Objectives
- Provide isolated, per-PR preview environments with unique namespaces to prevent cross-tenant bleed-over.
- Enforce automatic expiry to control cost and avoid configuration drift from stale previews.
- Tear down previews automatically when the PR closes or merges so resources never outlive code changes.

## Architecture Overview
- **Triggers**: GitHub Actions workflows react to `pull_request` events (`opened`, `synchronize`, `reopened`, `closed`) and a nightly `schedule` for stale cleanup.
- **Build & Publish**: CI builds immutable images (app + supporting services) and pushes to `ghcr.io/<org>/<app>` tagged with `pr-<number>-<shortsha>`.
- **Namespace-per-PR**: Each preview is deployed into Kubernetes namespace `preview-pr-<number>`, created on demand with strict RBAC and resource quotas.
- **Deployment**: Helm or Argo CD apply manifests using PR-specific values (image tags, ingress hostnames, feature flags). Ingress hosts follow `pr-<number>.preview.<domain>`.
- **State & Secrets**: Preview uses ephemeral backing stores (ephemeral Postgres schema or disposable database instance). Secrets come from a read-only `ExternalSecrets` or Vault role scoped to the namespace.
- **Safety Rails**: Admission policy checks enforce signed images and SBOM validation; preview ingress is gated behind OIDC (GitHub SSO) with HTTPS+HSTS.

## Namespace Isolation Controls
- Namespace label set: `app=preview`, `pr=<number>`, `ttl-hours=<N>` for policy targeting and cleanup.
- Network policies restrict egress to approved services (e.g., mock dependencies) and disable access to production networks.
- ResourceQuota/LimitRange applied per namespace to cap CPU/memory and prevent noisy neighbors.
- ServiceAccounts bound via Role/RoleBinding so jobs in one preview cannot interact with another namespace.

## Lifecycle
### Create / Update (PR opened or synchronized)
1. CI job builds/pushes images and calculates `ttl-hours` (default 72h unless overridden by label like `preview-ttl/<hours>` on the PR). The job writes the computed expiry into an artifact for later teardown workflows and comments.
2. Provision namespace with labels/annotations:
   ```yaml
   metadata:
     name: preview-pr-1234
     labels:
       app: preview
       pr: "1234"
       ttl-hours: "72"
     annotations:
       preview.summit.dev/expires-at: "2025-02-07T12:00:00Z"  # computed from creation + ttl
    ```
3. Apply infrastructure chart (databases/queues) and application chart with PR-specific values (image tags, ingress host, feature flag toggles).
4. Post PR comment containing the preview URL, expiry timestamp, and status of smoke tests.

**Suggested GitHub Actions job (create/update):**
```yaml
name: preview-upsert
on:
  pull_request:
    types: [opened, synchronize, reopened]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    concurrency:
      group: preview-${{ github.event.pull_request.number }}
      cancel-in-progress: true
    permissions:
      contents: read
      id-token: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - name: Log in to GHCR
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: echo "$GITHUB_TOKEN" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
      - uses: docker/setup-buildx-action@v3
      - uses: sigstore/cosign-installer@v3
      - name: Configure cluster access
        uses: azure/k8s-set-context@v4
        with:
          method: oidc
          cluster-type: generic
          kubeconfig: ${{ secrets.KUBECONFIG_B64 }}
      - name: Set build metadata
        id: meta
        env:
          LABELS_JSON: ${{ toJson(github.event.pull_request.labels) }}
        run: |
          DEFAULT_TTL=72
          HOURS=$(printf '%s\n' "$LABELS_JSON" | jq -r '.[]?.name' | grep -oE '^preview-ttl/[0-9]+' | head -1 | cut -d/ -f2)
          HOURS=${HOURS:-$DEFAULT_TTL}
          if [ "$HOURS" -lt 1 ] || [ "$HOURS" -gt 168 ]; then
            echo "TTL must be between 1 and 168 hours." >&2
            exit 1
          fi
          EXPIRES_AT=$(date -u -d "+${HOURS} hours" --iso-8601=seconds)
          echo "ttl_hours=${HOURS}" >> "$GITHUB_OUTPUT"
          echo "expires_at=${EXPIRES_AT}" >> "$GITHUB_OUTPUT"
          printf 'ttl-hours=%s\nexpires-at=%s\n' "$HOURS" "$EXPIRES_AT" > preview-metadata.txt
      - name: Build & push
        run: |
          SHORT_SHA=$(git rev-parse --short HEAD)
          TAG="pr-${{ github.event.pull_request.number }}-$SHORT_SHA"
          docker build -t ghcr.io/<org>/<app>:${TAG} .
          cosign sign ghcr.io/<org>/<app>:${TAG}
          echo "TAG=${TAG}" >> $GITHUB_ENV
      - name: Deploy
        run: |
          NS=preview-pr-${{ github.event.pull_request.number }}
          kubectl create ns "$NS" --dry-run=client -o yaml | kubectl apply -f -
          kubectl label ns "$NS" app=preview pr=${{ github.event.pull_request.number }} ttl-hours=${{ steps.meta.outputs.ttl_hours }} --overwrite
          kubectl annotate ns "$NS" preview.summit.dev/expires-at=${{ steps.meta.outputs.expires_at }} --overwrite
          helm upgrade --install app-$NS charts/app --namespace "$NS" \
            --set image.tag=$TAG \
            --set ingress.host=pr-${{ github.event.pull_request.number }}.preview.<domain> \
            --wait --timeout=10m
      - name: Upload preview metadata
        uses: actions/upload-artifact@v4
        with:
          name: preview-${{ github.event.pull_request.number }}
          path: preview-metadata.txt
      - name: Comment with preview URL
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: preview
          message: |
            Preview ready: https://pr-${{ github.event.pull_request.number }}.preview.<domain>
            Expires: ${{ steps.meta.outputs.expires_at }}
```

### Smoke & Policy Gates
- After deploy, run lightweight smoke suite (e.g., Playwright or Cypress) against the preview URL.
- Enforce admission policies: block deploy if image signature or SBOM verification fails, or if required secrets are missing.

### Auto-Expiry for Stale Previews
- A scheduled cleanup job (GitHub Action or cluster CronJob) scans namespaces with `app=preview`.
- It reads `preview.summit.dev/expires-at` or computes expiry from `ttl-hours`; any namespace past expiry is deleted (`helm uninstall` and namespace delete). Logs are pushed to SIEM for audit.
- Optional: send Slack/PR comment warning 12 hours before expiry.

**Suggested cleanup flow:**
```yaml
name: preview-cleanup
on:
  schedule:
    - cron: "0 * * * *"  # hourly expiry sweep
jobs:
  delete-expired:
    runs-on: ubuntu-latest
    steps:
      - name: Delete expired namespaces
        run: |
          for NS in $(kubectl get ns -l app=preview -o jsonpath='{.items[*].metadata.name}'); do
            EXP=$(kubectl get ns "$NS" -o jsonpath='{.metadata.annotations.preview\.summit\.dev/expires-at}')
            if [ -z "$EXP" ]; then
              CREATION=$(kubectl get ns "$NS" -o jsonpath='{.metadata.creationTimestamp}')
              TTL_LABEL=$(kubectl get ns "$NS" -o jsonpath='{.metadata.labels.ttl-hours}')
              if [ -z "$CREATION" ] || [ -z "$TTL_LABEL" ]; then
                DEFAULT_TTL=72
                CREATION=${CREATION:-$(date -u --iso-8601=seconds)}
                EXP=$(date -u -d "$CREATION + ${DEFAULT_TTL} hours" --iso-8601=seconds)
              else
                EXP=$(date -u -d "$CREATION + ${TTL_LABEL} hours" --iso-8601=seconds)
              fi
            fi
            if [ "$(date -d "$EXP" +%s)" -lt "$(date -u +%s)" ]; then
              helm uninstall app-$NS -n "$NS" || true
              kubectl delete ns "$NS"
            fi
          done
```

### Teardown on PR Close/Merge
- `pull_request.closed` event triggers a teardown workflow that:
  1. Looks up namespace `preview-pr-<number>`.
  2. Runs `helm uninstall`/`argocd app delete` for that PR.
  3. Deletes namespace and ephemeral backing stores (databases/buckets) and revokes short-lived credentials.
  4. Marks the PR with a final status (e.g., "Preview torn down") to keep auditability.

**Suggested teardown job:**
```yaml
name: preview-teardown
on:
  pull_request:
    types: [closed]
jobs:
  teardown:
    runs-on: ubuntu-latest
    steps:
      - name: Tear down preview
        run: |
          NS=preview-pr-${{ github.event.pull_request.number }}
          helm uninstall app-$NS -n "$NS" || true
          kubectl delete ns "$NS" --ignore-not-found
      - name: Comment status
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: preview
          message: "Preview environment torn down for PR #${{ github.event.pull_request.number }}."
```

## Observability & Audit
- Emit deployment/teardown events to an audit log with PR number, namespace, actor, and timestamps.
- Attach preview URL and TTL to PR check outputs for quick triage.
- Collect per-namespace cost and usage metrics to tune TTL defaults and quotas.

## Safeguards
- Protect registries with signed images (Cosign) and enforce signature verification in admission controllers.
- Restrict preview ingress with OIDC or GitHub SSO where required; enforce HTTPS and HSTS.
- Disallow connection strings or endpoints pointing to production by validating environment variables during deploy.
- Enforce per-namespace service accounts with minimal RBAC; disable hostPath mounts and privilege escalation in preview pods.
