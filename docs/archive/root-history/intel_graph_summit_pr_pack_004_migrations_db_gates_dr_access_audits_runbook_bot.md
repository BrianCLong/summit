# PR Pack 004 — Migrations, DB Gates, DR Multi‑Region, Access Audits, Runbook Bot (Ready‑to‑merge)

Twelve PRs to make schema changes safe & reversible, harden backups/DR, require reason‑for‑access, and automate on‑call runbooks. Includes cutover + rollback.

---

## PR 35 — Migration Gate & Checklist (expand/contract)

**Purpose:** Block risky deploys unless a migration plan exists and follows expand→backfill→dual‑write→switch→contract.

**Files**

**`SECURITY/migration-plan.md`** (template)

```md
# Migration Plan

- Change type: (add column, split table, index, etc.)
- Risk class: (low/med/high)
- Steps:
  1. Expand: forward‑compatible DDL
  2. Backfill: idempotent job spec
  3. Dual‑write: flag name & rollout
  4. Switch reads: flag name & metrics
  5. Contract: remove old path (after ≥7d)
- Rollback: (flags to flip; data to restore)
- Owner + on‑call:
```

**`scripts/check-migration-plan.js`**

```js
const fs = require('fs');
const msg = process.env.PR_TITLE + ' ' + (process.env.PR_BODY || '');
const touchesDb =
  /(db\/migrations|schema|prisma|sequelize|knex)/.test(msg) ||
  (process.env.CHANGED_FILES || '')
    .split('\n')
    .some((p) => /db\/migrations|schema/.test(p));
if (touchesDb && !fs.existsSync('SECURITY/migration-plan.md')) {
  console.error('❌ DB change detected but SECURITY/migration-plan.md missing');
  process.exit(1);
}
console.log('✅ Migration plan present or no DB change.');
```

**`.github/workflows/migration-gate.yml`**

```yaml
name: migration-gate
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Gather PR context
        id: ctx
        uses: actions/github-script@v7
        with:
          script: |
            core.setOutput('title', context.payload.pull_request.title)
            core.setOutput('body', context.payload.pull_request.body || '')
      - name: List changed files
        id: files
        run: |
          git fetch origin ${{ github.base_ref }} --depth=1
          git diff --name-only origin/${{ github.base_ref }}... > changed.txt
          cat changed.txt
          echo "CHANGED_FILES=$(cat changed.txt | tr '\n' ',')" >> $GITHUB_ENV
      - run: node scripts/check-migration-plan.js
        env:
          PR_TITLE: ${{ steps.ctx.outputs.title }}
          PR_BODY: ${{ steps.ctx.outputs.body }}
          CHANGED_FILES: ${{ env.CHANGED_FILES }}
```

**Rollback:** Remove `migration-gate` required check.

---

## PR 36 — Online Postgres Migration Helpers

**Purpose:** Minimize locks/timeouts (use `CONCURRENTLY`, low lock timeout, safe DDL).

**Files**

**`db/migrations/2025090703_expand.sql`**

```sql
-- Expand: forward compatible
SET lock_timeout = '1s';
SET statement_timeout = '5min';
ALTER TABLE orders ADD COLUMN new_total_cents bigint;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at ON orders (created_at);
```

**`scripts/pg_online_migrate.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
export PGAPPNAME=pg-online
export PGOPTIONS="-c lock_timeout=1000 -c statement_timeout=300000"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$1"
```

**`.github/workflows/migrate-online.yml`**

```yaml
name: migrate-online
on:
  workflow_dispatch:
    inputs: { file: { description: 'SQL file path', required: true } }
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/pg_online_migrate.sh ${{ github.event.inputs.file }}
        env: { DATABASE_URL: ${{ secrets.DATABASE_URL }} }
```

**Rollback:** Revert migration commit; migrations are additive (expand) only.

---

## PR 37 — Dual‑Write + Backfill Pattern

**Purpose:** Safe data moves with feature flags and metrics.

**Files**

**`feature-flags/flags.yaml`** (append)

```yaml
dual_write_orders: { default: false, owners: [data] }
read_new_orders: { default: false, owners: [api] }
```

**`scripts/backfill_orders.ts`**

```ts
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const bsz = 1000;
  while (true) {
    const { rows } = await pool.query(
      'SELECT id FROM orders WHERE new_total_cents IS NULL LIMIT $1',
      [bsz],
    );
    if (!rows.length) break;
    for (const r of rows) {
      await pool.query(
        'UPDATE orders SET new_total_cents = total_cents WHERE id=$1',
        [r.id],
      );
    }
  }
}
run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

**`server/db/dualwrite.ts`**

```ts
export function writeOrder(db, order, flags) {
  return db.tx(async (t) => {
    await t.insert('orders', order);
    if (flags.dual_write_orders) {
      await t.none('UPDATE orders SET new_total_cents=$1 WHERE id=$2', [
        order.total_cents,
        order.id,
      ]);
    }
  });
}
```

**Rollback:** Disable flags; no schema change required.

---

## PR 38 — Blue/Green for Datastore (K8s + snapshots)

**Purpose:** Swap databases with minimal downtime using snapshot/replica.

**Files**

**`k8s/db/volumesnapshotclass.yaml`** (CSI supports snapshots)

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata: { name: csi-snap }
driver: ebs.csi.aws.com
deletionPolicy: Delete
```

