# Runbook: Local Smoke → Evidence Bundle (v0.1)

## 0) One-time setup

```bash
# from repo root
cp .env.example .env.local
docker compose up -d --build
# apply Neo4j constraints & seed
cat db/neo4j/constraints.cypher | docker exec -i $(docker ps -qf name=neo4j) cypher-shell -u neo4j -p neo4jpassword
cat db/neo4j/seed.cypher | docker exec -i $(docker ps -qf name=neo4j) cypher-shell -u neo4j -p neo4jpassword
```

## 1) Ingest demo data

```bash
npm --prefix ingest run demo
```

**Pass** if console prints `Ingested >= 3 rows`.

## 2) API sanity & SLO smoke

```bash
# basic query
curl -s -H 'Content-Type: application/json' -H 'x-tenant: demo-tenant' \
  -d '{"query":"{ searchPersons(q:\"a\", limit:3){ id name } }"}' \
  http://localhost:4000/graphql | jq .

# k6 p95 checks
node ops/k6/api-smoke.js   # or: k6 run ops/k6/api-smoke.js
node ops/k6/cypher-load.js # or: k6 run ops/k6/cypher-load.js
```

**Targets**: API p95 ≤ 350 ms; 1-hop Cypher p95 ≤ 300 ms.

## 3) Policy simulation (OPA)

```bash
opa eval --data policies --input <(echo '{"subject":{"tenantId":"demo-tenant"},"action":"read","resource":{"tenantId":"demo-tenant"}}') "data.abac.allow"
```

**Pass** if result is `true`. Cross-tenant should be `false`.

## 4) Tests

```bash
npm --prefix api test
npm --prefix ingest test
```

## 5) Evidence bundle (attach to PR)

Create a tamper-evident bundle of artifacts (hash-manifest + reports):

### `scripts/evidence.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
ARTIFACTS_DIR=.evidence
rm -rf "$ARTIFACTS_DIR" && mkdir -p "$ARTIFACTS_DIR"
# collect
cp -v ops/k6/*.js "$ARTIFACTS_DIR"/ || true
npm --prefix api test -- --reporters=default --json --outputFile="$ARTIFACTS_DIR/api-tests.json" || true
npm --prefix ingest test -- --reporters=default --json --outputFile="$ARTIFACTS_DIR/ingest-tests.json" || true
# optional: k6 summaries if installed
command -v k6 >/dev/null && k6 run --summary-export "$ARTIFACTS_DIR/api-k6.json" ops/k6/api-smoke.js || true
command -v k6 >/dev/null && k6 run --summary-export "$ARTIFACTS_DIR/cypher-k6.json" ops/k6/cypher-load.js || true
# manifest
( cd "$ARTIFACTS_DIR" && find . -type f -print0 | sort -z | xargs -0 shasum -a 256 > MANIFEST.sha256 )
# tarball
TS=$(date -u +%Y%m%dT%H%M%SZ)
TAR="evidence_$TS.tgz"
tar -czf "$TAR" -C "$ARTIFACTS_DIR" .
shasum -a 256 "$TAR" > "$TAR.sha256"
echo "Bundle: $TAR"
```

Make executable and run:

```bash
chmod +x scripts/evidence.sh
./scripts/evidence.sh
```

Artifacts will appear under `.evidence/` plus a versioned tarball.
