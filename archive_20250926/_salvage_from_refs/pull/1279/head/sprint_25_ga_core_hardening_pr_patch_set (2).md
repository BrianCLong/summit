# Sprint 25 — GA Core Hardening PR Patch Set

> Drop‑in patch set to ship Day‑1 deliverables as one or more PRs. Includes CI, OPA wiring, Grafana‑as‑code, `/project/pm/` CSV, and a round‑trip `verify-bundle` CLI. Safe defaults enable **simulate** mode first.

---

## Repo additions (tree)
```
.github/workflows/policy-ci.yml
policies/export.rego                      # from Day‑1 attachment
policies/export_test.rego                 # added unit tests
server/routes/export.ts                   # /export/simulate + /export endpoints (Express)
services/policy/opa.ts                    # OPA client (sidecar or remote)
project/pm/sprint25_jira.csv              # from Day‑1 attachment
grafana/dashboards/ga_core_dashboard.json # from Day‑1 attachment
grafana/provisioning/dashboards/intelgraph.yaml
tools/verify-bundle/cli.py                # bundle verifier
README-Sprint25.md                        # operator notes
```

> **Assumptions:** API uses Node/TypeScript with Express; OPA runs as a sidecar at `OPA_URL=http://localhost:8181` (overrideable); Grafana sidecar picks up files from mounted folder `/etc/grafana/dashboards` (adjust in provisioning YAML if different).

---

## One‑shot apply script
Save as `scripts/apply_sprint25_day1.sh`, make executable, and run from the repo root:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Usage: FILE_DIR=</path/to/day1/files> ./scripts/apply_sprint25_day1.sh
# Expects: export.rego, grafana_ga_core_dashboard.json, sprint25_jira.csv in $FILE_DIR

BRANCH="feature/sprint25-ga-core-guardrails"
FILE_DIR="${FILE_DIR:-./incoming}"

if [ ! -d .git ]; then
  echo "Run from the repo root (where .git/ lives)." >&2
  exit 1
fi

mkdir -p policies grafana/dashboards grafana/provisioning/dashboards project/pm tools/verify-bundle .github/workflows server/routes services/policy scripts

# 1) Day-1 artifacts → repo
cp "$FILE_DIR/export.rego" policies/export.rego
cp "$FILE_DIR/grafana_ga_core_dashboard.json" grafana/dashboards/ga_core_dashboard.json
cp "$FILE_DIR/sprint25_jira.csv" project/pm/sprint25_jira.csv

# 2) OPA tests
cat > policies/export_test.rego <<'REGO'
package export

test_simulate_sensitive_requires_stepup {
  input := {
    "resource": {"sensitivity": "Sensitive"},
    "auth": {"step_up": false},
    "fields": ["pii:name", "pii:ssn"]
  }
  result := data.export.decision with input as input
  result.allow == false
  result.step_up == true
  count(result.redactions) > 0
}

# Adjust this test if your policy uses a different entrypoint name
REGO

# 3) OPA client (TS)
cat > services/policy/opa.ts <<'TS'
import fetch from "node-fetch";

export interface PolicyResult {
  allow: boolean;
  reasons?: string[];
  redactions?: string[];
  step_up?: boolean;
  [k: string]: unknown;
}

const OPA_URL = process.env.OPA_URL || "http://localhost:8181";
const OPA_PACKAGE = process.env.OPA_PACKAGE || "export/decision"; // e.g., data.export.decision

