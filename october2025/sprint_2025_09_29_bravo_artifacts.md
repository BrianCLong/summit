````markdown
---
slug: sprint-2025-09-29-bravo-artifacts
version: v2025.09.29-b3
parent_slug: sprint-2025-09-29-bravo
summary: Concrete, repo-aligned scaffolds (PR template, labeler, Makefile, Helm overlays, Prometheus alerts, Grafana dashboards, OTEL config, OPA, sealed-secrets, DR drill)
---

# Sprint 24 — Repo-Aligned Artifacts & Scaffolds

_Source basis: repository bundles `summit-main` and `summit-2025.09.23.1710` with services `api-gateway`, `gateway`, `ingest`, `docs-api`, Helm charts `app`, `gateway`, `monitoring`, `prometheus`, and workflows under `.github/workflows/`._

> Drop these files into the indicated paths. They are idempotent and designed to integrate with the existing structure.

---

## 1) Pull Request Template

**Path:** `.github/pull_request_template.md`

```markdown
## Summary

## Change Type

- [ ] App code
- [ ] Infra/IaC (Terraform/Helm)
- [ ] Security/Policy (OPA/Secrets)
- [ ] Data migration (requires migration gate)

## Risk & Canary Plan

- rollout: 10→30→60→100
- guardrails: error-rate, p95 latency
- rollback: `helm rollback <release> <rev>` + feature-flags

## Testing

- unit:
- e2e:
- perf (k6):
- security (SAST/SCA):

## Observability

- traces added/updated:
- metrics/dashboards:
- logs (structured fields):

## Checklist

- [ ] No plaintext secrets
- [ ] SBOM produced; no CRITICAL vulns
- [ ] Migration gate artifact attached (if schema)
- [ ] Runbook updated
```
````

---

## 2) Auto-label by Path (Projects V2 friendly)

**Path:** `.github/labeler.yml`

```yaml
ci/cd:
  - .github/workflows/**
  - .ci/**
deploy:
  - charts/**
  - infra/**
  - terraform/**
observability:
  - charts/monitoring/**
  - charts/prometheus/**
  - services/**/otel/**
security:
  - .gitleaks.toml
  - .github/workflows/**security**
  - policy/**
arborist:
  - .github/**
  - tools/**
feature-flag:
  - services/**/flags/**
migration-gate:
  - ops/migrations/**
```

Add workflow:
**Path:** `.github/workflows/labeler.yml`

```yaml
name: Pull Request Labeler
on:
  pull_request_target:
    types: [opened, synchronize]
permissions:
  contents: read
  pull-requests: write
jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v5
        with: { repo-token: ${{ secrets.GITHUB_TOKEN }} }
```

---

## 3) Makefile — Preview, Canary, Rollback

**Path:** `Makefile`

```make
REG ?= ghcr.io/your-org
APP ?= app
NS  ?= dev
SHA ?= $(shell git rev-parse --short HEAD)

.PHONY: build push sbom preview canary rollback destroy-preview
build:
	docker build -t $(REG)/$(APP):$(SHA) .

push: build
	docker push $(REG)/$(APP):$(SHA)

sbom:
	syft $(REG)/$(APP):$(SHA) -o spdx-json > sbom-$(SHA).json

preview:
	kubectl create ns pr-$(PR) --dry-run=client -o yaml | kubectl apply -f -
	helm upgrade --install $(APP) charts/app -n pr-$(PR) -f charts/preview/values.yaml --set image.tag=$(SHA)

destroy-preview:
	kubectl delete ns pr-$(PR) --ignore-not-found

canary:
	helm upgrade --install $(APP) charts/app -n $(NS) -f charts/app/values.yaml -f charts/app/values-canary.yaml --set image.tag=$(SHA)

rollback:
	helm rollback $(APP) $(REV) -n $(NS)
```

---

## 4) Helm Overlays — Canary & Preview

**Path:** `charts/app/values-canary.yaml`

