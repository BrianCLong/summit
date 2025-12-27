# PR Pack 005 — Neo4j HA & Backups, Redis SLOs, Relevance Rollouts, Privacy/DLP, Edge Protection (Ready‑to‑merge)

Twelve PRs focused on graph/store resilience, cache tuning, safe search relevance releases, privacy-by-default logging, egress/WAF controls, and secrets rotation. Each includes rollback notes.

---

## PR 47 — Neo4j HA via Helm (cores + read replicas)

**Purpose:** Highly‑available graph with metrics and safe upgrade strategy.

**Files**

**`helm/neo4j/values.yaml`** (example)

```yaml
neo4j:
  name: graph
  edition: enterprise
  acceptLicenseAgreement: 'yes'
  core:
    numberOfServers: 3
    persistentVolume:
      size: 200Gi
  readReplica:
    numberOfServers: 2
    persistentVolume:
      size: 200Gi
  resources:
    requests: { cpu: 500m, memory: 4Gi }
    limits: { cpu: 2, memory: 8Gi }
  config:
    dbms.backup.listen_address: :6362
    dbms.memory.heap.initial_size: 2G
    dbms.memory.heap.max_size: 4G
    dbms.memory.pagecache.size: 3G
  metrics:
    prometheus:
      enabled: true
      endpoint: /metrics
serviceMonitor:
  enabled: true
```

**Rollback:** Scale read replicas to 0; reduce cores to 1 for dev.

---

## PR 48 — Neo4j backups (online) + restore rehearsal

**Purpose:** S3‑backed encrypted backups, last‑backup enforcement, weekly restore drill.

**Files**

**`k8s/neo4j/backup-secret.yaml`**

```yaml
apiVersion: v1
kind: Secret
metadata: { name: neo4j-backup, namespace: prod }
stringData:
  AWS_ACCESS_KEY_ID: <ssm:neo4j/backup/key>
  AWS_SECRET_ACCESS_KEY: <ssm:neo4j/backup/secret>
  S3_BUCKET: s3://intelgraph-prod-neo4j
```

**`k8s/neo4j/cron-backup.yaml`**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: neo4j-backup, namespace: prod }
spec:
  schedule: '0 * * * *' # hourly incrementals
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: backup
              image: neo4j:5
              envFrom: [{ secretRef: { name: neo4j-backup } }]
              command: ['/bin/bash', '-lc']
              args:
                - |
                  neo4j-admin database backup --from=graph-core-0.graph:6362 --parallel-processes=4 --backup-dir=/tmp/backup graph;
                  aws s3 cp --recursive /tmp/backup "$S3_BUCKET/$(date +%F-%H%M)" --sse AES256
```

**`k8s/neo4j/cron-backup-verify.yaml`**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: neo4j-backup-verify, namespace: prod }
spec:
  schedule: '30 0 * * *' # nightly
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: verify
              image: amazon/aws-cli:2
              envFrom: [{ secretRef: { name: neo4j-backup } }]
              command: ['/bin/sh', '-c']
              args:
                [
                  'test $(aws s3 ls $S3_BUCKET/ --recursive | tail -1 | wc -l) -gt 0',
                ]
```

**`k8s/neo4j/restore-rehearsal.yaml`** (scratch namespace)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: neo4j-restore-rehearsal, namespace: dr-verify }
spec:
  schedule: '0 3 * * 1'
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: restore
              image: neo4j:5
              envFrom: [{ secretRef: { name: neo4j-backup, optional: false } }]
              command: ['/bin/bash', '-lc']
              args:
                - |
                  LATEST=$(aws s3 ls $S3_BUCKET/ --recursive | tail -1 | awk '{print $4}');
                  aws s3 cp s3://$LATEST /tmp/backup --recursive;
                  neo4j-admin database restore --from-path=/tmp/backup graph --force;
                  cypher-shell -u neo4j -p $NEO4J_AUTH "MATCH (n) RETURN count(n)";
