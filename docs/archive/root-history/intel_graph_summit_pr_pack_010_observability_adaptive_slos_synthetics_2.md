# PR Pack 010 — Observability++, Adaptive SLOs, Synthetics 2.0, Incident Learning (Ready‑to‑merge)

Twelve PRs to level‑up signal quality and close the loop from detection → mitigation → learning. Focus: tail‑based sampling with exemplars, adaptive SLO burn gates, multi‑region browser synthetics, anomaly detection, log budgets, and automated post‑incident learning. Each PR includes rollback + cutover.

---

## PR 107 — OTEL tail‑based sampling (errors, high latency, rare traffic)

**Purpose:** Keep the 1% that matters; drop noisy traces.

**Files**

**`otel/collector-tail-sampling.yaml`**

```yaml
receivers:
  otlp: { protocols: { http: {}, grpc: {} } }
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    expected_new_traces_per_sec: 500
    policies:
      - name: always-sample-errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: high-latency
        type: latency
        latency: { threshold_ms: 1500 }
      - name: health-checks-low
        type: string_attribute
        string_attribute:
          {
            key: http.target,
            values: ['/health', '/healthz'],
            enabled_regex_matching: true,
            invert_match: true,
          }
  batch: {}
exporters:
  otlphttp: { endpoint: http://tempo.monitoring.svc:4318 }
  prometheus: { endpoint: 0.0.0.0:9464 }
extensions: { health_check: {} }
service:
  extensions: [health_check]
  pipelines:
    traces:
      {
        receivers: [otlp],
        processors: [tail_sampling, batch],
        exporters: [otlphttp],
      }
    metrics: { receivers: [otlp], processors: [batch], exporters: [prometheus] }
```

**Rollback:** Swap to prior `otel-collector.yaml` or set `policies: []` to sample 100%.

---

## PR 108 — Metrics↔Traces exemplars

**Purpose:** Link spikes on dashboards directly to representative traces.

**Files**

**`observability/prometheus/prometheus.yml`** (enable exemplars)

```yaml
storage: { exemplars: { max_age: 1h } }
```

**`server/metrics/http.ts`**

```ts
import client from 'prom-client';
const h = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'latency',
  labelNames: ['path', 'method'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});
export function record(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const secs = Number(process.hrtime.bigint() - start) / 1e9;
    h.labels(req.route?.path || req.path, req.method).observe(secs);
  });
  next();
}
```

**`otel/sdk/tracing.ts`** (propagate trace id → exemplars via OTEL Prom exporter if used)

```ts
// Ensure tracecontext propagation enabled; dashboards link via Tempo/Jaeger UI
```

**Rollback:** Remove exemplar storage block; metrics continue normally.

---

## PR 109 — Adaptive SLOs (multi‑window burn) + promotion gate

**Purpose:** Catch fast burns and slow smolders; pipe into CI `verify-release`.

**Files**

**`observability/prometheus/slo-burn-rules.yaml`**

```yaml
groups:
  - name: slo-burn
    rules:
      - record: error_rate:ratio1m
        expr: sum(rate(http_requests_total{code=~"5.."}[1m]))/sum(rate(http_requests_total[1m]))
      - record: error_rate:ratio5m
        expr: sum(rate(http_requests_total{code=~"5.."}[5m]))/sum(rate(http_requests_total[5m]))
      - alert: FastBurn
        expr: error_rate:ratio1m > 0.05 and error_rate:ratio5m > 0.03
        for: 5m
        labels: { severity: critical }
      - alert: SlowBurn
        expr: error_rate:ratio5m > 0.02
        for: 30m
        labels: { severity: warning }
```

**`scripts/verify_release.ts`** (append)

```ts
// Also query FastBurn/SlowBurn alerts via Alertmanager API; fail on firing
```

**Rollback:** Use single‑window gate as before.

---

## PR 110 — Alert routing, dedup & templates

**Purpose:** Reduce noise; include runbook links and SLO context.

**Files**

**`observability/alertmanager/alertmanager.yaml`**

