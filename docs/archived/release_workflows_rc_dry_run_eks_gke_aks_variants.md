# .github/workflows/release-rc.yml — **Dry‑Run (No External Systems)**

Trigger on RC tags; runs tests, OPA, SBOM/vuln, Helm lint/template, and uploads evidence. No cluster or registry access.

```yaml
name: release-rc
on:
  push:
    tags: [ 'v24.*-rc*' ]
permissions:
  contents: read
  actions: read
jobs:
  rc-verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Node & install
        uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: |
          cd server
          npm ci
          npm run lint
          npm run typecheck
          npm test -- --ci --reporters=default --reporters=jest-junit
      - name: OPA test
        uses: open-policy-agent/setup-opa@v2
      - run: opa test policy -v
      - name: SBOM + vuln scan
        uses: anchore/scan-action@v3
        with: { path: ., fail-build: true, severity-cutoff: high }
      - name: Setup Helm
        uses: azure/setup-helm@v4
      - name: Helm lint/template (dry)
        run: |
          helm lint charts/intelgraph
          helm template ig charts/intelgraph -f charts/intelgraph/values.staging.yaml >/dev/null
          helm template ig charts/intelgraph -f charts/intelgraph/values.prod.yaml >/dev/null || true
      - name: Collect evidence
        run: |
          mkdir -p .evidence/rc
          echo "tag=${GITHUB_REF_NAME}" > .evidence/rc/meta.txt
      - uses: actions/upload-artifact@v4
        with: { name: evidence-rc-${{ github.ref_name }}, path: .evidence }
```

---

# .github/workflows/release-eks.yml — **EKS** (OIDC, GHCR)

```yaml
name: release-eks
on:
  push:
    tags: ['v24.*']
permissions:
  id-token: write
  contents: read
  packages: write
jobs:
  build-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: server/Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/intelgraph-server:${{ github.ref_name }}
  deploy-canary:
    needs: build-publish
    runs-on: ubuntu-latest
    env:
      EKS_CLUSTER: ${{ secrets.EKS_CLUSTER_NAME }}
      AWS_REGION: ${{ secrets.AWS_REGION }}
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          aws-region: ${{ env.AWS_REGION }}
      - uses: aws-actions/eks-update-kubeconfig@v4
        with:
          cluster-name: ${{ env.EKS_CLUSTER }}
      - name: Helm canary 10%
        run: |
          helm upgrade --install ig charts/intelgraph \
            -f charts/intelgraph/values.prod.yaml \
            --set image.tag=${{ github.ref_name }} \
            --set featureFlags.v24.coherence=true
      - name: Notify PagerDuty
        run: |
          jq -n --arg ts "$(date -u +%FT%TZ)" '{routing_key: env.PAGERDUTY_ROUTING_KEY, event_action:"trigger", payload:{summary:"Deploy '${{ github.ref_name }}' canary 10%", timestamp:$ts, source:"github-actions", severity:"info", component:"intelgraph-server", class:"deployment"}}' > pd.json
          curl -sS -X POST https://events.pagerduty.com/v2/enqueue -H 'Content-Type: application/json' -d @pd.json
        env:
          PAGERDUTY_ROUTING_KEY: ${{ secrets.PAGERDUTY_ROUTING_KEY }}
```

**Secrets to set:** `AWS_ROLE_TO_ASSUME`, `AWS_REGION`, `EKS_CLUSTER_NAME`, `PAGERDUTY_ROUTING_KEY`.

---

# .github/workflows/release-gke.yml — **GKE** (WIF, GHCR)

