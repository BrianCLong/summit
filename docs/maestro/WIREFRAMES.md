Maestro UI — Low‑Fi Wireframes (Text)

3.1 Home / Control Hub

```
+----------------------------------------------------------------------------------+
| Header: Search ⌘K | Env: prod ▼ | Alerts ●3 | User ▼                            |
+----------------------------------------------------------------------------------+
| [Autonomy Dial L0..L5] [Risk Budget ▣▣▢▢] [Freeze: OFF] [Canary 10%] [Rollback ON]|
+----------------------------------------------------------------------------------+
| Quick Actions:  Run Recipe  |  New Runbook  |  Open Dashboard  |  Open Tickets   |
+----------------------------------------------------------------------------------+
| Cards:                                                                           |
|  - Live Runs (sparkline, status)    - SLO Heatmap          - Cost Guard          |
|  - Recent Changes (diff)            - Pending Approvals    - Incidents           |
+----------------------------------------------------------------------------------+
```

3.2 Runs & Pipelines (DAG View)

```
+----------------------------------- Runs & Pipelines ----------------------------------+
| Filters: Status ▾  Owner ▾  Tag ▾  Time ▾  Search                                    |
|---------------------------------------------------------------------------------------|
| DAG: [source▣]-->[validate▣]-->[enrich▣]-->[plan▣]-->|if ok|-->[execute▣]--->[report] |
|       \----------------------->[fallback▣]--------------------------------------------|
| Side Panel: Node Details | Params | Logs | Metrics | Artifacts | Evidence | Policies  |
+---------------------------------------------------------------------------------------+
```

3.3 Autonomy & Guardrails

```
+------------------------------- Autonomy & Guardrails ---------------------------------+
| Dial: L0 L1 L2 L3 L4 L5  | Window: 09:00-17:00 MDT | Blast Radius: <= 10%            |
|---------------------------------------------------------------------------------------|
| Policies (ordered):                                                              [i]  |
| 1) Change freeze on Fridays after 12:00                                            ON |
| 2) Auto-rollback if error budget burn > 2%/h                                      ON |
| 3) Require dual-approval for risk score >= 7/10                                   ON |
| 4) Cost ceiling $200/run                                                           ON |
|---------------------------------------------------------------------------------------|
| Simulation:  Preview impact → show affected resources, risk bands, SLO deltas         |
+---------------------------------------------------------------------------------------+
```

3.4 Recipes Library

```
+------------------------------------- Recipes ----------------------------------------+
| Filters: Domain ▾  Verified ▾  Owner ▾  Risk ▾  Last Used ▾  Search                   |
|---------------------------------------------------------------------------------------|
| ▣ Rapid Attribution     ▣ SLO Guard Enforce   ▣ Lateral Movement Map  ▣ Cost Clamp    |
|---------------------------------------------------------------------------------------|
| Right Panel: YAML/JSON schema | Param form | Pre-flight checks | Version history      |
| Actions: Save as new | Dry-run | Schedule | Share | Export | Pin to Hub              |
+---------------------------------------------------------------------------------------+
```

3.5 Observability & SLOs

```
+--------------------------------- Observability --------------------------------------+
| Tabs: Dashboards | Traces | Logs | Alerts | SLOs | Incidents | UIs (Airflow/Argo)     |
|---------------------------------------------------------------------------------------|
| Top: Env ▾  Service ▾  Time ▾  Variables ▾  Compare ▾                                 |
| Panels: Latency p95 | Error rate | Throughput | Queue depth | Cost per run | Heatmaps |
| SLOs: Target 99.5% | Burn rate | Error budget left | Breach predictions              |
+---------------------------------------------------------------------------------------+
```

3.6 CI/CD & Environments

```
+----------------------------------- CI/CD --------------------------------------------+
| Environments: dev | stage | prod | Preview (per PR)                                  |
| Pipeline Graph: build → test → package → deploy → verify → release                   |
| Controls: Pause | Retry | Promote | Rollback | Pin | Compare Run vs Commit           |
| GitHub: Workflows | Runs | Logs | Artifacts | Annotations                            |
+---------------------------------------------------------------------------------------+
```

3.7 Tickets / Issues / Projects (GitHub‑native)

```
+------------------------------ Tickets & Projects -------------------------------------+
| Views: Table | Board | Roadmap | Timeline | Saved filters                            |
| Filters: Repo ▾  Labels ▾  Assignees ▾  Milestone ▾  Health ▾  Linked Runs ▾         |
| Table: Issue ▾ | Status | Priority | Linked Run | CI Build | Owner | Age | Actions    |
| Detail: Markdown | Tasks | PRs | Deploys | Linked DAG nodes | Audit | Discussions     |
+---------------------------------------------------------------------------------------+
```

3.8 Admin Studio

```
+----------------------------------- Admin Studio -------------------------------------+
| Schema Registry | Connectors | Feature Flags | Access (RBAC/ABAC) | Audit | Jobs      |
| Health: Connectors up/down | Backfills | Retries | Policy Simulation | License Rules  |
+---------------------------------------------------------------------------------------+
```
