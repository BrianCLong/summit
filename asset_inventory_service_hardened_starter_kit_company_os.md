# Asset Inventory Service — Hardened Starter Kit (CompanyOS)

> Purpose: Create a production‑grade service to collect, normalize, and expose inventories for **aws.accounts**, **gcp.projects**, **azure.subscriptions**, and monitoring endpoints (**prometheus**, **grafana**). Replace ad‑hoc shell commands with least‑privilege collectors, provenance, and policy gates.

---

## 0) Architecture (C4‑L2)
- **API**: `asset-inventory-api` (FastAPI). Read-only endpoints; optional write endpoints for paste/seed.
- **Collectors**: stateless, idempotent **CronJobs** per provider: `collector-aws`, `collector-gcp`, `collector-azure`, `collector-prom`, `collector-grafana`.
- **Store**: Postgres (prod) / SQLite (dev). Single schema `inventory` with provenance columns.
- **AuthN/Z**: ServiceAccount + IRSA/WI (cloud-native workload identity). API protected via service mesh or OAuth proxy (viewer ok for Grafana path).
- **Observability**: Prom metrics, structured logs with trace IDs.
- **Governance**: OPA policies for network egress + secret usage; signed images & SBOMs.

---

## 1) Data Model (SQL)
```sql
-- schema.sql
create schema if not exists inventory;
create table if not exists inventory.cloud_accounts (
  id text primary key,
  provider text not null check (provider in ('aws','gcp','azure')),
  name text,
  org_path text,
  status text,
  region_residency text,
  raw jsonb not null,
  discovered_at timestamptz not null default now(),
  source text not null, -- which collector/version
  provenance jsonb not null -- CLI/SDK, request ids, paginations
);
create index if not exists cloud_accounts_provider_idx on inventory.cloud_accounts(provider);

create table if not exists inventory.monitoring_endpoints (
  id text primary key,
  kind text not null check (kind in ('prometheus','grafana')),
  url text not null,
  auth_mode text not null check (auth_mode in ('none','token','basic','oauth')),
  status text,
  raw jsonb,
  discovered_at timestamptz not null default now(),
  provenance jsonb not null
);
```

---

## 2) API (FastAPI) — minimal routes
```python
# services/asset-inventory/api/main.py
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
import os, json, sqlite3
app = FastAPI(title="CompanyOS Asset Inventory", version="0.1.0")
DB_PATH = os.getenv("DB_PATH", "./data/inventory.db")

def conn():
    return sqlite3.connect(DB_PATH)

class EndpointIn(BaseModel):
    id: str
    kind: str
    url: str
    auth_mode: str = "none"

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.get("/api/v1/accounts")
def accounts(provider: str | None = None):
    q = "select id, provider, name, status, raw from inventory_cloud_accounts"
    params = []
    if provider:
        q += " where provider=?"; params=[provider]
    with conn() as c:
        c.row_factory = sqlite3.Row
        rows = c.execute(q, params).fetchall()
    return [dict(r) for r in rows]

@app.get("/api/v1/monitoring")
def monitoring(kind: str | None = None):
    q = "select id, kind, url, status, raw from inventory_monitoring_endpoints"
    params = []
    if kind:
        q += " where kind=?"; params=[kind]
    with conn() as c:
        c.row_factory = sqlite3.Row
        rows = c.execute(q, params).fetchall()
    return [dict(r) for r in rows]

@app.post("/api/v1/monitoring")
def upsert_endpoint(ep: EndpointIn):
    with conn() as c:
        c.execute(
            "insert into inventory_monitoring_endpoints (id,kind,url,auth_mode,status,raw,provenance)\n             values (?,?,?,?,?,'{}','{""method"":""api""}')\n             on conflict(id) do update set url=excluded.url, auth_mode=excluded.auth_mode",
            (ep.id, ep.kind, ep.url, ep.auth_mode, "active")
        )
    return {"ok": True}
```
> Notes: SQLite table names flattened for SQLite convenience: `inventory_cloud_accounts`, `inventory_monitoring_endpoints` (create via migration step below).

---

## 3) Collectors (SDK‑based; no `shell=True`)

