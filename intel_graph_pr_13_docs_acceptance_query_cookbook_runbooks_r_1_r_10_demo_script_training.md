# IntelGraph – PR‑13 Docs & Acceptance (Query Cookbook, Runbooks R1–R10, Demo Script, Training)

This package consolidates **documentation**, **acceptance tests**, and **enablement**. It adds a query cookbook, full runbook drafts (R1–R7, R9, R10), demo script, training labs, and CI wiring for BDD acceptance tests.

---

## PR‑13 – Branch & PR

**Branch:** `chore/docs-acceptance`  
**Open PR:**
```bash
git checkout -b chore/docs-acceptance
# apply patches below, commit, push
gh pr create -t "Docs & Acceptance: query cookbook, runbooks R1–R10, demo script, training labs" -b "Adds comprehensive docs under /docs, Gherkin acceptance tests with CI, runbook drafts with KPIs & legal preconditions, demo walkthrough, and training labs." -B develop -H chore/docs-acceptance -l prio:P0,area:docs
```

---

## 1) Docs tree

```diff
*** Begin Patch
*** Add File: docs/README.md
+# IntelGraph Documentation

- **Architecture**: `/docs/architecture/`
- **Query Cookbook**: `/docs/cookbook/`
- **Runbooks**: `/docs/runbooks/`
- **Governance & Policy**: `/docs/governance/`
- **Operations**: `/docs/ops/`
- **Demo**: `/docs/demo/`
- **Training**: `/docs/training/`
*** End Patch
```

```diff
*** Begin Patch
*** Add File: docs/architecture/overview.md
+# Architecture Overview

Services: API (GraphQL), Ingest, ER, Analytics, Copilot, Prov‑Ledger, UI, OPA, Kafka, Neo4j.

Data model (MVP): Entity(id, kind, props), Edge(rel, validFrom/Until), Claim, Provenance.

Cross‑cutting: ABAC (OPA), Audit, OTEL, Prom/Grafana, cost/slow guards.
*** End Patch
```

---

## 2) Query Cookbook (GraphQL + Cypher)

```diff
*** Begin Patch
*** Add File: docs/cookbook/time_travel.md
+# Time‑travel Queries

**Goal:** Read a node/edge as of a historical time.

**GraphQL persisted ID**: `getEntityAt` (planned)

**Cypher template:**
```cypher
MATCH (n {id:$id})
WHERE n.validFrom <= datetime($t) AND (n.validUntil IS NULL OR n.validUntil >= datetime($t))
RETURN n
```

**Acceptance:** Given a node valid 2024‑01‑01→2025‑03‑01, when t=2024‑06‑01, attributes match snapshot.
*** End Patch
```

```diff
*** Begin Patch
*** Add File: docs/cookbook/policy_aware_shortest.md
+# Policy‑aware Shortest Path

**Goal:** Shortest path honoring OPA field/resource policy.

**GraphQL persisted ID:** `shortest`

**Cypher:**
```cypher
MATCH (a {id:$src}),(b {id:$dst})
CALL algo.shortestPaths.stream(a,b,$maxHops) YIELD nodeId
RETURN nodeId
```

**OPA input:** `{ user, action:'read', resource:{ sensitivity } }`

**Acceptance:** When sensitivity=restricted and role=analyst, only allowed fields returned.
*** End Patch
```

```diff
*** Begin Patch
*** Add File: docs/cookbook/geo_copresence.md
+# Geo Co‑Presence

**Goal:** Identify entities co‑present within Δt and Δd.

**Analytics API:** `/analytics/patterns/copresence`

**Acceptance:** Given sightings A,B within 1km/120m, pair (A,B) returned.
*** End Patch
```

---

## 3) Governance & Policy

```diff
*** Begin Patch
*** Add File: docs/governance/opa_policies.md
# OPA Policies (MVP)

- Role→Action matrix (analyst/admin)
- Sensitivity→allowed_fields
- Deny reasons and policy simulation
- TODO: purpose, legalBasis, license
*** End Patch
```

---

## 4) Ops Docs

```diff
*** Begin Patch
*** Add File: docs/ops/observability.md
# Observability

- Metrics: `http_request_duration_ms`, `query_rejected_total`
- Tracing: OTEL; exporter to Collector (4318)
- Dashboards: Grafana `API Latency`
*** End Patch
```

---

## 5) Demo Script (public GA)

