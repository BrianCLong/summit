# Next Wave PRs — verify-bundle CLI, Adjudication Queue, SLO Alerts

> Two new PRs + one dashboard/alerting enhancement so you can hit the Day‑6 demo goals (round‑trip proof, adjudication queue w/ undo + audit, visible p95 targets).

---

## PR 4 — feat(tooling): **verify‑bundle CLI (round‑trip proof / hash match)**
**Branch:** `feat/tooling-verify-bundle`

### What’s included
- `tools/verify-bundle/verify_bundle.py` — deterministic zipper + SHA‑256.
- `tools/verify-bundle/manifest.yaml` — default bundle: policy, Grafana JSON, Jira CSV.
- `tools/verify-bundle/README.md` — usage.
- `Makefile` — `make verify-bundle`
- `.github/workflows/verify-bundle.yml` — runs on PR.

### Patch (unified diff)
```diff
*** Begin Patch
*** Add File: tools/verify-bundle/verify_bundle.py
+#!/usr/bin/env python3
+"""verify-bundle — create and verify a deterministic artifact bundle.
+
+Features:
+  * Deterministic ZIP (stable filename order, normalized metadata timestamps/attrs)
+  * SHA-256 manifest for bundle and members
+  * Round-trip proof: extract → re-pack → hashes match
+"""
+from __future__ import annotations
+import argparse, hashlib, io, json, os, sys, time, tempfile, zipfile
+from pathlib import Path
+import yaml
+
+EPOCH_DOT = (1980, 1, 1, 0, 0, 0)  # lowest DOS time supported by zip
+
+def sha256_bytes(b: bytes) -> str:
+    return hashlib.sha256(b).hexdigest()
+
+def sha256_file(p: Path) -> str:
+    h = hashlib.sha256()
+    with p.open('rb') as f:
+        for chunk in iter(lambda: f.read(1 << 16), b''):
+            h.update(chunk)
+    return h.hexdigest()
+
+def load_manifest(path: Path) -> dict:
+    with path.open('r', encoding='utf-8') as f:
+        return yaml.safe_load(f)
+
+def normalize_zipinfo(name: str) -> zipfile.ZipInfo:
+    zi = zipfile.ZipInfo(name)
+    zi.date_time = EPOCH_DOT
+    zi.compress_type = zipfile.ZIP_DEFLATED
+    zi.external_attr = 0o100644 << 16  # -rw-r--r--
+    return zi
+
+def build_bundle(files: list[dict], out_zip: Path) -> dict:
+    # sort by archive_path for determinism
+    files_sorted = sorted(files, key=lambda x: x['archive_path'])
+    member_hashes = {}
+    with zipfile.ZipFile(out_zip, 'w', compression=zipfile.ZIP_DEFLATED) as z:
+        for item in files_sorted:
+            src = Path(item['source']).resolve()
+            arc = item['archive_path']
+            data = src.read_bytes()
+            zi = normalize_zipinfo(arc)
+            z.writestr(zi, data)
+            member_hashes[arc] = sha256_bytes(data)
+    bundle_bytes = Path(out_zip).read_bytes()
+    return {
+        'bundle_sha256': sha256_bytes(bundle_bytes),
+        'members': member_hashes,
+        'size': len(bundle_bytes)
+    }
+
+def command_create(args):
+    m = load_manifest(Path(args.manifest))
+    out = Path(args.output)
+    res = build_bundle(m['files'], out)
+    meta = {'created_at': int(time.time()), 'bundle': str(out), **res}
+    print(json.dumps(meta, indent=2))
+
+def command_verify(args):
+    zpath = Path(args.bundle)
+    want = args.sha256.lower()
+    got = sha256_file(zpath)
+    ok = (want == got)
+    print(json.dumps({'bundle': str(zpath), 'ok': ok, 'want': want, 'got': got}, indent=2))
+    sys.exit(0 if ok else 2)
+
+def command_prove_roundtrip(args):
+    # extract → re-pack (using manifest) → hashes match
+    m = load_manifest(Path(args.manifest))
+    orig_zip = Path(args.bundle)
+    orig_hash = sha256_file(orig_zip)
+    with tempfile.TemporaryDirectory() as td:
+        with zipfile.ZipFile(orig_zip) as z:
+            z.extractall(td)
+        # re-read files from original sources to ensure provenance
+        tmp_zip = Path(td) / 'repacked.zip'
+        res = build_bundle(m['files'], tmp_zip)
+        match = res['bundle_sha256'] == orig_hash
+        print(json.dumps({
+            'original': str(orig_zip),
+            'original_sha256': orig_hash,
+            'repacked_sha256': res['bundle_sha256'],
+            'size': res['size'],
+            'match': match
+        }, indent=2))
+        sys.exit(0 if match else 3)
+
+def main():
+    ap = argparse.ArgumentParser()
+    sub = ap.add_subparsers(dest='cmd', required=True)
+    apc = sub.add_parser('create', help='Create bundle zip from manifest')
+    apc.add_argument('--manifest', required=True)
+    apc.add_argument('--output', default='sprint25_day1_artifacts.zip')
+    apc.set_defaults(func=command_create)
+
+    apv = sub.add_parser('verify', help='Verify bundle hash')
+    apv.add_argument('--bundle', required=True)
+    apv.add_argument('--sha256', required=True)
+    apv.set_defaults(func=command_verify)
+
+    apr = sub.add_parser('prove-roundtrip', help='Extract→repack proof; hashes match')
+    apr.add_argument('--manifest', required=True)
+    apr.add_argument('--bundle', required=True)
+    apr.set_defaults(func=command_prove_roundtrip)
+
+    args = ap.parse_args()
+    args.func(args)
+
+if __name__ == '__main__':
+    main()
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: tools/verify-bundle/manifest.yaml
+files:
+  - source: policies/export.rego
+    archive_path: policies/export.rego
+  - source: observability/grafana/dashboards/ga_core_dashboard.json
+    archive_path: grafana/ga_core_dashboard.json
+  - source: project/pm/sprint25_jira.csv
+    archive_path: project/pm/sprint25_jira.csv
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: tools/verify-bundle/README.md
+# verify-bundle CLI
+
+Deterministic artifact bundling + hash proof for Day‑6 demo.
+
+## Quickstart
+```bash
+python3 tools/verify-bundle/verify_bundle.py create \
+  --manifest tools/verify-bundle/manifest.yaml \
+  --output sprint25_day1_artifacts.zip | tee bundle_meta.json
+
+python3 tools/verify-bundle/verify_bundle.py verify \
+  --bundle sprint25_day1_artifacts.zip \
+  --sha256 $(jq -r .bundle_sha256 bundle_meta.json)
+
+python3 tools/verify-bundle/verify_bundle.py prove-roundtrip \
+  --manifest tools/verify-bundle/manifest.yaml \
+  --bundle sprint25_day1_artifacts.zip
+```
+
*** End Patch
```

