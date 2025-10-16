# IntelGraph – Local Stack (docker-compose) & Perf Tests (k6) + PR-4

This package adds a reproducible local stack (Neo4j + OPA + Kafka) and baseline k6 performance tests, wrapped as **PR‑4**. Everything is copy‑pasteable patches and commands.

---

## PR‑4 – Local stack & perf tests

**Branch:** `feature/local-stack-perf`  
**Open PR:**

```bash
git checkout -b feature/local-stack-perf
# apply patches below, commit, push
gh pr create -t "Local stack (Neo4j+OPA+Kafka) & k6 perf tests" -b "docker-compose, seed data, OPA policy, k6 scenarios + Makefile targets" -B develop -H feature/local-stack-perf -l prio:P0,area:ops
```

---

## 1) docker-compose stack

**Patch:**

```diff
*** Begin Patch
*** Add File: docker-compose.yml
+version: '3.9'
+services:
+  neo4j:
+    image: neo4j:5.22
+    container_name: ig_neo4j
+    environment:
+      - NEO4J_AUTH=${NEO4J_USER:-neo4j}/${NEO4J_PASSWORD:-neo4j}
+      - NEO4J_dbms_memory_heap_initial__size=1G
+      - NEO4J_dbms_memory_heap_max__size=1G
+      - NEO4J_server_http_listen__address=0.0.0.0:7474
+      - NEO4J_server_bolt_listen__address=0.0.0.0:7687
+    ports:
+      - "7474:7474"
+      - "7687:7687"
+    volumes:
+      - neo4j-data:/data
+      - ./scripts/seed.cypher:/docker-entrypoint-initdb.d/seed.cypher:ro
+
+  zookeeper:
+    image: bitnami/zookeeper:3.9
+    environment:
+      - ALLOW_ANONYMOUS_LOGIN=yes
+    ports: ["2181:2181"]
+
+  kafka:
+    image: bitnami/kafka:3.7
+    environment:
+      - KAFKA_CFG_ZOOKEEPER_CONNECT=zookeeper:2181
+      - ALLOW_PLAINTEXT_LISTENER=yes
+      - KAFKA_CFG_LISTENERS=PLAINTEXT://:9092
+      - KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092
+    depends_on: [ zookeeper ]
+    ports: ["9092:9092"]
+
+  opa:
+    image: openpolicyagent/opa:0.66.0
+    command: ["run","--server","--log-level=debug","/policies/policy.rego"]
+    volumes:
+      - ./policies:/policies:ro
+    ports:
+      - "8181:8181"
+
+  api:
+    build: ./services/api
+    environment:
+      - PORT=4000
+      - NEO4J_URI=bolt://neo4j:7687
+      - NEO4J_USER=${NEO4J_USER:-neo4j}
+      - NEO4J_PASSWORD=${NEO4J_PASSWORD:-neo4j}
+      - MAX_COST=1000
+    depends_on: [ neo4j, opa ]
+    ports: ["4000:4000"]
+
+volumes:
+  neo4j-data:
*** End Patch
```

### Minimal Dockerfile for API

```diff
*** Begin Patch
*** Add File: services/api/Dockerfile
+FROM node:20-alpine
+WORKDIR /app
+COPY package.json package-lock.json* ./
+RUN npm ci || npm i
+COPY src ./src
+COPY src/persisted.json ./src/persisted.json
+EXPOSE 4000
+CMD ["npm","run","start"]
*** End Patch
```

---

## 2) Seed data for local testing

```diff
*** Begin Patch
*** Add File: scripts/seed.cypher
+// Simple graph for shortestPath and entity fetch
+CREATE (a:Person {id:'P1', name:'Alice'});
+CREATE (b:Person {id:'P2', name:'Bob'});
+CREATE (c:Person {id:'P3', name:'Carol'});
+CREATE (d:Host {id:'H1', ip:'10.0.0.1'});
+MATCH (a {id:'P1'}),(b {id:'P2'}),(c {id:'P3'}),(d {id:'H1'})
+CREATE (a)-[:KNOWS]->(b), (b)-[:KNOWS]->(c), (c)-[:LOGGED_IN]->(d);
*** End Patch
```

Optional seed script:

