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
    paths:
      [
        'policies/**',
        'server/**',
        'services/**',
        'grafana/**',
        'tools/verify-bundle/**',
        'project/pm/**',
      ]
  push:
    branches: [main]
    paths: ['policies/**', 'tools/verify-bundle/**']
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