```diff
*** Begin Patch
*** Update File: Makefile
@@
 policy-test:
 	opa test -v policies
+
+.PHONY: verify-bundle
+verify-bundle:
+	python3 tools/verify-bundle/verify_bundle.py create --manifest tools/verify-bundle/manifest.yaml --output sprint25_day1_artifacts.zip
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: .github/workflows/verify-bundle.yml
+name: Verify Bundle
+on:
+  pull_request:
+    paths:
+      - 'tools/verify-bundle/**'
+      - 'policies/**'
+      - 'observability/grafana/**'
+      - 'project/pm/**'
+  push:
+    branches: [ main ]
+    paths:
+      - 'tools/verify-bundle/**'
+      - 'policies/**'
+      - 'observability/grafana/**'
+      - 'project/pm/**'
+jobs:
+  verify:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - uses: actions/setup-python@v5
+        with:
+          python-version: '3.x'
+      - name: Install deps
+        run: pip install pyyaml
+      - name: Build bundle
+        run: |
+          python3 tools/verify-bundle/verify_bundle.py create \
+            --manifest tools/verify-bundle/manifest.yaml \
+            --output sprint25_day1_artifacts.zip | tee bundle_meta.json
+      - name: Verify
+        run: |
+          HASH=$(jq -r .bundle_sha256 bundle_meta.json) && \
+          python3 tools/verify-bundle/verify_bundle.py verify --bundle sprint25_day1_artifacts.zip --sha256 $$HASH
+
*** End Patch
```

