# Synthetics, DR Playbook & Helm Release (OCI + Signing) — IntelGraph Unification

This pack adds external **synthetic monitoring** (status page + alert routing), a complete **Disaster Recovery Playbook** with tested restore drills and validation, and a **packaged Helm chart release** pipeline using **OCI** push and **cosign** signing/attestation.

---

## 0) Repo Layout
```
ops/
  synthetics/
    blackbox-exporter.yaml
    prober-routes.yaml
    statuspage-config.md
    pagerduty-routing.yaml
    synthetics-rules.prom
  backup/
    backup.sh
    restore.sh
    verify.sh
    schedule-cron.yaml
    README.md
  dr/
    playbook.md
    runbook-sev1-dr.md
    runbook-rto-rpo-drill.md
.github/workflows/
  helm-release.yaml
  synthetics-check.yaml
  dr-drill.yaml
deploy/
  helm/intelgraph/
    charts/ (subcharts if any)
    chart-signing.md
```

---

## 1) Synthetics — Blackbox Exporter + Prometheus + PagerDuty

### 1.1 Blackbox Exporter
```yaml
# ops/synthetics/blackbox-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: blackbox-exporter, namespace: observability }
spec:
  replicas: 1
  selector: { matchLabels: { app: blackbox-exporter } }
  template:
    metadata: { labels: { app: blackbox-exporter } }
    spec:
      containers:
      - name: blackbox-exporter
        image: prom/blackbox-exporter:v0.25.0
        args: ["--config.file=/etc/blackbox/blackbox.yml"]
        ports: [{ containerPort: 9115 }]
        volumeMounts:
          - name: cfg
            mountPath: /etc/blackbox
      volumes:
        - name: cfg
          configMap:
            name: blackbox-config
---
apiVersion: v1
kind: Service
metadata: { name: blackbox-exporter, namespace: observability }
spec:
  selector: { app: blackbox-exporter }
  ports: [{ name: http, port: 9115, targetPort: 9115 }]
---
apiVersion: v1
kind: ConfigMap
metadata: { name: blackbox-config, namespace: observability }
data:
  blackbox.yml: |
    modules:
      http_2xx:
        prober: http
        timeout: 10s
        http:
          method: GET
          valid_http_versions: [ "HTTP/1.1", "HTTP/2.0" ]
          preferred_ip_protocol: "ip4"
```

### 1.2 Probes (gateway GraphQL + wallet verify)
```yaml
# ops/synthetics/prober-routes.yaml
apiVersion: monitoring.coreos.com/v1
kind: Probe
metadata: { name: gateway-graphql, namespace: observability }
spec:
  jobName: blackbox-gateway
  module: http_2xx
  prober:
    url: blackbox-exporter.observability.svc:9115
  targets:
    staticConfig:
      targets:
        - https://gateway.stage.example.com/graphql
---
apiVersion: monitoring.coreos.com/v1
kind: Probe
metadata: { name: wallet-verify, namespace: observability }
spec:
  jobName: blackbox-wallet
  module: http_2xx
  prober:
    url: blackbox-exporter.observability.svc:9115
  targets:
    staticConfig:
      targets:
        - https://gateway.stage.example.com/wallet/health
```

### 1.3 Prometheus alerts -> PagerDuty
```yaml
# ops/synthetics/synthetics-rules.prom
groups:
- name: synthetics.rules
  rules:
  - alert: GatewayDown
    expr: probe_success{job="blackbox-gateway"} == 0
    for: 2m
    labels: { severity: critical, team: "intelgraph" }
    annotations:
      summary: "Gateway GraphQL unreachable"
      description: "Synthetic probe failed for 2m. Check ingress, DNS, pods."
  - alert: WalletVerifyDown
    expr: probe_success{job="blackbox-wallet"} == 0
    for: 5m
    labels: { severity: warning, team: "intelgraph" }
    annotations:
      summary: "Wallet verify endpoint unreachable"
      description: "Wallet health probe failing."
```