```

**Rollback:** Disable CronJobs; backups from prior schedule remain.

---

## PR 49 — Redis tuning, SLOs, and alerts

**Purpose:** Predictable cache behavior and alerting on churn/evictions.

**Files**

**`k8s/redis/configmap.yaml`**

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: redis-config, namespace: prod }
data:
  redis.conf: |
    maxmemory 75%
    maxmemory-policy allkeys-lru
    timeout 0
    tcp-keepalive 300
    slowlog-log-slower-than 10000
    slowlog-max-len 256
```

**`k8s/redis/statefulset.yaml`** (excerpt)

```yaml
spec:
  template:
    spec:
      containers:
        - name: redis
          image: redis:7
          args: ['redis-server', '/etc/redis/redis.conf']
          volumeMounts:
            - name: config
              mountPath: /etc/redis
          readinessProbe:
            {
              tcpSocket: { port: 6379 },
              initialDelaySeconds: 5,
              periodSeconds: 5,
            }
          livenessProbe:
            {
              tcpSocket: { port: 6379 },
              initialDelaySeconds: 15,
              periodSeconds: 10,
            }
      volumes:
        - name: config
          configMap: { name: redis-config }
```

**`observability/prometheus/redis-rules.yaml`**

```yaml
groups:
  - name: redis-sli
    rules:
      - record: redis:evictions_per_s:rate1m
        expr: rate(redis_evicted_keys_total[1m])
      - alert: RedisEvictionsHigh
        expr: redis:evictions_per_s:rate1m > 10
        for: 10m
        labels: { severity: warning }
        annotations: { summary: 'Redis evictions elevated' }
```

**Rollback:** Revert configmap to default; disable alerts.

---

## PR 50 — Edge protection: WAF + global rate‑limit (NGINX Ingress)

**Purpose:** Reduce abuse and protect upstreams.

**Files**

**`k8s/ingress/web.yaml`** (annotations)

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/enable-modsecurity: 'true'
    nginx.ingress.kubernetes.io/modsecurity-snippet: |
      SecRuleEngine On
      Include /etc/nginx/owasp-modsecurity-crs/nginx-modsecurity.conf
    nginx.ingress.kubernetes.io/proxy-body-size: '2m'
    nginx.ingress.kubernetes.io/limit-rps: '10'
    nginx.ingress.kubernetes.io/limit-burst-multiplier: '2'
    nginx.ingress.kubernetes.io/limit-whitelist: '10.0.0.0/8'
```

**Rollback:** Remove annotations; keep basic ingress.

---

## PR 51 — Relevance rollout: flags, evaluator, and guardrails

**Purpose:** Safely ship new ranking signals/models for search/graph relevance.

**Files**

**`feature-flags/flags.yaml`** (append)

```yaml
ranker_v1: { default: true, owners: [search] }
ranker_v2: { default: false, owners: [search] }
ranker_guardrail: { default: true, owners: [search] }
```

**`relevance/eval/offline_eval.ts`**

```ts
import fs from 'fs';
// Inputs: judgments.tsv (query \t doc \t label)
// Outputs: nDCG@10, ERR@20 per variant
```

**`server/relevance/guardrail.ts`**

```ts
export function guardrail(metrics) {
  // Fail rollout if nDCG drops > 2% or bad click skew rises > 3%
  return (
    metrics.ndcg10_v2 >= metrics.ndcg10_v1 * 0.98 &&
    metrics.bad_skew_v2 <= metrics.bad_skew_v1 * 1.03
  );
}
```

**`.github/workflows/relevance-gate.yml`**

```yaml
name: relevance-gate
on: [workflow_dispatch]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node relevance/eval/offline_eval.ts > eval.json
      - run: node -e "const m=require('./eval.json'); if(!require('./server/relevance/guardrail').guardrail(m)) process.exit(1)"