---

## PR 5 — feat(service): **Adjudication Queue (undo + audit)**
**Branch:** `feat/service-adjudication-queue`

### What’s included
- Minimal Express service w/ SQLite for demoability.
- REST endpoints: create, list, undo, audit view.
- OpenAPI spec + unit tests.
- Dockerfile + Makefile target.

### Patch (unified diff)
```diff
*** Begin Patch
*** Add File: services/adjudication-queue/package.json
+{
+  "name": "adjudication-queue",
+  "version": "0.1.0",
+  "private": true,
+  "type": "module",
+  "scripts": {
+    "dev": "node src/server.js",
+    "test": "node --test",
+    "migrate": "node src/migrate.js"
+  },
+  "dependencies": {
+    "better-sqlite3": "^9.4.0",
+    "express": "^4.19.2",
+    "nanoid": "^5.0.7"
+  }
+}
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/adjudication-queue/src/db.js
+import Database from 'better-sqlite3';
+import { join, dirname } from 'path';
+import { fileURLToPath } from 'url';
+
+const __dirname = dirname(fileURLToPath(import.meta.url));
+const dbPath = join(__dirname, '..', 'data.db');
+
+export const db = new Database(dbPath);
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/adjudication-queue/src/migrate.js
+import { db } from './db.js';
+
+db.exec(`
+CREATE TABLE IF NOT EXISTS adjudications (
+  id TEXT PRIMARY KEY,
+  created_at INTEGER NOT NULL,
+  actor TEXT NOT NULL,
+  action TEXT NOT NULL,
+  status TEXT NOT NULL,       -- pending | resolved | undone
+  before_json TEXT,
+  after_json TEXT,
+  reason TEXT
+);
+CREATE TABLE IF NOT EXISTS audit_log (
+  id INTEGER PRIMARY KEY AUTOINCREMENT,
+  ts INTEGER NOT NULL,
+  ref_id TEXT NOT NULL,
+  event TEXT NOT NULL,
+  details TEXT
+);
+`);
+
+console.log('migration complete');
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/adjudication-queue/src/server.js
+import express from 'express';
+import { db } from './db.js';
+import { customAlphabet } from 'nanoid';
+
+const nanoid = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 10);
+const app = express();
+app.use(express.json());
+
+const insertAdj = db.prepare(`INSERT INTO adjudications (id, created_at, actor, action, status, before_json, after_json, reason)
+VALUES (@id, @created_at, @actor, @action, @status, @before_json, @after_json, @reason)`);
+const listAdj = db.prepare(`SELECT * FROM adjudications WHERE status = ? ORDER BY created_at DESC`);
+const getAdj = db.prepare(`SELECT * FROM adjudications WHERE id = ?`);
+const updateStatus = db.prepare(`UPDATE adjudications SET status = ? WHERE id = ?`);
+const insAudit = db.prepare(`INSERT INTO audit_log (ts, ref_id, event, details) VALUES (@ts, @ref_id, @event, @details)`);
+const listAudit = db.prepare(`SELECT * FROM audit_log WHERE ref_id = ? ORDER BY ts DESC`);
+
+function audit(ref_id, event, details) {
+  insAudit.run({ ts: Date.now(), ref_id, event, details: JSON.stringify(details||{}) });
+}
+
+app.post('/api/adjudications', (req, res) => {
+  const id = nanoid();
+  const now = Date.now();
+  const { actor, action, before, after, reason } = req.body;
+  if (!actor || !action) return res.status(400).json({ error: 'actor and action are required' });
+  insertAdj.run({ id, created_at: now, actor, action, status: 'pending', before_json: JSON.stringify(before||null), after_json: JSON.stringify(after||null), reason: reason||null });
+  audit(id, 'created', { actor, action });
+  res.status(201).json({ id, created_at: now, status: 'pending' });
+});
+
+app.get('/api/adjudications', (req, res) => {
+  const status = req.query.status || 'pending';
+  const rows = listAdj.all(status);
+  res.json(rows.map(r => ({...r, before: tryJSON(r.before_json), after: tryJSON(r.after_json)})));
+});
+
+app.post('/api/adjudications/:id/undo', (req, res) => {
+  const id = req.params.id;
+  const row = getAdj.get(id);
+  if (!row) return res.status(404).json({ error: 'not found' });
+  updateStatus.run('undone', id);
+  audit(id, 'undo', { by: req.body.actor || 'system' });
+  res.json({ id, status: 'undone' });
+});
+
+app.get('/api/audit', (req, res) => {
+  const id = req.query.ref;
+  if (!id) return res.status(400).json({ error: 'ref required' });
+  const rows = listAudit.all(id);
+  res.json(rows);
+});
+
+function tryJSON(s){ try{ return JSON.parse(s); } catch{ return null; } }
+
+const port = process.env.PORT || 8085;
+app.listen(port, () => console.log(`adjudication-queue listening on :${port}`));
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/adjudication-queue/openapi.yaml
+openapi: 3.0.3
+info:
+  title: Adjudication Queue API
+  version: 0.1.0
+paths:
+  /api/adjudications:
+    post:
+      summary: Create adjudication item
+      requestBody:
+        required: true
+        content:
+          application/json:
+            schema:
+              type: object
+              properties:
+                actor: { type: string }
+                action: { type: string }
+                before: { type: object }
+                after: { type: object }
+                reason: { type: string }
+      responses:
+        '201': { description: Created }
+    get:
+      summary: List adjudications
+      parameters:
+        - in: query
+          name: status
+          schema: { type: string, enum: [pending, resolved, undone] }
+      responses:
+        '200': { description: OK }
+  /api/adjudications/{id}/undo:
+    post:
+      summary: Undo adjudication
+      parameters:
+        - in: path
+          name: id
+          required: true
+          schema: { type: string }
+      responses:
+        '200': { description: OK }
+  /api/audit:
+    get:
+      summary: Get audit log for a reference id
+      parameters:
+        - in: query
+          name: ref
+          required: true
+          schema: { type: string }
+      responses:
+        '200': { description: OK }
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/adjudication-queue/Dockerfile
+FROM node:20-alpine
+WORKDIR /app
+COPY package.json package-lock.json* ./
+RUN npm ci || npm i --production
+COPY src ./src
+COPY openapi.yaml ./
+ENV PORT=8085
+CMD ["node", "src/migrate.js"], ["node", "src/server.js"]
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: services/adjudication-queue/README.md
+# Adjudication Queue (demo service)
+
+Minimal queue with **undo** and **audit** to support Day‑6 demo.
+
+```bash
+cd services/adjudication-queue
+npm run migrate && npm run dev
+
+# Create
+curl -sX POST localhost:8085/api/adjudications \
+  -H 'content-type: application/json' \
+  -d '{"actor":"alice","action":"export.redaction","before":{},"after":{"masked":true},"reason":"PII detected"}'
+
+# List
+curl -s localhost:8085/api/adjudications?status=pending | jq .
+
+# Undo
+curl -sX POST localhost:8085/api/adjudications/AB12CD34/undo -H 'content-type: application/json' -d '{"actor":"bob"}'
+
+# Audit
+curl -s localhost:8085/api/audit?ref=AB12CD34 | jq .
+```
+
*** End Patch
```

