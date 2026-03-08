# Jira Import — Maestro Composer Backend Sprint

**Project Key:** `MCB` (change to your project key)  
**Sprint Window:** Sep 2–Sep 13, 2025  
**Components:** `workflow-engine`, `server`, `prov-ledger-service`, `router`  
**Fix Version/s:** `maestro-composer-backend-v0.1`

---

## CSV (Epics, Stories, Sub‑tasks)

> Import via **Jira Settings → System → External System Import → CSV**. Map columns: _Project Key, Issue Type, Summary, Description, Priority, Components, Labels, Epic Name, Epic Link, Story Points, Assignee, Fix Version/s_.

```csv
Project Key,Issue Type,Summary,Description,Priority,Components,Labels,Epic Name,Epic Link,Story Points,Assignee,Fix Version/s
MCB,Epic,EPIC A — Definitions & Versioning,"Own the schema/DSL, versioning, publish flow, and diff endpoints for Composer backend.",High,"workflow-engine","composer,backend,epic","EPIC A — Definitions & Versioning",, , ,maestro-composer-backend-v0.1
MCB,Epic,EPIC B — Execution Runtime,"Queue, worker pool, checkpoints, recovery, and human-task state machine.",High,"workflow-engine","runtime,backend,epic","EPIC B — Execution Runtime",, , ,maestro-composer-backend-v0.1
MCB,Epic,EPIC C — Triggers & Webhooks,"HMAC webhooks and schedule reconciler.",Medium,"workflow-engine","triggers,webhooks,epic","EPIC C — Triggers & Webhooks",, , ,maestro-composer-backend-v0.1
MCB,Epic,EPIC D — Governance & Audit,"OPA policy gates and provenance ledger integration.",High,"server;prov-ledger-service","opa,provenance,epic","EPIC D — Governance & Audit",, , ,maestro-composer-backend-v0.1
MCB,Epic,EPIC E — Observability & SLOs,"OTEL tracing, RED metrics, dashboards, perf baselines.",High,"workflow-engine;server","otel,metrics,epic","EPIC E — Observability & SLOs",, , ,maestro-composer-backend-v0.1
MCB,Epic,EPIC F — Federation & SDK,"GraphQL read subgraph + TypeScript SDK for Composer UI.",Medium,"server;apps/api","graphql,sdk,epic","EPIC F — Federation & SDK",, , ,maestro-composer-backend-v0.1

MCB,Story,JSON Schema + Type Guards (author + validate),"Create JSON Schema for WorkflowDefinition + TypeScript guards. Validate on create/update. **AC:** invalid DAGs rejected with actionable errors; fixtures under `/apps/workflow-engine/src/services/__fixtures__` pass.",High,"workflow-engine","schema,validation","",EPIC A — Definitions & Versioning,3,,maestro-composer-backend-v0.1
MCB,Story,Versioning & Publish Flow (semver + immutable snapshot),"Implement `POST /api/workflows/:id/publish`. Persist immutable snapshot to `workflow_versions`; bump semver; emit provenance stub. **AC:** draft→published w/ read-only snapshot; conflicts rejected.",High,"workflow-engine;server","versioning,publish","",EPIC A — Definitions & Versioning,3,,maestro-composer-backend-v0.1
MCB,Story,Version Diff Endpoint,"`GET /api/workflows/:id/versions` returns structural diff (added/removed/changed steps). **AC:** JSON diff includes step ids and config-hash; time ≤ 200ms on 200‑step graph.",Medium,"workflow-engine","diff,api","",EPIC A — Definitions & Versioning,2,,maestro-composer-backend-v0.1

MCB,Story,Redis Queue + Worker Pool (idempotent handlers),"Implement enqueue at `POST /api/workflows/:id/execute` and worker consumers using Redis Streams/consumer groups. **AC:** at-least-once processing with idempotency keys; crash test shows no duplicate side-effects.",High,"workflow-engine","runtime,queue","",EPIC B — Execution Runtime,5,,maestro-composer-backend-v0.1
MCB,Story,Step Checkpointing & Recovery,"Persist per-step checkpoints to PG (`workflow_executions.steps`). Resume on restart. **AC:** kill worker mid-flight; resume within 30s; final state correct; no duplicate external calls.",High,"workflow-engine","checkpoint,recovery","",EPIC B — Execution Runtime,5,,maestro-composer-backend-v0.1
MCB,Story,Human Task State Machine + Endpoints,"Implement `/api/human-tasks` CRUD + assign/escalate/complete with SLA timers. **AC:** SLA breach emits event; escalate policy triggers; audit entries recorded.",Medium,"workflow-engine","human-in-loop,api","",EPIC B — Execution Runtime,3,,maestro-composer-backend-v0.1

MCB,Story,HMAC Webhooks + Secret Rotation,"`POST /api/webhooks/workflow/:workflowId/:triggerPath` with body HMAC; rotate secrets per `webhook_secrets`. **AC:** signature verify; replay protection; 429 on abuse.",High,"workflow-engine","webhook,security","",EPIC C — Triggers & Webhooks,3,,maestro-composer-backend-v0.1
MCB,Story,Schedule Reconciler (cron registry),"Implement `/api/schedules/reconcile` to register/update crons; recover missed ticks. **AC:** idempotent; drift correction window configurable.",Medium,"workflow-engine","schedule,cron","",EPIC C — Triggers & Webhooks,2,,maestro-composer-backend-v0.1

MCB,Story,OPA Policy Gates for CRUD/Execute,"Integrate OPA (or open-policy-agent via sidecar) to enforce ABAC on create/update/publish/execute. **AC:** denied calls return machine-readable rationale; policy bundles loaded at boot.",High,"server;workflow-engine","opa,authz","",EPIC D — Governance & Audit,5,,maestro-composer-backend-v0.1
MCB,Story,Provenance Hooks (publish + execution export),"Wire to `prov-ledger-service` (`/src/server.ts`, `/src/ledger.ts`). On publish: register version manifest; on completion: export evidence bundle TAR.GZ. **AC:** external verifier validates signature and hash.",High,"prov-ledger-service;workflow-engine","provenance,audit","",EPIC D — Governance & Audit,3,,maestro-composer-backend-v0.1

MCB,Story,OTEL Spans + RED Metrics + Dashboards,"Instrument API→queue→worker spans; Prom metrics (rate, errors, duration). Commit Grafana JSON. **AC:** dashboard shows live runs; alerts on SLO burn.",High,"workflow-engine;server","otel,metrics,observability","",EPIC E — Observability & SLOs,3,,maestro-composer-backend-v0.1
MCB,Story,k6 Perf Baselines,"Create k6 scripts for enqueue and worker throughput. **AC:** p95 enqueue <300ms; sustain 200 RPS with <1% error in stage.",Medium,"workflow-engine","performance,testing","",EPIC E — Observability & SLOs,2,,maestro-composer-backend-v0.1

MCB,Story,GraphQL Read Subgraph (Federation),"Add read-only subgraph for `workflow(id)`, `workflows`, `execution(id)` in `server/graphql/federation`. **AC:** rover compose OK; gateway resolves.",Medium,"server","graphql,federation","",EPIC F — Federation & SDK,3,,maestro-composer-backend-v0.1
MCB,Story,TypeScript SDK for Composer UI,"Generate typed client for REST; publish as package (private). **AC:** examples compile; basic README.",Medium,"apps/api;workflow-engine","sdk,typescript","",EPIC F — Federation & SDK,2,,maestro-composer-backend-v0.1

MCB,Sub-task,[Schema] Author JSON Schema + AJV validators,"Use AJV to enforce schema & custom keywords (timeouts, retries).",Medium,"workflow-engine","schema,validation","",JSON Schema + Type Guards (author + validate),, ,maestro-composer-backend-v0.1
MCB,Sub-task,[Schema] Unit tests + fixtures,"100% fixtures pass; negative tests cover cycles/unreachable nodes.",Medium,"workflow-engine","testing","",JSON Schema + Type Guards (author + validate),, ,maestro-composer-backend-v0.1
MCB,Sub-task,[Runtime] Implement Redis XREADGROUP workers,"Set up consumer groups, ack, retry/backoff, DLQ.",High,"workflow-engine","runtime,redis","",Redis Queue + Worker Pool (idempotent handlers),, ,maestro-composer-backend-v0.1
MCB,Sub-task,[Runtime] Idempotency keys + outbox,"Persist keys in Redis+PG; ensure exactly-once observable behavior.",High,"workflow-engine","idempotency","",Redis Queue + Worker Pool (idempotent handlers),, ,maestro-composer-backend-v0.1
MCB,Sub-task,[Governance] OPA policy bundle + tests,"Ship default policies; contract tests for CRUD/execute decisions.",High,"server","opa,policy","",OPA Policy Gates for CRUD/Execute,, ,maestro-composer-backend-v0.1
MCB,Sub-task,[Provenance] Evidence bundle builder,"Create TAR.GZ via `tar-stream` + `zlib`; sign bundle.",Medium,"prov-ledger-service","provenance,crypto","",Provenance Hooks (publish + execution export),, ,maestro-composer-backend-v0.1
```