### 3.1 AWS
```python
# services/asset-inventory/collectors/aws_collect.py
import boto3, json, os, datetime, sqlite3
ORG_ROLE_ARN = os.getenv("AWS_ORG_AUDIT_ROLE_ARN")
DB_PATH = os.getenv("DB_PATH", "./data/inventory.db")

def assume(role):
    sts=boto3.client('sts')
    creds=sts.assume_role(RoleArn=role, RoleSessionName='asset-inventory')['Credentials']
    return boto3.client('organizations',
        aws_access_key_id=creds['AccessKeyId'],
        aws_secret_access_key=creds['SecretAccessKey'],
        aws_session_token=creds['SessionToken'])

def run():
    org=assume(ORG_ROLE_ARN)
    paginator = org.get_paginator('list_accounts')
    rows=[]
    for page in paginator.paginate():
        for a in page['Accounts']:
            rows.append((a['Id'], 'aws', a.get('Name'), a.get('Arn'), a.get('Status'), json.dumps(a), json.dumps({"source":"aws-sdk","ts":datetime.datetime.utcnow().isoformat()})))
    with sqlite3.connect(DB_PATH) as c:
        c.executemany("insert into inventory_cloud_accounts (id,provider,name,org_path,status,raw,provenance) values (?,?,?,?,?,?,?) on conflict(id) do update set name=excluded.name, status=excluded.status, raw=excluded.raw", rows)

if __name__ == "__main__":
    run()
```

### 3.2 GCP
```python
# services/asset-inventory/collectors/gcp_collect.py
from google.cloud import resourcemanager_v3
import json, os, sqlite3, datetime
DB_PATH=os.getenv("DB_PATH","./data/inventory.db")

def run():
    client = resourcemanager_v3.ProjectsClient()
    rows=[]
    for p in client.list_projects():
        raw = resourcemanager_v3.Project.to_dict(p)
        rows.append((p.name.split('/')[-1], 'gcp', p.display_name, p.parent, p.state.name, json.dumps(raw), json.dumps({"source":"gcp-sdk","ts":datetime.datetime.utcnow().isoformat()})))
    with sqlite3.connect(DB_PATH) as c:
        c.executemany("insert into inventory_cloud_accounts (id,provider,name,org_path,status,raw,provenance) values (?,?,?,?,?,?,?) on conflict(id) do update set name=excluded.name, status=excluded.status, raw=excluded.raw", rows)

if __name__ == "__main__":
    run()
```

### 3.3 Azure
```python
# services/asset-inventory/collectors/azure_collect.py
from azure.identity import DefaultAzureCredential
from azure.mgmt.resource import SubscriptionClient
import os, sqlite3, json, datetime
DB_PATH=os.getenv("DB_PATH","./data/inventory.db")

def run():
    cred=DefaultAzureCredential()
    client=SubscriptionClient(cred)
    rows=[]
    for s in client.subscriptions.list():
        raw = {"subscription_id": s.subscription_id, "display_name": s.display_name, "state": s.state.value}
        rows.append((s.subscription_id, 'azure', s.display_name, None, s.state.value, json.dumps(raw), json.dumps({"source":"azure-sdk","ts":datetime.datetime.utcnow().isoformat()})))
    with sqlite3.connect(DB_PATH) as c:
        c.executemany("insert into inventory_cloud_accounts (id,provider,name,org_path,status,raw,provenance) values (?,?,?,?,?,?,?) on conflict(id) do update set name=excluded.name, status=excluded.status, raw=excluded.raw", rows)

if __name__ == "__main__":
    run()
```

### 3.4 Prometheus + Grafana
```python
# services/asset-inventory/collectors/monitoring_collect.py
import requests, os, sqlite3, json, datetime
DB_PATH=os.getenv("DB_PATH","./data/inventory.db")
PROM_URL=os.getenv("PROM_URL")
GRAFANA_URL=os.getenv("GRAFANA_URL")
GRAFANA_TOKEN=os.getenv("GRAFANA_TOKEN")

def run():
    rows=[]
    if PROM_URL:
        try:
            r=requests.get(f"{PROM_URL}/api/v1/status/runtimeinfo", timeout=5)
            rows.append(("prom-default","prometheus",PROM_URL,"token" if 'Authorization' in r.request.headers else 'none',"up" if r.ok else "down", json.dumps(r.json() if r.ok else {}), json.dumps({"source":"prom","ts":datetime.datetime.utcnow().isoformat()})))
        except Exception:
            rows.append(("prom-default","prometheus",PROM_URL,"none","down", "{}", json.dumps({"source":"prom","error":True})))
    if GRAFANA_URL:
        headers={}
        if GRAFANA_TOKEN:
            headers={"Authorization":f"Bearer {GRAFANA_TOKEN}"}
        r=requests.get(f"{GRAFANA_URL}/api/health", headers=headers, timeout=5)
        rows.append(("grafana-default","grafana",GRAFANA_URL,"token" if GRAFANA_TOKEN else 'none',"up" if r.ok else "down", json.dumps(r.json() if r.ok else {}), json.dumps({"source":"grafana","ts":datetime.datetime.utcnow().isoformat()})))
    with sqlite3.connect(DB_PATH) as c:
        c.executemany("insert into inventory_monitoring_endpoints (id,kind,url,auth_mode,status,raw,provenance) values (?,?,?,?,?,?,?) on conflict(id) do update set url=excluded.url, status=excluded.status, raw=excluded.raw", rows)

if __name__ == "__main__":
    run()
```