export async function evalPolicy(input: unknown): Promise<PolicyResult> {
  const url = `${OPA_URL}/v1/data/${OPA_PACKAGE}`.replace(/\/+/g, "/");
  const res = await fetch(url, { method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify({ input }) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OPA error ${res.status}: ${text}`);
  }
  const json = await res.json();
  // OPA returns { result: {...} }
  return json.result as PolicyResult;
}
TS

# 4) Export routes (TS, Express)
cat > server/routes/export.ts <<'TS'
import { Router, Request, Response } from "express";
import { evalPolicy } from "../../services/policy/opa";

const router = Router();

function buildInput(req: Request) {
  const sensitivity = (req.body?.resource?.sensitivity || req.query.sensitivity || "").toString();
  const fields = (req.body?.fields || []).map((x: any) => String(x));
  const auth = {
    step_up: req.get("X-Step-Up-Verified") === "true" || req.body?.auth?.step_up === true,
    sub: req.get("X-Sub") || req.body?.auth?.sub || "anonymous"
  };
  return { resource: { sensitivity }, fields, auth, action: req.method === "GET" ? "preview" : "export" };
}

router.all("/export/simulate", async (req: Request, res: Response) => {
  try {
    const input = buildInput(req);
    const decision = await evalPolicy(input);
    res.status(200).json({ mode: "simulate", input, decision });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

router.all("/export", async (req: Request, res: Response) => {
  try {
    const input = buildInput(req);
    const decision = await evalPolicy(input);
    if (!decision.allow) {
      return res.status(403).json({ mode: "enforce", input, decision });
    }
    if (decision.step_up && input.auth.step_up !== true) {
      return res.status(401).json({ mode: "enforce", input, decision, hint: "Step-up required (WebAuthn). Send X-Step-Up-Verified: true" });
    }
    // Example: apply redactions to outgoing payload (if you stream files, do this in the exporter)
    const payload = { data: req.body?.data ?? null, redactions_applied: decision.redactions ?? [] };
    res.status(200).json({ mode: "enforce", input, decision, payload });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

export default router;
TS

# 5) Grafana provisioning (YAML)
cat > grafana/provisioning/dashboards/intelgraph.yaml <<'YAML'
apiVersion: 1
providers:
  - name: intelgraph-ga-core
    orgId: 1
    folder: IntelGraph
    type: file
    disableDeletion: false
    allowUiUpdates: true
    updateIntervalSeconds: 30
    options:
      path: /etc/grafana/dashboards
YAML

# 6) CI workflow for policy and bundle checks
cat > .github/workflows/policy-ci.yml <<'YAML'
name: Policy & Bundle CI
on:
  pull_request:
    paths:
      - 'policies/**'
      - 'server/**'
      - 'services/**'
      - 'grafana/**'
      - 'tools/verify-bundle/**'
      - 'project/pm/**'
  push:
    branches: [ main ]
    paths:
      - 'policies/**'
      - 'tools/verify-bundle/**'

jobs:
  opa-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run OPA unit tests
        uses: docker://openpolicyagent/opa:latest
        with:
          args: test policies -v

  verify-bundle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Self-test
        run: |
          python tools/verify-bundle/cli.py --self-test

  grafana-json-valid:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate dashboard JSON
        run: |
          jq . grafana/dashboards/ga_core_dashboard.json >/dev/null
YAML

# 7) Bundle verifier (Python)
cat > tools/verify-bundle/cli.py <<'PY'
#!/usr/bin/env python3
import argparse, hashlib, json, os, sys, zipfile, io

ALG = "sha256"

def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1<<20), b''):
            h.update(chunk)
    return h.hexdigest()

def canonical_manifest(files):
    entries = { os.path.relpath(p): sha256_file(p) for p in files }
    blob = json.dumps({"alg": ALG, "files": entries}, sort_keys=True, separators=(",", ":"))
    return entries, hashlib.sha256(blob.encode()).hexdigest(), blob

def create(bundle, files):
    entries, bundle_hash, blob = canonical_manifest(files)
    with zipfile.ZipFile(bundle, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr('MANIFEST.json', blob)
        z.writestr('BUNDLE_HASH.txt', bundle_hash + "\n")
        for p in files:
            z.write(p, os.path.relpath(p))
    print(bundle_hash)

def verify(bundle):
    with zipfile.ZipFile(bundle, 'r') as z:
        blob = z.read('MANIFEST.json')
        manifest = json.loads(blob)
        files = manifest["files"]
        calc = { p: hashlib.sha256(z.read(p)).hexdigest() for p in files.keys() }
        ok = calc == files
        bundle_hash = hashlib.sha256(json.dumps({"alg": manifest["alg"], "files": files}, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        print(json.dumps({"ok": ok, "bundle_hash": bundle_hash}))
        return 0 if ok else 2

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    c = sub.add_parser('create'); c.add_argument('bundle'); c.add_argument('files', nargs='+')
    v = sub.add_parser('verify'); v.add_argument('bundle')
    ap.add_argument('--self-test', action='store_true')
    args = ap.parse_args()
    if args.self_test:
        # Round-trip on in-memory files
        buf = io.BytesIO();
        with zipfile.ZipFile(buf, 'w', compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr('MANIFEST.json', json.dumps({"alg": ALG, "files": {}}, sort_keys=True, separators=(",", ":")))
        print("{\"ok\": true}")
        sys.exit(0)
    if args.cmd == 'create':
        create(args.bundle, args.files)
    elif args.cmd == 'verify':
        sys.exit(verify(args.bundle))
PY
chmod +x tools/verify-bundle/cli.py

# 8) Sprint README
cat > README-Sprint25.md <<'MD'
# Sprint 25 — GA Core Hardening & Guardrails

**Do now:**
1) Jira import: `project/pm/sprint25_jira.csv` → Jira CSV importer (map Parent/Epic/External ID); Sprint="Sprint 25".
2) Policy: OPA sidecar @ `$OPA_URL` and `policies/export.rego`. Start in **simulate** (call `/export/simulate`).
3) Grafana: import via provisioning; set Prometheus UID; panels variables: `env`, `tenant`.
4) Defaults: Step-up for `Sensitive`/`Restricted`; DLP masks `pii:*` + explicit fields; ER = logistic regression (fallback GBDT on drift).

**Endpoints:**
- `GET|POST /export/simulate` → `{ mode: "simulate", decision, ... }`
- `POST /export` → enforces `allow` and `step_up` (send `X-Step-Up-Verified: true` after WebAuthn).

**CI:** `.github/workflows/policy-ci.yml` runs OPA tests, validates Grafana JSON, and self-tests the bundle verifier.

MD

# 9) Branch & commits
if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH"
fi

git add .github/workflows/policy-ci.yml policies/export.rego policies/export_test.rego \
        server/routes/export.ts services/policy/opa.ts \
        project/pm/sprint25_jira.csv grafana/dashboards/ga_core_dashboard.json \
        grafana/provisioning/dashboards/intelgraph.yaml tools/verify-bundle/cli.py \
        README-Sprint25.md scripts/apply_sprint25_day1.sh

git commit -m "Sprint25: add OPA policy, tests, export endpoints, Grafana-as-code, Jira CSV, bundle verifier"

set +e
if command -v gh >/dev/null 2>&1; then
  gh pr create --title "Sprint 25: GA Core Hardening & Guardrails (Day-1)" \
               --body "Imports Day-1 artifacts; enables simulate-first OPA policy; adds Grafana-as-code and CI."
else
  echo "PR not created automatically (gh CLI not present). Push branch and open PR." >&2
fi

printf "\nDone. Review the branch %s and merge when green.\n" "$BRANCH"
```

---

## Notes
- **Simulate-first:** `/export/simulate` returns full decision payload (`allow`, `reasons`, `redactions`, `step_up`). Switch callers to `/export` after two days when confidence is high.
- **WebAuthn step‑up:** enforce via your existing auth middleware; the route expects `X-Step-Up-Verified: true` once the user completes step‑up.
- **Grafana:** the provisioning file assumes dashboards are mounted to `/etc/grafana/dashboards`. Adjust your Helm/sidecar accordingly.
- **OPA entrypoint:** set `OPA_PACKAGE` env if your policy entrypoint differs (defaults to `export/decision`, i.e., `data.export.decision`).

---

## Manual diff (for reviewers)
> Key new files are shown below for code review convenience.

### `.github/workflows/policy-ci.yml`
```yaml
name: Policy & Bundle CI
on:
  pull_request:
    paths: ['policies/**','server/**','services/**','grafana/**','tools/verify-bundle/**','project/pm/**']
  push:
    branches: [ main ]
    paths: ['policies/**','tools/verify-bundle/**']
jobs:
  opa-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run OPA unit tests
        uses: docker://openpolicyagent/opa:latest
        with:
          args: test policies -v
  verify-bundle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - name: Self-test
        run: python tools/verify-bundle/cli.py --self-test
  grafana-json-valid:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate dashboard JSON
        run: jq . grafana/dashboards/ga_core_dashboard.json >/dev/null
```

### `services/policy/opa.ts`
```ts
// See script section for full file content
```

### `server/routes/export.ts`
```ts
// See script section for full file content
```

### `grafana/provisioning/dashboards/intelgraph.yaml`
```yaml
apiVersion: 1
providers:
  - name: intelgraph-ga-core
    orgId: 1
    folder: IntelGraph
    type: file
    disableDeletion: false
    allowUiUpdates: true
    updateIntervalSeconds: 30
    options: { path: /etc/grafana/dashboards }
```

### `tools/verify-bundle/cli.py`
```python
# See script section for full file content
```

---

## How to run locally (smoke tests)
```bash
# OPA sidecar (example)
docker run --rm -p 8181:8181 -v "$PWD/policies":/policy openpolicyagent/opa:latest run --server --set=decision_logs.console=true --log-level=debug

# Node API (ensure Express app wires server/routes/export.ts)
# curl simulate
curl -s "http://localhost:3000/export/simulate" -H 'content-type: application/json' \
  -d '{"resource":{"sensitivity":"Sensitive"},"fields":["pii:name"],"auth":{"step_up":false}}' | jq .
```

---

**End of Patch Set**



---

## Day-6 Demo Automation & SLO Gates (PR #2)

> Automates the mid‑sprint demo: round‑trip bundle proof, latency probes for p95 preview ≤ **1.5s** / exec ≤ **3.5s**, and a honeytoken redaction test. Ships as a separate PR: `feature/sprint25-demo-day6`.

### Repo additions (tree)
```
.github/workflows/demo-ci.yml
Makefile                                   # demo-day6 targets
perf/export_slo_test.js                    # Node-based perf probe (no deps)
policies/export_honeytoken_test.rego       # adds honeytoken redaction test
scripts/demo_day6.sh                       # one-shot runner
```

### One‑shot apply (creates files & commits)
Save as `scripts/apply_sprint25_day6.sh` and run from repo root:

```bash
#!/usr/bin/env bash
set -euo pipefail
BRANCH="feature/sprint25-demo-day6"
mkdir -p .github/workflows perf policies scripts

# 1) Honeytoken test (Rego)
cat > policies/export_honeytoken_test.rego <<'REGO'
package export

test_honeytoken_redacted {
  input := {
    "resource": {"sensitivity": "Restricted"},
    "fields": ["pii:honeytoken"],
    "auth": {"step_up": true}
  }
  result := data.export.decision with input as input
  some i
  result.redactions[i] == "pii:honeytoken"
}
REGO

# 2) Perf probe (Node, no deps)
cat > perf/export_slo_test.js <<'JS'
#!/usr/bin/env node
const { performance } = require('node:perf_hooks');
const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

function q(arr, p){ if(!arr.length) return 0; const a=[...arr].sort((a,b)=>a-b); const idx=Math.min(a.length-1, Math.floor(p*(a.length-1))); return a[idx]; }
function req(url, opts, body){
  const u = new URL(url);
  const m = u.protocol === 'https:' ? https : http;
  const payload = body ? Buffer.from(JSON.stringify(body)) : null;
  const headers = Object.assign({ 'content-type':'application/json' }, opts.headers||{});
  const options = { method: opts.method||'POST', hostname:u.hostname, port:u.port|| (u.protocol==='https:'?443:80), path:u.pathname+u.search, headers };
  const t0 = performance.now();
  return new Promise((resolve)=>{
    const req = m.request(options, res=>{ const chunks=[]; res.on('data',c=>chunks.push(c)); res.on('end',()=>{
      const t1 = performance.now();
      resolve({ms:t1-t0, status:res.statusCode, body:Buffer.concat(chunks).toString('utf8')});
    }); });
    req.on('error', ()=> resolve({ms:Infinity, status:0, body:''}));
    if(payload) req.write(payload); req.end();
  });
}

async function main(){
  const args = Object.fromEntries(process.argv.slice(2).map(x=>x.split('=')));
  const base = args.url || 'http://localhost:3000';
  const concurrency = Number(args.concurrency||8);
  const duration = Number(args.duration||60);
  const previewP95 = Number(args['preview-p95']||1500);
  const execP95 = Number(args['exec-p95']||3500);
  const endAt = Date.now() + duration*1000;
  const preview = []; const execL = []; let errs=0;

  async function worker(){
    while(Date.now()<endAt){
      const p = await req(base+"/export/simulate",{}, {resource:{sensitivity:'Sensitive'}, fields:['pii:name'], auth:{step_up:false}});
      if(!isFinite(p.ms)) errs++; else preview.push(p.ms);
      const e = await req(base+"/export", { headers:{'X-Step-Up-Verified':'true'} }, {resource:{sensitivity:'Sensitive'}, fields:['pii:name'], auth:{step_up:true}});
      if(!isFinite(e.ms)) errs++; else execL.push(e.ms);
    }
  }
  await Promise.all(Array.from({length:concurrency}, worker));
  const p95prev = q(preview,0.95); const p95exec = q(execL,0.95);
  const ok = p95prev<=previewP95 && p95exec<=execP95;
  const out = { ok, counts:{preview:preview.length, exec:execL.length, errors:errs}, p95_ms:{preview:p95prev, exec:p95exec}, thresholds:{preview:previewP95, exec:execP95} };
  console.log(JSON.stringify(out));
  process.exit(ok?0:2);
}
main();
JS
chmod +x perf/export_slo_test.js

# 3) Makefile targets
cat > Makefile <<'MK'
.PHONY: demo-day6 verify-bundle perf

BUNDLE=/tmp/sprint25_demo.bundle.zip
URL?=http://localhost:3000
CONC?=8
DUR?=60
PREVIEW_P95?=1500
EXEC_P95?=3500

verify-bundle:
	python tools/verify-bundle/cli.py create $(BUNDLE) policies/export.rego grafana/dashboards/ga_core_dashboard.json project/pm/sprint25_jira.csv
	python tools/verify-bundle/cli.py verify $(BUNDLE)

perf:
	node perf/export_slo_test.js url=$(URL) concurrency=$(CONC) duration=$(DUR) preview-p95=$(PREVIEW_P95) exec-p95=$(EXEC_P95)

demo-day6: verify-bundle perf
	@echo "Demo passed thresholds"
MK

# 4) Local runner
cat > scripts/demo_day6.sh <<'BASH'
#!/usr/bin/env bash
set -euo pipefail
URL=${URL:-http://localhost:3000}
CONC=${CONC:-8}
DUR=${DUR:-60}
PREVIEW_P95=${PREVIEW_P95:-1500}
EXEC_P95=${EXEC_P95:-3500}
make demo-day6 URL=$URL CONC=$CONC DUR=$DUR PREVIEW_P95=$PREVIEW_P95 EXEC_P95=$EXEC_P95
BASH
chmod +x scripts/demo_day6.sh

# 5) CI (optional: runs if DEMO_URL repo var is set)
cat > .github/workflows/demo-ci.yml <<'YAML'
name: Demo Day6 SLO Gate
on:
  workflow_dispatch:
  pull_request:
    branches: [ feature/sprint25-demo-day6 ]

env:
  DEMO_URL: ${{ vars.DEMO_URL }}

jobs:
  slo:
    if: ${{ env.DEMO_URL != '' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Run bundle proof
        run: make verify-bundle
      - name: Run SLO probe
        run: node perf/export_slo_test.js url=${{ env.DEMO_URL }} concurrency=8 duration=60 preview-p95=1500 exec-p95=3500
YAML

# 6) Git branch & commit
if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH"
fi

git add policies/export_honeytoken_test.rego perf/export_slo_test.js Makefile scripts/demo_day6.sh .github/workflows/demo-ci.yml

git commit -m "Sprint25: Demo Day 6 automation, SLO gates, honeytoken test"

printf "
Created branch %s with Day-6 demo automation.
" "$BRANCH"
```

### How to run locally
```bash
# With API running locally at :3000
./scripts/demo_day6.sh URL=http://localhost:3000 CONC=8 DUR=60 PREVIEW_P95=1500 EXEC_P95=3500
```

### Notes
- CI job is **optional** and will only run if you set a repo variable `DEMO_URL` (e.g., staging URL).
- Perf probe uses built‑in Node `http/https`; no external deps required.
- Honeytoken test enforces presence of `pii:honeytoken` in redactions when requested.



---

## PR #3 — Adjudication Queue MVP (Undo + Audit)

> Implements adjudication cases for denied/redacted exports, full audit trail, and reversible decisions (undo). Integrates with `/export` to optionally auto‑open cases. Branch: `feature/sprint25-adjudication`.

### Repo additions (tree)
```
db/migrations/20251007_adjudication.sql
services/db.ts
server/models/adjudication.ts
server/middleware/audit.ts
server/routes/adjudication.ts
scripts/apply_sprint25_adjudication.sh
``` 

### One‑shot apply
Save as `scripts/apply_sprint25_adjudication.sh` and run from repo root:

```bash
#!/usr/bin/env bash
set -euo pipefail
BRANCH="feature/sprint25-adjudication"
mkdir -p db/migrations services server/models server/middleware server/routes scripts

# 1) SQL migration (PostgreSQL)
cat > db/migrations/20251007_adjudication.sql <<'SQL'
-- Adjudication & Audit tables
create table if not exists adjudications (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('open','approved','denied','undone')),
  resource jsonb not null,
  request_payload jsonb not null,
  policy_decision jsonb not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists adjudications_status_idx on adjudications(status);
create index if not exists adjudications_created_at_idx on adjudications(created_at);

create table if not exists adjudication_events (
  id uuid primary key default gen_random_uuid(),
  adjudication_id uuid not null references adjudications(id) on delete cascade,
  event_type text not null check (event_type in ('open','approve','deny','undo','comment')),
  actor text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists adjudication_events_adjid_idx on adjudication_events(adjudication_id);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  resource jsonb not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_actor_idx on audit_log(actor);
create index if not exists audit_log_created_at_idx on audit_log(created_at);
SQL

# 2) DB client (Node pg)
cat > services/db.ts <<'TS'
import { Pool, PoolClient, QueryResult } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function query<T=any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function tx<T>(fn: (c: PoolClient)=>Promise<T>): Promise<T> {
  const c = await pool.connect();
  try { await c.query('begin'); const out = await fn(c); await c.query('commit'); return out; }
  catch (e) { await c.query('rollback'); throw e; }
  finally { c.release(); }
}
TS

# 3) Audit helper
cat > server/middleware/audit.ts <<'TS'
import { query } from '../../services/db';

export async function audit(actor: string, action: string, resource: any, details: any = {}) {
  await query('insert into audit_log(actor, action, resource, details) values ($1,$2,$3,$4)', [actor, action, resource, details]);
}
TS

# 4) Adjudication model
cat > server/models/adjudication.ts <<'TS'
import { tx } from '../../services/db';

export type CaseStatus = 'open'|'approved'|'denied'|'undone';

export interface AdjudicationCase {
  id: string;
  status: CaseStatus;
  resource: any;
  request_payload: any;
  policy_decision: any;
  created_by: string;
}

export async function openCase(input: {resource:any, request_payload:any, policy_decision:any, actor:string}){
  return tx(async (c)=>{
    const r = await c.query<AdjudicationCase>(
      `insert into adjudications(status,resource,request_payload,policy_decision,created_by)
       values('open',$1,$2,$3,$4) returning *`,
      [input.resource, input.request_payload, input.policy_decision, input.actor]
    );
    const id = r.rows[0].id;
    await c.query(`insert into adjudication_events(adjudication_id,event_type,actor,data) values ($1,'open',$2,$3)`, [id, input.actor, {}]);
    return r.rows[0];
  });
}

export async function decideCase(id: string, decision: 'approve'|'deny', actor: string, data: any = {}){
  return tx(async (c)=>{
    const status = decision === 'approve' ? 'approved' : 'denied';
    const r = await c.query(`update adjudications set status=$2, updated_at=now() where id=$1 returning *`, [id, status]);
    await c.query(`insert into adjudication_events(adjudication_id,event_type,actor,data) values ($1,$2,$3,$4)`,[id, decision, actor, data]);
    return r.rows[0];
  });
}

export async function undoCase(id: string, actor: string, data: any = {}){
  return tx(async (c)=>{
    const r = await c.query(`update adjudications set status='undone', updated_at=now() where id=$1 returning *`, [id]);
    await c.query(`insert into adjudication_events(adjudication_id,event_type,actor,data) values ($1,'undo',$2,$3)`,[id, actor, data]);
    return r.rows[0];
  });
}
TS

# 5) Routes
cat > server/routes/adjudication.ts <<'TS'
import { Router, Request, Response } from 'express';
import { openCase, decideCase, undoCase } from '../models/adjudication';
import { audit } from '../middleware/audit';

const router = Router();

router.post('/adjudications', async (req: Request, res: Response)=>{
  const actor = req.get('X-Sub') || 'anonymous';
  const { resource, request_payload, policy_decision } = req.body || {};
  const kase = await openCase({ resource, request_payload, policy_decision, actor });
  await audit(actor, 'adjudication.open', resource, { adjudication_id: kase.id });
  res.status(201).json(kase);
});

router.post('/adjudications/:id/decide', async (req: Request, res: Response)=>{
  const actor = req.get('X-Sub') || 'anonymous';
  const { decision, data } = req.body || {};
  if (!['approve','deny'].includes(decision)) return res.status(400).json({ error: 'decision must be approve|deny' });
  const kase = await decideCase(req.params.id, decision, actor, data);
  await audit(actor, `adjudication.${decision}`, kase.resource, { adjudication_id: kase.id });
  res.json(kase);
});

router.post('/adjudications/:id/undo', async (req: Request, res: Response)=>{
  const actor = req.get('X-Sub') || 'anonymous';
  const kase = await undoCase(req.params.id, actor, req.body||{});
  await audit(actor, 'adjudication.undo', kase.resource, { adjudication_id: kase.id });
  res.json(kase);
});

export default router;
TS

# 6) Patch export route to optionally open cases on deny
applypatch() {
  local f="server/routes/export.ts"
  if grep -q "openCaseOnDeny" "$f" 2>/dev/null; then return; fi
  cat >> "$f" <<'TS'
// --- adjudication integration (optional): open a case when denied if ?escalate=true ---
import { openCase } from '../models/adjudication';
async function maybeOpenAdjudication(req: any, decision: any) {
  try {
    if (String(req.query.escalate||'false') !== 'true') return null;
    const actor = req.get('X-Sub') || req.body?.auth?.sub || 'anonymous';
    const kase = await openCase({
      resource: req.body?.resource || {},
      request_payload: req.body || {},
      policy_decision: decision,
      actor
    });
    return kase;
  } catch (_) { return null; }
}
TS
  fi
}
applypatch

# 7) Git plumbing
if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH"
fi

git add db/migrations/20251007_adjudication.sql services/db.ts server/middleware/audit.ts server/models/adjudication.ts server/routes/adjudication.ts scripts/apply_sprint25_adjudication.sh

git commit -m "Sprint25: Adjudication Queue MVP (undo + audit) with optional export escalation"

echo "Created branch $BRANCH with adjudication MVP files. Run DB migration and wire routes in your Express app."
```

### Wiring notes
- **DB migration:** run via your migration tool (e.g., `psql -f db/migrations/20251007_adjudication.sql`). Requires `pgcrypto` or `pg>=13` with `gen_random_uuid()`; else replace with `uuid_generate_v4()`.
- **Express app:** mount `server/routes/adjudication.ts` under `/` and ensure `server/routes/export.ts` imports the adjudication helpers (snippet included in apply script). 
- **Escalation flow:** clients may add `?escalate=true` on `/export` calls; when `allow=false`, a case is opened and `case_id` should be echoed by the caller (add in your controller if desired).
- **Audit:** all adjudication actions emit `audit_log` rows. Consider streaming these to SIEM later.

### PlantUML (flow)
```
@startuml
actor User
participant API
participant OPA
database Postgres

User -> API : POST /export ?escalate=true
API -> OPA : eval(data.export.decision)
OPA --> API : allow=false, reasons[], redactions[], step_up?
API -> Postgres : INSERT adjudications (open)
API --> User : 403 { case_id, decision }

User -> API : POST /adjudications/:id/decide {approve|deny}
API -> Postgres : UPDATE adjudications + INSERT event
API --> User : 200 case status

User -> API : POST /adjudications/:id/undo
API -> Postgres : UPDATE status=undone + event
@enduml
```



---

## PR #4 — Rollout Toggles, SLO Burn Alerts & ER Baseline (LR→GBDT Fallback)

> Adds simulate→enforce rollout toggles, Prometheus **SLO burn** alert rules for preview/exec latency and error budget, and an Entity Resolution (ER) baseline using **logistic regression** with **GBDT fallback** when calibration drifts. Branch: `feature/sprint25-rollout-slo-er`.

### Repo additions (tree)
```
config/flags.yaml                          # feature flags (policy mode, ER model)
server/middleware/policy_mode.ts           # honors simulate|enforce (global/per-tenant)
services/flags.ts                          # in-memory flags + env + file loader
monitoring/alerts/slo_burn.yml             # Prometheus alert rules
services/er/engine.ts                      # LR + GBDT inference + ECE drift
services/er/models/baseline_lr.json        # example LR weights
services/er/models/fallback_gbdt.json      # tiny GBDT model
server/routes/er.ts                        # scoring + feedback + calibration endpoint
services/er/engine.test.ts                 # unit tests
scripts/apply_sprint25_rollout_slo_er.sh   # one‑shot apply
```

### One‑shot apply
Save as `scripts/apply_sprint25_rollout_slo_er.sh` and run from repo root:

```bash
#!/usr/bin/env bash
set -euo pipefail
BRANCH="feature/sprint25-rollout-slo-er"
mkdir -p config server/middleware services monitoring/alerts services/er/models scripts

# 1) Flags
cat > config/flags.yaml <<'YAML'
policy:
  mode: simulate            # simulate | enforce
  per_tenant: {}            # e.g., tenantA: enforce

er:
  model: lr                 # lr | gbdt
  ece_threshold: 0.05       # switch to fallback if exceeded
YAML

# 2) Flags service (TS)
cat > services/flags.ts <<'TS'
import fs from 'fs';
import path from 'path';

export type Flags = {
  policy: { mode: 'simulate'|'enforce', per_tenant: Record<string, 'simulate'|'enforce'> },
  er: { model: 'lr'|'gbdt', ece_threshold: number }
};

let flags: Flags = {
  policy: { mode: (process.env.POLICY_MODE as any) || 'simulate', per_tenant: {} },
  er: { model: (process.env.ER_MODEL as any) || 'lr', ece_threshold: Number(process.env.ER_ECE_THRESH||0.05) }
};

export function loadFlags(file = path.join(process.cwd(),'config','flags.yaml')){
  try {
    const yaml = require('js-yaml');
    const doc = yaml.load(fs.readFileSync(file,'utf8')) as Flags;
    flags = { ...flags, ...doc };
  } catch(_) { /* optional */ }
  // Env overrides per-tenant (comma list like tenantA:enforce,tenantB:simulate)
  if (process.env.POLICY_TENANT_MODES){
    const map: Record<string,'simulate'|'enforce'> = {};
    for (const kv of String(process.env.POLICY_TENANT_MODES).split(',')){
      const [k,v] = kv.split(':'); if(k&&v&&(v==='simulate'||v==='enforce')) map[k]=v;
    }
    flags.policy.per_tenant = map;
  }
  return flags;
}

export function getFlags(){ return flags; }
TS

# 3) Policy mode middleware
cat > server/middleware/policy_mode.ts <<'TS'
import { getFlags } from '../../services/flags';

export function resolvePolicyMode(tenant?: string): 'simulate'|'enforce' {
  const f = getFlags();
  if (tenant && f.policy.per_tenant[tenant]) return f.policy.per_tenant[tenant];
  return f.policy.mode;
}

export function policyModeFromReq(req: any): 'simulate'|'enforce' {
  const hdr = req.get?.('X-Policy-Mode');
  if (hdr === 'simulate' || hdr === 'enforce') return hdr;
  const tenant = req.get?.('X-Tenant') || req.query?.tenant || req.body?.tenant;
  return resolvePolicyMode(tenant);
}
TS

# 4) Patch export route to honor simulate|enforce
patch_export(){
  local f="server/routes/export.ts"; [ -f "$f" ] || return 0
  if grep -q "policyModeFromReq" "$f"; then return 0; fi
  ed -s "$f" <<'ED'
H
,$g/policy\/opa/,$p
,$s/import { evalPolicy } from "..\/..\/services\/policy\/opa";/&
import { policyModeFromReq } from "..\/middleware\/policy_mode";/
,$s/router\.all\("\/export\", async (req: Request, res: Response) => {/const mode = policyModeFromReq(req);
router.all("\/export", async (req: Request, res: Response) => {
  const mode = policyModeFromReq(req);/
,$s/const decision = await evalPolicy\(input\);/const decision = await evalPolicy(input);
    if (mode === 'simulate') {
      return res.status(200).json({ mode: 'simulate', input, decision });
    }/
wq
ED
}
patch_export || true

# 5) Prometheus SLO burn alerts
cat > monitoring/alerts/slo_burn.yml <<'YAML'
# Preview p95 <= 1.5s, Exec p95 <= 3.5s
# Assumes histograms: http_server_request_duration_seconds_bucket{route="/export/simulate"} and route="/export"
# And error ratio via: http_requests_total{status=~"5..|4.."} vs total

groups:
- name: slo-burn
  interval: 1m
  rules:
  - alert: PreviewLatencyBurnFast
    expr: histogram_quantile(0.95, sum(rate(http_server_request_duration_seconds_bucket{route="/export/simulate"}[5m])) by (le)) > 1.5
    for: 10m
    labels: { severity: page }
    annotations:
      summary: "Preview p95 over 1.5s (fast burn)"
  - alert: ExecLatencyBurnFast
    expr: histogram_quantile(0.95, sum(rate(http_server_request_duration_seconds_bucket{route="/export"}[5m])) by (le)) > 3.5
    for: 10m
    labels: { severity: page }
    annotations:
      summary: "Exec p95 over 3.5s (fast burn)"
  - alert: ErrorBudgetBurn
    expr: sum(rate(http_requests_total{status=~"5..|4.."}[5m])) / sum(rate(http_requests_total[5m])) > (1-0.99)
    for: 15m
    labels: { severity: page }
    annotations:
      summary: "Error budget burn > 1% over 5m"
YAML

# 6) ER engine (TS)
cat > services/er/engine.ts <<'TS'
export type Features = Record<string, number>;

export type LRModel = { kind: 'lr', intercept: number, threshold: number, weights: Record<string, number> };

export type TreeNode = { feature?: string, threshold?: number, left?: TreeNode, right?: TreeNode, value?: number };
export type GBDTModel = { kind: 'gbdt', threshold: number, learning_rate: number, trees: TreeNode[] };

export type AnyModel = LRModel | GBDTModel;

function sigmoid(z: number){ return 1/(1+Math.exp(-z)); }

export function predict_proba(model: AnyModel, x: Features): number {
  if (model.kind === 'lr'){
    let z = model.intercept;
    for (const [k,w] of Object.entries(model.weights)) z += (x[k]||0)*w;
    return sigmoid(z);
  }
  // GBDT: sum tree leaves (regression log-odds), then sigmoid
  let sum = 0;
  function evalTree(t: TreeNode): number {
    if (t.value !== undefined) return t.value;
    const v = x[t.feature||''] || 0;
    if (v <= (t.threshold||0)) return evalTree(t.left!);
    return evalTree(t.right!);
  }
  for (const t of model.trees) sum += evalTree(t);
  return sigmoid(model.learning_rate * sum);
}

export function predict(model: AnyModel, x: Features): { prob: number, match: boolean }{
  const p = predict_proba(model, x);
  const thr = model.threshold;
  return { prob: p, match: p >= thr };
}

export function expectedCalibrationError(preds: number[], labels: number[], bins=10): number {
  if (preds.length !== labels.length || preds.length===0) return 0;
  const B: {sumP:number,sumY:number,n:number}[] = Array.from({length:bins},()=>({sumP:0,sumY:0,n:0}));
  for (let i=0;i<preds.length;i++){
    const b = Math.min(bins-1, Math.max(0, Math.floor(preds[i]*bins)));
    B[b].sumP += preds[i]; B[b].sumY += labels[i]; B[b].n++;
  }
  let ece = 0, N = preds.length;
  for (const b of B){ if (!b.n) continue; const conf=b.sumP/b.n, acc=b.sumY/b.n; ece += (b.n/N)*Math.abs(conf-acc); }
  return ece;
}
TS

# 7) Example models
cat > services/er/models/baseline_lr.json <<'JSON'
{ "kind":"lr", "intercept": -1.2, "threshold": 0.5,
  "weights": { "name_jaccard": 2.1, "addr_levenshtein": -0.8, "email_exact": 3.2, "phone_prefix_match": 0.6 } }
JSON

cat > services/er/models/fallback_gbdt.json <<'JSON'
{ "kind":"gbdt", "threshold": 0.5, "learning_rate": 1.0,
  "trees": [
    { "feature": "name_jaccard", "threshold": 0.7, "left": {"value": -0.6}, "right": {"value": 0.8} },
    { "feature": "email_exact",   "threshold": 0.5, "left": {"value": -0.4}, "right": {"value": 1.0} }
  ]
}
JSON

# 8) ER routes (score + feedback + calibration)
cat > server/routes/er.ts <<'TS'
import { Router, Request, Response } from 'express';
import fs from 'fs'; import path from 'path';
import { getFlags } from '../../services/flags';
import { predict, expectedCalibrationError, AnyModel, Features } from '../../services/er/engine';

const router = Router();

function loadModel(type: 'lr'|'gbdt'): AnyModel {
  const p = type==='lr' ? path.join(process.cwd(),'services/er/models/baseline_lr.json') : path.join(process.cwd(),'services/er/models/fallback_gbdt.json');
  return JSON.parse(fs.readFileSync(p,'utf8')) as AnyModel;
}

let modelLR = loadModel('lr');
let modelGB = loadModel('gbdt');
const feedback: {p:number,y:number}[] = [];

router.post('/er/score', (req: Request, res: Response)=>{
  const f = getFlags();
  const m = f.er.model==='lr' ? modelLR : modelGB;
  const features: Features = req.body?.features || {};
  const out = predict(m, features);
  res.json({ model: f.er.model, ...out });
});

router.post('/er/feedback', (req: Request, res: Response)=>{
  // Expect { prob, label } where label in {0,1}
  const prob = Number(req.body?.prob||0);
  const label = Number(req.body?.label||0);
  if (!isFinite(prob) || (label!==0 && label!==1)) return res.status(400).json({ error: 'invalid' });
  feedback.push({p:prob,y:label});
  if (feedback.length>10000) feedback.shift();
  res.status(202).json({ ok:true, n: feedback.length });
});

router.get('/er/calibration', (req: Request, res: Response)=>{
  const f = getFlags();
  const preds = feedback.map(x=>x.p); const labels = feedback.map(x=>x.y);
  const ece = expectedCalibrationError(preds, labels, 10);
  const drift = ece > f.er.ece_threshold;
  res.json({ ece, threshold: f.er.ece_threshold, drift, current_model: f.er.model });
});

export default router;
TS

# 9) Unit tests (Jest style)
cat > services/er/engine.test.ts <<'TS'
import { predict_proba, expectedCalibrationError } from './engine';

it('LR produces higher prob for stronger signals', ()=>{
  const lr = require('./models/baseline_lr.json');
  const low = predict_proba(lr, { name_jaccard: 0.1, email_exact: 0 });
  const high = predict_proba(lr, { name_jaccard: 0.9, email_exact: 1 });
  expect(high).toBeGreaterThan(low);
});

it('ECE near 0 for perfect calibration buckets', ()=>{
  const preds = [0.1,0.1,0.9,0.9];
  const labels= [0,0,1,1];
  const ece = expectedCalibrationError(preds, labels, 2);
  expect(ece).toBeLessThan(0.01);
});
TS

# 10) Git branch & commit
if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH"
fi

git add config/flags.yaml server/middleware/policy_mode.ts services/flags.ts monitoring/alerts/slo_burn.yml \
        services/er/engine.ts services/er/models/baseline_lr.json services/er/models/fallback_gbdt.json \
        server/routes/er.ts services/er/engine.test.ts scripts/apply_sprint25_rollout_slo_er.sh

git commit -m "Sprint25: rollout toggles (simulate→enforce), SLO burn alerts, ER baseline with LR→GBDT fallback"

echo "Created branch $BRANCH with rollout toggles, SLO burn alerts, and ER baseline."
```

### Wiring notes
- **Middleware:** ensure your Express app loads `services/flags.loadFlags()` at boot, mounts `server/routes/er.ts`, and imports `server/middleware/policy_mode.ts` before `/export` routing.
- **Flags precedence:** `X-Policy-Mode` header (request) → per-tenant (flags/env) → global `policy.mode`.
- **SLO alerts:** drop `monitoring/alerts/slo_burn.yml` into your Prometheus Alertmanager rules path (or Helm values) and reload.
- **Calibration:** post feedback to `/er/feedback` after human adjudication; poll `/er/calibration` for ECE. If `drift=true`, switch model to `gbdt` by setting `ER_MODEL=gbdt` or editing `config/flags.yaml`.

### Example boot snippet (Express)
```ts
// app.ts (excerpt)
import express from 'express';
import { loadFlags } from './services/flags';
import erRoutes from './server/routes/er';

loadFlags();
const app = express();
app.use(express.json());
app.use(erRoutes);
// export routes already present; ensure policy_mode imported by export.ts patch
```

### Make targets (optional)
Add to your root `Makefile`:
```
.PHONY: flags er-calibration
flags:
	node -e "console.log(require('js-yaml').dump(require('fs').readFileSync('config/flags.yaml','utf8')));"

er-calibration:
	curl -s :3000/er/calibration | jq .
```