```yaml
rollout:
  enabled: true
  steps:
    - setWeight: 10
    - pause: { duration: 2m }
    - setWeight: 30
    - pause: { duration: 5m }
    - setWeight: 60
    - pause: { duration: 10m }
metrics:
  - name: error-rate
    provider: prometheus
    interval: 1m
    failureLimit: 1
    query: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.02
  - name: latency-p95
    provider: prometheus
    interval: 1m
    failureLimit: 1
    query: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 1.5
```

**Path:** `charts/preview/values.yaml`

```yaml
image:
  tag: latest
resources:
  requests: { cpu: '50m', memory: '128Mi' }
  limits: { cpu: '250m', memory: '512Mi' }
env:
  - name: NODE_ENV
    value: 'staging'
  - name: FEATURE_FLAGS
    value: 'safe_defaults'
```

---

## 5) Prometheus Alert Rules — RED + Burn Rate

**Path:** `charts/monitoring/templates/alerts-canary.yaml`

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: canary-guardrails
  labels: { role: canary }
spec:
  groups:
    - name: canary.rules
      rules:
        - alert: CanaryHighErrorRate
          expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.02
          for: 5m
          labels: { severity: critical, signal: error }
          annotations: { summary: 'Canary error rate > 2%' }
        - alert: CanaryLatencyP95High
          expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 1.5
          for: 5m
          labels: { severity: critical, signal: latency }
          annotations: { summary: 'Canary p95 latency > 1.5s' }
        - alert: ErrorBudgetBurnFast
          expr: (sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
            / sum(rate(http_requests_total[5m])) by (service)) > 0.02
          for: 2m
          labels: { severity: page, burn: fast }
          annotations: { summary: 'Fast burn: 2%+ errors' }
```

---

## 6) Grafana Dashboards — RED per Service

**Path:** `charts/grafana/dashboards/red.json`

```json
{
  "title": "Service RED (p95, error rate, requests)",
  "timezone": "browser",
  "panels": [
    { "type": "timeseries", "title": "Requests/s", "targets": [{ "expr": "sum(rate(http_requests_total[1m]))" }] },
    { "type": "timeseries", "title": "Error rate", "targets": [{ "expr": "sum(rate(http_requests_total{status=~\\"5..\\"}[5m])) / sum(rate(http_requests_total[5m]))" }] },
    { "type": "timeseries", "title": "Latency p95", "targets": [{ "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))" }] }
  ]
}
```

---

## 7) OTEL Config (Collector) & App Hints

**Path:** `charts/ig-platform/templates/otel-collector-configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: otel-collector-config }
data:
  otel-collector-config.yaml: |
    receivers:
      otlp:
        protocols: { http: {}, grpc: {} }
    processors:
      batch: {}
      memory_limiter: { }
      attributes:
        actions:
          - key: feature_flags
            from_context: feature_flags
            action: upsert
    exporters:
      prometheus: { endpoint: ":9464" }
      otlp:
        endpoint: tempo:4317
        tls: { insecure: true }
    service:
      pipelines:
        traces: { receivers: [otlp], processors: [batch], exporters: [otlp] }
        metrics: { receivers: [otlp], processors: [batch], exporters: [prometheus] }
