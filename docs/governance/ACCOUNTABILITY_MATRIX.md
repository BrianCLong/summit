# IntelGraph Absolute Accountability Matrix

## Domain Ownership

| Domain | Primary Owner | Secondary Owner | Escalation Path | Key Components |
|--------|---------------|-----------------|-----------------|----------------|
| **Core Architecture** | @arch-lead | @maestro-lead | #arch-escalation | Monolith, MCP, Orchestrator |
| **Data & Sharding** | @data-lead | @sre-lead | #data-ops | Postgres, Neo4j, ShardManager |
| **Security & Privacy** | @security-lead | @compliance-lead | #sec-incident | WAF, ABAC, DP-Engine, PQC |
| **AI & ML Ops** | @ai-lead | @data-lead | #ai-ops | ModelManager, LifecycleService |
| **Global Ops & DR** | @sre-lead | @arch-lead | #sre-emergency | FailoverOrchestrator, Chaos |
| **Governance** | @compliance-lead | @pm-lead | #gov-review | RACI, Audit, Certification |

## Automated Accountability Enforcement
- **Drift Remediation**: Automatically notifies @data-lead and @sre-lead on failure.
- **Canary Failures**: Automatically triggers rollback and notifies @sre-lead and @arch-lead.
- **Residency Violations**: High-severity violations trigger immediate alert to @security-lead.
- **Model Bias**: Bias detected by `ModelMonitorService` triggers retraining and notifies @ai-lead.

## Final Project Sunsetting (Kill Criteria)
- **Stalled Projects**: 30 days of zero activity (commits/runs) -> Marked as STALLED.
- **Auto-Archival**: 60 days of zero activity -> Automatic archival to `ColdStorageService`.
- **Final Deletion**: 90 days of zero activity -> Permanent deletion after @compliance-lead sign-off.
