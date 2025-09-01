Project Key,Issue Type,Summary,Description,Priority,Components,Labels,Epic Name,Epic Link,Story Points,Assignee,Fix Version/s
MCB,Epic,EPIC L — Sub-Workflows & Reuse,"Introduce sub-workflow step type, version pinning/compatibility, GraphQL/CLI support for invocation.",High,"workflow-engine;server","epic,subworkflows","EPIC L — Sub-Workflows & Reuse",,, ,maestro-composer-backend-v0.3
MCB,Epic,EPIC M — Compensation/Sagas,"Add compensation DSL and runtime, manual compensation endpoint, auditing and events.",High,"workflow-engine;server","epic,sagas","EPIC M — Compensation/Sagas",,, ,maestro-composer-backend-v0.3
MCB,Epic,EPIC N — Caching & Performance,"Deterministic result caching with analytics and invalidation.",High,"workflow-engine;server;packages","epic,caching","EPIC N — Caching & Performance",,, ,maestro-composer-backend-v0.3
MCB,Epic,EPIC O — Isolation & Quotas,"Tenant namespaced queues, guardrails (payload/fan-out caps), QoS enforcement.",High,"workflow-engine;router","epic,isolation,qos","EPIC O — Isolation & Quotas",,, ,maestro-composer-backend-v0.3
MCB,Epic,EPIC P — DR & Deploys,"Stage DR (active-passive), blue/green deploys, online migrations and linter.",High,"ops;server;workflow-engine","epic,dr,deploys","EPIC P — DR & Deploys",,, ,maestro-composer-backend-v0.3
MCB,Epic,EPIC Q — Bulk Ops & Portability,"Export/import signed artifacts, bulk publish/execute with job tracker and CLI hooks.",Medium,"server;packages","epic,bulk,portability","EPIC Q — Bulk Ops & Portability",,, ,maestro-composer-backend-v0.3
MCB,Epic,EPIC R — Policy, Retention & DLP,"OPA decision cache, retention TTL jobs, archive to object storage, DLP hooks (stubs).",Medium,"server;ops;packages","epic,policy,retention,dlp","EPIC R — Policy, Retention & DLP",,, ,maestro-composer-backend-v0.3
MCB,Epic,EPIC S — Observability v3,"Per-tenant queue dashboards, DR/deploy safety board, predictive alerts.",Medium,"ops;workflow-engine","epic,observability","EPIC S — Observability v3",,, ,maestro-composer-backend-v0.3

MCB,Story,Sub-Workflow Step Type,"Implement step type `subworkflow` invoking a published `workflow_version_id` with typed input/output mapping. **AC:** child executionId linked; traces joined; fan-out cap respected.",High,"workflow-engine;server","story,subworkflows","",EPIC L — Sub-Workflows & Reuse,5,,maestro-composer-backend-v0.3
MCB,Story,Version Pinning & Compatibility,"Semver pinning/range checks; publish rejects incompatible breaking changes when dependents specify constraints.",High,"workflow-engine","story,versioning","",EPIC L — Sub-Workflows & Reuse,3,,maestro-composer-backend-v0.3
MCB,Story,GraphQL/CLI Subworkflow Support,"Add GraphQL mutation `enqueueSubworkflow` and CLI `mc subworkflow invoke`; auth propagation.",Medium,"server;packages","story,graphql,cli","",EPIC L — Sub-Workflows & Reuse,2,,maestro-composer-backend-v0.3

MCB,Story,Compensation DSL & Runtime,"Add `compensate` handlers and runtime policy; record compensation events; idempotent execution.",High,"workflow-engine;server","story,sagas","",EPIC M — Compensation/Sagas,5,,maestro-composer-backend-v0.3
MCB,Story,Manual Compensation Endpoint,"`POST /api/executions/:id/compensate` for ops; policy-gated and audited.",Medium,"server","story,sagas,api","",EPIC M — Compensation/Sagas,2,,maestro-composer-backend-v0.3

MCB,Story,Deterministic Result Cache,"Opt-in memoization for deterministic steps (HTTP GET/DB read/ML w/ fixed model). Cache keys in provenance; TTL/LRU.",High,"workflow-engine;server;packages","story,caching","",EPIC N — Caching & Performance,5,,maestro-composer-backend-v0.3
MCB,Story,Cache Analytics & Controls,"Invalidate by key/prefix; metrics for hit/miss/eviction; admin endpoints.",Medium,"server","story,caching,analytics","",EPIC N — Caching & Performance,3,,maestro-composer-backend-v0.3

MCB,Story,Tenant Namespaced Queues,"Introduce per-tenant (or class) queue namespaces and limiters; verify isolation via chaos test.",High,"workflow-engine;router","story,isolation,qos","",EPIC O — Isolation & Quotas,3,,maestro-composer-backend-v0.3
MCB,Story,Guardrails (payload/fan-out caps),"Set payload size caps, step fan-out/concurrency limits; friendly 413/429 with retry-after.",Medium,"workflow-engine;router","story,guardrails","",EPIC O — Isolation & Quotas,2,,maestro-composer-backend-v0.3

MCB,Story,Stage DR (active-passive),"Set up replica PG/Redis; runbook for promote; DNS failover; RPO≤5m, RTO≤30m validated in stage.",High,"ops;server;workflow-engine","story,dr","",EPIC P — DR & Deploys,5,,maestro-composer-backend-v0.3
MCB,Story,Blue/Green + Online Migrations,"Blue/green deployments for API/workers; ghost expand-contract migration pattern; migration linter in CI.",High,"ops;server","story,deploys,migrations","",EPIC P — DR & Deploys,3,,maestro-composer-backend-v0.3