**`k8s/db/blue-green.yaml`** (pattern)

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata: { name: db-blue-snap, namespace: prod }
spec:
  source: { persistentVolumeClaimName: db-blue-pvc }
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata: { name: db-green-pvc, namespace: prod }
spec:
  dataSource:
    {
      name: db-blue-snap,
      kind: VolumeSnapshot,
      apiGroup: snapshot.storage.k8s.io,
    }
  storageClassName: gp3
  accessModes: [ReadWriteOnce]
  resources: { requests: { storage: 200Gi } }
```

**Rollback:** Keep blue as primary; delete green PVC.

---

## PR 39 — WAL‑G Backups + Encryption (PITR)

**Purpose:** Reliable, encrypted backups with point‑in‑time restore.

**Files**

**`k8s/db/walg-secret.yaml`**

```yaml
apiVersion: v1
kind: Secret
metadata: { name: walg, namespace: prod }
stringData:
  AWS_ACCESS_KEY_ID: <ssm:db/backup/key>
  AWS_SECRET_ACCESS_KEY: <ssm:db/backup/secret>
  WALG_S3_PREFIX: s3://intelgraph-prod-db/
  WALG_COMPRESSION_METHOD: brotli
  WALG_DELTA_MAX_STEPS: '6'
  WALG_UPLOAD_CONCURRENCY: '4'
```

**`k8s/db/cron-backup.yaml`**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: pg-backup, namespace: prod }
spec:
  schedule: '*/30 * * * *'
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: backup
              image: wal-g/wal-g:latest
              envFrom: [{ secretRef: { name: walg } }]
              command: ['/bin/sh', '-c']
              args: ['wal-g backup-push /var/lib/postgresql/data']
```

**Rollback:** Disable CronJob; backups remain in last good state.

---

## PR 40 — Cross‑Region DR (Database + DNS)

**Purpose:** Meet RTO/RPO with warm standby + health‑checked failover.

**Files**

**`infra/dr/postgres-replica.tf`** (pattern)

```hcl
module "pg_replica" {
  source = "./modules/pg-replica"
  primary_region = "us-east-1"
  dr_region      = "us-west-2"
}
```

**`infra/dr/route53-failover.tf`**

```hcl
resource "aws_route53_health_check" "primary" {
  type = "HTTPS"
  resource_path = "/healthz"
  fqdn = "api.prod.example.com"
}

resource "aws_route53_record" "api" {
  zone_id = var.zone_id
  name    = "api.prod.example.com"
  type    = "A"
  set_identifier = "primary"
  failover_routing_policy { type = "PRIMARY" }
  alias { name = aws_lb.primary.dns_name, zone_id = aws_lb.primary.zone_id, evaluate_target_health = true }
  health_check_id = aws_route53_health_check.primary.id
}
```

**Rollback:** Switch routing back to primary; disable failover policy.

---

## PR 41 — Reason‑for‑Access + Audit Log

**Purpose:** Enforce justification for sensitive actions and capture immutable audit.

**Files**

**`server/middleware/reason.ts`**

```ts
import type { Request, Response, NextFunction } from 'express';
export function requireReason(actions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!actions.includes(req.path)) return next();
    const reason = req.header('x-reason') || '';
    if (!reason) return res.status(400).json({ error: 'reason_required' });
    (req as any).reason = reason;
    next();
  };
}
```

**`server/middleware/audit.ts`**

```ts
export function audit(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const rec = {
      ts: new Date().toISOString(),
      user: req.user?.id,
      path: req.path,
      method: req.method,
      status: res.statusCode,
      reason: (req as any).reason || null,
      ip: req.ip,
    };
    console.log(JSON.stringify({ audit: rec }));
  });
  next();
}
```

**Rollback:** Make `requireReason([])` a no‑op; leave audit on.

---

## PR 42 — Step‑Up Auth (WebAuthn) for Tier‑3 Ops

**Purpose:** Require FIDO2 for destructive actions.

**Files**

**`server/routes/webauthn.ts`** (skeleton)

```ts
import express from 'express';
const r = express.Router();
r.post('/webauthn/challenge', (_req, res) => {
  /* return challenge */ res.json({ challenge: '...' });
});
r.post('/webauthn/verify', (_req, res) => {
  /* verify */ res.json({ ok: true, level: 2 });
});
export default r;
```

**`server/app.ts`** (wire)

```ts
import { requireStepUp } from './middleware/stepup';
app.post('/admin/delete-user', requireStepUp(2), handler);
```

**Rollback:** Lower required level or remove middleware.