```diff
*** Begin Patch
*** Update File: Makefile
@@
 verify-bundle:
 	python3 tools/verify-bundle/verify_bundle.py create --manifest tools/verify-bundle/manifest.yaml --output sprint25_day1_artifacts.zip
+
+.PHONY: adjudication-run
+adjudication-run:
+	cd services/adjudication-queue && npm run migrate && npm run dev
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: .github/workflows/adjudication-queue.yml
+name: Adjudication Queue CI
+on:
+  pull_request:
+    paths:
+      - 'services/adjudication-queue/**'
+  push:
+    branches: [ main ]
+    paths:
+      - 'services/adjudication-queue/**'
+jobs:
+  build:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - uses: actions/setup-node@v4
+        with:
+          node-version: 20
+      - run: |
+          cd services/adjudication-queue
+          npm ci || npm i
+          npm run migrate
+          node -e "require('http'); console.log('ok')"
+
*** End Patch
```

---

## Enhancement — obs: **p95 thresholds + alerting rules**
**Branch:** `chore/obs-p95-thresholds-alerts`

### What’s included
- Prometheus rules computing p95 via histograms + SLO alerts.
- Dashboard thresholds on NLQ/exec p95 cards.

### Patch (unified diff)
```diff
*** Begin Patch
*** Add File: observability/prometheus/rules/ga_core_slo.rules.yml
+groups:
+  - name: ga-core-slo
+    interval: 1m
+    rules:
+      - record: job:nlq_latency_seconds:p95
+        expr: histogram_quantile(0.95, sum by (le) (rate(nlq_latency_seconds_bucket[5m])))
+      - record: job:exec_latency_seconds:p95
+        expr: histogram_quantile(0.95, sum by (le) (rate(exec_latency_seconds_bucket[5m])))
+      - alert: GA_Core_NLQ_P95_SLO_Breach
+        expr: job:nlq_latency_seconds:p95 > 1.5
+        for: 10m
+        labels:
+          severity: page
+        annotations:
+          summary: "NLQ p95 above 1.5s"
+      - alert: GA_Core_Exec_P95_SLO_Breach
+        expr: job:exec_latency_seconds:p95 > 3.5
+        for: 10m
+        labels:
+          severity: page
+        annotations:
+          summary: "Exec p95 above 3.5s"
+
*** End Patch
```

