# Integration Mega‑Sprint — The Unification Release (Everything Connected, Production‑Ready)

> Objective: **Integrate absolutely everything** assembled to date—from ideation/Wishbooks through Sprints 1–4, GA bundle, E2E demo, datasets, perf pack, security/compliance ops—into a coherent, production‑ready platform. One command to stand up, one path to deploy, one schema of truth, and a single pane of glass for ops. No orphaned services. No dangling docs. **Everything** connected, tested, observed, and releasable.

**Sprint Window (America/Denver):** Wed **Oct 1 → Nov 25, 2025** (condensed execution plan below assumes final hardening iteration)

---

## 0) Inventory & Dependency Map (Everything)

### 0.1 Services & Roles

- **Core**: `gateway-graphql`, `lac-policy-compiler (LAC)`, `prov-ledger`, `analytics-service (GDS)`, `pattern-miner`, `ai-nl2cypher`, `case-service`, `report-service`, `runbook-engine`, `budget-guard`, `archive-tier (MinIO)`, `offline-sync (CRDT)`
- **Advanced**: `xai-service`, `federation-service`, `wallet-service`
- **Ops/Sec**: `hardening` (fuzz/sbom/a11y/soak), `dsar-service`, `retention-jobs`
- **Data/Perf**: dataset generators, importers; perf suite (k6, CPI), dashboards
- **Infra**: Compose (dev), Helm/Kustomize (k8s), CI pipelines, Make targets

### 0.2 Unified Dependency Graph (simplified)

```
 webapp
   │
 gateway-graphql ──► LAC ──► OPA(bundle)
   │                └─► Prov‑Ledger
   ├─► Analytics (Neo4j/GDS) ──► Neo4j
   ├─► Pattern‑Miner ───────► Neo4j
   ├─► NL→Cypher
   ├─► Case‑Service ──► Postgres
   ├─► Report‑Service
   ├─► Runbook‑Engine ──► {Gateway, Analytics, NL→Cypher}
   ├─► Budget‑Guard
   ├─► Archive‑Tier ──► MinIO (S3)
   ├─► Offline‑Sync
   ├─► XAI‑Service ──► Neo4j
   ├─► Federation‑Service ──► Neo4j
   └─► Wallet‑Service

 Observability: OTEL→Collector→Jaeger; Prom→Grafana
 Auth: Keycloak OIDC → Gateway → services (JWT/RBAC/ABAC)
```

---

## 1) Unification Deliverables (This Sprint)

1. **Single Config Standard** (`/config/unified.yaml`) → generates env for dev/k8s; includes secrets refs (Vault) and feature flags.
2. **Auth Everywhere**: Keycloak OIDC + RBAC/ABAC propagation; `subject` context enforced gateway→services; step‑up for EXPORT.
3. **Schema of Truth**: canonical types, GraphQL schema finalized; service contracts pinned; JSON Schemas published.
4. **Policy Path**: LAC first, then OPA bundle; reason codes in audit; policy simulation panel in webapp.
5. **Provenance End‑to‑End**: claims on ingest, manifests for analytics outputs, report captions linked, wallets carry hashes.
6. **Cost Guard & Budgets**: pre‑execute estimates + budget checks; slow‑query killer; dashboards & alerts.
7. **Data Lifecycle**: ingestion → archive tiering; retention cron; DSAR export path; legal hold honored.
8. **E2E Orchestrator**: one Make target runs seed + end‑to‑end demo + perf sweep + compliance demo.
9. **Observability One‑Stop**: standardized OTEL attributes, Prom labels; Grafana space with all panels; red/green gates.
10. **K8s Production Manifests**: Helm values hardened (resources, HPA, PDB, NPs), TLS/mTLS options, readiness/liveness across services.
11. **Docs Unification**: operator runbook, analyst guide, API ref, security & DPIA consolidated; changelog finalized.

---

## 2) Unified Config & Feature Flags

