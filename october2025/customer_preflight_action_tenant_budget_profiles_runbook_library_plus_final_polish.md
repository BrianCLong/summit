# Customer Preflight Action + Tenant Budget Profiles & Runbook Library — Plus Final Polish

This pack adds:

1. **Customer Preflight GitHub Action** that validates a customer’s cluster/env before install.
2. **Tenant‑scoped Budget Profiles** and a **Default Runbook Library** seeded per tenant for best‑practice guardrails.
3. A sweep of **final polish** across docs, security headers, CSP/CORS, SLOs, telemetry consent, and dashboard provisioning.

---

## 0) Repo Layout

```
onboarding/
  preflight.sh                    # CLI preflight (from prior pack)
  quickstart.md
  values-sample.yaml
  checklist.md
  faq.md
  action/
    README.md
    customer-preflight.yaml       # GitHub Action (reusable workflow)
    scripts/
      kube-oidc-login.sh
      preflight-ci.sh
bootstrap/
  budgets/
    profiles.yaml                 # tenant budget tiers
  runbooks/
    R1_community.json
    R2_fanin.json
    R3_cotravel.json
    R4_bridge_broker.json
    R5_anomaly.json
  wallets/
    profiles.json                 # disclosure profiles (press/court/partner)
  redactions/
    profiles.json
  seed-tenant.ts                  # seeds budgets/runbooks/redactions/wallets
ops/
  headers/security-headers.md     # CSP/CORS/HSTS guidance
  slo/slo-catalog.yaml            # SLOs + error budgets
  dashboards/provisioning.json    # Grafana folder + dashboards map
```

---

## 1) Customer Preflight — Reusable GitHub Action

### 1.1 Reusable workflow

```yaml
# onboarding/action/customer-preflight.yaml
name: customer-preflight
on:
  workflow_call:
    inputs:
      kubeconfig:
        { description: 'Base64 kubeconfig', required: false, type: string }
      cluster_url:
        {
          description: 'API server URL (for OIDC login)',
          required: false,
          type: string,
        }
      oidc_sa_token:
        {
          description: 'ServiceAccount token (if not using kubeconfig)',
          required: false,
          type: string,
        }
      keycloak_issuer:
        { description: 'OIDC issuer URL', required: true, type: string }
      hostname:
        { description: 'Ingress hostname', required: true, type: string }
      verify_oci:
        {
          description: 'Run Helm OCI + cosign checks',
          required: false,
          default: true,
          type: boolean,
        }
    secrets:
      GHCR_TOKEN: { required: false }
jobs:
  preflight:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup kubectl/helm/cosign
        uses: azure/setup-kubectl@v4
      - uses: azure/setup-helm@v4
      - name: Install cosign
        run: curl -sSL https://raw.githubusercontent.com/sigstore/cosign/main/install.sh | sudo bash
      - name: Kube login (kubeconfig)
        if: inputs.kubeconfig != ''
        run: |
          echo "${{ inputs.kubeconfig }}" | base64 -d > $HOME/.kube/config
          kubectl cluster-info
      - name: Kube login (OIDC token)
        if: inputs.kubeconfig == '' && inputs.oidc_sa_token != ''
        run: |
          echo "Setting up OIDC token auth"
          kubectl config set-cluster customer --server=${{ inputs.cluster_url }} --insecure-skip-tls-verify=true
          kubectl config set-credentials sa --token='${{ inputs.oidc_sa_token }}'
          kubectl config set-context ctx --cluster=customer --user=sa
          kubectl config use-context ctx
          kubectl cluster-info
      - name: Run preflight checks
        env:
          KEYCLOAK_ISSUER: ${{ inputs.keycloak_issuer }}
          HOSTNAME: ${{ inputs.hostname }}
        run: bash onboarding/preflight.sh
      - name: OCI/cosign verify
        if: inputs.verify_oci == true
        env:
          ORG: BrianCLong/intelgraph
          CHART: intelgraph
          VERSION: 1.0.0
          GHCR_TOKEN: ${{ secrets.GHCR_TOKEN }}
        run: |
          if [ -n "$GHCR_TOKEN" ]; then echo $GHCR_TOKEN | helm registry login ghcr.io -u ${{ github.actor }} --password-stdin; fi
          helm pull oci://ghcr.io/$ORG/charts/$CHART --version $VERSION -d ./charts
          cosign verify ghcr.io/$ORG/charts/$CHART:$VERSION \
            --certificate-oidc-issuer https://token.actions.githubusercontent.com \
            --certificate-identity-regexp ".*github.com/$ORG.*"
```