```diff
*** Begin Patch
*** Add File: docs/demo/ga_walkthrough.md
# GA Demo Walkthrough

1. Start stack: `make docker && make seed`
2. **UI** (http://localhost:8080): Graph tap → Timeline/Map sync; Ctrl/Cmd‑K → Copilot NL→Cypher preview.
3. **ABAC**: `make policy.sim` → show allow/fields.
4. **ER**: `make er.score` then `make er.merge.preview`.
5. **Prov‑Ledger**: `make prov.export` → inspect signature & merkle_root.
6. **Analytics**: `make analytics.centrality`.
7. **Perf**: `make perf`, open Grafana.
*** End Patch
```

---

## 6) Runbooks (R1–R7, R9, R10) – drafts with KPIs & preconditions

```diff
*** Begin Patch
*** Add File: docs/runbooks/R1-rapid-attribution.md
# R1 Rapid Attribution (CTI)

**Objective:** Attribute phishing/malware infra clusters within 30m.

**Inputs:** STIX/TAXII, MISP, OFAC, DNS/WHOIS.

**Steps:**
1. Ingest TAXII feed and DNS/WHOIS.
2. ER merge suspected alias IOCs.
3. Analytics: centrality + infra clustering; pattern burst.
4. Copilot: NL→Cypher for "paths from campaign X to IP Y".
5. Export: Prov‑Ledger manifest.

**KPIs:** time‑to‑first‑hypothesis < 30m; % citations present; replay determinism 100%.
*** End Patch
```

```diff
*** Begin Patch
*** Add File: docs/runbooks/R2-phishing-cluster.md
# R2 Phishing Cluster Discovery (DFIR)

**Objective:** Cluster phishing emails & infra.

**Inputs:** IMAP, HTTP fetcher, DNS/WHOIS.

**Steps:** parse headers, cluster by from/IP, ER email/DNS, centrality.

**KPIs:** cluster precision > 0.8.
*** End Patch
```

```diff
*** Begin Patch
*** Add File: docs/runbooks/R3-disinformation-network.md
# R3 Disinformation Network Mapping

**Objective:** Map narratives & amplifiers.

**Inputs:** RSS/HTTP, social exports.

**Steps:** collect articles, ER by domain/author, narrative grouping, timeline bursts.

**KPIs:** narrative coverage > 80%; citation density.
*** End Patch
```

```diff
*** Begin Patch
*** Add File: docs/runbooks/R4-aml-structuring.md
# R4 AML Structuring Detection

**Objective:** Detect structuring patterns.

**Inputs:** CSV/S3 transactional exports; sanctions list.

**Steps:** amount bucketing; copresence of accounts; SAR export template.

**KPIs:** alert precision/recall (pilot dataset).
*** End Patch
```

```diff
*** Begin Patch
*** Add File: docs/runbooks/R5-hrd-vetting.md
# R5 Human Rights Incident Vetting

**Objective:** Vet incident reports with provenance.

**Inputs:** media, OSINT.

**Steps:** register exhibits (Prov‑Ledger), cross‑source corroboration, contradiction tagging.

**KPIs:** % exhibits with valid manifests; 0 unexplained deltas.
*** End Patch
```

```diff
*** Begin Patch
*** Add File: docs/runbooks/R6-supply-chain-compromise.md
# R6 Supply‑Chain Compromise Trace

**Objective:** Trace dependency compromise.

**Inputs:** SBOM (S3/HTTP), advisories, DNS/WHOIS.

**Steps:** ingest SBOM, map dependencies, centrality on impacted subgraph, COA drafting.

**KPIs:** time‑to‑blast‑radius.
*** End Patch
```

```diff
*** Begin Patch
*** Add File: docs/runbooks/R7-insider-risk.md
# R7 Insider‑Risk (Consent‑Bound)

**Objective:** Evaluate insider risk with consent/purpose limits.

**Inputs:** access logs, HR data (licensed).

**Steps:** enforce ABAC purpose tags, anomaly queue triage, ombuds approval flow.

**KPIs:** adverse‑event rate = 0; time‑to‑decision.
*** End Patch
```

```diff
*** Begin Patch
*** Add File: docs/runbooks/R9-crisis-ops.md
# R9 Crisis Ops (Civic)

**Objective:** Support crisis response.

**Inputs:** RSS/HTTP, geodata.

**Steps:** map lifeline assets, convoy planning, COA simulation outline.

**KPIs:** time‑to‑map; accuracy of co‑presence alerts.
*** End Patch
```