MCB,Story,Export/Import Artifacts,"Signed tarball export/import of workflows/templates/policies; manifest verification; CLI commands.",Medium,"server;packages","story,bulk,portability","",EPIC Q — Bulk Ops & Portability,3,,maestro-composer-backend-v0.3
MCB,Story,Bulk Publish/Execute + Job Tracker,"Async jobs for bulk publish/execute; `GET /api/jobs/:id`; rate limits; audit.",Medium,"server","story,bulk,jobs","",EPIC Q — Bulk Ops & Portability,2,,maestro-composer-backend-v0.3

MCB,Story,OPA Decision Cache,"In-memory decision cache with TTL and bundle ETag invalidation; p99 <25ms.",Medium,"server","story,opa,policy","",EPIC R — Policy, Retention & DLP,3,,maestro-composer-backend-v0.3
MCB,Story,Retention & Archive (TTL + Object Store),"TTL job trims execution logs/events; archive to object storage with KMS; restore runbook.",Medium,"ops;server","story,retention,archive","",EPIC R — Policy, Retention & DLP,2,,maestro-composer-backend-v0.3

MCB,Story,Per-Tenant Queue Dashboards,"Grafana dashboards for queue depth/lag/service time per tenant; predictive burn alerts.",Medium,"ops;workflow-engine","story,observability,queues","",EPIC S — Observability v3,3,,maestro-composer-backend-v0.3
MCB,Story,DR & Deploy Safety Board,"Dashboard for replication lag, canary, release guard panels; alert rules.",Medium,"ops","story,observability,dr","",EPIC S — Observability v3,2,,maestro-composer-backend-v0.3

MCB,Sub-task,[SubWF] IO mapping & validation,"Define input/output schemas; mapping engine; negative tests.",High,"workflow-engine","subtask,subworkflows","",Sub-Workflow Step Type,,,maestro-composer-backend-v0.3
MCB,Sub-task,[SubWF] Trace linking,"Link parent/child spans; ensure correlation IDs propagate.",Medium,"workflow-engine;server","subtask,observability","",Sub-Workflow Step Type,,,maestro-composer-backend-v0.3
MCB,Sub-task,[Compat] Semver diff & policy,"Detect breaking changes; surface reason; block publish when constrained.",High,"workflow-engine","subtask,versioning","",Version Pinning & Compatibility,,,maestro-composer-backend-v0.3
MCB,Sub-task,[Sagas] Event types + audit,"Add COMPENSATE\_\* events; SSE unchanged; audit coverage.",High,"server;workflow-engine","subtask,sagas","",Compensation DSL & Runtime,,,maestro-composer-backend-v0.3
MCB,Sub-task,[Sagas] Manual compensate policy,"Policy guard + runbook for manual compensation.",Medium,"server","subtask,sagas,policy","",Manual Compensation Endpoint,,,maestro-composer-backend-v0.3
MCB,Sub-task,[Cache] Key hashing + TTL/LRU,"Stable hashing incl. env/secretRefs; TTL & LRU eviction.",High,"workflow-engine;packages","subtask,caching","",Deterministic Result Cache,,,maestro-composer-backend-v0.3
MCB,Sub-task,[Cache] Invalidate + metrics,"Admin invalidate (key/prefix); hit/miss/evict metrics; alerts.",Medium,"server;ops","subtask,caching,metrics","",Cache Analytics & Controls,,,maestro-composer-backend-v0.3
MCB,Sub-task,[Isolation] Queue namespaces,"Define {tenant}:{class} queues; limiters; chaos test.",High,"workflow-engine;router","subtask,isolation,qos","",Tenant Namespaced Queues,,,maestro-composer-backend-v0.3
MCB,Sub-task,[Guardrails] Payload/fan-out caps,"Implement caps; 413/429 responses with retry-after.",Medium,"workflow-engine;router","subtask,guardrails","",Guardrails (payload/fan-out caps),,,maestro-composer-backend-v0.3
MCB,Sub-task,[DR] Replica + promote runbook,"Set up PG/Redis replica; promotion script; DNS steps.",High,"ops;server","subtask,dr","",Stage DR (active-passive),,,maestro-composer-backend-v0.3
MCB,Sub-task,[Deploy] Blue/green + linter,"Queue drain/resume; ghost migrations; CI linter for DDL.",High,"ops;server","subtask,deploys,migrations","",Blue/Green + Online Migrations,,,maestro-composer-backend-v0.3
MCB,Sub-task,[Bulk] Tarball signer + verify,"Sign manifest; verify on import; CLI wiring.",Medium,"server;packages","subtask,bulk,security","",Export/Import Artifacts,,,maestro-composer-backend-v0.3
MCB,Sub-task,[Bulk] Job tracker + rate limit,"Jobs table; progress; 429 with retry-after; audit.",Medium,"server","subtask,bulk,jobs","",Bulk Publish/Execute + Job Tracker,,,maestro-composer-backend-v0.3
MCB,Sub-task,[OPA] Decision cache impl,"TTL cache; ETag-based invalidation; p99 test.",Medium,"server","subtask,opa","",OPA Decision Cache,,,maestro-composer-backend-v0.3
MCB,Sub-task,[Retention] TTL + archive flow,"Trim task; archive to object store with KMS; restore doc.",Medium,"ops;server","subtask,retention","",Retention & Archive (TTL + Object Store),,,maestro-composer-backend-v0.3
MCB,Sub-task,[Obs] Queue dashboards + alerts,"Depth/lag/service time panels; predictive burn alerts.",Medium,"ops;workflow-engine","subtask,observability","",Per-Tenant Queue Dashboards,,,maestro-composer-backend-v0.3
MCB,Sub-task,[Obs] DR safety board,"Replication lag, canary, release guard panels; alert rules.",Medium,"ops","subtask,observability,dr","",DR & Deploy Safety Board,,,maestro-composer-backend-v0.3