```

**Node/Express middleware snippet** (drop in `services/api-gateway/otel/middleware.ts`):

```ts
import { context, trace, SpanStatusCode } from '@opentelemetry/api';
export function withTrace(name: string, fn: any) {
  return async (req, res, next) => {
    const tracer = trace.getTracer('api-gateway');
    await tracer.startActiveSpan(name, async (span) => {
      try {
        span.setAttribute('http.route', req.path);
        span.setAttribute(
          'user.id.hash',
          req.headers['x-user']
            ? String(req.headers['x-user']).slice(-8)
            : 'anon',
        );
        span.setAttribute('feature_flags', process.env.FEATURE_FLAGS || '');
        await fn(req, res, next);
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (e: any) {
        span.recordException(e);
        span.setStatus({ code: SpanStatusCode.ERROR, message: e.message });
        next(e);
      } finally {
        span.end();
      }
    });
  };
}
```

---

## 8) OPA/Gatekeeper Policies

**Path:** `policy/constraints.yaml`

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredProbes
metadata: { name: require-probes }
spec:
  match: { kinds: [{ apiGroups: ['apps'], kinds: ['Deployment'] }] }
  parameters: { livenessProbe: true, readinessProbe: true }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: DisallowLatestTag
metadata: { name: disallow-latest }
spec:
  match: { kinds: [{ apiGroups: ['apps'], kinds: ['Deployment'] }] }
```

---

## 9) Sealed Secrets (pattern)

**Path:** `secrets/README.md`

```md
# Sealed Secrets

- Create secret: `kubectl create secret generic app-secrets -n prod --from-literal=API_KEY=... --dry-run=client -o yaml > secret.yaml`
- Seal: `kubeseal --controller-name=sealed-secrets --format yaml < secret.yaml > sealed-secret.yaml`
- Commit `sealed-secret.yaml`, never commit `secret.yaml`.
```

**Path:** `.github/workflows/sealed-secrets-validate.yml`

```yaml
name: Validate Sealed Secrets
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check for unsealed secrets
        run: |
          if grep -R "kind: Secret" -n secrets/; then echo "Unsealed Secret found"; exit 1; fi
```

---

## 10) Migration Gate Scripts

**Path:** `ops/migrations/migrate.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
DB="$1"; FILE="$2"
echo "Dry-run against replica..."
psql "$DB" -c "BEGIN; \i $FILE; ROLLBACK;" >/dev/null
sha=$(sha256sum "$FILE" | awk '{print $1}')
echo "$FILE sha256=$sha" > "$FILE.sha"
```

**Path:** `.github/workflows/migration-gate.yml`

```yaml
name: migration-gate
on: [pull_request]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify migration artifacts
        run: |
          test -n "$(ls ops/migrations/*up.sql 2>/dev/null)" || (echo "No migrations found" && exit 0)
          for f in ops/migrations/*up.sql; do
            test -f "$f.sha" || (echo "Missing checksum for $f" && exit 1)
          done
```

---

## 11) Service-Specific Health & Probes

**Path:** `services/api-gateway/k8s/deployment.yaml` (excerpt)

```yaml
livenessProbe:
  httpGet: { path: /health, port: 8080 }
  initialDelaySeconds: 10
  periodSeconds: 15
readinessProbe:
  httpGet: { path: /ready, port: 8080 }
  initialDelaySeconds: 5
  periodSeconds: 10
```

Repeat for `services/ingest`, `services/docs-api`.

---

## 12) DR Drill Playbook (Stage)

**Path:** `runbooks/dr-drill-stage.md`

```md
# DR Drill — Stage

## Preconditions

- Read replicas healthy; PITR enabled; backups < 24h old
- Health checks in Route53 green

## Steps

1. Freeze writes on primary (feature flag `writes_enabled=false`).
2. Promote replica in secondary region; update DNS weight to 100.
3. Run smoke (`/health`,`/ready`), functional path, and data checksums.
4. Record timestamps: start, promote, DNS propagate, healthy, accept traffic.

## Success Criteria

- RTO ≤ 15 min, RPO ≤ 5 min
- Dashboards show stable p95 and error rate

## Rollback

- Flip DNS back; re-enable writes; reconcile lagging events
```

---

## 13) Release Notes Generator (CLI)

**Path:** `tools/release-notes.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
TAG=${1:-v$(date +%Y.%m.%d)-b1}
MILESTONE="Sprint 24 — 2025-09-29 → 2025-10-10"
notes=$(gh issue list --milestone "$MILESTONE" --state closed --json number,title,labels | jq -r '.[] | "- #\(.number) \(.title) [\(.labels|map(.name)|join(", "))]"')
cat > RELEASE-NOTES.md <<EOF
# Release $TAG

## Closed Issues
$notes

## Evidence
- TBD dashboards & audit links
EOF
```

---

## 14) Soak & Go/No-Go Checklist (to pin)

**Path:** `checklists/go-no-go.md`

```md
- [ ] Stage stable ≥ 48h
- [ ] Canary metrics green
- [ ] No CRITICAL security findings
- [ ] DR drill ready / last run < 30 days
- [ ] Runbooks updated; owners on-call
```

---

_End of artifacts._

```

```