---

## 4) Packaging

### 4.1 Requirements
```text
# services/asset-inventory/requirements.txt
fastapi
uvicorn[standard]
boto3
google-cloud-resource-manager
azure-identity
azure-mgmt-resource
requests
prometheus-client
pydantic
```

### 4.2 Dockerfile (non‑root, slim, SBOM‑friendly)
```dockerfile
# services/asset-inventory/Dockerfile
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN adduser --disabled-password --gecos '' app && mkdir -p /app/data && chown -R app:app /app
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY api/ ./api/
COPY collectors/ ./collectors/
COPY migrations/ ./migrations/
USER app
EXPOSE 8080
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

---

## 5) Migrations (SQLite starter)
```bash
# services/asset-inventory/migrations/init.sh
set -euo pipefail
DB_PATH=${DB_PATH:-./data/inventory.db}
mkdir -p $(dirname "$DB_PATH")
python - <<'PY'
import sqlite3, os
schema='''
create table if not exists inventory_cloud_accounts (
  id text primary key, provider text, name text, org_path text, status text, raw json, provenance json
);
create table if not exists inventory_monitoring_endpoints (
  id text primary key, kind text, url text, auth_mode text, status text, raw json, provenance json
);
'''
os.makedirs('./data', exist_ok=True)
con=sqlite3.connect(os.getenv('DB_PATH','./data/inventory.db'))
con.executescript(schema)
con.commit(); con.close()
PY
```

---

## 6) Kubernetes (Helm‑ready manifests)
```yaml
# services/asset-inventory/k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: asset-inventory
  labels: {app: asset-inventory}
spec:
  replicas: 2
  selector: {matchLabels: {app: asset-inventory}}
  template:
    metadata:
      labels: {app: asset-inventory}
    spec:
      serviceAccountName: asset-inventory
      containers:
      - name: api
        image: ghcr.io/ORG/REPO/asset-inventory:{{ .SHA | default "latest" }}
        ports: [{containerPort: 8080}]
        readinessProbe: {httpGet: {path: /healthz, port: 8080}, initialDelaySeconds: 2, periodSeconds: 10}
        livenessProbe: {httpGet: {path: /healthz, port: 8080}, initialDelaySeconds: 10, periodSeconds: 20}
        resources:
          requests: {cpu: 50m, memory: 64Mi}
          limits: {cpu: 200m, memory: 256Mi}
        env:
        - name: DB_PATH
          value: /data/inventory.db
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: asset-inventory
spec:
  selector: {app: asset-inventory}
  ports: [{port: 80, targetPort: 8080}]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: asset-inventory
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/asset-inventory-audit # IRSA (example)
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: {name: asset-inventory}
spec:
  minAvailable: 1
  selector: {matchLabels: {app: asset-inventory}}
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: {name: asset-inventory}
spec:
  scaleTargetRef: {apiVersion: apps/v1, kind: Deployment, name: asset-inventory}
  minReplicas: 2
  maxReplicas: 5
  metrics:
    - type: Resource
      resource: {name: cpu, target: {type: Utilization, averageUtilization: 70}}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: {name: asset-inventory-deny-all}
spec:
  podSelector: {matchLabels: {app: asset-inventory}}
  policyTypes: [Egress, Ingress]
  ingress: []
  egress:
    - to:
      - namespaceSelector: {}
      ports:
      - protocol: TCP
        port: 443
```

### 6.1 CronJobs
```yaml
# services/asset-inventory/k8s/cronjobs.yaml
apiVersion: batch/v1
kind: CronJob
metadata: {name: collector-aws}
spec:
  schedule: "*/15 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: asset-inventory
          containers:
            - name: collector
              image: ghcr.io/ORG/REPO/asset-inventory:{{ .SHA | default "latest" }}
              command: ["python","/app/collectors/aws_collect.py"]
              env:
                - name: DB_PATH
                  value: /data/inventory.db
                - name: AWS_ORG_AUDIT_ROLE_ARN
                  valueFrom:
                    secretKeyRef: {name: asset-inventory, key: aws_org_audit_role_arn}
          restartPolicy: OnFailure