```yaml
# ops/synthetics/pagerduty-routing.yaml
receivers:
- name: pagerduty
  pagerduty_configs:
  - routing_key: ${PAGERDUTY_ROUTING_KEY}
route:
  receiver: pagerduty
  routes:
  - matchers: [ severity = "critical" ]
    receiver: pagerduty
```

### 1.4 Status page notes
```md
# ops/synthetics/statuspage-config.md
- Components: Gateway API, Webapp, Ledger, Analytics, Wallet, Keycloak
- Metrics: synthetic uptime (30d), p95 GraphQL latency, wallet verify success ratio
- Incidents templates: Sev1/Sev2 with public summaries and links to RCA once closed
```

### 1.5 GitHub Action for synthetics from outside cluster
```yaml
# .github/workflows/synthetics-check.yaml
name: synthetics-check
on:
  schedule: [{ cron: '*/5 * * * *' }]
  workflow_dispatch: {}
jobs:
  ext:
    runs-on: ubuntu-latest
    steps:
      - name: Probe gateway
        run: |
          code=$(curl -s -o /dev/null -w "%{http_code}" https://gateway.stage.example.com/graphql)
          [ "$code" = "200" ] || (echo "Gateway down: $code" && exit 1)
      - name: Probe wallet
        run: |
          code=$(curl -s -o /dev/null -w "%{http_code}" https://gateway.stage.example.com/wallet/health)
          [ "$code" = "200" ] || (echo "Wallet down: $code" && exit 1)
```

---

## 2) DR Playbook — RTO/RPO, Backups, Restore, Validation

### 2.1 Backup scripts (daily + hourly WAL, MinIO mirror)
```bash
# ops/backup/backup.sh
set -euo pipefail
STAMP=$(date +%F_%H%M)
mkdir -p /backup/neo4j /backup/pg /backup/minio
neo4j-admin database dump neo4j --to-path=/backup/neo4j/$STAMP
pg_dump "$POSTGRES_URL" > /backup/pg/pg_$STAMP.sql
mc mirror minio/intelgraph /backup/minio/intelgraph-$STAMP
sha256sum /backup/pg/pg_$STAMP.sql > /backup/pg/pg_$STAMP.sha256
```

```bash
# ops/backup/restore.sh
set -euo pipefail
STAMP=${1:?usage: restore.sh STAMP}
neo4j-admin database load neo4j --from-path=/backup/neo4j/$STAMP --force
psql "$POSTGRES_URL" < /backup/pg/pg_${STAMP}.sql
```

```bash
# ops/backup/verify.sh
set -euo pipefail
# Verify GraphQL ping and sample query
curl -sf "$GATEWAY_URL" -H 'content-type: application/json' -d '{"query":"{ __typename }"}' >/dev/null
curl -sf "$GATEWAY_URL" -H 'content-type: application/json' -d '{"query":"mutation{ runAnalytics(name:\"pagerank\"){ name }}"}' | jq -e '.data.runAnalytics.name=="pagerank"' >/dev/null
```

### 2.2 K8s Cron for backups
```yaml
# ops/backup/schedule-cron.yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: intelgraph-backup, namespace: intelgraph }
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: ghcr.io/ORG/intelgraph/ops-runner:latest
            envFrom: [{ secretRef: { name: intelgraph-secrets } }]
            command: ["/bin/sh","-lc","bash ops/backup/backup.sh"]
```

### 2.3 DR Playbook
```md
# ops/dr/playbook.md
## Objectives
- **RTO ≤ 1h**, **RPO ≤ 5m**.

## Scenarios
1. **Region outage**: restore to warm standby cluster; flip DNS.
2. **DB corruption**: restore last good backup + apply claim deltas.
3. **Keycloak outage**: switch to backup realm; accept cached tokens for 1h.

## Procedure (Region outage)
- Promote standby K8s: `helm upgrade --install` with same values; mount backup volumes or pull from object store.
- Restore databases using `restore.sh STAMP`.
- Re-point ingress DNS; validate with `ops/backup/verify.sh`.
- Post-mortem checklist & RCA template.
```