---

## JSON (Jira Cloud REST Bulk Create)

> Optional: POST to `/rest/api/3/issue/bulk` (auth required). Replace `PROJECT_KEY`. Epic links require created epic keys; create epics first, then stories referencing those keys, or run two passes.

```json
{
  "issueUpdates": [
    {
      "fields": {
        "project": { "key": "MCB" },
        "summary": "EPIC A — Definitions & Versioning",
        "issuetype": { "name": "Epic" },
        "customfield_10011": "EPIC A — Definitions & Versioning",
        "components": [{ "name": "workflow-engine" }],
        "labels": ["composer", "backend", "epic"],
        "fixVersions": [{ "name": "maestro-composer-backend-v0.1" }]
      }
    },
    {
      "fields": {
        "project": { "key": "MCB" },
        "summary": "EPIC B — Execution Runtime",
        "issuetype": { "name": "Epic" },
        "customfield_10011": "EPIC B — Execution Runtime",
        "components": [{ "name": "workflow-engine" }],
        "labels": ["runtime", "backend", "epic"],
        "fixVersions": [{ "name": "maestro-composer-backend-v0.1" }]
      }
    }

    /* Create remaining epics C–F, then stories linking via "epic link" custom field (varies by site; in company-managed projects often customfield_10014). */
  ]
}
```