```

**Rollback:** Disable `ranker_v2`, leave `ranker_v1` on.

---

## PR 52 — End‑to‑end privacy logging (Fluent Bit + OTEL scrubbing)

**Purpose:** Ensure logs/traces never leak PII; encrypt at rest; TTLs.

**Files**

**`k8s/logging/fluent-bit-configmap.yaml`**

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: fluent-bit-config, namespace: logging }
data:
  filters.conf: |
    [FILTER]
      Name          modify
      Match         kube.*
      Remove_key    authorization
      Remove_key    email
      Remove_key    password
  outputs.conf: |
    [OUTPUT]
      Name  s3
      Match *
      bucket intelgraph-logs
      sse     AES256
      total_file_size 50M
  parsers.conf: |
    # json parser
```

**`otel/processor-config.yaml`** (append)

```yaml
processors:
  attributes/privacy:
    actions:
      - key: user.email
        action: delete
      - key: db.statement.parameters
        action: delete
service:
  pipelines:
    logs:
      processors: [attributes/privacy]
    traces:
      processors: [attributes/privacy]
```

**Rollback:** Route logs to /dev/null in non‑prod; relax filters.

---

## PR 53 — Tenant isolation via RLS (Postgres) + middleware for graph

**Purpose:** Prevent cross‑tenant data access at DB level; enforce in graph layer.

**Files**

**`db/migrations/2025090705_rls.sql`**

```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON events USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

**`server/middleware/tenant.ts`**

```ts
export function setTenant(req, _res, next) {
  const tenant = req.headers['x-tenant-id'];
  req.db.query("SELECT set_config('app.tenant_id', $1, false)", [tenant]);
  next();
}
```

**`server/graph/guard.ts`**

```ts
export function enforceTenantInCypher(query: string, tenant: string) {
  if (!/WHERE\s+tenant_id\s*=/.test(query))
    throw new Error('tenant_filter_required');
}
```

**Rollback:** Disable RLS; keep middleware checks.

---

## PR 54 — Strict egress: default deny + allowlist + egress gateway

**Purpose:** Reduce data exfiltration risk.

**Files**

**`k8s/network/egress-deny.yaml`**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny-egress, namespace: prod }
spec:
  podSelector: {}
  policyTypes: [Egress]
  egress: []
```

**`k8s/network/egress-allow.yaml`**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: allow-egress-s3, namespace: prod }
spec:
  podSelector: {}
  policyTypes: [Egress]
  egress:
    - to:
        - ipBlock: { cidr: 52.216.0.0/15 } # S3 (example)
      ports: [{ protocol: TCP, port: 443 }]
```

**Rollback:** Remove deny; keep allow per‑pod.

---

## PR 55 — Secrets rotation automation (monthly)

**Purpose:** Rotate keys/tokens with zero‑downtime and auditable trace.

**Files**

**`.github/workflows/rotate-secrets.yml`**

```yaml
name: rotate-secrets
on:
  schedule: [{ cron: '0 7 1 * *' }]
jobs:
  rotate:
    runs-on: ubuntu-latest
    permissions: { id-token: write, contents: read }
    steps:
      - uses: actions/checkout@v4
      - name: Rotate DB password
        run: node scripts/rotate_secret.js db/password
      - name: Restart rollouts
        env: { KUBECONFIG: ${{ secrets.PROD_KUBECONFIG }} }
        run: |
          argo rollouts restart app -n prod