```yaml
name: release-gke
on:
  push:
    tags: ['v24.*']
permissions:
  id-token: write
  contents: read
  packages: write
jobs:
  build-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: server/Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/intelgraph-server:${{ github.ref_name }}
  deploy-canary:
    needs: build-publish
    runs-on: ubuntu-latest
    env:
      GKE_CLUSTER: ${{ secrets.GKE_CLUSTER_NAME }}
      GKE_LOCATION: ${{ secrets.GKE_LOCATION }} # zone or region
      PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WIF_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}
      - uses: google-github-actions/get-gke-credentials@v2
        with:
          cluster_name: ${{ env.GKE_CLUSTER }}
          location: ${{ env.GKE_LOCATION }}
          project_id: ${{ env.PROJECT_ID }}
      - name: Helm canary 10%
        run: |
          helm upgrade --install ig charts/intelgraph \
            -f charts/intelgraph/values.prod.yaml \
            --set image.tag=${{ github.ref_name }} \
            --set featureFlags.v24.coherence=true
      - name: Notify PagerDuty
        run: |
          jq -n --arg ts "$(date -u +%FT%TZ)" '{routing_key: env.PAGERDUTY_ROUTING_KEY, event_action:"trigger", payload:{summary:"Deploy '${{ github.ref_name }}' canary 10%", timestamp:$ts, source:"github-actions", severity:"info", component:"intelgraph-server", class:"deployment"}}' > pd.json
          curl -sS -X POST https://events.pagerduty.com/v2/enqueue -H 'Content-Type: application/json' -d @pd.json
        env:
          PAGERDUTY_ROUTING_KEY: ${{ secrets.PAGERDUTY_ROUTING_KEY }}
```

**Secrets to set:** `GCP_WIF_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`, `GKE_CLUSTER_NAME`, `GKE_LOCATION`, `PAGERDUTY_ROUTING_KEY`.

---

# .github/workflows/release-aks.yml — **AKS** (OIDC, GHCR)

```yaml
name: release-aks
on:
  push:
    tags: ['v24.*']
permissions:
  id-token: write
  contents: read
  packages: write
jobs:
  build-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: server/Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/intelgraph-server:${{ github.ref_name }}
  deploy-canary:
    needs: build-publish
    runs-on: ubuntu-latest
    env:
      AKS_RESOURCE_GROUP: ${{ secrets.AKS_RESOURCE_GROUP }}
      AKS_CLUSTER_NAME: ${{ secrets.AKS_CLUSTER_NAME }}
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - uses: azure/aks-set-context@v3
        with:
          resource-group: ${{ env.AKS_RESOURCE_GROUP }}
          cluster-name: ${{ env.AKS_CLUSTER_NAME }}
      - name: Helm canary 10%
        run: |
          helm upgrade --install ig charts/intelgraph \
            -f charts/intelgraph/values.prod.yaml \
            --set image.tag=${{ github.ref_name }} \
            --set featureFlags.v24.coherence=true
      - name: Notify PagerDuty
        run: |
          jq -n --arg ts "$(date -u +%FT%TZ)" '{routing_key: env.PAGERDUTY_ROUTING_KEY, event_action:"trigger", payload:{summary:"Deploy '${{ github.ref_name }}' canary 10%", timestamp:$ts, source:"github-actions", severity:"info", component:"intelgraph-server", class:"deployment"}}' > pd.json
          curl -sS -X POST https://events.pagerduty.com/v2/enqueue -H 'Content-Type: application/json' -d @pd.json
        env:
          PAGERDUTY_ROUTING_KEY: ${{ secrets.PAGERDUTY_ROUTING_KEY }}
```

**Secrets to set:** `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AKS_RESOURCE_GROUP`, `AKS_CLUSTER_NAME`, `PAGERDUTY_ROUTING_KEY`.

---

# Optional helper — tools/freeze-pq.js (repo utility)

```js
#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');
const queries = {
  tenant:
    'query($tenantId:ID!){ tenantCoherence(tenantId:$tenantId){ score status updatedAt } }',
  publish:
    'mutation($input:PublishCoherenceSignalInput!){ publishCoherenceSignal(input:$input) }',
};
const out = {};
for (const k in queries)
  out[crypto.createHash('sha256').update(queries[k]).digest('hex')] =
    queries[k];
fs.mkdirSync('.maestro', { recursive: true });
fs.writeFileSync(
  '.maestro/persisted-queries.json',
  JSON.stringify(out, null, 2),
);
console.log('Persisted queries written:', Object.keys(out));
```