```
config/unified.yaml

env:
  common:
    OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
    PROM_PUSHGATEWAY: http://prometheus:9091
    LAC_URL: http://lac:7001
    LEDGER_URL: http://ledger:7002
    ANALYTICS_URL: http://analytics:7003
    MINER_URL: http://miner:7004
    NL_URL: http://nl2cypher:7005
    CASE_URL: http://case:7006
    REPORT_URL: http://report:7007
    RUNBOOK_URL: http://runbook:7008
    BUDGET_URL: http://budget:7009
    ARCHIVE_URL: http://archive:7010
    OFFLINE_URL: http://offline:7011
    XAI_URL: http://xai:7012
    FED_URL: http://fed:7013
    WALLET_URL: http://wallet:7014
    DSAR_URL: http://dsar:7015
    OPA_URL: http://opa:8181
    KEYCLOAK_ISSUER: https://keycloak/auth/realms/intelgraph
    KEYCLOAK_AUDIENCE: intelgraph-api
    NEO4J_URL: bolt://neo4j:7687
    NEO4J_USER: neo4j
    NEO4J_PASS: ${vault:neo4j/password}
    POSTGRES_URL: ${vault:postgres/url}
    S3_ENDPOINT: http://minio:9000
    S3_KEY: ${vault:minio/key}
    S3_SECRET: ${vault:minio/secret}
  flags:
    enableXAI: true
    enableFederation: true
    enableWallets: true
    enableOffline: true
    strictOPA: true
    prodMode: true
```

**Generator**: `tools/config/render.ts` translates unified.yaml → per‑service `.env` and Helm `values.yaml` overlays (dev/stage/prod).

---

## 3) Auth/RBAC/ABAC Wiring (Gateway & Services)

- Gateway middleware validates Keycloak JWT, extracts `sub`, `roles`, and `attrs` (tenant, clearance), attaches to `ctx.subject`.
- All mutations call LAC first; LAC calls OPA; deny returns **human reason**.
- Step‑up: operations tagged `EXPORT` require WebAuthn/ACR level enforced by Keycloak; propagated claim in token.

**Gateway snippet (final):**

```ts
// services/gateway-graphql/src/auth.ts
import jwksRsa from 'jwks-rsa';
import jwt from 'jsonwebtoken';
export async function auth(req: any) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) throw new Error('unauthenticated');
  const kid: any = (jwt.decode(token, { complete: true }) as any)?.header?.kid;
  const client = jwksRsa({
    jwksUri:
      process.env.KEYCLOAK_JWKS ||
      `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`,
  });
  const key = await client.getSigningKey(kid);
  const pub = key.getPublicKey();
  const decoded: any = jwt.verify(token, pub, {
    audience: process.env.KEYCLOAK_AUDIENCE,
    issuer: process.env.KEYCLOAK_ISSUER,
  });
  return {
    subject: {
      sub: decoded.sub,
      roles: decoded.realm_access?.roles || [],
      attrs: { tenant: decoded.tnt, acr: decoded.acr },
    },
  };
}
```

**Service side**: uniform helper reads `x-subject` header forwarded by gateway or re‑verifies JWT when called directly.

---

## 4) Schema of Truth & Contracts

- Publish **GraphQL SDL** under `/contracts/schema.graphql` (frozen for this release).
- Publish **JSON Schemas** for REST payloads: LAC enforce, ledger claims/manifests, runbook run, pattern params, wallet bundle.
- Contract tests in CI (`services/*/contract.test.ts`) call gateway with canned fixtures; snapshots stored.

---

## 5) Policy Path & Simulation Panel

- Webapp **Policy Inspector**: paste action + resource → see LAC decision & OPA reason; diff simulator.
- All denials emit `policy_denied{rule="id",opa_reason="..."}` metric + audit log with trace id.

---

## 6) Provenance Everywhere

- Ingest wizard registers initial claims; analytics services register derived claims; report captions attach manifest IDs; wallets include claim hash lists; federation returns only claim hashes + proof.
- `prov-ledger` adds `/claims/search` + pagination; `/manifests/:id/export` returns W3C‑style proof envelope (seeded).

---

## 7) Cost Guard & Budgets (Finalized)

- Gateway wraps `generateCypher/runAnalytics/runPattern` with estimate → budget check (tenant/case) → execute; slow‑killer cancels if p99 > threshold.
- Grafana: CPI gauge (from perf pack), budget denies, slow‑kill counts; alerts to Slack/Email (configurable).

---

## 8) Data Lifecycle: Ingest→Archive→Retention→DSAR

- Archive‑tier receives report artifacts & large analytic outputs.
- Retention cron deletes claims past TTL unless legal hold; audit emitted.
- DSAR endpoint composes subject bundle with redactions by audience profile; includes verification checksum.

---

## 9) Observability Unification