```diff
*** Begin Patch
*** Add File: scripts/seed.sh
+#!/usr/bin/env bash
+set -euo pipefail
+NEO4J_USER=${NEO4J_USER:-neo4j}
+NEO4J_PASSWORD=${NEO4J_PASSWORD:-neo4j}
+echo "Seeding via cypher-shell..."
+docker exec -i ig_neo4j cypher-shell -u $NEO4J_USER -p $NEO4J_PASSWORD < /docker-entrypoint-initdb.d/seed.cypher
+echo "Done."
*** End Patch
```

---

## 3) OPA policy (baseline ABAC placeholder)

```diff
*** Begin Patch
*** Add File: policies/policy.rego
+package intelgraph.authz
+
+default allow = false
+
+allow {
+  input.user.role == "analyst"
+  input.action == "read"
+}
+
+allow {
+  input.user.role == "admin"
+}
*** End Patch
```

(We’ll wire API → OPA later; this gives us a running policy server for integration.)

---

## 4) k6 performance tests

**Install:** `brew install k6` (or use `docker run -i grafana/k6 run -`).

```diff
*** Begin Patch
*** Add File: tests/perf/api_shortest_path.js
+import http from 'k6/http';
+import { check, sleep } from 'k6';
+
+export const options = {
+  vus: 10,
+  duration: '30s',
+  thresholds: {
+    http_req_duration: ['p(95)<1500'],
+  },
+};
+
+const url = 'http://localhost:4000/';
+const headers = { 'Content-Type': 'application/json', 'apq-id': 'shortest' };
+
+export default function () {
+  const payload = JSON.stringify({ variables: { src: 'P1', dst: 'H1' } });
+  const res = http.post(url, payload, { headers });
+  check(res, {
+    'status 200': (r) => r.status === 200,
+    'has data': (r) => r.body && r.body.includes('shortestPath'),
+  });
+  sleep(0.2);
+}
*** End Patch
```

```diff
*** Begin Patch
*** Add File: tests/perf/api_entity_get.js
+import http from 'k6/http';
+import { check } from 'k6';
+
+export const options = { vus: 20, duration: '20s', thresholds: { http_req_duration: ['p(95)<800'] } };
+
+const url = 'http://localhost:4000/';
+const headers = { 'Content-Type': 'application/json', 'apq-id': 'getEntity' };
+
+export default function () {
+  const payload = JSON.stringify({ variables: { id: 'P1' } });
+  const res = http.post(url, payload, { headers });
+  check(res, { '200': (r) => r.status === 200 });
+}
*** End Patch
```

---

## 5) Makefile helpers

```diff
*** Begin Patch
*** Update File: Makefile
@@
 .PHONY: test docker helm
 test:
 	npm test --workspaces --if-present && pytest -q || true
 docker:
 	docker compose build && docker compose up -d
+down:
+	docker compose down -v
+seed:
+	bash scripts/seed.sh || true
+perf:
+	k6 run tests/perf/api_shortest_path.js && k6 run tests/perf/api_entity_get.js
 helm.package:
 	helm package infrastructure/helm/intelgraph -d charts/
 helm.index:
 	helm repo index charts/ --url https://brianclong.github.io/intelgraph/charts
*** End Patch
```

---

## 6) Local runbook

1. `cp .env.example .env` (optional: set `NEO4J_USER`/`NEO4J_PASSWORD`).
2. `make docker` → starts **Neo4j, Kafka, OPA, API**.
3. Seed demo data: `make seed`.
4. Hit GraphQL:
   - Persisted ID `getEntity`: `curl -s -H 'apq-id: getEntity' -d '{"variables":{"id":"P1"}}' http://localhost:4000/`.
   - Persisted ID `shortest`: `curl -s -H 'apq-id: shortest' -d '{"variables":{"src":"P1","dst":"H1"}}' http://localhost:4000/`.
5. Run perf: `make perf` (targets p95 under thresholds).

---

## 7) Notes & Next

- Wire **API → OPA** with a proper authz check per request (plugin calling `POST /v1/data/intelgraph/authz`).
- Add **Kafka topics** and a placeholder **ingest** service container once connectors start emitting events.
- Integrate **GitHub Action** to run k6 with `grafana/k6-action` on PRs labelled `perf`.