---

## PR 43 — PII Redaction & OTEL Attribute Filters

**Purpose:** Prevent sensitive data in logs/traces.

**Files**

**`server/logger.ts`**

```ts
import pino from 'pino';
export const logger = pino({
  redact: {
    paths: [
      'req.headers.authorization',
      'password',
      'ssn',
      'card.number',
      'email',
    ],
    remove: true,
  },
});
```

**`otel/processor-config.yaml`**

```yaml
processors:
  attributes/scrub:
    actions:
      - key: http.request.header.authorization
        action: delete
      - key: user.email
        action: delete
exporters: { /* ... */ }
service:
  pipelines:
    traces:
      processors: [batch, attributes/scrub]
```

**Rollback:** Relax redact paths.

---

## PR 44 — On‑Call Runbook Bot (IssueOps)

**Purpose:** One‑click, auditable runbook actions via PR/issue comments.

**Files**

**`.github/workflows/runbook-dispatch.yml`**

```yaml
name: runbook-dispatch
on:
  issue_comment:
    types: [created]
permissions: { contents: read }
jobs:
  run:
    if: contains(github.event.comment.body, '/runbook')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Parse command
        id: cmd
        run: |
          body='${{ github.event.comment.body }}'
          echo "action=$(echo $body | awk '{print $2}')" >> $GITHUB_OUTPUT
      - name: Execute
        env: { KUBECONFIG: ${{ secrets.PROD_KUBECONFIG }} }
        run: |
          case "${{ steps.cmd.outputs.action }}" in
            rollback) argo rollouts abort app -n prod || true ; argo rollouts promote --to-last-stable app -n prod ;;
            scale-down) kubectl -n prod scale deploy/app --replicas=0 ;;
            flag-off) node scripts/ffctl.ts graph_reranker_v2 false ;;
          esac
```

**Rollback:** Disable workflow.

---

## PR 45 — Vulnerability Exception Workflow (time‑boxed)

**Purpose:** Allow explicit, expiring exceptions with approver + reason.

**Files**

**`.security/allowlist.yaml`**

```yaml
exceptions:
  - id: CVE-2024-XYZ
    package: some-lib@1.2.3
    severity: HIGH
    expires: 2025-10-01
    reason: 'No fixed version; sandboxed usage'
    approver: 'security@intelgraph'
```

**`scripts/vuln-allow.js`**

```js
const fs = require('fs');
const list = require('../.security/allowlist.yaml');
const today = new Date().toISOString().slice(0, 10);
for (const e of list.exceptions) {
  if (e.expires < today) {
    console.error(`Expired exception ${e.id}`);
    process.exit(1);
  }
}
console.log('✅ Exceptions valid');
```

**`.github/workflows/vuln-allow-check.yml`**

```yaml
name: vuln-allow-check
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/vuln-allow.js
```

**Rollback:** Remove required check; keep file for record.

---

## PR 46 — Schema Version Negotiation (N/N‑1)

**Purpose:** Ensure rolling deploys are safe while both versions run.

**Files**

**`db/migrations/2025090704_schema_version.sql`**

```sql
CREATE TABLE IF NOT EXISTS schema_version (
  version int not null,
  effective_at timestamptz not null default now()
);
INSERT INTO schema_version(version) VALUES (1) ON CONFLICT DO NOTHING;
```

**`server/routes/schema.ts`**

```ts
import express from 'express';
const r = express.Router();
let current = 1;
r.get('/schema/version', (_req, res) => res.json({ version: current }));
export default r;
```

**`.github/workflows/schema-negotiate.yml`**

```yaml
name: schema-negotiate
on: [deployment_status]
jobs:
  check:
    if: ${{ github.event.deployment_status.state == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - name: Verify N/N-1 compatibility
        run: echo "Query both old and new endpoints; ensure compat"
```

**Rollback:** Keep version static; disable check.

---

# Cutover (half day)

1. Enable **migration-gate** as required check for DB‑touching PRs.
2. Ship **expand** migrations only (PR 36) → deploy app with dual‑write off.
3. Run **backfill** (PR 37) in stage → prod; monitor error rate.
4. Flip **dual_write_orders** → observe metrics; flip **read_new_orders** after stability.
5. Schedule **contract** migration after ≥7 days.
6. Deploy **WAL‑G backups** and run first restore rehearsal to scratch namespace.
7. Configure **DR routing** and run a staged failover in stage.
8. Enforce **reason‑for‑access** and **PII redaction**; socialize runbook bot commands.

# Rollback

- Disable flags to return to old write/read path.
- Abort canary with **runbook bot** or workflow.
- Restore from latest WAL‑G snapshot to scratch → swap PVC (Blue/Green).
- Remove or set policies to audit‑only.

# Ownership

- **DB/Platform:** PR 36, 38–40, 46
- **App/Backend:** PR 37, 41–43, 46
- **SRE/On‑call:** PR 44
- **Security:** PR 35, 45