- **OTEL resource attrs** standardized: `service.name`, `tenant`, `caseId`, `subject.sub`, `policy.ruleId`.
- **Prom labels** standardized: `service`, `endpoint`, `tenant`, `status`.
- Grafana space **“IntelGraph GA”** imports all dashboards: guardrails, analytics, CPI, collab/report, XAI/fed/wallet, audit/forensics.

---

## 10) Kubernetes Production: Helm Values & Security

- **Resources**: right‑sized requests/limits per service; HPA (CPU+RPS custom metric).
- **PodDisruptionBudgets** & **PriorityClasses** for gateway, LAC, ledger.
- **NetworkPolicies** lock east‑west; only gateway may call services (plus approved side‑paths).
- **TLS**: Terminate at ingress; optional **mTLS** (service mesh ready).
- **Secrets**: sourced from Vault via CSI driver; zero secrets in env files.
- **Pipelines**: images signed with cosign; SBOM attached.

---

## 11) Docs & Runbooks Unification

- `/docs` includes Analyst Guide, Operator Runbook, API Reference (generated), Security & DPIA packs, and the Demo Cue Sheets.
- Add “golden path” — a 10‑minute quickstart from login → insight → report → wallet.

---

## 12) One‑Command Mega Orchestrator

```make
mega:
	# 1. Render configs and spin up dev stack
	npx ts-node tools/config/render.ts
	docker compose -f docker-compose.dev.yaml up -d --build
	# 2. Seed synthetic dataset + provenance
	pnpm ts-node tools/scripts/seed-synthetic.ts
	# 3. Run E2E demo + compliance & perf sweeps
	node tools/demo/e2e-demo.ts
	node perf/scripts/run-suite.ts
	# 4. Compliance demo (OPA decisions, DSAR, retention)
	curl -s -XPOST localhost:7015/dsar/request -H 'content-type: application/json' -d '{"subjectId":"E_xxx","audience":"press"}' | jq '.'
```

---

## 13) QA Gates (Definition of Done — Integrated)

- ✅ Contract tests green across all services
- ✅ E2E flow emits valid manifests; verify succeeds
- ✅ Policy denials carry readable OPA reason; simulation panel matches CLI
- ✅ CPI, p95 latency, and budget alarms within targets
- ✅ DSAR bundle produced & verified; retention deletes appear in audit
- ✅ XAI overlays and counterfactuals render; federation returns claim hashes only; wallet verify/revoke works
- ✅ A11y checks AA/AAA pass on core flows
- ✅ Security scans (SAST/DAST/SCA) 0 criticals; SBOM archived
- ✅ Helm chart deploys to `stage`, soak 48h clean; chaos drills RTO≤1h, RPO≤5m

---

## 14) Integration Work Items (Stories)

1. **Config Render Tool** (`tools/config/render.ts`) — parse `unified.yaml`, output `.env` + Helm overrides.
2. **Gateway Auth Middleware** — Keycloak JWT → ctx.subject; forward `x-subject` to services.
3. **OPA sidecar & bundle** — bake `compliance/opa` into bundle; CI `opa test`.
4. **Ledger Search & Export** — add endpoints; generator for proof envelope.
5. **Policy Inspector UI** — run LAC/OPA and show diffs; copy curl.
6. **Budget slow‑killer** — cancel execution over threshold; emit metric.
7. **DSAR happy path** — web button to request bundle → open verifier.
8. **Retention cron** — annotations for Vault secrets and TTL; log to audit.
9. **Grafana space import** — preload all JSON dashboards.
10. **Helm hardening** — HPAs, PDBs, NPs, secrets via CSI; ingress TLS.
11. **Docs consolidation** — stitch Analyst/Operator/Compliance; quickstart.

---

## 15) Risks & Mitigations

- **Config drift**: single source (`unified.yaml`) + CI check that generated files match.
- **Auth regressions**: canary route requiring ACR level; fallback to deny‑by‑default.
- **Query cost blowups**: budget guard + slow‑killer + previews; alerts & kill switch.
- **Model drift**: nightly red‑team eval; store model cards.
- **Federation leakage**: only claim hashes + proof; revocation enforced.

---

## 16) Final Release Checklist (Unification)

- [ ] Mega target runs clean end‑to‑end on a fresh clone
- [ ] `helm upgrade` on `stage` green; smoke & soak OK
- [ ] All dashboards visible; alerts wired
- [ ] Docs published; PR body updated
- [ ] Tag `v1.0.0-uni` and push images