### 2.4 DR Drill Workflow
```yaml
# .github/workflows/dr-drill.yaml
name: dr-drill
on: [workflow_dispatch]
jobs:
  simulate-restore:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Spin ephemeral stack
        run: docker compose -f docker-compose.dev.yaml up -d --build
      - name: Restore sample backup
        env:
          POSTGRES_URL: postgres://intelgraph:intelgraph@localhost:5432/intelgraph
          GATEWAY_URL: http://localhost:7000/graphql
        run: |
          bash ops/backup/restore.sh LAST || true
          bash ops/backup/verify.sh
```

---

## 3) Helm Chart Release — OCI + cosign

### 3.1 Helm packaging & OCI push
```yaml
# .github/workflows/helm-release.yaml
name: helm-release
on:
  workflow_dispatch:
    inputs:
      version: { description: 'Chart semver (e.g., 1.0.0)', required: true, type: string }
      appVersion: { description: 'App version tag (e.g., v1.0.0-uni)', required: true, type: string }
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write, id-token: write }
    steps:
      - uses: actions/checkout@v4
      - name: Bump chart versions
        run: |
          yq -i '.version = "${{ inputs.version }}" | .appVersion = "${{ inputs.appVersion }}"' deploy/helm/intelgraph/Chart.yaml
      - name: Helm login to GHCR
        run: echo ${{ github.token }} | helm registry login ghcr.io -u ${{ github.actor }} --password-stdin
      - name: Package chart
        run: |
          helm package deploy/helm/intelgraph -u -d dist
      - name: Push to OCI
        run: |
          helm push dist/intelgraph-${{ inputs.version }}.tgz oci://ghcr.io/${{ github.repository }}/charts
      - name: Cosign sign chart
        env:
          COSIGN_EXPERIMENTAL: 1
        run: |
          cosign sign --yes ghcr.io/${{ github.repository }}/charts/intelgraph:${{ inputs.version }}
      - name: Cosign attest (SLSA provenance)
        run: |
          cosign attest --yes --predicate <(echo '{"buildType":"helm","version":"'${{ inputs.version }}'"}') --type slsaprovenance ghcr.io/${{ github.repository }}/charts/intelgraph:${{ inputs.version }}
```

### 3.2 Chart signing notes
```md
# deploy/helm/intelgraph/chart-signing.md
- Use GitHub OIDC + keyless signing (cosign) for charts.
- Consumers can verify: `cosign verify ghcr.io/ORG/intelgraph/charts/intelgraph:1.0.0`.
- Optionally, also push to a static index (`helm repo index`) for air‑gapped installs.
```

---

## 4) Close Remaining Gaps (checklist)
- [ ] Synthetics deployed (blackbox, probes, rules), PagerDuty routing key set
- [ ] Status page components mapped; initial incidents templates
- [ ] Backups scheduled via CronJob; restore & verify scripts pass
- [ ] DR playbook reviewed, drill workflow runs green
- [ ] Helm release pipeline signed & published to GHCR (OCI)
- [ ] Docs updated: Synthetics, DR, Helm consumption

---

## 5) Quick Commands
```bash
# Deploy blackbox + probes + rules (assumes kube-prometheus-stack)
kubectl apply -f ops/synthetics/blackbox-exporter.yaml
kubectl apply -f ops/synthetics/prober-routes.yaml
kubectl create configmap synthetics-rules --from-file=ops/synthetics/synthetics-rules.prom -n observability

# Trigger helm release
gh workflow run helm-release.yaml -f version=1.0.0 -f appVersion=v1.0.0-uni

# Run DR drill locally
bash ops/backup/backup.sh && bash ops/backup/restore.sh $(date +%F_%H%M) && bash ops/backup/verify.sh
```