```yaml
route:
  group_by: ['alertname', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: oncall
receivers:
  - name: oncall
    webhook_configs:
      - url: https://runbook-bot/actions/ingest
templates:
  - 'observability/alertmanager/templates/*.tmpl'
```

**`observability/alertmanager/templates/slo.tmpl`**

```tmpl
{{ define "slo.summary" }}{{ .CommonAnnotations.summary }} — SLO burn {{ .CommonLabels.service }}
Runbook: https://docs/runbooks/{{ .CommonLabels.service }}
{{ end }}
```

**Rollback:** Revert to default receiver or increase repeat_interval.

---

## PR 111 — Synthetics 2.0 (Playwright browser journeys)

**Purpose:** Simulate real users (login → search → detail → export) with screenshots, traces.

**Files**

**`synthetics/playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  retries: 1,
  use: { trace: 'on', screenshot: 'only-on-failure' },
});
```

**`synthetics/journeys/golden.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
test('golden path', async ({ page }) => {
  await page.goto(process.env.BASE_URL!);
  await page.click('text=Login');
  await page.fill('#email', process.env.E2E_USER!);
  await page.fill('#password', process.env.E2E_PASS!);
  await page.click('text=Sign in');
  await expect(page.locator('text=Welcome')).toBeVisible();
  await page.fill('#q', 'graph');
  await page.press('#q', 'Enter');
  await expect(page.locator('[data-test=result]')).toHaveCountGreaterThan(0);
});
```

**`.github/workflows/synthetics-browser.yml`**

```yaml
name: synthetics-browser
on:
  schedule: [{ cron: '*/10 * * * *' }]
  workflow_dispatch: {}
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test synthetics/journeys --reporter=line
        env:
          BASE_URL: ${{ secrets.STAGE_BASE_URL }}
          E2E_USER: ${{ secrets.E2E_USER }}
          E2E_PASS: ${{ secrets.E2E_PASS }}
```

**Rollback:** Reduce schedule or run on demand.

---

## PR 112 — Multi‑region probes & SLI per region

**Purpose:** Detect regional issues before global blast radius.

**Files**

**`.github/workflows/region-probes.yml`**

```yaml
name: region-probes
on:
  schedule: [{ cron: '*/5 * * * *' }]
jobs:
  probe:
    strategy:
      matrix: { region: [iad, pdx, fra] }
    runs-on: ubuntu-latest
    steps:
      - name: GET /healthz from ${{ matrix.region }}
        run: |
          curl -fsSL https://$REGION.example.com/healthz
        env: { REGION: ${{ matrix.region }} }
```

**Rollback:** Reduce regions or disable schedule.

---

## PR 113 — Golden‑path coverage map & guard

**Purpose:** Ensure every critical path has a synthetic; block releases if gaps.

**Files**

**`synthetics/coverage.yaml`**

```yaml
paths:
  - name: login
    url: /login
  - name: search
    url: /search?q=foo
  - name: export
    url: /export
```

**`scripts/synthetics-guard.ts`**

```ts
// Load coverage.yaml and check that journeys/* contains specs for each path; fail if missing
```

**`.github/workflows/synthetics-guard.yml`** — run on PR; required check.

**Rollback:** Warn‑only.

---

## PR 114 — Anomaly detection (seasonal) + residual alerts

**Purpose:** Catch weirdness that static thresholds miss.

**Files**

**`observability/anomaly/detect.py`**

```py
# Load historical p95 latency, fit seasonal baseline, output residuals to pushgateway
```

**`.github/workflows/anomaly.yml`**

```yaml
name: anomaly
on: [schedule]
schedule: [{ cron: '*/15 * * * *' }]
jobs:
  detect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install pandas statsmodels requests
      - run: python observability/anomaly/detect.py
```

**`observability/prometheus/anomaly-alerts.yaml`**

```yaml
groups:
  - name: anomaly
    rules:
      - alert: LatencyResidualHigh
        expr: latency_residual_ms > 200
        for: 10m
        labels: { severity: warning }
```

**Rollback:** Disable job/alerts.

---

## PR 115 — Log budgets & adaptive sampling

**Purpose:** Keep logs within budget while preserving high‑value context.