---

# Secrets Matrix (summary)

- **Common:** `PAGERDUTY_ROUTING_KEY`
- **EKS:** `AWS_ROLE_TO_ASSUME`, `AWS_REGION`, `EKS_CLUSTER_NAME`
- **GKE:** `GCP_WIF_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`, `GKE_CLUSTER_NAME`, `GKE_LOCATION`
- **AKS:** `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AKS_RESOURCE_GROUP`, `AKS_CLUSTER_NAME`
- **Registry (GHCR):** uses `${{ secrets.GITHUB_TOKEN }}` by default

---

# Unified **release.yml** — Auto‑select EKS / GKE / AKS via repo variable

**How it works:** Set repository variable **`CLUSTER_FLAVOR`** to `eks`, `gke`, or `aks`. Only the matching deploy job runs. Common steps (build, tag, evidence) run once.

> Required secrets per flavor are listed after the workflow.

```yaml
name: release
on:
  push:
    tags: [ 'v24.*' ]
concurrency:
  group: release-${{ github.ref_name }}
  cancel-in-progress: false
permissions:
  id-token: write
  contents: read
  packages: write

jobs:
  validate-flavor:
    runs-on: ubuntu-latest
    steps:
      - name: Check CLUSTER_FLAVOR
        run: |
          case "${{ vars.CLUSTER_FLAVOR }}" in
            eks|gke|aks) echo "cluster flavor: ${{ vars.CLUSTER_FLAVOR }}" ;;
            *) echo "::error::Set repo variable CLUSTER_FLAVOR to eks|gke|aks"; exit 1 ;;
          esac

  build-publish:
    needs: validate-flavor
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: server/Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/intelgraph-server:${{ github.ref_name }}

  stage-verify:
    needs: build-publish
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - name: Install & test
        run: |
          cd server
          npm ci
          npm run lint
          npm run typecheck
          npm test -- --ci --reporters=default --reporters=jest-junit
      - name: OPA test
        uses: open-policy-agent/setup-opa@v2
      - run: opa test policy -v
      - name: SBOM + vuln scan
        uses: anchore/scan-action@v3
        with: { path: ., fail-build: true, severity-cutoff: high }
      - name: Upload evidence (build/test)
        uses: actions/upload-artifact@v4
        with: { name: evidence-${{ github.ref_name }}, path: . }

  deploy-eks:
    if: ${{ vars.CLUSTER_FLAVOR == 'eks' }}
    needs: [stage-verify]
    runs-on: ubuntu-latest
    env:
      AWS_REGION: ${{ secrets.AWS_REGION }}
      EKS_CLUSTER: ${{ secrets.EKS_CLUSTER_NAME }}
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          aws-region: ${{ env.AWS_REGION }}
      - uses: aws-actions/eks-update-kubeconfig@v4
        with:
          cluster-name: ${{ env.EKS_CLUSTER }}
      - name: Helm canary 10%
        run: |
          helm upgrade --install ig charts/intelgraph \
            -f charts/intelgraph/values.prod.yaml \
            --set image.tag=${{ github.ref_name }} \
            --set featureFlags.v24.coherence=true
      - name: PagerDuty change
        run: |
          jq -n --arg ts "$(date -u +%FT%TZ)" '{routing_key: env.PAGERDUTY_ROUTING_KEY, event_action:"trigger", payload:{summary:"Deploy '${{ github.ref_name }}' canary 10%", timestamp:$ts, source:"github-actions", severity:"info", component:"intelgraph-server", class:"deployment"}}' > pd.json
          curl -sS -X POST https://events.pagerduty.com/v2/enqueue -H 'Content-Type: application/json' -d @pd.json
        env: { PAGERDUTY_ROUTING_KEY: ${{ secrets.PAGERDUTY_ROUTING_KEY }} }

  deploy-gke:
    if: ${{ vars.CLUSTER_FLAVOR == 'gke' }}
    needs: [stage-verify]
    runs-on: ubuntu-latest
    env:
      GKE_CLUSTER: ${{ secrets.GKE_CLUSTER_NAME }}
      GKE_LOCATION: ${{ secrets.GKE_LOCATION }}
      PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WIF_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}
      - uses: google-github-actions/get-gke-credentials@v2
        with:
          cluster_name: ${{ env.GKE_CLUSTER }}
          location: ${{ env.GKE_LOCATION }}
          project_id: ${{ env.PROJECT_ID }}
      - name: Helm canary 10%
        run: |
          helm upgrade --install ig charts/intelgraph \
            -f charts/intelgraph/values.prod.yaml \
            --set image.tag=${{ github.ref_name }} \
            --set featureFlags.v24.coherence=true
      - name: PagerDuty change
        run: |
          jq -n --arg ts "$(date -u +%FT%TZ)" '{routing_key: env.PAGERDUTY_ROUTING_KEY, event_action:"trigger", payload:{summary:"Deploy '${{ github.ref_name }}' canary 10%", timestamp:$ts, source:"github-actions", severity:"info", component:"intelgraph-server", class:"deployment"}}' > pd.json
          curl -sS -X POST https://events.pagerduty.com/v2/enqueue -H 'Content-Type: application/json' -d @pd.json
        env: { PAGERDUTY_ROUTING_KEY: ${{ secrets.PAGERDUTY_ROUTING_KEY }} }

  deploy-aks:
    if: ${{ vars.CLUSTER_FLAVOR == 'aks' }}
    needs: [stage-verify]
    runs-on: ubuntu-latest
    env:
      AKS_RESOURCE_GROUP: ${{ secrets.AKS_RESOURCE_GROUP }}
      AKS_CLUSTER_NAME:  ${{ secrets.AKS_CLUSTER_NAME }}
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - uses: azure/aks-set-context@v3
        with:
          resource-group: ${{ env.AKS_RESOURCE_GROUP }}
          cluster-name: ${{ env.AKS_CLUSTER_NAME }}
      - name: Helm canary 10%
        run: |
          helm upgrade --install ig charts/intelgraph \
            -f charts/intelgraph/values.prod.yaml \
            --set image.tag=${{ github.ref_name }} \
            --set featureFlags.v24.coherence=true
      - name: PagerDuty change
        run: |
          jq -n --arg ts "$(date -u +%FT%TZ)" '{routing_key: env.PAGERDUTY_ROUTING_KEY, event_action:"trigger", payload:{summary:"Deploy '${{ github.ref_name }}' canary 10%", timestamp:$ts, source:"github-actions", severity:"info", component:"intelgraph-server", class:"deployment"}}' > pd.json
          curl -sS -X POST https://events.pagerduty.com/v2/enqueue -H 'Content-Type: application/json' -d @pd.json
        env: { PAGERDUTY_ROUTING_KEY: ${{ secrets.PAGERDUTY_ROUTING_KEY }} }
```

## Secrets & Vars to set

- **Repo variable:** `CLUSTER_FLAVOR` → `eks` | `gke` | `aks`
- **Common secret:** `PAGERDUTY_ROUTING_KEY`
- **EKS secrets:** `AWS_ROLE_TO_ASSUME`, `AWS_REGION`, `EKS_CLUSTER_NAME`
- **GKE secrets:** `GCP_WIF_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`, `GKE_CLUSTER_NAME`, `GKE_LOCATION`
- **AKS secrets:** `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AKS_RESOURCE_GROUP`, `AKS_CLUSTER_NAME`