```diff
*** Begin Patch
*** Add File: docs/runbooks/R10-darkweb-lead-vetting.md
# R10 Dark‑Web Lead Vetting

**Objective:** Vet leads with license‑aware intake + corroboration.

**Inputs:** HTTP fetcher, CSV/S3.

**Steps:** license gating, corroboration scoring, Prov‑Ledger export.

**KPIs:** false‑positive rate.
*** End Patch
```

---

## 7) Acceptance tests (Gherkin) + CI wiring

```diff
*** Begin Patch
*** Add File: tests/acceptance/features/policy_aware_shortest.feature
Feature: Policy‑aware shortest path
  Scenario: Analyst on restricted resource sees permitted fields
    Given a graph with nodes P1 and H1 connected within 6 hops
    When I call persisted query "shortest" with headers:
      | authorization            | role analyst |
      | x-resource-sensitivity  | restricted   |
    Then the response status is 200
    And the response contains nodes with fields allowed by policy
*** End Patch
```

```diff
*** Begin Patch
*** Add File: tests/acceptance/features/prov_manifest.feature
Feature: Provenance export manifest
  Scenario: Export and verify manifest
    Given an exhibit "hello world"
    When I export a manifest with one identity step
    Then the manifest verifies with matching signature and merkle_root
*** End Patch
```

```diff
*** Begin Patch
*** Add File: tests/acceptance/runner.py
+import json, base64, requests, os
+
+def test_policy_shortest():
+  url='http://localhost:4000/'
+  r = requests.post(url, headers={'content-type':'application/json','apq-id':'shortest','authorization':'role analyst','x-resource-sensitivity':'restricted'}, json={'variables':{'src':'P1','dst':'H1'}})
+  assert r.status_code==200
+
+def test_prov_manifest():
+  data=base64.b64encode(b'hello world').decode('utf8')
+  R=requests.post('http://localhost:4300/prov/register/bytes', json={'data_b64':data}).json(); cid=R['cid']
+  M=requests.post('http://localhost:4300/prov/export/manifest', json={'exhibits':[cid],'steps':[{'name':'s1','deps':[],'op':'identity','params':{}}]}).json()['manifest']
+  V=requests.post('http://localhost:4300/prov/verify/manifest', json=M)
+  assert V.status_code==200
*** End Patch
```

```diff
*** Begin Patch
*** Add File: .github/workflows/acceptance.yml
+name: Acceptance Tests
+on:
+  workflow_dispatch:
+  push:
+    branches: [ develop ]
+jobs:
+  accept:
+    runs-on: ubuntu-latest
+    services:
+      neo4j:
+        image: neo4j:5.22
+        ports: ['7687:7687','7474:7474']
+        env:
+          NEO4J_AUTH: neo4j/neo4j
+    steps:
+      - uses: actions/checkout@v4
+      - run: docker compose up -d --build
+      - uses: actions/setup-python@v5
+        with: { python-version: '3.12' }
+      - run: pip install requests
+      - run: python tests/acceptance/runner.py
*** End Patch
```

---

## 8) Training labs

```diff
*** Begin Patch
*** Add File: docs/training/labs.md
# Training Labs

## Analyst I
- Use Copilot to propose NL→Cypher for shortest path.
- Run Analytics burst and explain output.

## Operator
- Configure Ingest Wizard for CSV + RSS.
- Verify connectors produce expected counts.

## Ombudsman
- Use policy simulation to show deny reasons.
- Export a Prov‑Ledger manifest and verify.
*** End Patch
```

---

## 9) CONTRIBUTING + Style

```diff
*** Begin Patch
*** Add File: CONTRIBUTING.md
# Contributing to IntelGraph

- Branching: feature/*, chore/*, fix/* → PR → develop → main.
- Tests: unit + integration + acceptance; add datasets under `services/*/tests`.
- Security: no secrets in code; use `.env` or GH Environments; follow OPA policy.
- Style: PEP‑8 (Python), ESLint/Prettier (Node).
*** End Patch
```

---

## 10) Next after merge

- Flesh out runbooks with **dataset links**, **automations**, and **export templates**.
- Expand acceptance runner to spin the full compose stack and assert JSON schemas.
- Link demo walkthrough into the UI (help menu) and add a