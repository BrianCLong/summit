# Pilot Cutover & Staging Promotion Playbook — IntelGraph Unification Release

> Goal: Move an existing pilot tenant onto the unified GA stack with zero data loss and minimal downtime; then promote from **dev → stage → prod** with automated smoke/perf/compliance gates, feature‑flag rollout, and rollback plans.

**Timezone:** America/Denver • **Release tag:** `v1.0.0-uni`

---

## 0) Roles & Preconditions

- **Release Captain:** approves freezes, flips flags
- **DBA:** Neo4j + Postgres backups/rollbacks
- **SRE:** Helm/Kustomize deploy, Grafana/Jaeger/Prom
- **Security Lead:** OPA bundle review, DPIA sign‑off
- **Analyst Rep:** validates flows against acceptance scripts

### Required

- Artifacts built & pushed: images for all services at `v1.0.0-uni`
- Helm chart packaged: `dist/intelgraph-0.1.0.tgz`
- Vault secrets populated; Keycloak realm exported
- Data exports validated on dev snapshot

---

## 1) Data Migration Plan (Pilot → Unified)

### 1.1 Backups (T‑24h & T‑1h)

```bash
# Neo4j (online backup or dump)
neo4j-admin database dump neo4j --to-path=/backups/$(date +%F)
# Postgres
pg_dump "$POSTGRES_URL" > backups/pg_$(date +%F_%H%M).sql
# MinIO (optional)
mc mirror minio/intelgraph s3-backup/intelgraph-$(date +%F)
```

### 1.2 Export existing claims → re‑manifest (hash stability)

```bash
curl -s http://old-ledger/claims?limit=100000 > exports/claims.json
jq -r '.[].id' exports/claims.json > exports/claim_ids.txt
# Build new manifest batches of 1k
split -l 1000 exports/claim_ids.txt exports/batch_
for f in exports/batch_*; do
  ids=$(jq -R -s 'split("\n")|map(select(length>0))' $f)
  curl -s -XPOST $NEW_LEDGER/manifests -H 'content-type: application/json' \
    -d "{\"claimIds\":$ids}" | tee -a exports/new_manifests.json
done
```

### 1.3 Entities/Edges import (if old graph exists outside Neo4j)

```bash
# Prepare CSVs to match new schema (id,label,type,country,createdAt)
python tools/migrate/export_graph.py --src old --out imports/
cypher-shell -u neo4j -p $NEO4J_PASS -a $NEO4J_URL < data/import/import.cypher
```

### 1.4 Case/Report metadata

```sql
-- Map legacy case tables into Case/Task/ReportMeta
INSERT INTO "Case"(id,name,status,owner) SELECT guid,title,'open',owner FROM legacy_cases;
INSERT INTO "Task"(id,caseId,assignee,title,status) SELECT guid,case_guid,assignee,summary,state FROM legacy_tasks;
INSERT INTO "ReportMeta"(id,caseId,title,audience,fileKey) SELECT guid,case_guid,title,audience,key FROM legacy_reports;
```

### 1.5 Budget initialization

```bash
curl -s -XPOST $BUDGET/init -H 'content-type: application/json' \
  -d '{"tenant":"pilot","ms":2500,"rows":100000}'>/dev/null
```

---

## 2) Identity & Secrets

### 2.1 Keycloak realm (OIDC)

```bash
# Import realm JSON
kcadm.sh config credentials --server $KC_URL --realm master --user admin --password *****
kcadm.sh create realms -f keycloak/realm-intelgraph.json || kcadm.sh update realms/intelgraph -f keycloak/realm-intelgraph.json
# Create client intelgraph-api and set audience / JWKS
```

### 2.2 Vault Secrets (CSI)

```bash
vault kv put secret/intelgraph neo4j/password=*** postgres/url=*** minio/key=*** minio/secret=***
# Ensure CSI driver is enabled; Helm values reference these keys
```

---

## 3) Staging Deployment (Blue/Green)

### 3.1 Install/Upgrade

```bash
helm upgrade --install intelgraph dist/intelgraph-0.1.0.tgz \
  -n intelgraph --create-namespace \
  -f deploy/helm/intelgraph/values.yaml \
  -f deploy/helm/intelgraph/overlays/values-generated.yaml \
  --set image.tag=v1.0.0-uni
```

### 3.2 Post‑deploy jobs

```bash
kubectl -n intelgraph apply -f deploy/k8s/cron-retention.yaml
kubectl -n intelgraph rollout status deploy/intelgraph-gateway --timeout=180s
```