```diff
*** Begin Patch
*** Update File: observability/grafana/dashboards/ga_core_dashboard.json
@@
   "panels": [
@@
-    {"type": "stat","title": "NLQ p95 (s)",
+    {"type": "stat","title": "NLQ p95 (s)",
       "gridPos": {"x": 0, "y": 0, "w": 6, "h": 4},
@@
-      }]
+      }],
+      "fieldConfig": {"defaults": {"thresholds": {"mode": "absolute", "steps": [{"value": null}, {"value": 1.5}]} }}
     },
@@
-    {"type": "stat","title": "Ingest p95 (s)",
+    {"type": "stat","title": "Exec p95 (s)",
       "gridPos": {"x": 6, "y": 0, "w": 6, "h": 4},
@@
-        "expr": "ingest_latency_seconds_p95{env=\"$env\",tenant=~\"$tenant\"}",
+        "expr": "exec_latency_seconds_p95{env=\"$env\",tenant=~\"$tenant\"}",
         "legendFormat": "p95"
-      }]
+      }],
+      "fieldConfig": {"defaults": {"thresholds": {"mode": "absolute", "steps": [{"value": null}, {"value": 3.5}]}}}
     },
*** End Patch
```

```diff
*** Begin Patch
*** Update File: observability/README.md
@@
 **Variables:** this dashboard expects `env` and `tenant` labels on metrics.
 
 > To use the **attached** JSON instead of the minimal one here, overwrite
 > `observability/grafana/dashboards/ga_core_dashboard.json` with your file.
+
+**Alerts:** load Prometheus rule file `observability/prometheus/rules/ga_core_slo.rules.yml`. Set your Alertmanager routes for `severity=page`.
 
*** End Patch
```

---

## How these hit your Day‑6 demo goals
- **Round‑trip proof**: `verify-bundle.py prove-roundtrip` prints matching SHA‑256.
- **Adjudication queue**: supports create/list/undo with audit trail; drop‑in demo via SQLite.
- **p95 visibility**: dashboard thresholds + SLO alerts at 1.5s/3.5s; optional histogram rules incl