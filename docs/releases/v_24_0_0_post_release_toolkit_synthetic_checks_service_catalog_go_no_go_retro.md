# 1) Scheduled Synthetic — Persisted Query Health

**File:** `.github/workflows/synthetic-pq.yml`

Runs every 5 minutes against staging/prod, calling your persisted **tenantCoherence** query via hash. Fails fast, uploads logs, and (optional) posts to Slack.

```yaml
name: synthetic-pq
on:
  schedule: [{ cron: '*/5 * * * *' }]
  workflow_dispatch: {}
permissions: { contents: read }
jobs:
  check:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        env: [staging, prod]
    steps:
      - uses: actions/checkout@v4
      - name: Run synthetic
        env:
          GRAPHQL_URL: ${{ secrets[format('{0}_GRAPHQL_URL', matrix.env)] }}
          JWT:         ${{ secrets[format('{0}_JWT', matrix.env)] }}
          HASH_TENANT: ${{ secrets[format('{0}_PQ_HASH_TENANT', matrix.env)] }}
          TENANT_ID:   ${{ vars.SYNTH_TENANT_ID || 'tenant-123' }}
        run: |
          bash scripts/synthetic-pq.sh
      - if: failure()
        name: Upload logs
        uses: actions/upload-artifact@v4
        with: { name: synthetic-${{ matrix.env }}-${{ github.run_id }}, path: '**/*.log' }
      - if: failure() && env.SLACK_WEBHOOK_URL != ''
        name: Slack notify (optional)
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        run: |
          curl -X POST -H 'Content-type: application/json' --data '{"text":"❌ Synthetic PQ failed on '${{ matrix.env }}' — run $GITHUB_RUN_ID"}' "$SLACK_WEBHOOK_URL"
```

> **Secrets to set:** `STAGING_GRAPHQL_URL`, `STAGING_JWT`, `STAGING_PQ_HASH_TENANT`, `PROD_GRAPHQL_URL`, `PROD_JWT`, `PROD_PQ_HASH_TENANT` (and optional `SLACK_WEBHOOK_URL`).

---

# 2) Backstage Service Catalog Entry

**File:** `catalog-info.yaml`

Registers the service with SLOs, on-call, runbooks, and dashboards.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: intelgraph-server
  description: v24 Global Coherence Ecosystem API (GraphQL + Subscriptions)
  tags: [graphql, neo4j, postgres, coherence, v24]
  annotations:
    pagerduty.com/service-id: intelgraph-server
    grafana/dashboard-url: https://grafana.example.com/d/v24
    slo/read-p95-ms: '350'
    slo/write-p95-ms: '700'
    slo/sub-fanout-p95-ms: '250'
    slo/error-rate-pct: '0.1'
spec:
  type: service
  lifecycle: production
  owner: team-intelgraph
  system: intelgraph
  providesApis: [intelgraph-graphql]
```

---

# 3) On‑Call Runbook (Quick Triage)

**File:** `runbooks/v24-coherence.md`

- **Alert:** GraphQL p95 > 350ms (10m) or error‑rate > 0.1% (10m)
- **Checks:**
  1. Look for Neo4j/PG latency spikes; verify Redis PubSub health.
  2. Confirm cache hit‑rate; temporarily force Postgres read model.
  3. If sustained: set `v24.coherence=false`; roll back Helm to last good rev.
- **Dashboards:** Grafana v24 panel links.
- **Run commands:** `scripts/rollback-v24.sh`.
- **Escalation:** PagerDuty service `intelgraph-server`.

---

# 4) Go/No‑Go Sign‑off Pack

**File:** `release/go-no-go.md`

```md
# v24.0.0 Go/No-Go — Sign‑offs

Date: [Awaiting Input: Date of release]
Time (America/Denver): [Awaiting Input: Time of release]

## Approvals

- Eng Lead v24: [Signature Required]
- SRE On‑Call: [Signature Required]
- Security: [Signature Required]
- Platform Arch: [Signature Required]

## Gates

<!-- This checklist should be completed by the release manager -->

- [ ] CI green (tests, OPA, SBOM, vuln)
- [ ] k6 SLO suite within budgets
- [ ] Persisted queries frozen & deployed
- [ ] Alerts & dashboard applied
- [ ] Secrets validated in prod

## Risk Notes & Backout

- Canary plan: 10%→50%→100%
- Rollback: feature flag off + Helm rollback
```

---

# 5) Post‑Release Retro Template

**File:** `postmortems/v24-retro-template.md`

```md
# v24.0.0 Release Retrospective

Date Range: [Awaiting Input: Date range of the release]
Facilitator: [Awaiting Input: Name of the facilitator]
Participants: [Awaiting Input: List of participants]

## What went well

- [Awaiting Input: Things that went well]

## What we can improve

- [Awaiting Input: Things to improve]

## DORA Metrics

- Deployment Frequency: [Awaiting Input: Deployment frequency]
- Lead Time for Changes: [Awaiting Input: Lead time for changes]
- Change Failure Rate: [Awaiting Input: Change failure rate]
- MTTR: [Awaiting Input: Mean time to recovery]

## Actions (with owners & due dates)

- [ ] [Awaiting Input: Action item] (Owner, YYYY‑MM‑DD)
```