### 3.3 Smoke (automated)

```bash
make e2e
docker run --network host -i grafana/k6 run - < ops/k6/gateway-queries.js
node tools/demo/e2e-demo.ts
```

### 3.4 Perf & CPI gate

```bash
PROM_URL=http://prometheus.intelgraph:9090 node perf/scripts/run-suite.ts > perf/summary.json
jq '.p95_ms < 1500 and (.cost_per_insight|tonumber) <= 0.005' perf/summary.json | grep true
```

### 3.5 Compliance gate

```bash
opa test -v compliance/opa
node services/hardening/scripts/sbom.cjs
node ops/accessibility/axe-ci.js
```

### 3.6 Security smoke

```bash
semgrep --config p/ci
trufflehog filesystem --only-verified .
```

---

## 4) Feature Flags & Gradual Rollout

### 4.1 Flags (unified.yaml → render → configmap reload)

- `enableXAI`, `enableFederation`, `enableWallets`, `enableOffline`, `strictOPA`, `prodMode`

### 4.2 Rollout plan

1. Enable `prodMode`, keep advanced features **off**.
2. Enable `enableXAI` for internal group only (Keycloak group claim).
3. After 24h soak, enable Federation/Wallets for pilot.
4. Keep `strictOPA=true` from start; monitor deny rates.

---

## 5) Cutover Window (Pilot)

### 5.1 Timeline (example)

- **T‑30m:** Freeze writes on legacy; banner users to maintenance
- **T‑20m:** Final backups; export deltas (claims/cases)
- **T‑10m:** Apply deltas to new ledger/case DB
- **T:** DNS cut to new gateway; invalidate CDN if used
- **T+10m:** Run smoke & sanity flows; unfreeze

### 5.2 DNS & Health

```bash
# Preconfigure ingress with blue/green hostnames
kubectl -n intelgraph get ingress
# Flip CNAME: gateway.pilot → gateway.blue
```

### 5.3 Sanity checklist

- Login works (OIDC), roles honored
- NL→Cypher preview & execution OK
- Analytics/Pattern returns non‑empty results
- Case creation + Report render OK
- Runbook runs, proofs generated
- Budget denials present on heavy queries
- DSAR bundle returns; retention cron logs deletes (dry‑run OK)
- XAI overlays; Federation returns claim hashes; Wallet issue/verify OK

---

## 6) Rollback Strategy

- Keep **green** old stack for 24h.
- If CPI/latency/deny rates regress > threshold, flip DNS back.
- DB migrations are additive—no destructive changes; manifests re‑creatable from claims.
- Keep old images in registry; `helm rollback intelgraph <rev>`.

---

## 7) Observability & Alerting

- Import Grafana space **IntelGraph GA**.
- Alerts:
  - `p95_graph_ms > 1500` for 10m
  - `policy_denied_rate > 5%` for 15m
  - `budget_denies > 20/h` sustained
  - `wallet_revocations spike` > 3σ
- On alert, link to Jaeger traces with `tenant=pilot` tag.

---

## 8) Scripts & Utilities

### 8.1 Keycloak token mint (service account)

```bash
curl -s --data 'grant_type=client_credentials&client_id=intelgraph-api&client_secret=***' \
  $KEYCLOAK/auth/realms/intelgraph/protocol/openid-connect/token | jq -r .access_token > token.txt
```

### 8.2 Budget tweak

```bash
curl -s -XPOST $BUDGET/check -H 'content-type: application/json' -d '{"tenant":"pilot","estMs":5000,"estRows":2e6}'
```

### 8.3 Manifest verify sample

```bash
mid=$(jq -r '.[0].id' exports/new_manifests.json)
curl -s $NEW_LEDGER/manifests/$mid/export | jq '.'
```

---

## 9) Post‑Cutover Tasks

- Update **Runbook Library** for pilot use‑cases (IDs prefixed with tenant)
- Import **Report templates** and redaction profiles
- Set **budgets** per case severity (Low/Med/High)
- Train analysts on **Policy Inspector** and **Wallet Disclosure**

---

## 10) Sign‑off Checklist

- [ ] All gates green (smoke/perf/compliance/security)
- [ ] 24h soak clean (no Sev‑1/2)
- [ ] DPIA addendum filed; OPA logs sampled
- [ ] Release notes updated with pilot specifics
- [ ] Old stack decommissioned

---

## 11) Appendices

- **A. Helm values diff template**
- **B. Keycloak realm template**
- **C. Vault policy & role examples**
- **D. Sample DNS switch plan**