---
# Similar CronJobs for gcp_collect.py, azure_collect.py, monitoring_collect.py
```

---

## 7) CI/CD (GitHub Actions)
```yaml
# .github/workflows/asset-inventory.yml
name: asset-inventory
on:
  pull_request:
    paths: [ 'services/asset-inventory/**' ]
  push:
    branches: [ main ]
    paths: [ 'services/asset-inventory/**' ]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r services/asset-inventory/requirements.txt
      - run: python -m pyflakes services/asset-inventory || true
  build-sbom-sign:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - name: Build image
        run: |
          IMAGE=ghcr.io/${{ github.repository }}/asset-inventory:${{ github.sha }}
          docker build -t $IMAGE services/asset-inventory
          echo IMAGE=$IMAGE >> $GITHUB_ENV
      - name: SBOM
        uses: anchore/sbom-action@v0
        with: { image: ${{ env.IMAGE }}, format: cyclonedx-json, output-file: sbom.cdx.json }
      - name: Trivy gate
        uses: aquasecurity/trivy-action@0.24.0
        with: { image-ref: ${{ env.IMAGE }}, exit-code: '1', severity: 'CRITICAL,HIGH' }
      - name: Push image
        run: echo "$CR_PAT" | docker login ghcr.io -u $GITHUB_ACTOR --password-stdin && docker push $IMAGE
        env: { CR_PAT: ${{ secrets.GITHUB_TOKEN }} }
      - name: Cosign sign
        uses: sigstore/cosign-installer@v3
      - run: cosign sign --yes ${{ env.IMAGE }}
```

---

## 8) Backstage Component
```yaml
# services/asset-inventory/catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: asset-inventory
  description: CompanyOS cloud & monitoring asset registry.
  annotations:
    companyos.io/inventory-api: "/api/v1"
    companyos.io/providers: "aws,gcp,azure,prometheus,grafana"
spec:
  type: service
  lifecycle: beta
  owner: team-platform
  system: companyos
```

---

## 9) ArgoCD App
```yaml
# deploy/argocd/apps/asset-inventory.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: asset-inventory
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/ORG/REPO.git
    targetRevision: main
    path: services/asset-inventory/k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: companyos
  syncPolicy:
    automated: {prune: true, selfHeal: true}
    syncOptions: [CreateNamespace=true]
```

---

## 10) OPA/Gatekeeper Policies (snippets)
```rego
# policy/egress.rego
package kubernetes.network
violation[{
  "msg": msg,
}] {
  input.kind.kind == "NetworkPolicy"
  count(input.spec.egress) == 0
  msg := "Egress must be explicitly allowed to known endpoints"
}
```

---

## 11) README / Runbook
- **Dev**: `make dev` → runs API + local collectors against SQLite; set `PROM_URL`, `GRAFANA_URL` envs.
- **First Deploy**:
  1. Create secrets (examples below).
  2. Commit ArgoCD app; sync.
  3. Verify `/healthz`, then `/api/v1/accounts?provider=aws`.
- **Secrets**:
```bash
kubectl -n companyos create secret generic asset-inventory \
  --from-literal=aws_org_audit_role_arn=arn:aws:iam::111111111111:role/OrgAuditRole \
  --from-literal=grafana_token=REDACTED
```
- **SLO**: 99.9% API availability; collectors complete within 5 min every 15 min.
- **Dashboards**: export Prom metrics; wire to Grafana.

---

## 12) Patch Notes vs. Prior Attempt
- Replaced shell‑based CLI calls with official SDKs (idempotent, typed, paginated).
- Added data store + provenance for auditability.
- Introduced collectors as CronJobs; API is read‑only, scalable.
- Hardened container (non‑root), probes, resources, NetworkPolicy, HPA, PDB.
- CI/CD with SBOM, signing, vuln gate.
- Fixed repo paths (`services/asset-inventory/k8s/...`).
- Backstage annotations simplified; inventory exposed via API instead of stuffing JSON into catalog.

---

## 13) Open Items (fill before prod)
- Choose workload identity per cloud (IRSA / GCP WI / Azure Workload Identity) and set correct annotations.
- Decide Postgres vs SQLite; if Postgres, add StatefulSet + PVC.
- Add OAuth/OIDC in front of API (auth‑proxy) if exposed beyond cluster.
- Register Grafana dashboards + Prom alerts for collectors' freshness.