**Files**

**`server/logger.ts`** (append)

```ts
let rate = Number(process.env.LOG_SAMPLE_RATE || '1.0');
export function maybeLog(level: 'info' | 'warn' | 'error', obj: any) {
  if (level === 'error' || Math.random() < rate) logger[level](obj);
}
```

**`observability/prometheus/log-budget-rules.yaml`**

```yaml
groups:
  - name: log-budget
    rules:
      - record: logs:per_min
        expr: sum(rate(app_logs_total[1m]))
      - alert: LogBudgetExceeded
        expr: logs:per_min > 2000
        for: 10m
```

**Rollback:** Fix rate to 1.0; disable alert.

---

## PR 116 — Incident learning loop (auto‑PM, snapshots, actions)

**Purpose:** Auto‑populate postmortems from telemetry, attach Grafana snapshots, and open follow‑up tasks.

**Files**

**`.github/workflows/auto-postmortem.yml`**

```yaml
name: auto-postmortem
on:
  issues:
    types: [labeled]
jobs:
  build_pm:
    if: contains(github.event.issue.labels.*.name, 'incident')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Draft PM
        uses: peter-evans/create-issue-from-file@v5
        with:
          title: 'Postmortem: #${{ github.event.issue.number }}'
          content-file: runbooks/postmortem_template.md
          labels: postmortem
```

**`runbooks/postmortem_template.md`** (includes slots for timeline, root cause, contributing factors, and links to dashboards/traces).

**Rollback:** Make manual postmortems only.

---

## PR 117 — SLO‑as‑Code library + tests

**Purpose:** Declaratively define SLOs (objective, window, queries) and generate rules/dashboards/tests.

**Files**

**`observability/slo/slo.yaml`**

```yaml
services:
  web:
    objective: 99.9
    window: 30d
    indicator:
      errors: sum(rate(http_requests_total{code=~"5..",job="web"}[5m]))
      total: sum(rate(http_requests_total{job="web"}[5m]))
```

**`observability/slo/build.ts`**

```ts
// Reads slo.yaml; emits recording rules + Grafana panels; runs unit tests to sanity-check queries
```

**`.github/workflows/slo-build.yml`** — run on PR; required.

**Rollback:** Keep static rules.

---

## PR 118 — Public status page publisher

**Purpose:** Publish per‑service uptime/error budgets to a static status page.

**Files**

**`status/site/index.html`** — minimal static page with uptime tiles.

**`.github/workflows/status-publish.yml`**

```yaml
name: status-publish
on:
  schedule: [{ cron: '*/30 * * * *' }]
  workflow_dispatch: {}
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/status_build.js # pulls SLO metrics → JSON → HTML
      - uses: actions/upload-pages-artifact@v3
        with: { path: status/site }
  deploy:
    needs: build
    permissions: { pages: write, id-token: write }
    environment: github-pages
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4
```

**Rollback:** Disable publisher; internal dashboards only.

---

# Cutover (half day)

1. Deploy **OTEL tail‑sampling** alongside existing collector (shadow); verify kept/error traces ratio.
2. Enable **exemplars** and update Grafana panels to link to traces.
3. Roll out **Adaptive SLO rules**; wire to `verify-release` (non‑blocking first).
4. Start **Synthetics 2.0** on stage; add **region probes**; tune thresholds.
5. Turn on **anomaly detection** in dry‑run; review residual alerts.
6. Enforce **log budgets** in stage; monitor cost/volume.
7. Enable **incident auto‑PM** flow; test on a staged incident.
8. Migrate existing SLOs to **SLO‑as‑Code**; verify generated rules = current.
9. Publish **status page** privately; make public after review.

# Rollback

- Use legacy collector config; disable tail sampler.
- Remove exemplar storage block.
- Revert to single‑window SLOs; keep gates disabled.
- Run synthetics on demand only.
- Disable anomaly + log budget alerts.
- Keep postmortems fully manual.

# Ownership

- **Platform/Observability:** PR 107–110, 112, 114–118
- **QA/Release:** PR 111, 113
- **SRE/On‑call:** PR 110, 116