### 1.2 Helper scripts

```bash
# onboarding/action/scripts/preflight-ci.sh
set -euo pipefail
KEYCLOAK_ISSUER=${KEYCLOAK_ISSUER:?}
HOSTNAME=${HOSTNAME:?}
bash onboarding/preflight.sh
```

### 1.3 README (how customers invoke)

````md
# Customer Preflight Action

Add to your repo `.github/workflows/preflight.yaml`:

```yaml
name: preflight
on: [workflow_dispatch]
jobs:
  prep:
    uses: BrianCLong/intelgraph/.github/workflows/customer-preflight.yaml@main
    with:
      keycloak_issuer: https://keycloak.yourco.com/auth/realms/intelgraph
      hostname: intelgraph.yourco.com
      verify_oci: true
    secrets:
      GHCR_TOKEN: ${{ secrets.GHCR_TOKEN }}
```
````

````

---

## 2) Tenant‑Scoped Budget Profiles

```yaml
# bootstrap/budgets/profiles.yaml
profiles:
  pilot:
    description: Conservative defaults for new tenants
    limits:
      estMs: 2000
      estRows: 200000
      memoryMB: 1024
      gdsProjectionMaxNodes: 2000000
      gdsProjectionMaxRels: 15000000
  standard:
    description: Typical investigative workloads
    limits:
      estMs: 4000
      estRows: 1000000
      memoryMB: 2048
      gdsProjectionMaxNodes: 5000000
      gdsProjectionMaxRels: 40000000
  intensive:
    description: Large teams / heavy analytics
    limits:
      estMs: 8000
      estRows: 5000000
      memoryMB: 4096
      gdsProjectionMaxNodes: 20000000
      gdsProjectionMaxRels: 150000000
````

Seed endpoint usage (curl):

```bash
TENANT=pilot
curl -s -XPOST $BUDGET_URL/init -H 'content-type: application/json' \
  -d @- <<EOF
{ "tenant":"$TENANT", "profile":"pilot" }
EOF
```

---

## 3) Default Runbook Library (seeded per tenant)

### 3.1 R1 — Community Snapshot

```json
// bootstrap/runbooks/R1_community.json
{
  "id": "R1",
  "name": "Community Snapshot",
  "nodes": [
    {
      "id": "nl",
      "type": "nl2cypher",
      "params": { "text": "community detection" }
    },
    { "id": "an", "type": "analytics", "params": { "name": "louvain" } },
    {
      "id": "report",
      "type": "report",
      "params": { "template": "community_overview" }
    }
  ]
}
```

### 3.2 R2 — Fan‑in Hub

```json
{
  "id": "R2",
  "name": "Financial Fan‑in",
  "nodes": [
    {
      "id": "pattern",
      "type": "pattern",
      "params": { "name": "fanin", "min": 8 }
    },
    { "id": "an", "type": "analytics", "params": { "name": "pagerank" } },
    {
      "id": "report",
      "type": "report",
      "params": { "template": "fanin_overview" }
    }
  ]
}
```

### 3.3 R3 — Co‑travel Cell

```json
{
  "id": "R3",
  "name": "Co‑travel Cell",
  "nodes": [
    {
      "id": "pattern",
      "type": "pattern",
      "params": { "name": "cotravel", "withinHours": 6 }
    },
    { "id": "map", "type": "map", "params": { "brushHours": 6 } },
    {
      "id": "report",
      "type": "report",
      "params": { "template": "cotravel_overview" }
    }
  ]
}
```

### 3.4 R4 — Bridge/Broker + Content

```json
{
  "id": "R4",
  "name": "Bridge/Broker + Content",
  "nodes": [
    { "id": "an", "type": "analytics", "params": { "name": "betweenness" } },
    {
      "id": "pattern",
      "type": "pattern",
      "params": { "name": "bridge_broker" }
    },
    {
      "id": "report",
      "type": "report",
      "params": { "template": "bridge_overview" }
    }
  ]
}
```

### 3.5 R5 — Temporal Anomaly

```json
{
  "id": "R5",
  "name": "Temporal Anomaly",
  "nodes": [
    {
      "id": "nl",
      "type": "nl2cypher",
      "params": { "text": "nodes with sharp rise in degree last 24h" }
    },
    {
      "id": "report",
      "type": "report",
      "params": { "template": "anomaly_overview" }
    }
  ]
}
```

---

## 4) Wallet & Redaction Profiles (per tenant)

```json
// bootstrap/wallets/profiles.json
{
  "press": {
    "ttlSeconds": 3600,
    "audience": "press",
    "fields": ["summary", "time", "entities", "hashes"]
  },
  "partner": {
    "ttlSeconds": 86400,
    "audience": "partner",
    "fields": ["summary", "entities", "edges", "hashes", "manifests"]
  },
  "court": { "ttlSeconds": 259200, "audience": "court", "fields": ["*"] }
}
```

```json
// bootstrap/redactions/profiles.json
{ "press": ["SSN", "DOB", "Address"], "partner": ["SSN"], "court": [] }
```

---

## 5) Tenant Seeder

```ts
// bootstrap/seed-tenant.ts
import fs from 'fs';
import fetch from 'node-fetch';
const TENANT = process.env.TENANT || 'pilot';
const BUDGET = process.env.BUDGET_URL || 'http://localhost:7009';
const RUNBOOK = process.env.RUNBOOK_URL || 'http://localhost:7008';
const WALLET = process.env.WALLET_URL || 'http://localhost:7014';
const REPORT = process.env.REPORT_URL || 'http://localhost:7007';
(async () => {
  // budgets
  const prof = JSON.parse(
    fs.readFileSync('bootstrap/budgets/profiles.yaml', 'utf8'),
  ); // assume loader or pre‑converted JSON
  await fetch(`${BUDGET}/init`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenant: TENANT, profile: 'pilot' }),
  });
  // runbooks
  for (const id of [
    'R1_community',
    'R2_fanin',
    'R3_cotravel',
    'R4_bridge_broker',
    'R5_anomaly',
  ]) {
    const j = JSON.parse(
      fs.readFileSync(`bootstrap/runbooks/${id}.json`, 'utf8'),
    );
    await fetch(`${RUNBOOK}/library`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant: TENANT, runbook: j }),
    });
  }
  // redactions & wallet profiles
  const reds = JSON.parse(
    fs.readFileSync('bootstrap/redactions/profiles.json', 'utf8'),
  );
  const wals = JSON.parse(
    fs.readFileSync('bootstrap/wallets/profiles.json', 'utf8'),
  );
  await fetch(`${REPORT}/redactions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenant: TENANT, profiles: reds }),
  });
  await fetch(`${WALLET}/profiles`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenant: TENANT, profiles: wals }),
  });
  console.log('Seeded tenant', TENANT);
})();
```

Make target:

```make
tenant-seed:
	TENANT=$(TENANT) node bootstrap/seed-tenant.ts
```

---

## 6) Security & Headers Polish

```md
# ops/headers/security-headers.md

- Enable HSTS, X-Content-Type-Options, X-Frame-Options=DENY, Referrer-Policy=strict-origin-when-cross-origin
- CSP (strict): default-src 'none'; connect-src 'self' https://keycloak …; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'
- CORS: allow only SPA/gateway origins; preflight cache 300s; credentials=false
```

Gateway snippet:

```ts
import helmet from 'helmet';
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'none'"],
        'connect-src': ["'self'", process.env.KEYCLOAK_ISSUER],
        'img-src': ["'self'", 'data:'],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'frame-ancestors': ["'none'"],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
);
```

---

## 7) SLO Catalog & Error Budgets

```yaml
# ops/slo/slo-catalog.yaml
services:
  gateway:
    availability: { slo: 99.9, window: 30d, alert: 15m }
    latency_p95_ms: { slo: 1500, window: 7d }
  analytics:
    job_success_rate: { slo: 99.0, window: 7d }
  ledger:
    verify_success: { slo: 99.99, window: 30d }
```

---

## 8) Grafana Provisioning Map

```json
// ops/dashboards/provisioning.json
{
  "folders": {
    "IntelGraph GA": [
      "cost-per-insight.json",
      "neo4j-gds-health.json",
      "audit.json"
    ]
  }
}
```

---

## 9) Docs polish

- `/docs/policies/privacy.md` and `/docs/policies/cookies.md` (link in footer)
- `/docs/support/oncall.md` (rotas & escalation)
- `/docs/api/examples.md` (GraphQL queries & REST samples)

---

## 10) Checklists

- [ ] Customer preflight reusable workflow published and referenced in README
- [ ] Budget profiles loaded; `budget-guard` acknowledges tenant tier
- [ ] Runbook library seeded; webapp shows runbooks R1–R5 for new tenant
- [ ] Wallet/redaction profiles attached to tenant
- [ ] Security headers and CSP verified in browser
- [ ] SLOs visible; dashboards provisioned

```

```