> **Note:** Your site’s Epic Name field and Epic Link field IDs (e.g., `customfield_10011`, `customfield_10014`) will differ. Check **Jira Settings → Issues → Custom fields**.

---

## Repo‑Aware Notes (for implementers)

- **Workflow Engine code:** `/apps/workflow-engine/src/server.ts`, `/apps/workflow-engine/src/services/WorkflowService.ts`, `/apps/workflow-engine/src/services/WorkflowBuilder.ts`.
- **Migrations present:** `/server/src/db/migrations/014_workflow_automation_tables.sql` defines `workflow_definitions`, `workflow_executions`, `human_tasks`, `workflow_templates`, etc.
- **GraphQL federation placeholder:** `/server/graphql/federation/index.ts` → fill with read resolvers.
- **Provenance service:** `/prov-ledger-service/src/server.ts`, `/prov-ledger-service/src/ledger.ts` with signing helpers.
- **QoS config:** `/router/qos.yaml` — use for backpressure & budgets.
- **Observability:** add OTEL + Prom metrics in `apps/workflow-engine/src/server.ts` and worker loop.

---

## After Import — Quick Setup

1. Move all stories into sprint **Sep 2–Sep 13, 2025**.
2. Assign owners.
3. Create dashboards: _Sprint burndown_, _Runtime RED_, _Policy decision rate_.
4. Link stories to runbooks in `runbooks/` and ADRs.