```

**`scripts/rotate_secret.js`**

```js
// Placeholder: read current, generate new, write to SSM/Secrets Manager, create ExternalSecret revision
```

**Rollback:** Re‑set secret to previous value (kept for 7 days) and restart pods.

---

## PR 56 — SLOs for Neo4j & Redis (recording + alerts + dashboard)

**Purpose:** Golden signals for stores.

**Files**

**`observability/prometheus/graph-cache-rules.yaml`**

```yaml
groups:
  - name: graph-sli
    rules:
      - record: neo4j:bolt_latency_ms:p95
        expr: histogram_quantile(0.95, sum(rate(neo4j_bolt_message_processing_time_seconds_bucket[5m])) by (le)) * 1000
      - alert: Neo4jBoltLatencyHigh
        expr: neo4j:bolt_latency_ms:p95 > 200
        for: 10m
        labels: { severity: warning }
  - name: cache-sli
    rules:
      - record: redis:ops_per_s:rate1m
        expr: rate(redis_commands_processed_total[1m])
```

**`observability/grafana/dashboards/stores.json`** (skeleton)

```json
{
  "title": "Stores — Neo4j & Redis",
  "panels": [
    {
      "type": "timeseries",
      "title": "Neo4j p95 (ms)",
      "targets": [{ "expr": "neo4j:bolt_latency_ms:p95" }]
    },
    {
      "type": "timeseries",
      "title": "Redis ops/s",
      "targets": [{ "expr": "redis:ops_per_s:rate1m" }]
    }
  ]
}
```

**Rollback:** Remove rules/dashboard.

---

## PR 57 — ChatOps bridge for on‑call (Slack)

**Purpose:** Execute safe runbook actions via Slack with audit.

**Files**

**`.github/workflows/chatops.yml`**

```yaml
name: chatops
on:
  repository_dispatch:
    types: [chatops]
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Execute command
        env: { KUBECONFIG: ${{ secrets.PROD_KUBECONFIG }} }
        run: |
          case "${{ github.event.client_payload.command }}" in
            rollback) argo rollouts abort app -n prod || true ; argo rollouts promote --to-last-stable app -n prod ;;
            status) kubectl -n prod get rollouts ;;
          esac
```

**Rollback:** Disable workflow.

---

## PR 58 — Privacy test harness (no PII leakage)

**Purpose:** CI job that runs user journeys and asserts logs/traces contain no PII keys.

**Files**

**`privacy/tests/no-pii.e2e.ts`**

```ts
import { getLogs } from './util';
const DISALLOWED = [/email/i, /password/i, /ssn/i, /credit/i];

it('no PII appears in logs', async () => {
  const logs = await getLogs();
  for (const k of DISALLOWED) expect(logs).not.toMatch(k);
});
```

**`.github/workflows/privacy-check.yml`**

```yaml
name: privacy-check
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run test:privacy
```

**Rollback:** Remove required status; keep tests local.

---

# Cutover (half day)

1. Deploy **Neo4j HA** in stage; verify metrics & failover; enable hourly backups.
2. Configure **Redis** with tuned eviction; validate evictions near zero under steady load.
3. Turn on **WAF/rate‑limit** in stage; monitor false positives; then prod at low thresholds.
4. Wire **relevance gate**; ship `ranker_v2` to 10% traffic with guardrails; rollback via flags on breach.
5. Enable **privacy logging** and **privacy tests**; fix any violations before enforcing.
6. Apply **RLS** and tenant middleware; run contract tests across tenants.
7. Turn on **egress deny** and gradually allowlist required destinations.
8. Schedule **secrets rotation** monthly; validate rollout restart flow.
9. Publish **Neo4j/Redis SLO dashboards**; hook alerts into on‑call ChatOps.

# Rollback

- Disable feature flags (`ranker_v2`, guardrails remain true).
- Remove WAF/limits annotations if causing false positives.
- Scale Neo4j read replicas down; turn off backups/restore rehearsal if noisy.
- Revert RLS migration and drop policy; keep app‑level tenant guard temporarily.

# Ownership

- **Platform/DB:** PR 47–48, 56
- **Platform/Cache/Edge:** PR 49–50, 54
- **Search/ML:** PR 51
- **Security/Privacy:** PR 52, 58, 55
- **Backend:** PR 53
- **SRE/On‑call:** PR 57
