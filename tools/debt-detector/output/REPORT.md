# Technical Debt & Missing Features Report

**Generated on**: 2025-12-06T18:25:10.679Z
**Total Items**: 8369

This report serves as the authoritative record of detected technical debt, missing features, and potentially broken references.

## Breakdown by Type
- **NOTE**: 609
- **TODO**: 571
- **SPRINT**: 3152
- **FIXME**: 22
- **MISSING_IMPORT**: 3922
- **XXX**: 36
- **HACK**: 18
- **FUTURE WORK**: 3
- **NOT IMPLEMENTED**: 29
- **COMING SOON**: 7

## Detailed Findings

| Type | File | Description |
|------|------|-------------|
| NOTE | `.agentic-prompts/README.md:28` | constraints |
| NOTE | `.aider.chat.history.md:351` | at the end listing `chmod` commands to run. |
| TODO | `.archive/workflows/arborist.yml:18` | implement query for merged + age; log only in dry-run |
| NOTE | `.archive/workflows/brand-flip-placeholder.yml:34` | This workflow does NOT change runtime configuration." |
| SPRINT | `.archive/workflows/ci-guarded-rail.yml:1` | doc) — kept in sync |
| TODO | `.archive/workflows/ci-reusable-build.yml:32` | replace with your build command |
| NOTE | `.archive/workflows/merge-train.yml:41` | typically you'd gate via branch protection; here we simply mark as ready) |
| FIXME | `.archive/workflows/no-todos.yml:14` | in production code and manifests |
| FIXME | `.archive/workflows/no-todos.yml:28` | found in production paths"; \ |
| SPRINT | `.archive/workflows/verify-provenance.yml:2` | 27A: Verify SBOM + SLSA provenance on artifact promotion |
| SPRINT | `.changes.md:1593` | artifacts |
| NOTE | `.claude/prompts/security/XAI-001-xai-integrity-overlays.md:323` | in caveats' |
| TODO | `.disabled/intelgraph-mcp.disabled/src/server.ts:10` | wire to graph backend and apply tenant-scoped filtering |
| MISSING_IMPORT | `.disabled/mcp-core.disabled/src/core.ts` | Import source './transports/stdio.js' not found on disk. |
| MISSING_IMPORT | `.disabled/mcp-core.disabled/src/core.ts` | Import source './transports/http.js' not found on disk. |
| MISSING_IMPORT | `.disabled/mcp-core.disabled/src/core.ts` | Import source './auth.js' not found on disk. |
| MISSING_IMPORT | `.disabled/mcp-core.disabled/src/core.ts` | Import source './policy.js' not found on disk. |
| MISSING_IMPORT | `.disabled/mcp-core.disabled/src/core.ts` | Import source './logging.js' not found on disk. |
| MISSING_IMPORT | `.disabled/mcp-core.disabled/src/policy.ts` | Import source './auth.js' not found on disk. |
| MISSING_IMPORT | `.disabled/mcp-core.disabled/src/policy.ts` | Import source './registry.js' not found on disk. |
| MISSING_IMPORT | `.disabled/mcp-core.disabled/src/registry.ts` | Import source './auth.js' not found on disk. |
| MISSING_IMPORT | `.disabled/mcp-core.disabled/src/toolkits/graph.ts` | Import source '../auth.js' not found on disk. |
| MISSING_IMPORT | `.disabled/mcp-core.disabled/src/toolkits/orchestrator.ts` | Import source '../registry.js' not found on disk. |
| MISSING_IMPORT | `.disabled/mcp-core.disabled/src/toolkits/orchestrator.ts` | Import source '../auth.js' not found on disk. |
| MISSING_IMPORT | `.disabled/mcp-core.disabled/test/core.spec.ts` | Import source '../src/core.js' not found on disk. |
| MISSING_IMPORT | `.disabled/mcp-core.disabled/test/core.spec.ts` | Import source '../src/registry.js' not found on disk. |
| SPRINT | `.evidence/reports/closed_prs.json:288` | v0.5 – Guarded Rail" |
| SPRINT | `.evidence/reports/closed_prs.json:984` | artifacts" |
| SPRINT | `.github/ISSUE_TEMPLATE/promise-feature.yml:162` | planning |
| SPRINT | `.github/ISSUE_TEMPLATE/release-checklist-v24.4.0.md:4` | +3 (Provenance + Abuse + Cost + RTBF + SLO)' |
| TODO | `.github/ISSUE_TEMPLATE/release-checklist.md:30` | assert) |
| MISSING_IMPORT | `.github/scanners/auto-pr-fixer.ts` | Import source './config.js' not found on disk. |
| MISSING_IMPORT | `.github/scanners/config.ts` | Import source './types.js' not found on disk. |
| MISSING_IMPORT | `.github/scanners/index.ts` | Import source './sbom-generator.js' not found on disk. |
| MISSING_IMPORT | `.github/scanners/index.ts` | Import source './trivy-scanner.js' not found on disk. |
| MISSING_IMPORT | `.github/scanners/index.ts` | Import source './slsa3-attestor.js' not found on disk. |
| MISSING_IMPORT | `.github/scanners/index.ts` | Import source './auto-pr-fixer.js' not found on disk. |
| MISSING_IMPORT | `.github/scanners/index.ts` | Import source './config.js' not found on disk. |
| MISSING_IMPORT | `.github/scanners/index.ts` | Import source './types.js' not found on disk. |
| MISSING_IMPORT | `.github/scanners/sbom-generator.ts` | Import source './config.js' not found on disk. |
| MISSING_IMPORT | `.github/scanners/sbom-generator.ts` | Import source './types.js' not found on disk. |
| MISSING_IMPORT | `.github/scanners/slsa3-attestor.ts` | Import source './config.js' not found on disk. |
| MISSING_IMPORT | `.github/scanners/trivy-scanner.ts` | Import source './config.js' not found on disk. |
| XXX | `.github/workflows/agentic-task-orchestrator.yml:276` | [Task description]" |
| XXX | `.github/workflows/agentic-task-orchestrator.yml:278` | [Task]" --body-file .github/PR_TEMPLATES/codex-task-pr.md |
| NOTE | `.github/workflows/auto-green.yml:37` | gate |
| NOTE | `.github/workflows/ci.yml:145` | Jest tests run against source (ts-jest) so we don't strictly need build artifacts here. |
| HACK | `.github/workflows/code-quality-gates.yml:191` | comments in changed files |
| TODO | `.github/workflows/code-quality-gates.yml:340` | ${todoCount}\n`; |
| FIXME | `.github/workflows/code-quality-gates.yml:341` | ${fixmeCount}\n`; |
| HACK | `.github/workflows/code-quality-gates.yml:342` | ${hackCount}\n\n`; |
| TODO | `.github/workflows/conftest.yml:6` | Remove once Helm template helpers are fixed |
| NOTE | `.github/workflows/copilot-adoption-report.yml:168` | (no metrics) |
| TODO | `.github/workflows/lane-fast.yml:45` | Remove once lint warnings are fixed across codebase |
| FIXME | `.github/workflows/maintainability-check.yml:160` | comments |
| TODO | `.github/workflows/maintainability-check.yml:174` | comments:** $TODO_COUNT" >> metrics-report.md |
| FIXME | `.github/workflows/maintainability-check.yml:175` | comments:** $FIXME_COUNT" >> metrics-report.md |
| FIXME | `.github/workflows/maintainability-check.yml:292` | comments systematically" >> "$REPORT_FILE" |
| FIXME | `.github/workflows/pr-quality-gate.yml:63` | count |
| FIXME | `.github/workflows/pr-quality-gate.yml:66` | comments" |
| FIXME | `.github/workflows/pr-quality-gate.yml:68` | comments ($TODO_COUNT). Consider addressing technical debt." |
| NOTE | `.github/workflows/preview-env.yml:307` | resources are tagged for TTL enforcement; preview images were deleted for this PR." |
| TODO | `.github/workflows/promise-tracker.yml:67` | without issue reference |
| TODO | `.github/workflows/promise-tracker.yml:71` | without issue link" |
| TODO | `.github/workflows/promise-tracker.yml:136` | Implement feature (#123)\` |
| NOTE | `.github/workflows/security-scan.yml:139` | CodeQL Analysis runs in a separate workflow." >> $GITHUB_STEP_SUMMARY |
| NOTE | `.maestro/changes/20250915-copilot-hardening.yaml:15` | committed' |
| NOTE | `.maestro/tests/k6/isolation_stress.js:383` | In a real scenario, you might want to clean up test data |
| NOTE | `AGENTIC_EXECUTION_GUIDE.md:148` | any existing errors |
| NOTE | `AGENTIC_EXECUTION_GUIDE.md:149` | any existing warnings |
| XXX | `AGENTIC_EXECUTION_GUIDE.md:190` | per CODEX specs" |
| XXX | `AGENTIC_EXECUTION_GUIDE.md:217` | [Task title] |
| XXX | `AGENTIC_EXECUTION_GUIDE.md:238` | [Task title]" \ |
| TODO | `AUTH_ARCHITECTURE_DOCUMENTATION.md:918` | Implement full OIDC issuer verification (Line 161) |
| TODO | `AUTH_ARCHITECTURE_DOCUMENTATION.md:1254` | for full OIDC validation with issuer verification \| Production deployments using JWT without proper |
| SPRINT | `BUG_BASH_REPORT_20250922.md:78` | Planning) |
| SPRINT | `CI_AND_PR_CLEANUP_SUMMARY.md:102` | 28: Sharding, Analytics, Governance |
| SPRINT | `CI_AND_PR_CLEANUP_SUMMARY.md:132` | 29: Quotas, Entity Resolution, Schema Governance |
| SPRINT | `CI_AND_PR_CLEANUP_SUMMARY.md:140` | 31: Billing E2E, ER Eval, and API v1.1 |
| SPRINT | `CLAUDE_STRATEGIC_ROADMAP.md:11` | documents into actionable parallel epics. |
| SPRINT | `CLAUDE_STRATEGIC_ROADMAP.md:210` | Docs:** 100+ sprints in /docs/sprints/ and /october2025/ |
| SPRINT | `COMPLETION_REPORT.md:18` | plans were generated and saved to `project_management/jira/`: |
| SPRINT | `COMPLETION_REPORT.md:44` | prompts to a complete, instantiated set of plans and configurations, ready for the next phase of exe |
| SPRINT | `COMPOSER_VNEXT.md:3` | Goal:** Cut median build times by ≥30% on our top services while adding remote caching, test-impact  |
| SPRINT | `COMPOSER_VNEXT.md:5` | Results |
| SPRINT | `COMPOSER_VNEXT.md:52` | goal. |
| NOTE | `CONFIGURATION_CLEANUP_SUMMARY.md:152` | Use NEO4J_USER (not NEO4J_USERNAME - deprecated Q4 2024) |
| TODO | `CONTRIBUTING.md:186` | comments for next agent or human |
| SPRINT | `CleanRepo.md:5` | onward, every branch and PR merges, builds, and tests **100% clean** with deterministic artifacts, s |
| SPRINT | `CleanRepo.md:296` | Checkpoint (Sep 25):** Canary pipeline live; ≥80% tests passing; no flakies. |
| SPRINT | `CleanRepo.md:297` | Review (Oct 2):** Demo acceptance flow; publish signed artifacts and release notes. |
| SPRINT | `CleanRepo.md:314` | 27B “Merge Everything Clean” |
| SPRINT | `CleanRepo.md:360` | end. |
| SPRINT | `CleanRepo.md:366` | end; CI gate enforces it. |
| SPRINT | `CleanRepo.md:437` | review uses these docs for live demo (merge → release-candidate). |
| SPRINT | `CleanRepo.md:476` | Review) |
| SPRINT | `CleanRepo.md:497` | 27B) |
| SPRINT | `CleanRepo.md:510` | 27C “DevEx Turbo & Orchestrator E2E” |
| SPRINT | `CleanRepo.md:671` | Close) |
| SPRINT | `CleanRepo.md:706` | 27D “Security, Policy & Data Safeguards” |
| SPRINT | `CleanRepo.md:906` | Close) |
| SPRINT | `CleanRepo.md:938` | 27E “Performance, Cost & Reliability” |
| SPRINT | `CleanRepo.md:1119` | Close) |
| SPRINT | `CleanRepo.md:1150` | 27F “Data Quality, Provenance UX & GA Enablement” |
| SPRINT | `CleanRepo.md:1326` | Close) |
| SPRINT | `CleanRepo.md:1358` | 27G “Tri-Pane UX (Graph • Timeline • Map), Search, and Error-Proofing” |
| SPRINT | `CleanRepo.md:1525` | Close) |
| SPRINT | `CleanRepo.md:1556` | 27H “Enterprise Readiness (SSO/SCIM, Tenancy, BYOK, DR, Residency & Billing)” |
| SPRINT | `CleanRepo.md:1763` | Close) |
| SPRINT | `CleanRepo.md:1797` | 27I “Compliance, Risk & Trust Center (SOC 2, GDPR/CCPA, IR, VM, Vendor)” |
| NOTE | `CleanRepo.md:1922` | + rollback in PRs that modify infra, auth, or data flows; CAB lightweight checklist. |
| SPRINT | `CleanRepo.md:2000` | Close) |
| SPRINT | `CleanRepo.md:2034` | 27J “Connectors, Pipelines & Knowledge Fusion” |
| SPRINT | `CleanRepo.md:2233` | Close) |
| SPRINT | `CleanRepo.md:2265` | 27K “GA Release Engineering, Packaging & Launch Ops” |
| SPRINT | `CleanRepo.md:2465` | Close) |
| SPRINT | `CleanRepo.md:2497` | 27L “Post-GA Adoption Flywheel, Field Reliability & Customer Onboarding” |
| SPRINT | `CleanRepo.md:2697` | Close) |
| SPRINT | `CleanRepo.md:2729` | 27M “Safety, Abuse-Resistance & Red-Team Automation” |
| SPRINT | `CleanRepo.md:2933` | Close) |
| SPRINT | `CleanRepo.md:2965` | 27N “NL→Cypher Excellence, Semantic Retrieval & Query Optimization” |
| SPRINT | `CleanRepo.md:3161` | Close) |
| SPRINT | `CleanRepo.md:3192` | 27O “Plugin Platform, Workflow Automations & App SDK” |
| SPRINT | `CleanRepo.md:3397` | Close) |
| SPRINT | `CleanRepo.md:3430` | 27P “Federation, Clean Rooms & Secure Sharing” |
| SPRINT | `CleanRepo.md:3624` | Close) |
| SPRINT | `CleanRepo.md:3657` | 27Q “Temporal/Geo Intelligence, What-If Simulation & Playbooks” |
| SPRINT | `CleanRepo.md:3854` | Close) |
| SPRINT | `CleanRepo.md:3885` | 27R “Threat Intel Fusion, TTP Graphs & Actionable Signals” |
| SPRINT | `CleanRepo.md:4084` | Close) |
| SPRINT | `CleanRepo.md:4117` | 27S “Executive Insights, Reporting & Data Products” |
| SPRINT | `CleanRepo.md:4315` | Close) |
| SPRINT | `CleanRepo.md:4346` | 27T “Edge & Air-Gapped Ops, Mobile Field Kit & Offline Provenance” |
| SPRINT | `CleanRepo.md:4546` | Close) |
| SPRINT | `CleanRepo.md:4580` | 27U “Active-Active Multi-Region, Multi-Cloud & Zero-Downtime Everything” |
| SPRINT | `CleanRepo.md:4789` | Close) |
| SPRINT | `CleanRepo.md:4822` | 27V “Ops Copilot, Guarded Agents & NL Runbooks” |
| SPRINT | `CleanRepo.md:5022` | Close) |
| SPRINT | `CleanRepo.md:5054` | 27W “Model Governance, Eval Lab & Continual Tuning” |
| SPRINT | `CleanRepo.md:5260` | Close) |
| SPRINT | `CleanRepo.md:5294` | 27X “Zero-Trust Networking, Host Hardening & Supply-Chain Assurance” |
| SPRINT | `CleanRepo.md:5501` | Close) |
| SPRINT | `CleanRepo.md:5536` | 27Y “Performance, Cost & Carbon: Token Efficiency, Smart Caching, and Budget Guardrails” |
| SPRINT | `CleanRepo.md:5743` | Close) |
| SPRINT | `CleanRepo.md:5776` | 27Z “Delegated Admin, Org Hierarchies & Governance-at-Scale” |
| SPRINT | `CleanRepo.md:5975` | Close) |
| SPRINT | `CleanRepo.md:6009` | 28A “Sovereign & Regulated Deployments (FedRAMP/CJIS/HIPAA/IL5)” |
| SPRINT | `CleanRepo.md:6215` | Close) |
| SPRINT | `CleanRepo.md:6248` | 28B “Privacy-Enhancing Computation: MPC/HE/TEE & Private Queries” |
| SPRINT | `CleanRepo.md:6447` | Close) |
| SPRINT | `CleanRepo.md:6481` | 28C “Financial & Influence Network Disruption: AML Graphs, Sanctions, and Takedown Packs” |
| SPRINT | `CleanRepo.md:6688` | Close) |
| SPRINT | `Closed-PR-Merge.md:1` | — Plan, Scope, and Actions |
| SPRINT | `Closed-PR-Merge.md:26` | consolidation branch. ([GitHub][1]) |
| SPRINT | `Closed-PR-Merge.md:37` | scope (7 days, one team) |
| SPRINT | `Closed-PR-Merge.md:39` | Goal |
| SPRINT | `Closed-PR-Merge.md:141` | explicitly protects the **Provenance > Prediction** ethos, **Compartmentation & Policy-by-Default**, |
| SPRINT | `Closed-PR-Merge.md:161` | kit** to intelligently merge those closed PRs, remediate breaking changes, and ship the consolidated |
| SPRINT | `Closed-PR-Merge.md:786` | driver** you asked for. Drop these files in the repo root and you can run everything with: |
| NOTE | `DEPENDENCY_HEALTH_CHECK.md:102` | Only affects CLI usage, not library API |
| NOTE | `DEPENDENCY_HEALTH_CHECK.md:116` | Development-only impact, but should still be addressed |
| NOTE | `DEPENDENCY_HEALTH_CHECK.md:135` | Most packages show as "missing" - suggests they're declared but not installed (likely hoisted to roo |
| SPRINT | `DOCUMENTATION_MAP.md:13` | Documentation](#sprint-documentation) |
| SPRINT | `DOCUMENTATION_MAP.md:41` | planning |
| SPRINT | `DOCUMENTATION_MAP.md:45` | organization |
| SPRINT | `DOCUMENTATION_MAP.md:70` | catalog \| 100+ sprint plans organized \| 2025-11-20 \| |
| SPRINT | `DOCUMENTATION_MAP.md:94` | Documentation |
| SPRINT | `DOCUMENTATION_MAP.md:96` | Organization |
| SPRINT | `DOCUMENTATION_MAP.md:98` | catalog |
| SPRINT | `DOCUMENTATION_MAP.md:102` | \| File \| Status \| |
| SPRINT | `DOCUMENTATION_MAP.md:141` | Execution |
| SPRINT | `DOCUMENTATION_MAP.md:151` | Support Documents |
| SPRINT | `DOCUMENTATION_MAP.md:330` | impl report \| ✅ Complete \| |
| SPRINT | `DOCUMENTATION_MAP.md:410` | prompt \| |
| SPRINT | `DOCUMENTATION_MAP.md:411` | prompt \| |
| SPRINT | `DOCUMENTATION_MAP.md:412` | prompt \| |
| SPRINT | `DOCUMENTATION_MAP.md:422` | ideas \| |
| SPRINT | `DOCUMENTATION_MAP.md:447` | Plans** \| 100+ \| `/`, `/docs/sprints/`, `/october2025/` \| |
| SPRINT | `DOCUMENTATION_MAP.md:473` | planning:** Check `SPRINT_INDEX.md` |
| SPRINT | `DOCUMENTATION_MAP.md:507` | planning sessions \| |
| SPRINT | `DOCUMENTATION_MAP.md:508` | Index** \| Weekly \| New sprint starts \| |
| SPRINT | `DOCUMENTATION_MAP.md:510` | \| Sprint completion \| |
| SPRINT | `DOCUMENTATION_MAP.md:533` | organization |
| SPRINT | `EXECUTIVE_SUMMARY.md:179` | Execution |
| SPRINT | `EXECUTIVE_SUMMARY.md:184` | Duration** \| 2 weeks (10 working days) \| |
| SPRINT | `EXECUTIVE_SUMMARY.md:187` | Success Rate** \| 94%+ \| |
| SPRINT | `EXECUTIVE_SUMMARY.md:314` | completion rate |
| SPRINT | `EXECUTIVE_SUMMARY.md:404` | catalog \| `/SPRINT_INDEX.md` \| |
| SPRINT | `FINAL_MISSION_COMPLETE_ULTIMATE_SUMMARY.md:53` | summaries** and milestone achievements |
| SPRINT | `GA_CONSOLIDATION_RUNBOOK_UPDATED.md:171` | - UPGRADED |
| SPRINT | `GA_CONSOLIDATION_RUNBOOK_UPDATED.md:177` | - EXPANDED |
| TODO | `GOVERNANCE_DESIGN.md:27` | at opa-abac.ts:161) |
| SPRINT | `HYPERCARE_MISSION_COMPLETE.md:5` | execution |
| SPRINT | `INTELGRAPH_ENGINEERING_STANDARD_V4.md:967` | Planning (90m, biweekly):** commit to sprint goal + capacity. |
| SPRINT | `INTELGRAPH_ENGINEERING_STANDARD_V4.md:968` | Review/Demo (45m):** show working software; record demo. |
| SPRINT | `INTELGRAPH_ENGINEERING_STANDARD_V4.md:983` | backlog. |
| SPRINT | `INTELGRAPH_ENGINEERING_STANDARD_V4.md:1144` | commit, etc.) |
| SPRINT | `INTELGRAPH_ENGINEERING_STANDARD_V4.md:1173` | review. |
| XXX | `INTELGRAPH_ENGINEERING_STANDARD_V4.md:1346` | Title |
| SPRINT | `INTELGRAPH_ENGINEERING_STANDARD_V4.md:1365` | end (biweekly) or on demand via Merge Queue. |
| SPRINT | `INTELGRAPH_ENGINEERING_STANDARD_V4.md:1476` | Board** (group by `Status`, filter `is:open sprint:current`). |
| NOTE | `JULES_MASTER_ORCHESTRATION_PROMPT.md:237` | config/env vars, data flows, and failure modes. |
| XXX | `LAUNCH_SEQUENCE_v035.md:58` | (threshold: ≥0.8) |
| XXX | `LAUNCH_SEQUENCE_v035.md:68` | (below threshold) |
| SPRINT | `MAESTRO_PRD_ADDENDA.md:3` | planning or regulatory packages. |
| SPRINT | `MAESTRO_V03_SPRINT_SUMMARY.md:1` | Summary |
| SPRINT | `MAESTRO_V03_SPRINT_SUMMARY.md:5` | Goals Achieved |
| SPRINT | `MAESTRO_V03_SPRINT_SUMMARY.md:76` | KPI Results |
| SPRINT | `MAESTRO_V03_SPRINT_SUMMARY.md:179` | Recommendations |
| SPRINT | `MAESTRO_V03_SPRINT_SUMMARY.md:234` | Complete - All KPIs Met |
| SPRINT | `MAESTRO_v5-v10_IMPLEMENTATION_SUMMARY.md:5` | iterations. |
| SPRINT | `MAESTRO_v5-v10_IMPLEMENTATION_SUMMARY.md:7` | Implementations |
| SPRINT | `MAESTRO_v5-v10_IMPLEMENTATION_SUMMARY.md:9` | v5: Advanced Risk Analysis Engine |
| SPRINT | `MAESTRO_v5-v10_IMPLEMENTATION_SUMMARY.md:29` | v6: Intelligent Rollback System |
| SPRINT | `MAESTRO_v5-v10_IMPLEMENTATION_SUMMARY.md:48` | v7: Cross-Service Orchestration |
| SPRINT | `MAESTRO_v5-v10_IMPLEMENTATION_SUMMARY.md:67` | v8: AI-Powered Testing Strategy |
| SPRINT | `MAESTRO_v5-v10_IMPLEMENTATION_SUMMARY.md:86` | v9: Advanced Monitoring & Observability |
| SPRINT | `MAESTRO_v5-v10_IMPLEMENTATION_SUMMARY.md:105` | v10: Compliance & Governance Automation |
| SPRINT | `MAESTRO_v5-v10_IMPLEMENTATION_SUMMARY.md:128` | systems into a cohesive autonomous release train. |
| SPRINT | `MAESTRO_v5-v10_IMPLEMENTATION_SUMMARY.md:261` | completion) |
| HACK | `MAINTAINABILITY.md:76` | comments |
| TODO | `MAINTAINABILITY.md:243` | counting |
| FIXME | `MAINTAINABILITY.md:425` | comments |
| SPRINT | `MAINTAINABILITY.md:431` | to address debt |
| TODO | `MAINTAINABILITY.md:436` | fix this |
| TODO | `MAINTAINABILITY.md:438` | with issue reference |
| SPRINT | `MASTER_PLANNING.md:15` | Planning Framework](#sprint-planning-framework) |
| SPRINT | `MASTER_PLANNING.md:38` | Completion** \| 100+ sprints executed \| |
| SPRINT | `MASTER_PLANNING.md:144` | Planning Framework |
| SPRINT | `MASTER_PLANNING.md:146` | Organization Structure |
| SPRINT | `MASTER_PLANNING.md:148` | planning framework with **100+ documented sprints** organized into multiple streams: |
| SPRINT | `MASTER_PLANNING.md:154` | 01: Ethics-first DNA |
| SPRINT | `MASTER_PLANNING.md:155` | 02: Bitemporal + GeoTemporal + ER |
| SPRINT | `MASTER_PLANNING.md:156` | 03: Federated link discovery |
| SPRINT | `MASTER_PLANNING.md:192` | plans: |
| SPRINT | `MASTER_PLANNING.md:199` | Structure Pattern |
| SPRINT | `MASTER_PLANNING.md:204` | Goal |
| SPRINT | `MASTER_PLANNING.md:237` | Themes |
| SPRINT | `MASTER_PLANNING.md:266` | Velocity Metrics |
| SPRINT | `MASTER_PLANNING.md:729` | Documentation |
| SPRINT | `MASTER_PLANNING.md:843` | phases begin |
| SPRINT | `MASTER_PLANNING.md:848` | planning sessions |
| SPRINT | `MERGE-PLAN.md:13` | 27A**: CI/CD & Supply Chain Hardening |
| SPRINT | `MERGE-PLAN.md:20` | 27C**: Demo Stack & Observability |
| SPRINT | `MERGE-PLAN.md:26` | 27D**: Security Hardening |
| SPRINT | `MERGE-PLAN.md:33` | 27E**: Performance & Cost Optimization |
| SPRINT | `MERGE-PLAN.md:42` | 27B**: Final merge coordination (this document) |
| SPRINT | `MERGE-PLAN.md:43` | 27F**: Data Quality & GA Enablement |
| SPRINT | `MERGE-PLAN.md:44` | 27G**: Tri-Pane UX & Search Optimization |
| SPRINT | `MERGE-PLAN.md:45` | 27H**: Enterprise Readiness (SSO/SCIM, BYOK, DR) |
| FIXME | `MERGE-PLAN.md:327` | count maintained |
| SPRINT | `MERGE-PLAN.md:490` | Lead**: Available 24/7 during merge window |
| TODO | `MERGE_READY_VERIFICATION_CHECKLIST.md:22` | stubs in production code** - All implementations are complete and production-ready |
| SPRINT | `MLFP_IMPLEMENTATION_COMPLETE.md:11` | 1: Foundation & Core Features** ✅ **COMPLETE |
| SPRINT | `MLFP_IMPLEMENTATION_COMPLETE.md:20` | 2: Advanced Analytics & AI** ✅ **COMPLETE |
| SPRINT | `MLFP_IMPLEMENTATION_COMPLETE.md:27` | 3: Intelligence & Mobile** ✅ **COMPLETE |
| SPRINT | `MLFP_IMPLEMENTATION_COMPLETE.md:326` | 1-3 features implemented |
| SPRINT | `MVP2_Q1_Roadmap.md:36` | planning and agent dispatch. |
| SPRINT | `MVP2_Q1_Roadmap.md:38` | planning. |
| SPRINT | `ORCHESTRATION_INVENTORY.md:88` | management |
| SPRINT | `ORCHESTRATOR_SUPERSET_CAPABILITIES.md:20` | alignment from natural-language goals. |
| SPRINT | `ORCHESTRATOR_SUPERSET_CAPABILITIES.md:76` | synchronization. |
| SPRINT | `ORCHESTRATOR_SUPERSET_CAPABILITIES.md:102` | alignment, and VR/AR-ready Comet++ surfaces beyond current UI shell.      \| Q1–Q2: Context fabric r |
| SPRINT | `PHASE3_FINAL_VALIDATION_REPORT.md:244` | tracker note |
| SPRINT | `PHASE4_CONTROL_BOARD.md:17` | (2 weeks):** lock GraphQL ⇄ **prov-ledger** ⇄ **graph-xai** integration with **verifiable export**;  |
| SPRINT | `PHASE4_CONTROL_BOARD.md:28` | if needed. |
| SPRINT | `PHASE4_CONTROL_BOARD.md:223` | Plan (2 weeks) |
| SPRINT | `PM_COORDINATION_PAYLOAD.json:69` | activities" |
| SPRINT | `PR_TRIAGE_PLAN.md:425` | to governance PRs specifically |
| NOTE | `RELEASE_NOTES.md:51` | generation; runbooks and SLOs wired. |
| SPRINT | `RELEASE_NOTES.md:330` | Planning |
| SPRINT | `RELEASE_NOTES.md:332` | 26) |
| SPRINT | `RELEASE_NOTES_COMPREHENSIVE.md:5` | Cycles:** 8 completed sprints |
| SPRINT | `RELEASE_NOTES_COMPREHENSIVE.md:17` | Plans (Sept-Dec 2025)** - All 8 sprint cycles executed |
| SPRINT | `RELEASE_NOTES_COMPREHENSIVE.md:31` | Plans:** 8 sprint cycles implemented |
| SPRINT | `RELEASE_NOTES_COMPREHENSIVE.md:93` | Execution Timeline |
| SPRINT | `RELEASE_NOTES_COMPREHENSIVE.md:144` | management |
| SPRINT | `RELEASE_NOTES_COMPREHENSIVE.md:156` | Completion** - All 8 planned sprints executed successfully |
| SPRINT | `RELEASE_NOTES_COMPREHENSIVE.md:216` | cycles** → **Systematic delivery execution |
| FUTURE WORK | `RUNBOOKS/DR.md:84` | (Production) |
| NOTE | `RUNBOOKS/canary/raise_conductor_canary.md:37` | capture admission_decision_total by reason, top tenants impacted, any active overrides. |
| SPRINT | `SECURITY/dlp/rules.yml:2` | 27D: PII protection and field-level redaction |
| SPRINT | `SECURITY/policy/opa-bundle.ts:3` | 27D: Secure policy distribution with cryptographic verification |
| SPRINT | `SECURITY/policy/trust-policy.yaml:2` | 27D: SLSA compliance and provenance verification |
| SPRINT | `SECURITY/secrets/rotation.ts:3` | 27D: Automated credential lifecycle with zero-downtime rotation |
| SPRINT | `SECURITY/vuln-management.md:196` | ├─ Code      ├─ Unit    ├─ CAB     ├─ Blue/Green |
| NOTE | `SERVICE_INVENTORY.md:740` | Appears to be for red-teaming or scenario analysis |
| SPRINT | `SPRINT1_EXECUTION_SUMMARY.md:5` | Duration**: Planned 2 weeks |
| SPRINT | `SPRINT1_EXECUTION_SUMMARY.md:281` | backlog |
| SPRINT | `SPRINT1_EXECUTION_SUMMARY.md:283` | Planning (Next 2 Weeks) |
| SPRINT | `SPRINT1_EXECUTION_SUMMARY.md:298` | execution was completed using: |
| SPRINT | `SPRINT_ANALYST_COPILOT.md:10` | is a three-lane highway: Copilot, Workflows, Observability—each with a golden-path demo (query → exp |
| SPRINT | `SPRINT_ANALYST_COPILOT.md:42` | Prompt (paste this section into your tracker as the full brief) |
| SPRINT | `SPRINT_ANALYST_COPILOT.md:43` | Goal (2 weeks) |
| SPRINT | `SPRINT_CLEARANCE_LATTICE.md:1` | Prompt — Operation **CLEARANCE LATTICE** (Wishlist Sprint 03) |
| SPRINT | `SPRINT_FRAUD_SCAM_INTEL.md:1` | #2 (Fraud/Scam Intel + Social Monitoring) \| IntelGraph Advisory Report \| GitHub Branch: feature/fr |
| SPRINT | `SPRINT_FRAUD_SCAM_INTEL.md:10` | is a two-lane highway: (A) detectors & watchers (Fraud/Scam), (B) source-lawful Social Monitoring wi |
| SPRINT | `SPRINT_FRAUD_SCAM_INTEL.md:44` | Prompt (paste this whole section into your tracker) |
| SPRINT | `SPRINT_FRAUD_SCAM_INTEL.md:46` | Goal (2 weeks): Deliver Fraud/Scam Intelligence v1 and Social Monitoring v1.5 that produce explainab |
| TODO | `SPRINT_FRAUD_SCAM_INTEL.md:187` | call GraphQL mutation server.mutations.upsertAlert(alerts) |
| SPRINT | `SPRINT_GLASS_BOX.md:1` | Prompt — Operation **GLASS BOX** (Wishlist Sprint 05) |
| SPRINT | `SPRINT_INDEX.md:1` | Planning Index |
| SPRINT | `SPRINT_INDEX.md:12` | Organization](#sprint-organization) |
| SPRINT | `SPRINT_INDEX.md:14` | Timeline](#chronological-sprint-timeline) |
| SPRINT | `SPRINT_INDEX.md:17` | Planning Standards](#sprint-planning-standards) |
| SPRINT | `SPRINT_INDEX.md:24` | planning documentation across the Summit/IntelGraph project. Sprints are organized into multiple str |
| SPRINT | `SPRINT_INDEX.md:26` | Statistics |
| SPRINT | `SPRINT_INDEX.md:30` | Plans** \| 100+ \| |
| SPRINT | `SPRINT_INDEX.md:35` | Duration** \| 2 weeks (10 working days) \| |
| SPRINT | `SPRINT_INDEX.md:40` | Organization |
| SPRINT | `SPRINT_INDEX.md:49` | prompts (10+ files) |
| SPRINT | `SPRINT_INDEX.md:50` | plans (3 files) |
| SPRINT | `SPRINT_INDEX.md:64` | \| File \| Focus \| Status \| |
| SPRINT | `SPRINT_INDEX.md:66` | 01** \| `SPRINT_PROVENANCE_FIRST.md` \| Provenance & ethics-first DNA \| ✅ Complete \| |
| SPRINT | `SPRINT_INDEX.md:67` | 02** \| `SPRINT_TRIAD_MERGE.md` \| Bitemporal + GeoTemporal + ER \| ✅ Complete \| |
| SPRINT | `SPRINT_INDEX.md:68` | 03** \| `SPRINT_CLEARANCE_LATTICE.md` \| Federated link discovery \| ✅ Complete \| |
| SPRINT | `SPRINT_INDEX.md:80` | \| File \| Focus \| Status \| |
| SPRINT | `SPRINT_INDEX.md:97` | \| File \| Focus \| Status \| |
| SPRINT | `SPRINT_INDEX.md:114` | \| File \| Focus \| Status \| |
| SPRINT | `SPRINT_INDEX.md:127` | \| File \| Focus \| Status \| |
| SPRINT | `SPRINT_INDEX.md:139` | Timeline |
| SPRINT | `SPRINT_INDEX.md:143` | Calendar |
| SPRINT | `SPRINT_INDEX.md:147` | \| Dates \| File \| Focus Areas \| |
| SPRINT | `SPRINT_INDEX.md:149` | 14** \| Aug 29 - Sep 12 \| `sprint-14-plan.md` \| Provenance ledger beta \| |
| SPRINT | `SPRINT_INDEX.md:150` | Aug 25** \| Aug 25 - Sep 5 \| `sprint_plan_intel_graph_aug_25_sep_5_2025.md` \| Provenance & Export  |
| SPRINT | `SPRINT_INDEX.md:151` | 12** \| Sep 15-26, 2025 \| Intel Graph Frontend Sprint 12 \| UI foundation \| |
| SPRINT | `SPRINT_INDEX.md:152` | 2025-09-08** \| Sep 8-19, 2025 \| `sprint_plan_sep_8_19_2025_america_denver.md` \| Alert triage v2,  |
| SPRINT | `SPRINT_INDEX.md:153` | 2025-09-22** \| Sep 22 - Oct 3 \| `sprint_plan_sep_22_oct_3_2025_america_denver.md` \| Policy Intell |
| SPRINT | `SPRINT_INDEX.md:159` | \| Dates \| File \| Focus Areas \| |
| SPRINT | `SPRINT_INDEX.md:161` | 2025-10-06** \| Oct 6-17 \| `sprint_plan_oct_6_17_2025_america_denver.md` \| Graph UI enhancements \ |
| SPRINT | `SPRINT_INDEX.md:162` | 2025-10-20** \| Oct 20-31 \| `sprint_plan_oct_20_31_2025_america_denver.md` \| Federation capabiliti |
| SPRINT | `SPRINT_INDEX.md:163` | 2025-11-03** \| Nov 3-14 \| `sprint_plan_nov_3_14_2025_america_denver.md` \| Policy Intelligence v1  |
| SPRINT | `SPRINT_INDEX.md:164` | 2025-11-17** \| Nov 17-28 \| `sprint_plan_nov_17_28_2025_america_denver.md` \| SOAR v1.4 + Graph UI  |
| SPRINT | `SPRINT_INDEX.md:165` | 2025-12-01** \| Dec 1-12 \| `sprint_plan_dec_1_12_2025_america_denver.md` \| Mobile read-only \| |
| SPRINT | `SPRINT_INDEX.md:166` | 2025-12-15** \| Dec 15-23 \| `sprint_plan_dec_15_23_2025_america_denver.md` \| Year-end hardening \| |
| SPRINT | `SPRINT_INDEX.md:170` | Calendar |
| SPRINT | `SPRINT_INDEX.md:174` | \| Dates \| File \| Focus Areas \| |
| SPRINT | `SPRINT_INDEX.md:176` | 2026-01-19** \| Jan 19-30 \| `sprint_plan_jan_19_30_2026_america_denver.md` \| Federation v2 \| |
| SPRINT | `SPRINT_INDEX.md:177` | 2026-02-02** \| Feb 2-13 \| `sprint_plan_feb_2_13_2026_america_denver.md` \| Privacy enhancements \| |
| SPRINT | `SPRINT_INDEX.md:178` | 2026-02-16** \| Feb 16-27 \| `sprint_plan_feb_16_27_2026_america_denver.md` \| Policy Intelligence v |
| SPRINT | `SPRINT_INDEX.md:179` | 2026-03-02** \| Mar 2-13 \| `sprint_plan_mar_2_13_2026_america_denver.md` \| Early Access Launch \| |
| SPRINT | `SPRINT_INDEX.md:185` | \| Dates \| File \| Focus Areas \| |
| SPRINT | `SPRINT_INDEX.md:187` | 2026-04-13** \| Apr 13-24 \| `sprint_plan_apr_13_24_2026_america_denver.md` \| Advanced analytics \| |
| SPRINT | `SPRINT_INDEX.md:189` | 2026-05-11** \| May 11-22 \| `sprint_plan_may_11_22_2026_america_denver.md` \| Performance optimizat |
| SPRINT | `SPRINT_INDEX.md:190` | 2026-05-25** \| May 25 - Jun 5 \| `sprint_plan_may_25_jun_5_2026_america_denver.md` \| Scale testing |
| SPRINT | `SPRINT_INDEX.md:191` | 2026-06-08** \| Jun 8-19 \| `sprint_plan_jun_8_19_2026_america_denver.md` \| Production hardening \| |
| SPRINT | `SPRINT_INDEX.md:248` | \| File \| Focus \| Dates \| |
| SPRINT | `SPRINT_INDEX.md:272` | \| File \| Focus \| Dates \| |
| SPRINT | `SPRINT_INDEX.md:318` | Planning Standards |
| SPRINT | `SPRINT_INDEX.md:320` | Structure |
| SPRINT | `SPRINT_INDEX.md:322` | follows this consistent format: |
| SPRINT | `SPRINT_INDEX.md:325` | [Name/Number] |
| SPRINT | `SPRINT_INDEX.md:327` | Window |
| SPRINT | `SPRINT_INDEX.md:333` | Goal |
| SPRINT | `SPRINT_INDEX.md:408` | review, retrospective, planning next |
| SPRINT | `SPRINT_INDEX.md:447` | Themes |
| SPRINT | `SPRINT_INDEX.md:521` | Velocity Trends |
| SPRINT | `SPRINT_INDEX.md:525` | \| Completion Rate \| Notes \| |
| SPRINT | `SPRINT_INDEX.md:533` | structure |
| SPRINT | `SPRINT_INDEX.md:553` | by... |
| SPRINT | `SPRINT_INDEX.md:571` | Planning Tools |
| SPRINT | `SPRINT_INDEX.md:574` | structure in this document |
| SPRINT | `SPRINT_INDEX.md:582` | planning |
| SPRINT | `SPRINT_INDEX.md:586` | updates |
| SPRINT | `SPRINT_INDEX.md:590` | starts |
| SPRINT | `SPRINT_INDEX.md:591` | scope changes |
| SPRINT | `SPRINT_INDEX.md:597` | Index |
| SPRINT | `SPRINT_INDEX.md:600` | planning session (weekly) |
| SPRINT | `SPRINT_MAESTRO_COMPOSER_BACKEND.md:1` | Prompt — Maestro Composer (Backend) |
| SPRINT | `SPRINT_MAESTRO_COMPOSER_BACKEND.md:13` | End** (binary): |
| NOTE | `SPRINT_MAESTRO_COMPOSER_BACKEND.md:157` | Existing endpoints under `apps/workflow-engine/src/server.ts` provide a head start; the sprint finis |
| SPRINT | `SPRINT_MAESTRO_COMPOSER_BACKEND.md:238` | End) |
| SPRINT | `SPRINT_MAESTRO_COMPOSER_BACKEND_S2.md:1` | Prompt — Maestro Composer (Backend) — Sprint 2 |
| SPRINT | `SPRINT_MAESTRO_COMPOSER_BACKEND_S2.md:9` | North Star |
| SPRINT | `SPRINT_MAESTRO_COMPOSER_BACKEND_S2.md:207` | End) |
| SPRINT | `SPRINT_MAESTRO_COMPOSER_BACKEND_S3.md:1` | Prompt — Maestro Composer (Backend) — Sprint 3 |
| SPRINT | `SPRINT_MAESTRO_COMPOSER_BACKEND_S3.md:10` | North Star |
| SPRINT | `SPRINT_MAESTRO_COMPOSER_BACKEND_S3.md:226` | End) |
| SPRINT | `SPRINT_MAESTRO_UI_V0.1.md:1` | Prompt — Maestro UI v0.1 (Conductor → Maestro) |
| SPRINT | `SPRINT_MAESTRO_UI_V0.1.md:22` | Goal (2 weeks) |
| SPRINT | `SPRINT_PROBABLE_CAUSE.md:1` | Prompt — Operation **PROBABLE CAUSE** (Wishlist Sprint 04) |
| SPRINT | `SPRINT_PROVENANCE_FIRST.md:1` | Prompt — Operation **PROVENANCE FIRST** (Wishlist Sprint 01) |
| SPRINT | `SPRINT_PROVENANCE_FIRST.md:5` | hardens trust. We will not scale guesses; we will scale proof, audit, and reversible automation. |
| NOTE | `SPRINT_PROVENANCE_FIRST.md:155` | PII/License; commit. |
| SPRINT | `SPRINT_PROVENANCE_FIRST.md:163` | Exit) |
| SPRINT | `SPRINT_STATUS_AUG19.md:1` | Status - Aug 19, 2025 |
| SPRINT | `SPRINT_STATUS_AUG19.md:30` | Assignments (COPY-PASTE READY) |
| SPRINT | `SPRINT_TASKS.md:1` | Task Breakdown |
| SPRINT | `SPRINT_TASKS.md:3` | prompts into concrete tasks, files, and function signatures. |
| SPRINT | `SPRINT_TRIAD_MERGE.md:1` | Prompt — Operation **TRIAD MERGE** (Wishlist Sprint 02) |
| SPRINT | `SPRINT_UNIFIED_DATA_FOUNDATION.md:3` | #4. Consensus is noted where unanimous; dissents are highlighted. |
| SPRINT | `SPRINT_UNIFIED_DATA_FOUNDATION.md:16` | is a **four-lane** highway: **Federation**, **Imperfect Data**, **KYC/Forensics**, **Agentic Builder |
| SPRINT | `SPRINT_UNIFIED_DATA_FOUNDATION.md:45` | Prompt (paste this whole section into your tracker as the full brief) |
| SPRINT | `SPRINT_UNIFIED_DATA_FOUNDATION.md:47` | Goal (2 weeks) |
| SPRINT | `STEADY_STATE_MAINTENANCE.md:153` | 1: TypeScript & React Hardening |
| SPRINT | `STEADY_STATE_MAINTENANCE.md:165` | 2: Contracts & Resilience |
| TODO | `TECH_DEBT_TRACKER.md:7` | assert)` |
| TODO | `TECH_DEBT_TRACKER.md:8` | implement query for merged + age; log only in dry-run` |
| TODO | `TECH_DEBT_TRACKER.md:11` | call GraphQL mutation server.mutations.upsertAlert(alerts)` |
| TODO | `TECH_DEBT_TRACKER.md:12` | call Typesense search; for now, return empty` |
| TODO | `TECH_DEBT_TRACKER.md:13` | Implement PDF export` |
| TODO | `TECH_DEBT_TRACKER.md:14` | Implement SCIM sync using your IdP API.` |
| TODO | `TECH_DEBT_TRACKER.md:15` | wire to your telemetry` |
| TODO | `TECH_DEBT_TRACKER.md:16` | Implement layout logic here (dagre, radial)` |
| TODO | `TECH_DEBT_TRACKER.md:17` | Re-enable GraphQL subscription when schema is available` |
| TODO | `TECH_DEBT_TRACKER.md:18` | Re-enable when GraphQL schema is available` |
| TODO | `TECH_DEBT_TRACKER.md:19` | Navigate to hunt detail page` |
| TODO | `TECH_DEBT_TRACKER.md:20` | Navigate to IOC detail page` |
| TODO | `TECH_DEBT_TRACKER.md:21` | render the rest of the action details here *}` |
| TODO | `TECH_DEBT_TRACKER.md:22` | implement simulation of 50 clients editing the same document` |
| TODO | `TECH_DEBT_TRACKER.md:23` | Add proper OpenTelemetry configuration when exporter packages are available` |
| TODO | `TECH_DEBT_TRACKER.md:24` | left` |
| TODO | `TECH_DEBT_TRACKER.md:25` | set your SecretStore name` |
| TODO | `TECH_DEBT_TRACKER.md:26` | Implement admin-only check` |
| TODO | `TECH_DEBT_TRACKER.md:27` | Replace with your OIDC issuer URL` |
| TODO | `TECH_DEBT_TRACKER.md:28` | replace with actual processing logic` |
| TODO | `TECH_DEBT_TRACKER.md:29` | implement actual fine-tuning logic` |
| TODO | `TECH_DEBT_TRACKER.md:30` | Implement actual data export logic` |
| TODO | `TECH_DEBT_TRACKER.md:31` | Add prevention measures based on root cause analysis` |
| TODO | `TECH_DEBT_TRACKER.md:32` | ping DB/queue` |
| TODO | `TECH_DEBT_TRACKER.md:33` | reuse MerkleLog to recompute root; placeholder returns true` |
| TODO | `TECH_DEBT_TRACKER.md:34` | Track per-expert request counts if needed` |
| NOTE | `UPGRADE_PATH.md:224` | Maintainer considers side-channel attacks out of scope |
| SPRINT | `VNEXT_PLUS1_SPRINT_REPORT.md:3` | Report & Achievement Summary |
| SPRINT | `VNEXT_PLUS1_SPRINT_REPORT.md:5` | Goal:** Cut critical-path build time by ≥25% via Remote Build Execution (RBE), coverage-aware Test I |
| SPRINT | `VNEXT_PLUS1_SPRINT_REPORT.md:12` | Objectives - Delivery Status |
| SPRINT | `VNEXT_PLUS1_SPRINT_REPORT.md:211` | Retrospective |
| SPRINT | `VNEXT_PLUS1_SPRINT_REPORT.md:229` | commitments |
| SPRINT | `VNEXT_PLUS1_SPRINT_REPORT.md:267` | Report:** Comprehensive documentation and metrics |
| SPRINT | `VNEXT_PLUS1_SPRINT_REPORT.md:271` | Conclusion |
| SPRINT | `VNEXT_PLUS1_SPRINT_REPORT.md:277` | objectives completed. Ready for production deployment. |
| SPRINT | `VNEXT_PLUS1_SPRINT_REPORT.md:281` | completed on: September 12, 2025_ |
| SPRINT | `VNEXT_SPRINTS_VERIFICATION.md:3` | Status Overview |
| SPRINT | `VNEXT_SPRINTS_VERIFICATION.md:7` | \| Theme                          \| Status      \| Implementation                   \| Demo         |
| SPRINT | `VNEXT_SPRINTS_VERIFICATION.md:16` | 1: vNext - Foundation |
| SPRINT | `VNEXT_SPRINTS_VERIFICATION.md:41` | 2: vNext+1 - Remote Execution & Graph Turbo |
| SPRINT | `VNEXT_SPRINTS_VERIFICATION.md:81` | 3: vNext+2 - Federation & Foresight |
| SPRINT | `VNEXT_SPRINTS_VERIFICATION.md:121` | 4: vNext+3 - Autopilot & Resilience |
| SPRINT | `VNEXT_SPRINTS_VERIFICATION.md:204` | implementations are properly integrated in `package.json`: |
| SPRINT | `VNEXT_SPRINTS_VERIFICATION.md:230` | includes full demo coverage |
| SPRINT | `VNEXT_SPRINTS_VERIFICATION.md:255` | has: |
| SPRINT | `VNEXT_SPRINTS_VERIFICATION.md:264` | series represents a complete transformation of the IntelGraph build system, delivering autonomous, i |
| SPRINT | `VNEXT_SPRINTS_VERIFICATION.md:266` | components.** 🚀 |
| MISSING_IMPORT | `active-measures-module/client/components/ActiveMeasuresDashboard.tsx` | Import source './SimulationPanel' not found on disk. |
| MISSING_IMPORT | `active-measures-module/client/components/ActiveMeasuresDashboard.tsx` | Import source './ApprovalPanel' not found on disk. |
| MISSING_IMPORT | `active-measures-module/client/components/ActiveMeasuresDashboard.tsx` | Import source './SecurityPanel' not found on disk. |
| MISSING_IMPORT | `active-measures-module/src/middleware/auth.ts` | Import source '../utils/metrics';\n\ninterface User {\n  id: string;\n  username: string;\n  role: s |
| NOT IMPLEMENTED | `active-measures-module/src/security/homomorphicEncryption.ts:509` | for scheme: ${ciphertext.scheme}`, |
| NOTE | `activities.md:3060` | unknowns. |
| NOTE | `activities.md:3157` | (publishable, plain-language) |
| NOTE | `activities.md:3178` | unknowns. Prioritize harm reduction, transparency, and trust-building in all recommendations. Ensure |
| NOTE | `activities.md:3283` | (publishable, plain-language) |
| NOT IMPLEMENTED | `activities.md:3356` | elsewhere): |
| NOTE | `activities.md:4060` | (publishable, plain-language) |
| SPRINT | `adr/0013-paved-road-service-template.md:30` | goal by providing the artifact that enforces the governance checks. |
| XXX | `adr/adr-template.md:135` | Related decision |
| NOTE | `adversary_optimization_forecast_→_defensive_counter_optimization_pack_v_1_wolf.md:5` | (Chair):** We will not optimize adversary operations. This pack forecasts how adaptive opponents _mi |
| MISSING_IMPORT | `agents/multimodal/__tests__/fusion-orchestrator.test.ts` | Import source '../fusion-orchestrator.js' not found on disk. |
| MISSING_IMPORT | `agents/multimodal/__tests__/fusion-orchestrator.test.ts` | Import source '../clip-pipeline.js' not found on disk. |
| MISSING_IMPORT | `agents/multimodal/__tests__/fusion-orchestrator.test.ts` | Import source '../text-pipeline.js' not found on disk. |
| MISSING_IMPORT | `agents/multimodal/__tests__/fusion-orchestrator.test.ts` | Import source '../video-pipeline.js' not found on disk. |
| MISSING_IMPORT | `agents/multimodal/__tests__/fusion-orchestrator.test.ts` | Import source '../hallucination-guard.js' not found on disk. |
| MISSING_IMPORT | `agents/multimodal/__tests__/fusion-orchestrator.test.ts` | Import source '../pgvector-store.js' not found on disk. |
| MISSING_IMPORT | `agents/multimodal/__tests__/fusion-orchestrator.test.ts` | Import source '../neo4j-embeddings.js' not found on disk. |
| MISSING_IMPORT | `agents/multimodal/fusion-orchestrator.ts` | Import source './clip-pipeline.js' not found on disk. |
| MISSING_IMPORT | `agents/multimodal/fusion-orchestrator.ts` | Import source './text-pipeline.js' not found on disk. |
| MISSING_IMPORT | `agents/multimodal/fusion-orchestrator.ts` | Import source './video-pipeline.js' not found on disk. |
| MISSING_IMPORT | `agents/multimodal/fusion-orchestrator.ts` | Import source './hallucination-guard.js' not found on disk. |
| MISSING_IMPORT | `agents/multimodal/fusion-orchestrator.ts` | Import source './pgvector-store.js' not found on disk. |
| MISSING_IMPORT | `agents/multimodal/fusion-orchestrator.ts` | Import source './neo4j-embeddings.js' not found on disk. |
| MISSING_IMPORT | `agents/multimodal/index.ts` | Import source './fusion-orchestrator.js' not found on disk. |
| MISSING_IMPORT | `agents/multimodal/video-pipeline.ts` | Import source './clip-pipeline.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/__tests__/CircuitBreaker.test.ts` | Import source '../src/routing/CircuitBreaker.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/__tests__/GovernanceEngine.test.ts` | Import source '../src/governance/GovernanceEngine.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/__tests__/GovernanceEngine.test.ts` | Import source '../src/types/index.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/__tests__/HallucinationScorer.test.ts` | Import source '../src/scoring/HallucinationScorer.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/__tests__/HallucinationScorer.test.ts` | Import source '../src/types/index.js' not found on disk. |
| HACK | `agents/orchestrator/__tests__/MultiLLMOrchestrator.test.ts:97` | the system' }], |
| MISSING_IMPORT | `agents/orchestrator/__tests__/Providers.test.ts` | Import source '../src/providers/ClaudeProvider.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/__tests__/Providers.test.ts` | Import source '../src/providers/OpenAIProvider.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/__tests__/Providers.test.ts` | Import source '../src/providers/index.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/src/MultiLLMOrchestrator.ts` | Import source './state/index.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/src/MultiLLMOrchestrator.ts` | Import source './governance/index.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/src/MultiLLMOrchestrator.ts` | Import source './scoring/index.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/src/providers/ClaudeProvider.ts` | Import source './BaseLLMProvider.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/src/providers/OpenAIProvider.ts` | Import source './BaseLLMProvider.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/src/providers/index.ts` | Import source './BaseLLMProvider.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/src/providers/index.ts` | Import source './ClaudeProvider.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/src/providers/index.ts` | Import source './OpenAIProvider.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/src/providers/index.ts` | Import source '../types/index.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/src/routing/FallbackRouter.ts` | Import source './CircuitBreaker.js' not found on disk. |
| MISSING_IMPORT | `agents/orchestrator/src/routing/FallbackRouter.ts` | Import source '../providers/index.js' not found on disk. |
| NOTE | `airflow/tests/test_etl_flow.py:26` | Importing from a DAG file can be tricky if it has side effects (like defining a DAG object). |
| NOTE | `amb.md:31` | v1** (for front offices) |
| TODO | `api/search.js:6` | call Typesense search; for now, return empty |
| TODO | `apps/analytics-engine/src/server.ts:462` | Implement PDF export |
| NOT IMPLEMENTED | `apps/analytics-engine/src/server.ts:463` | yet' }); |
| NOT IMPLEMENTED | `apps/analytics-engine/src/services/DashboardService.ts:571` | yet'); |
| MISSING_IMPORT | `apps/feed-processor/src/server.ts` | Import source './utils/logger' not found on disk. |
| MISSING_IMPORT | `apps/feed-processor/src/server.ts` | Import source './config' not found on disk. |
| MISSING_IMPORT | `apps/feed-processor/src/server.ts` | Import source './middleware/auth' not found on disk. |
| NOT IMPLEMENTED | `apps/feed-processor/src/server.ts:224` | yet' }); |
| MISSING_IMPORT | `apps/feed-processor/src/services/EnrichmentService.ts` | Import source '../utils/logger' not found on disk. |
| MISSING_IMPORT | `apps/feed-processor/src/services/FeedProcessorService.ts` | Import source '../utils/logger' not found on disk. |
| TODO | `apps/gateway/src/rbac/scim.ts:2` | Implement SCIM sync using your IdP API. |
| NOT IMPLEMENTED | `apps/graph-analytics/src/server.ts:512` | yet' }); |
| NOT IMPLEMENTED | `apps/graph-analytics/src/server.ts:530` | yet' }); |
| NOT IMPLEMENTED | `apps/graph-analytics/src/server.ts:546` | yet' }); |
| MISSING_IMPORT | `apps/intelgraph-api/src/index.ts` | Import source './schema.js' not found on disk. |
| MISSING_IMPORT | `apps/intelgraph-api/src/index.ts` | Import source './lib/context.js' not found on disk. |
| MISSING_IMPORT | `apps/intelgraph-api/src/schema.ts` | Import source '../schema/base.graphql?raw' not found on disk. |
| MISSING_IMPORT | `apps/labeling-ui/src/App.tsx` | Import source './pages/ReviewPage' not found on disk. |
| MISSING_IMPORT | `apps/labeling-ui/src/App.tsx` | Import source './pages/DatasetsPage' not found on disk. |
| MISSING_IMPORT | `apps/labeling-ui/src/App.tsx` | Import source './pages/QualityPage' not found on disk. |
| MISSING_IMPORT | `apps/labeling-ui/src/pages/LabelingPage.tsx` | Import source '../components/labeling/ClusterReviewTask' not found on disk. |
| MISSING_IMPORT | `apps/labeling-ui/src/pages/LabelingPage.tsx` | Import source '../components/labeling/TextClassificationTask' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/benchmarking/ABTestingManager.ts` | Import source '../utils/logger.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/benchmarking/ABTestingManager.ts` | Import source './ModelBenchmarkingService.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/benchmarking/HyperparameterOptimizer.ts` | Import source '../training/TrainingPipeline.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/benchmarking/HyperparameterOptimizer.ts` | Import source '../utils/logger.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/benchmarking/ModelBenchmarkingService.ts` | Import source '../utils/logger.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/benchmarking/ModelRegistry.ts` | Import source '../utils/logger.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/benchmarking/ModelRegistry.ts` | Import source '../training/TrainingPipeline.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/benchmarking/RetrainingOrchestrator.ts` | Import source '../utils/logger.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/benchmarking/RetrainingOrchestrator.ts` | Import source '../training/TrainingPipeline.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/benchmarking/RetrainingOrchestrator.ts` | Import source './ModelBenchmarkingService.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/benchmarking/RetrainingOrchestrator.ts` | Import source './ModelRegistry.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/benchmarking/types.ts` | Import source '../training/TrainingPipeline.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/server.ts` | Import source './services/EntityResolutionService.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/server.ts` | Import source './utils/logger.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/server.ts` | Import source './config.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/server.ts` | Import source './utils/db.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/server.ts` | Import source './training/TrainingPipeline.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/services/EntityResolutionService.ts` | Import source '../config.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/services/EntityResolutionService.ts` | Import source '../utils/logger.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/training/TrainingPipeline.ts` | Import source '../benchmarking/ModelBenchmarkingService.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/training/TrainingPipeline.ts` | Import source '../benchmarking/ModelRegistry.js' not found on disk. |
| MISSING_IMPORT | `apps/ml-engine/src/utils/db.ts` | Import source '../config.js' not found on disk. |
| NOTE | `apps/mobile-interface/next-env.d.ts:4` | This file should not be edited |
| NOTE | `apps/mobile-native/scripts/analyze-bundle.js:102` | This requires Xcode to be installed\n'); |
| TODO | `apps/mobile-native/src/services/Database.ts:15` | Generate secure key |
| TODO | `apps/mobile-native/src/services/EnhancedOfflineSync.ts:280` | Implement location sync mutation |
| TODO | `apps/mobile-native/src/services/NotificationService.ts:118` | Send token to server |
| TODO | `apps/mobile-native/src/services/NotificationService.ts:215` | Navigate to appropriate screen based on notification data |
| TODO | `apps/mobile-native/src/services/OfflineSync.ts:96` | Replace with actual mutation |
| NOTE | `apps/search-engine/src/services/IndexingService.ts:496` | ElasticsearchService needs a deleteDocument method |
| TODO | `apps/web/src/components/FlowStudio.tsx:15` | Replace jQuery with React state management |
| HACK | `apps/web/src/components/panels/TimelineRail.tsx:114` | We are not rendering IDs on the DOM elements directly accessible. |
| SPRINT | `apps/web/src/components/search/unified-search.tsx:3` | 27G: Tri-pane UX with advanced search and error-proofing |
| NOTE | `apps/web/src/data/sampleProvenance.ts:22` | 'Loaded CSV source and normalised column order', |
| NOTE | `apps/web/src/data/sampleProvenance.ts:34` | 'Converted records to canonical JSON ordering', |
| NOTE | `apps/web/src/data/sampleProvenance.ts:46` | 'Validated dataset against policy thresholds', |
| NOTE | `apps/web/src/data/sampleProvenance.ts:57` | 'Prepared evidence bundle for downstream consumption', |
| MISSING_IMPORT | `apps/web/src/features/explain/explainSlice.ts` | Import source '../viewSync/viewSyncSlice' not found on disk. |
| TODO | `apps/web/src/features/explain/explainSlice.ts:3` | viewSync feature was removed - restore if needed |
| TODO | `apps/web/src/features/explain/explainSlice.ts:36` | Re-enable when viewSync feature is restored |
| SPRINT | `apps/web/src/hooks/useJIRAIntegration.ts:251` | management |
| NOT IMPLEMENTED | `apps/web/src/mock/handlers.ts:173` | in mock' }], |
| MISSING_IMPORT | `apps/web/src/pages/AdminDashboard.tsx` | Import source '../components/admin/ModerationQueue' not found on disk. |
| MISSING_IMPORT | `apps/web/src/pages/AdminDashboard.tsx` | Import source '../components/admin/FeatureFlagsPanel' not found on disk. |
| MISSING_IMPORT | `apps/web/src/pages/AdminDashboard.tsx` | Import source '../components/admin/AuditLogViewer' not found on disk. |
| MISSING_IMPORT | `apps/web/src/pages/AdminDashboard.tsx` | Import source '../components/admin/DataExportTools' not found on disk. |
| MISSING_IMPORT | `apps/web/src/pages/AdminDashboard.tsx` | Import source '../components/admin/SystemConfigPanel' not found on disk. |
| MISSING_IMPORT | `apps/web/src/pages/AdminDashboard.tsx` | Import source '../components/admin/AlertsPanel' not found on disk. |
| TODO | `apps/web/src/pages/AdminDashboard.tsx:31` | Implement missing admin components |
| TODO | `apps/web/src/pages/AdminPage.tsx:13` | Add toast notification when component is implemented |
| NOTE | `apps/web/src/pages/maestro/pages/Artifacts.tsx:170` | ?? 'No description provided'} |
| TODO | `apps/web/src/panes/ExplainPanel.tsx:19` | restore if needed */} |
| TODO | `apps/web/src/sync/history-explain-bridge.ts:1` | Remove jQuery dependency - migrate to React event system |
| TODO | `apps/web/src/sync/history-explain-bridge.ts:10` | Replace with React-based event system |
| MISSING_IMPORT | `apps/web/tests/maestroApi.spec.ts` | Import source '../lib/maestroApi' not found on disk. |
| NOTE | `apps/webapp/canvas-ops-pack/index.ts:60` | string): void { |
| NOT IMPLEMENTED | `apps/workflow-engine/src/server.ts:191` | yet' }); |
| NOT IMPLEMENTED | `apps/workflow-engine/src/server.ts:202` | yet' }); |
| NOT IMPLEMENTED | `apps/workflow-engine/src/server.ts:276` | yet' }); |
| NOT IMPLEMENTED | `apps/workflow-engine/src/server.ts:290` | yet' }); |
| NOT IMPLEMENTED | `apps/workflow-engine/src/server.ts:324` | yet' }); |
| SPRINT | `assistant/autotriage/README.md:133` | planning suggestions |
| SPRINT | `assistant/autotriage/README.md:329` | Planning |
| SPRINT | `assistant/autotriage/README.md:340` | themes |
| SPRINT | `backlog.yaml:6` | Sprint 1 |
| SPRINT | `backlog.yaml:9` | Sprint 1 |
| SPRINT | `backlog.yaml:12` | Sprint 2 |
| SPRINT | `backlog.yaml:15` | Sprint 2 |
| SPRINT | `backlog.yaml:21` | Sprint 1 |
| SPRINT | `backlog.yaml:24` | Sprint 1 |
| SPRINT | `backlog.yaml:27` | Sprint 2 |
| SPRINT | `backlog.yaml:30` | Sprint 3 |
| SPRINT | `backlog.yaml:36` | Sprint 1 |
| SPRINT | `backlog.yaml:39` | Sprint 2 |
| SPRINT | `backlog.yaml:42` | Sprint 3 |
| SPRINT | `backlog.yaml:48` | Sprint 1 |
| SPRINT | `backlog.yaml:51` | Sprint 1 |
| SPRINT | `backlog.yaml:54` | Sprint 2 |
| SPRINT | `backlog.yaml:57` | Sprint 3 |
| SPRINT | `backlog.yaml:60` | Sprint 3 |
| SPRINT | `backlog.yaml:66` | Paved Road + Governance |
| SPRINT | `backlog.yaml:69` | Paved Road + Governance |
| SPRINT | `backlog.yaml:72` | Paved Road + Governance |
| SPRINT | `backlog.yaml:75` | Paved Road + Governance |
| SPRINT | `backlog.yaml:78` | Paved Road + Governance |
| SPRINT | `backlog.yaml:81` | Paved Road + Governance |
| SPRINT | `backlog.yaml:84` | Paved Road + Governance |
| SPRINT | `backlog.yaml:87` | Paved Road + Governance |
| NOTE | `blowback_risk_controller.py:245` | str \| None = None |
| NOTE | `blowback_risk_controller.py:271` | str) -> None: |
| NOTE | `blowback_risk_controller.py:272` | = note |
| NOTE | `blowback_risk_controller.py:309` | = data.get("transparency_note"): |
| SPRINT | `build-hardening-validation-report.md:9` | Hotfix. |
| XXX | `build_platform_deploy_evidence_bundle_cosign_verify_digest_injection_k_6_slo_gate_release_notes.md:260` | ms (target ≤ 700 ms) |
| NOTE | `build_platform_graph_ql_contract_e_2_e_pack_k_6_playwright_inspector_persisted_queries.md:30` | = `mutation CreateNote($input: NoteInput!) { createNote(input: $input) { id text } }`; |
| NOTE | `build_platform_graph_ql_contract_e_2_e_pack_k_6_playwright_inspector_persisted_queries.md:42` | OK': (r) => r.status === 200 && r.json('data.createNote.id') !== undefined, |
| NOTE | `build_platform_graph_ql_contract_e_2_e_pack_k_6_playwright_inspector_persisted_queries.md:106` | = await gql(request, `mutation($t:String!){ createNote(input:{text:$t}){ id text } }`, { t: `pw-${Da |
| NOTE | `build_platform_graph_ql_contract_e_2_e_pack_k_6_playwright_inspector_persisted_queries.md:157` | { id: ID! text: String! } |
| SPRINT | `build_platform_remediation_sprint_plan_tickets_next_phase.md:1` | Plan (Next Phase) |
| NOTE | `build_platform_remediation_sprint_plan_tickets_next_phase.md:296` | that image digests in dev can be locally built and tagged with a temporary digest, never `latest`. |
| SPRINT | `build_platform_remediation_sprint_plan_tickets_next_phase.md:322` | demo: show a PR prevented by policy (mutable tag) and a perf regression caught by Lighthouse. |
| NOTE | `cdf/__init__.py:303` | {rng.choice(note_options)}") |
| NOTE | `charts/backup/k8s-config-backup-cron.yaml:251` | Secrets must be restored manually due to security considerations" |
| NOTE | `charts/backup/redis-backup-cron.yaml:131` | In production, this would require access to Redis data directory |
| SPRINT | `charts/grafana/dashboards/v24.4.0-overview.json:5` | +3 features: Provenance, Abuse Detection, Cost Management, RTBF, and Tenant SLOs", |
| TODO | `ci_cd_hardening_ready_to_commit_bundle_maestro_aware.md:1` | ` comments. |
| TODO | `ci_cd_hardening_ready_to_commit_bundle_maestro_aware.md:149` | replace with your build command |
| TODO | `ci_cd_hardening_ready_to_commit_bundle_maestro_aware.md:470` | set cluster context via KUBE_CONFIG |
| TODO | `ci_cd_hardening_ready_to_commit_bundle_maestro_aware.md:516` | implement checks against your metrics endpoint / health dashboard |
| TODO | `ci_cd_hardening_ready_to_commit_bundle_maestro_aware.md:665` | ` placeholders. |
| MISSING_IMPORT | `cli/__tests__/agent-client.test.ts` | Import source '../src/lib/agent-client.js' not found on disk. |
| MISSING_IMPORT | `cli/__tests__/config.test.ts` | Import source '../src/lib/config.js' not found on disk. |
| MISSING_IMPORT | `cli/__tests__/export-manager.test.ts` | Import source '../src/lib/export-manager.js' not found on disk. |
| MISSING_IMPORT | `cli/__tests__/graph-client.test.ts` | Import source '../src/lib/graph-client.js' not found on disk. |
| MISSING_IMPORT | `cli/src/cli.ts` | Import source './lib/config.js' not found on disk. |
| MISSING_IMPORT | `cli/src/cli.ts` | Import source './commands/graph.js' not found on disk. |
| MISSING_IMPORT | `cli/src/cli.ts` | Import source './commands/agent.js' not found on disk. |
| MISSING_IMPORT | `cli/src/cli.ts` | Import source './commands/export.js' not found on disk. |
| MISSING_IMPORT | `cli/src/cli.ts` | Import source './commands/sync.js' not found on disk. |
| MISSING_IMPORT | `cli/src/cli.ts` | Import source './commands/config.js' not found on disk. |
| MISSING_IMPORT | `cli/src/cli.ts` | Import source './lib/constants.js' not found on disk. |
| MISSING_IMPORT | `cli/src/cli.ts` | Import source './utils/errors.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/agent.ts` | Import source '../lib/config.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/agent.ts` | Import source '../lib/config.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/agent.ts` | Import source '../lib/agent-client.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/agent.ts` | Import source '../utils/output.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/agent.ts` | Import source '../utils/errors.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/agent.ts` | Import source '../lib/constants.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/config.ts` | Import source '../lib/config.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/config.ts` | Import source '../utils/output.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/config.ts` | Import source '../utils/errors.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/config.ts` | Import source '../lib/constants.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/export.ts` | Import source '../lib/config.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/export.ts` | Import source '../lib/config.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/export.ts` | Import source '../lib/graph-client.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/export.ts` | Import source '../lib/export-manager.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/export.ts` | Import source '../utils/output.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/export.ts` | Import source '../utils/errors.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/export.ts` | Import source '../lib/constants.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/graph.ts` | Import source '../lib/config.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/graph.ts` | Import source '../lib/config.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/graph.ts` | Import source '../lib/graph-client.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/graph.ts` | Import source '../utils/output.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/graph.ts` | Import source '../utils/errors.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/graph.ts` | Import source '../lib/constants.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/sync.ts` | Import source '../lib/config.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/sync.ts` | Import source '../lib/config.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/sync.ts` | Import source '../lib/graph-client.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/sync.ts` | Import source '../lib/pgvector-sync.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/sync.ts` | Import source '../utils/output.js' not found on disk. |
| MISSING_IMPORT | `cli/src/commands/sync.ts` | Import source '../utils/errors.js' not found on disk. |
| MISSING_IMPORT | `cli/src/lib/agent-client.ts` | Import source './config.js' not found on disk. |
| MISSING_IMPORT | `cli/src/lib/agent-client.ts` | Import source './constants.js' not found on disk. |
| MISSING_IMPORT | `cli/src/lib/export-manager.ts` | Import source './config.js' not found on disk. |
| MISSING_IMPORT | `cli/src/lib/export-manager.ts` | Import source './graph-client.js' not found on disk. |
| MISSING_IMPORT | `cli/src/lib/graph-client.ts` | Import source './config.js' not found on disk. |
| MISSING_IMPORT | `cli/src/lib/pgvector-sync.ts` | Import source './config.js' not found on disk. |
| MISSING_IMPORT | `cli/src/lib/pgvector-sync.ts` | Import source './graph-client.js' not found on disk. |
| MISSING_IMPORT | `cli/src/utils/errors.ts` | Import source '../lib/constants.js' not found on disk. |
| TODO | `client/_stashed_archive/client/src/components/graph/InteractiveGraphExplorer.js:564` | Highlight cluster nodes in graph |
| NOTE | `client/_stashed_archive/client/src/routes/CaseDetail.js:60` | = gql` |
| NOTE | `client/_stashed_archive/client/src/routes/CaseDetail.js:112` | = async () => { |
| NOTE | `client/_stashed_archive/client/src/routes/CaseDetail.js:113` | content:'); |
| NOTE | `client/src/components/HelpSystem.tsx:328` | error message** exactly |
| TODO | `client/src/components/IntelGraphWorkbench.tsx:361` | Implement layout logic here (dagre, radial) |
| TODO | `client/src/components/IntelGraphWorkbench.tsx:708` | Show tooltip on hover |
| TODO | `client/src/components/IntelGraphWorkbench.tsx:767` | Show tooltip on hover |
| NOTE | `client/src/components/PolicyDenialBanner.tsx:425` | </strong> All appeals are logged and audited. Misuse |
| COMING SOON | `client/src/components/ai/InvestigationRecommendationsEngine.tsx:1737` | - will include: |
| TODO | `client/src/components/dashboard/LiveActivityFeed.tsx:24` | Re-enable GraphQL subscription when schema is available |
| TODO | `client/src/components/dashboard/LiveActivityFeed.tsx:108` | Re-enable GraphQL subscription when schema is available |
| TODO | `client/src/components/dashboard/LiveActivityFeed.tsx:119` | Re-enable when GraphQL subscription is available |
| TODO | `client/src/components/dashboard/StatsOverview.tsx:5` | Re-enable GraphQL query when schema is available |
| TODO | `client/src/components/graph/InteractiveGraphExplorer.jsx:568` | Highlight cluster nodes in graph |
| NOTE | `client/src/components/incident/IncidentForensicsDashboard.tsx:510` | pattern'], |
| COMING SOON | `client/src/components/integrations/DataConnectorsDashboard.tsx:1709` | - will include: |
| COMING SOON | `client/src/components/integrations/DataConnectorsDashboard.tsx:1766` | - will include: |
| COMING SOON | `client/src/components/mlops/ModelManagementDashboard.tsx:1251` | - will include: |
| COMING SOON | `client/src/components/mlops/__tests__/ModelManagementDashboard.test.tsx:317` | message |
| COMING SOON | `client/src/components/reporting/EnterpriseDashboard.tsx:1529` | - will include: |
| TODO | `client/src/components/reports/ReportTemplateSelector.tsx:170` | replace with real mutation once backend wiring exists |
| COMING SOON | `client/src/components/security/SecurityAuditDashboard.tsx:1268` | - will include: |
| NOTE | `client/src/features/export/ExportCaseDialog.tsx:108` | a downloadable bundle URL may be populated by a background |
| NOTE | `client/src/features/hypotheses/store.ts:22` | string) => void; |
| MISSING_IMPORT | `client/src/features/nlq/NlqModal.test.tsx` | Import source './NlqModal.js' not found on disk. |
| TODO | `client/src/hooks/usePrefetch.ts:3` | Re-enable when GraphQL schema is available |
| TODO | `client/src/hooks/usePrefetch.ts:16` | Re-enable when GraphQL schema is available |
| TODO | `client/src/hooks/usePrefetch.ts:29` | Re-enable when GraphQL schema is available |
| TODO | `client/src/hooks/usePrefetch.ts:43` | Re-enable when GraphQL schema is available |
| NOTE | `client/src/lib/assistant/transport.ts:111` | Authorization header isn’t supported by native EventSource; use a token query param or cookie. |
| TODO | `client/src/pages/Hunting/HuntList.tsx:461` | Navigate to hunt detail page |
| TODO | `client/src/pages/Hunting/HuntList.tsx:536` | Create hunt logic here |
| TODO | `client/src/pages/IOC/IOCList.tsx:543` | Navigate to IOC detail page |
| TODO | `client/src/pages/IOC/IOCList.tsx:619` | Add IOC logic here |
| TODO | `client/src/pages/IOC/IOCList.tsx:678` | Import IOCs logic here |
| NOTE | `client/src/pages/Investigations/InvestigationDetail.tsx:1055` | Dialog */} |
| NOTE | `client/src/pages/Investigations/InvestigationDetail.tsx:1076` | Content" |
| TODO | `client/src/pages/Search/components/ResultList.tsx:263` | Navigate to detail page */ |
| TODO | `client/src/pages/Search/components/ResultList.tsx:322` | Filter by tag */ |
| TODO | `client/src/routes/ActionDetailsRoute.tsx:42` | render the rest of the action details here */} |
| NOTE | `client/src/routes/CaseDetail.js:60` | = gql` |
| NOTE | `client/src/routes/CaseDetail.js:112` | = async () => { |
| NOTE | `client/src/routes/CaseDetail.js:113` | content:'); |
| NOTE | `client/src/routes/CaseDetail.jsx:60` | = gql` |
| NOTE | `client/src/routes/CaseDetail.jsx:112` | = async () => { |
| NOTE | `client/src/routes/CaseDetail.jsx:113` | content:'); |
| MISSING_IMPORT | `client/src/services/api-client-with-deprecation.ts` | Import source './services/api-client-with-deprecation' not found on disk. |
| MISSING_IMPORT | `client-v039/src/index.ts` | Import source './manifest.js' not found on disk. |
| NOTE | `cofer_black_liaison_hardening_addendum_implementation_pack_v_1_wolf.md:209` | (neutral tone) |
| NOTE | `cognitive-targeting-engine/app.py:169` | Model is state-of-the-art open-source for emotion classification (7 classes: anger, disgust, fear, j |
| SPRINT | `commit_rollout_plan_ci_cd_hardening_maestro_order_of_operations.md:224` | Hardening Backlog |
| TODO | `company_os_next_pack_eight_parallel_pr_slices.md:133` | replace with metrics scrape; stubbed |
| TODO | `company_os_next_pack_eight_parallel_pr_slices.md:137` | compute from usage + billing; stubbed |
| NOTE | `company_os_next_pack_eight_parallel_pr_slices.md:457` | fetchAndVerify expects a real tar; here we just assert headers via Pact |
| SPRINT | `companyos/operating-modes.yaml:105` | with Prahalad’s core tenets: defend core |
| MISSING_IMPORT | `companyos/src/api/disclosure-packs.ts` | Import source '../authz/disclosure-export.js' not found on disk. |
| MISSING_IMPORT | `companyos/src/api/disclosure-packs.ts` | Import source '../authz/types.js' not found on disk. |
| MISSING_IMPORT | `companyos/src/authz/identity-middleware.ts` | Import source './types.js' not found on disk. |
| MISSING_IMPORT | `companyos/src/evidence/publish_sample.ts` | Import source './publisher.js' not found on disk. |
| TODO | `companyos/src/evidence/sources.ts:14` | replace with metrics scrape; stubbed |
| TODO | `companyos/src/evidence/sources.ts:19` | compute from usage + billing; stubbed |
| MISSING_IMPORT | `companyos/src/index.ts` | Import source './policy/index.js' not found on disk. |
| MISSING_IMPORT | `companyos/src/index.ts` | Import source './auth/step-up-route.js' not found on disk. |
| MISSING_IMPORT | `companyos/src/index.ts` | Import source './authz/identity-middleware.js' not found on disk. |
| MISSING_IMPORT | `companyos/src/index.ts` | Import source './api/disclosure-packs.js' not found on disk. |
| NOTE | `conductor-ui/backend/server.js:26` | In production, remove unsafe-inline and unsafe-eval |
| NOTE | `conductor-ui/backend/server.js:2302` | } = req.body \|\| {}; |
| NOTE | `conductor-ui/backend/server.js:2323` | reason, action: 'rollback' }); |
| NOTE | `conductor-ui/backend/server.js:2356` | reason, action: 'rollback' }); |
| NOTE | `conductor-ui/frontend/dist-new/app-PfXaWnjm.js:52692` | ' }), |
| NOTE | `conductor-ui/frontend/dist-new/app-PfXaWnjm.js:52866` | A }, |
| NOTE | `conductor-ui/frontend/dist-new/app-PfXaWnjm.js:52872` | A }), |
| NOTE | `conductor-ui/frontend/dist-new/app-PfXaWnjm.js:53110` | \|\| '-' }), |
| NOTE | `conductor-ui/frontend/privacy/tests/no-pii.e2e.ts:42` | db.statement.parameters should be scrubbed |
| NOTE | `conductor-ui/frontend/privacy/tests/util.ts:60` | email should be scrubbed from actual logs |
| NOTE | `conductor-ui/frontend/privacy/tests/util.ts:71` | parameters should be scrubbed |
| NOTE | `conductor-ui/frontend/privacy/tests/util.ts:80` | no sensitive token data should appear |
| NOTE | `conductor-ui/frontend/src/maestro/components/EnhancedRoutingStudio.js:7` | '' }); |
| NOTE | `conductor-ui/frontend/src/maestro/components/EnhancedRoutingStudio.js:27` | newPin.note \|\| undefined, |
| NOTE | `conductor-ui/frontend/src/maestro/components/EnhancedRoutingStudio.js:30` | '' }); |
| NOTE | `conductor-ui/frontend/src/maestro/components/EnhancedRoutingStudio.js:95` | (optional)', |
| NOTE | `conductor-ui/frontend/src/maestro/components/EnhancedRoutingStudio.js:98` | e.target.value })), |
| NOTE | `conductor-ui/frontend/src/maestro/components/EnhancedRoutingStudio.tsx:12` | '' }); |
| NOTE | `conductor-ui/frontend/src/maestro/components/EnhancedRoutingStudio.tsx:35` | newPin.note \|\| undefined, |
| NOTE | `conductor-ui/frontend/src/maestro/components/EnhancedRoutingStudio.tsx:39` | '' }); |
| NOTE | `conductor-ui/frontend/src/maestro/components/EnhancedRoutingStudio.tsx:97` | (optional)" |
| NOTE | `conductor-ui/frontend/src/maestro/components/EnhancedRoutingStudio.tsx:100` | e.target.value })) |
| TODO | `conductor-ui/frontend/src/maestro/main-maestro.js:7` | Add proper OpenTelemetry configuration when exporter packages are available |
| TODO | `conductor-ui/frontend/src/maestro/main-maestro.tsx:7` | Add proper OpenTelemetry configuration when exporter packages are available |
| NOTE | `conductor-ui/frontend/src/maestro/mutations/SafeMutations.ts:54` | z.string().optional(), |
| NOTE | `conductor-ui/frontend/src/maestro/mutations/SafeMutations.ts:319` | \|\| `Pinned by ${context.userId} at ${context.timestamp}`, |
| NOTE | `conductor-ui/frontend/src/maestro/pages/RoutingStudio.js:182` | }); |
| NOTE | `conductor-ui/frontend/src/maestro/pages/RoutingStudio.js:423` | \|\| '-' }), |
| NOTE | `conductor-ui/frontend/src/maestro/pages/RoutingStudio.tsx:136` | }); |
| NOTE | `conductor-ui/frontend/src/maestro/pages/RoutingStudio.tsx:321` | \|\| '-'}</td> |
| NOTE | `conductor-ui/frontend/src/maestro/pages/Secrets.js:434` | ' }), |
| NOTE | `conductor-ui/frontend/src/maestro/pages/Secrets.tsx:324` | </strong> Secret values are never displayed |
| FIXME | `conductor-ui/frontend/tools/collaboration-hub.js:109` | comments in:" |
| NOTE | `config/__tests__/neo4j.test.ts:332` | In real tests, you'd mock the driver to verify config |
| NOTE | `connectors/ACCEPTANCE_TEST.py:132` | No blocked fields in this connector (this is OK)") |
| NOTE | `connectors/cisa-kev/__tests__/test_e2e.py:143` | This will make a real HTTP request to CISA |
| MISSING_IMPORT | `connectors/sensors/src/connector-manager.ts` | Import source './base-connector.js' not found on disk. |
| MISSING_IMPORT | `connectors/sensors/src/http-connector.ts` | Import source './base-connector.js' not found on disk. |
| MISSING_IMPORT | `connectors/sensors/src/polling-connector.ts` | Import source './base-connector.js' not found on disk. |
| NOTE | `contracts/policy-pack/v0/signing/README.md:7` | This starter provides a bundle path placeholder; wire actual CI later. |
| SPRINT | `crypto/kms/hsm-adapter.ts:3` | 28A: Enterprise-grade key management for sovereign deployments |
| TODO | `dangerfile.js:35` | left |
| TODO | `dangerfile.js:46` | comments before merging.'); |
| NOTE | `data-pipelines/monitoring/sli_slo.py:13` | This is a lightweight utility; in CI you can point to a snapshot Prometheus or pipe CSV. |
| NOTE | `demo_cognitive_bias_mitigation.py:199` | This demonstration requires the IntelGraph cognitive modeling system to be properly configured.") |
| NOTE | `demos/copilot/safety_harness.py:140` | This analysis should be verified against additional evidence sources.]" |
| TODO | `deploy/external-secrets/maestro-secrets.yaml:9` | set your SecretStore name |
| SPRINT | `docker-compose.demo.yml:2` | 27C: Complete demo environment with metrics, alerts, and monitoring |
| SPRINT | `docs/ADR/0009-data-spine-and-audit.md:9` | theme requires durable capture of authz decisions, policy/config changes, and core data mutations. |
| TODO | `docs/AI_AGENT_WORKFLOW.md:529` | comments for handoffs |
| NOTE | `docs/API_INTEGRATION_GUIDE.md:38` | Never commit API keys to version control. Use environment variables or secret management systems. |
| SPRINT | `docs/BACKGROUND_AUTOMATION_STATUS_OCT2025.md:14` | Issues Created** (#9802-#9882) |
| SPRINT | `docs/BACKGROUND_AUTOMATION_STATUS_OCT2025.md:17` | tracker data |
| SPRINT | `docs/BACKGROUND_AUTOMATION_STATUS_OCT2025.md:22` | Tracker Seeding (✅ Complete) |
| SPRINT | `docs/BACKGROUND_AUTOMATION_STATUS_OCT2025.md:42` | dates ranging from Sept 29 to Oct 31, 2025 |
| SPRINT | `docs/BACKGROUND_AUTOMATION_STATUS_OCT2025.md:196` | Issues      \| 81    \| ✅ Created (#9802-#9882)                      \| |
| SPRINT | `docs/BACKGROUND_AUTOMATION_STATUS_OCT2025.md:204` | Tracker**: 81 issues |
| SPRINT | `docs/BACKGROUND_AUTOMATION_STATUS_OCT2025.md:247` | tracker seeding (killed process) |
| SPRINT | `docs/BACKGROUND_AUTOMATION_STATUS_OCT2025.md:248` | tracker seeding (successful) |
| SPRINT | `docs/BACKGROUND_AUTOMATION_STATUS_OCT2025.md:262` | Tracker Seeding |
| SPRINT | `docs/BACKGROUND_AUTOMATION_STATUS_OCT2025.md:277` | + 32 roadmap) |
| NOTE | `docs/BYOK_HSM_SECURITY_ROADMAP.md:212` | over KMS: Gradual traffic migration to new key |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:3` | Planning Guide |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:17` | 1-2: Single-Model Intent Router |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:45` | 3-4: Multi-Model Consensus |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:65` | 1-2 |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:75` | 5-6: OSINT Entity Fusion |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:93` | 3-4, Entity Extraction package |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:103` | 7-8: Hierarchical Memory (Tier 1-2) |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:132` | 9-10: Hierarchical Memory (Tier 3 + Semantic Selection) |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:151` | 7-8, Neo4j, Embeddings service |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:161` | 11-12: Risk Classification |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:189` | 13-14: ReAct Trace Framework |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:207` | 11-12, Audit log service |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:217` | 15-16: Slack Adapter (Basic) |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:235` | 1-6 (intent router) |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:245` | 17-18: Slack Adapter (Interactive) |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:263` | 15-16 |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:273` | 19-20: Web Adapter |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:301` | 21-24: Integration Testing & Hardening |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:335` | 25-26: Jailbreak Detection |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:352` | 27-28: Tool Supply Chain Attestation |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:371` | 29-30: Multi-Tenant Namespace Isolation |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:390` | 31-32: Advanced ReAct (Self-Correction) |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:407` | 33-34: Teams Adapter |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:424` | 35-40: Load Testing & FedRAMP Prep |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:441` | 41-48: Pilot Deployments |
| SPRINT | `docs/CHATOPS_IMPLEMENTATION_ROADMAP.md:462` | \| Focus \| Goal \| |
| SPRINT | `docs/CHATOPS_STRATEGY_ANALYSIS.md:548` | \| Deliverable \| Owner \| Dependencies \| |
| SPRINT | `docs/CHATOPS_STRATEGY_ANALYSIS.md:570` | \| Deliverable \| Owner \| Dependencies \| |
| SPRINT | `docs/CHATOPS_STRATEGY_ANALYSIS.md:590` | \| Deliverable \| Owner \| Dependencies \| |
| XXX | `docs/CICD_BEST_PRACTICES.md:201` | markers |
| TODO | `docs/CICD_BEST_PRACTICES.md:247` | Add rate limiting |
| FIXME | `docs/CICD_BEST_PRACTICES.md:248` | Handle edge case |
| TODO | `docs/CICD_BEST_PRACTICES.md:249` | Optimize performance |
| SPRINT | `docs/CODERABBIT_INTEGRATION_PROMPTS.md:12` | goals. |
| SPRINT | `docs/CODERABBIT_INTEGRATION_PROMPTS.md:212` | objective and customize context paths to the specific services or packages under change. |
| SPRINT | `docs/CONDUCTOR_30_60_90_ROADMAP.md:31` | (September 1-30, 2025) |
| SPRINT | `docs/CONDUCTOR_30_60_90_ROADMAP.md:131` | (October 1-31, 2025) |
| SPRINT | `docs/CONDUCTOR_30_60_90_ROADMAP.md:197` | (November 1-30, 2025) |
| SPRINT | `docs/CONDUCTOR_30_60_90_ROADMAP.md:324` | planning, team health monitoring     \| All managers     \| |
| NOTE | `docs/CONDUCTOR_PRD_v1.0.md:702` | (Slack/Email)**: link to datasheet + SOC2 packet + PRD |
| SPRINT | `docs/CUSTOMER_CENTRIC_WORKFLOW_SOLUTION.md:80` | with 2 pilot teams; capture baseline metrics. |
| SPRINT | `docs/CUSTOMER_CENTRIC_WORKFLOW_SOLUTION.md:99` | to co-design guided flows with top customer segments. |
| NOTE | `docs/ChatOps/comprehensive_prd_fillable_template_v_1 (1).md:695` | (Slack/Email)**: link to datasheet + SOC2 packet + PRD |
| NOTE | `docs/ChatOps/comprehensive_prd_fillable_template_v_1.md:695` | (Slack/Email)**: link to datasheet + SOC2 packet + PRD |
| NOTE | `docs/ChatOps/council_v_1_1_pager_roadmap_acceptance_test_checklist_ga_core.md:175` | + mitigation. |
| NOTE | `docs/ChatOps/day_5_7_connector_catalog_synthesis_copilot_predictive_orchestration_er_runbooks_scaffolds.md:597` | For v1 we ship a deterministic high‑precision resolver. The GNN/MLP is prepared for training once la |
| NOTE | `docs/ChatOps/day_of_cutover_command_center_smoke_tests_intel_graph.md:237` | if any threshold breached (even transient) |
| SPRINT | `docs/ChatOps/elite_counterforce_defensive_simulation_codex_dev_prompt_igac.md:15` | MVP focused on **fusion analytics** and **narrative-integrity detection**; postpone complex proxy si |
| NOTE | `docs/ChatOps/elite_counterforce_defensive_simulation_codex_dev_prompt_igac.md:30` | </span> Refrain from live counter-influence beyond factual corrections. |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade (1).md:23` | Sprint 1 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade (1).md:26` | Sprint 1 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade (1).md:29` | Sprint 2 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade (1).md:32` | Sprint 2 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade (1).md:38` | Sprint 1 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade (1).md:41` | Sprint 1 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade (1).md:44` | Sprint 2 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade (1).md:47` | Sprint 3 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade (1).md:53` | Sprint 1 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade (1).md:56` | Sprint 2 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade (1).md:59` | Sprint 3 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade (1).md:65` | Sprint 1 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade (1).md:68` | Sprint 1 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade (1).md:71` | Sprint 2 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade (1).md:74` | Sprint 3 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade (1).md:77` | Sprint 3 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade (1).md:152` | 2–3 to roadmap as committed post-GA releases. |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade.md:23` | Sprint 1 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade.md:26` | Sprint 1 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade.md:29` | Sprint 2 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade.md:32` | Sprint 2 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade.md:38` | Sprint 1 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade.md:41` | Sprint 1 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade.md:44` | Sprint 2 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade.md:47` | Sprint 3 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade.md:53` | Sprint 1 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade.md:56` | Sprint 2 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade.md:59` | Sprint 3 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade.md:65` | Sprint 1 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade.md:68` | Sprint 1 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade.md:71` | Sprint 2 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade.md:74` | Sprint 3 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade.md:77` | Sprint 3 |
| SPRINT | `docs/ChatOps/ga_core_lovable_upgrade.md:152` | 2–3 to roadmap as committed post-GA releases. |
| NOTE | `docs/ChatOps/ga_core_pr_branch_roll_up_aug_20_2025_america_denver.md:140` | Additional PRs not explicitly listed above are either duplicates of the grouped items or out‑of‑scop |
| SPRINT | `docs/ChatOps/git_hub_project_board_roadmap_turnkey_template.md:160` | Board (Board) |
| SPRINT | `docs/ChatOps/git_hub_project_board_roadmap_turnkey_template.md:231` | `assignee:@me iteration:@current -status:Done` |
| SPRINT | `docs/ChatOps/git_hub_project_board_roadmap_turnkey_template.md:250` | buckets; then use `iteration:@current` in filters. You can edit iterations (length, breaks) from the |
| NOTE | `docs/ChatOps/intel_graph_ai_symphony_orchestration_pack_mac_m_2_16_gb (1).md:132` | Avoid setting a provider-wide cap for "openai_compatible" to prevent impacting locals. |
| SPRINT | `docs/ChatOps/intel_graph_ai_symphony_orchestration_pack_mac_m_2_16_gb (1).md:221` | feat: |
| SPRINT | `docs/ChatOps/intel_graph_ai_symphony_orchestration_pack_mac_m_2_16_gb (1).md:709` | an endpoint (local) |
| NOTE | `docs/ChatOps/intel_graph_ai_symphony_orchestration_pack_mac_m_2_16_gb (2).md:132` | Avoid setting a provider-wide cap for "openai_compatible" to prevent impacting locals. |
| SPRINT | `docs/ChatOps/intel_graph_ai_symphony_orchestration_pack_mac_m_2_16_gb (2).md:221` | feat: |
| SPRINT | `docs/ChatOps/intel_graph_ai_symphony_orchestration_pack_mac_m_2_16_gb (2).md:709` | an endpoint (local) |
| SPRINT | `docs/ChatOps/intel_graph_ai_symphony_orchestration_pack_mac_m_2_16_gb.md:222` | feat: |
| NOTE | `docs/ChatOps/intel_graph_ai_symphony_orchestration_pack_mac_m_2_16_gb.md:514` | This stays within your existing Gemini plan. Add repo secret **`GOOGLE_API_KEY`**. |
| SPRINT | `docs/ChatOps/intel_graph_ai_symphony_orchestration_pack_mac_m_2_16_gb.md:631` | an endpoint (local) |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:4` | velocity plan. |
| TODO | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:79` | hotspots** (selected): Interactive graph cluster highlighting; webhook callbacks for NLP tasks; Kafk |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:148` | Velocity Plan (Updated Aug 16, 2025) |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:256` | dates assume a 2‑week cadence starting **Mon, Aug 18, 2025**. Update if your cadence differs or you  |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:258` | Dates & Milestones |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:265` | 1`, `sprint:2`, `points:1`, `points:2`, `points:3`, `points:5`, `points:8`, `points:13`, `goal`, `ba |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:274` | 1`,`points:5`\ |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:288` | 1`,`points:5`\ |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:301` | 1`,`points:3`\ |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:316` | 2`,`points:8`\ |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:328` | 2`,`points:5`\ |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:338` | 2`,`points:5`\ |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:348` | 2`,`points:5`\ |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:358` | 2`,`points:5`\ |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:369` | 2`,`points:3`\ |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:377` | totals) |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:409` | 1" "sprint:2" "points:1" "points:2" "points:3" "points:5" "points:8" "points:13" |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:436` | 1,points:5" \ |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:446` | 1,points:5" \ |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:455` | 1,points:3" \ |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:471` | 2,points:8" \ |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:479` | 2,points:5" \ |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:486` | 2,points:5" \ |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:493` | 2,points:5" \ |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:500` | 2,points:5" \ |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:508` | 2,points:3" \ |
| TODO | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:553` | (if exists) |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:640` | Plan |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:642` | 1:** Fold AI metrics into _Observability bootstrap_ (resolver + AI panels). |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:643` | 2:** Include AI endpoints in _Nightly load test_; extend _PBAC/OPA_ scope to cover `/api/ai/*` route |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:667` | 1,points:3,priority-high" "$S1_ID" $'Export ai_* metrics; add Grafana panels with SLOs and alerts. A |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:668` | 1,points:3,priority-high" "$S1_ID" $'Add JSON schema validation, size limits, PII redaction in logs; |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:669` | 2,points:5" "$S2_ID" $'Implement batch inference and read-through cache; stampede protection; hit ra |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:670` | 2,points:3" "$S2_ID" $'Expose model version/build in /models/status; publish model card & changelog; |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:671` | 2,points:3" "$S2_ID" $'Ensure focus states, ARIA labels, keyboard nav; responsive polish; writing gu |
| SPRINT | `docs/ChatOps/intel_graph_deep_dive_3_sprint_velocity_plan_aug_15_2025.md:672` | 2,points:3" "$S2_ID" $'Playwright covers panel → API → render; simulate timeouts/fallbacks; record t |
| SPRINT | `docs/ChatOps/intel_graph_front_end_rebuild_maturity_spec_v_1 (1).md:377` | planning and epic decomposition. |
| SPRINT | `docs/ChatOps/intel_graph_front_end_rebuild_maturity_spec_v_1.md:377` | planning and epic decomposition. |
| NOTE | `docs/ChatOps/intel_graph_front_end_specification_v_1.md:29` | archived: Beria argued for expanding surveillance motifs—**purged**; ethics gate stands. |
| NOTE | `docs/ChatOps/intel_graph_ga_bootstrap_git_hub_jira_skeleton_ready_to_run.md:438` | `customfield_10014` is the default Epic Link field in many Jira Cloud instances. If different, swap  |
| XXX | `docs/ChatOps/intel_graph_ga_phase_1_completion_memo_phase_2_plan_aug_22_2025.md:204` | Predictive Suite introduction (draft) |
| XXX | `docs/ChatOps/intel_graph_ga_phase_1_completion_memo_phase_2_plan_aug_22_2025.md:205` | Graph‑XAI overlays (draft) |
| SPRINT | `docs/ChatOps/intel_graph_ga_phase_1_master_implementation_prompt_for_the_dev_team.md:170` | Plan (12 weeks) |
| SPRINT | `docs/ChatOps/intel_graph_ga_phase_1_master_implementation_prompt_for_the_dev_team.md:172` | 1–2:** ADRs (security model, data partitioning, observability); SSO skeleton; OTEL baseline; perf ha |
| SPRINT | `docs/ChatOps/intel_graph_ga_phase_1_master_implementation_prompt_for_the_dev_team.md:173` | 3–4:** ABAC end‑to‑end on read paths; audit pipeline; Grafana SLOs; DR backups; Copilot sandbox prev |
| SPRINT | `docs/ChatOps/intel_graph_ga_phase_1_master_implementation_prompt_for_the_dev_team.md:174` | 5–6:** ABAC on write/compute; policy simulation; ER explainability + reconcile UI; cost guard; failo |
| SPRINT | `docs/ChatOps/intel_graph_ga_phase_1_master_implementation_prompt_for_the_dev_team.md:175` | 7–8:** Scale push (indexes, caches, read replicas); async analytics lanes; A11y uplift; chaos drill  |
| SPRINT | `docs/ChatOps/intel_graph_ga_phase_1_master_implementation_prompt_for_the_dev_team.md:176` | 9–10:** Frontend tri‑pane sync, undo/redo, command palette; incident runbooks; pen‑test hardening. |
| SPRINT | `docs/ChatOps/intel_graph_ga_phase_1_master_implementation_prompt_for_the_dev_team.md:177` | 11–12:** Freeze → RC; perf/chaos/DR proofs; GA Readiness Review; Go/No‑Go. |
| NOTE | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:296` | Requires `gh` CLI authenticated and `git` configured. The script makes a trivial WIP file to allow o |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:306` | 3: Graph Intelligence + Explainability,"Explainability overlay, schema validation metrics/fallback,  |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:307` | 3,UI,Declan,5 |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:308` | 3,GraphRAG,Velma,3 |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:309` | 3,Security,Max,5 |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:310` | 3,Schema,Astara,3 |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:311` | 4: Tenant Safety, Performance & TTP Overlay,"Tenant isolation, neighborhood cache, Neo4j indexing/hi |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:312` | 4,Security,Max,5 |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:313` | 4,Perf,Velma,5 |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:314` | 4,Perf,Astara,5 |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:315` | 4,CTI,Clem,8 |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:316` | 4,UI,Declan,3 |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:317` | 5: Realtime Collaboration & Analyst Toolkit,"LWW + idempotent ops; presence; annotations & secure sh |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:318` | 5,Realtime,Velma,8 |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:319` | 5,Realtime,Max,5 |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:320` | 5,UI;Security,Ivy,5 |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:321` | 5,UI;Ops,Ernestine,3 |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:322` | 6: Security, Compliance & Pilot,"Rate limits+breaker; DLP redaction+retention; backup/DR; pilot work |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:323` | 6,Security,Zappo,8 |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:324` | 6,Security,Zappo,5 |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:325` | 6,Ops,Frank,5 |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:326` | 6,Ops,Guy,8 |
| SPRINT | `docs/ChatOps/intel_graph_integrated_sprints_3_6_all_party_plan_draft_prs_jira_csv.md:336` | 5) and access checks. |
| TODO | `docs/ChatOps/intel_graph_mvp_0_implementation_plan_repo_layout_code_stubs_keycloak_cisa_taxii_mapbox_copilot_preview.md:401` | parse JWT (Keycloak). For dev, stub user |
| NOTE | `docs/ChatOps/intel_graph_mvp_0_implementation_plan_repo_layout_code_stubs_keycloak_cisa_taxii_mapbox_copilot_preview.md:645` | = 'rule-based'; |
| NOTE | `docs/ChatOps/intel_graph_mvp_0_implementation_plan_repo_layout_code_stubs_keycloak_cisa_taxii_mapbox_copilot_preview.md:658` | = 'unparsed'; |
| TODO | `docs/ChatOps/intel_graph_phase_3_completion_log_release_notes_aug_23_2025.md:7` | Update — Advanced Operations & Scale |
| TODO | `docs/ChatOps/intel_graph_release_candidate_stabilization_pack_post_merge_orchestrator (1).md:217` | add GraphQL introspection ping & a trivial query |
| NOTE | `docs/ChatOps/intel_graph_release_candidate_stabilization_pack_post_merge_orchestrator (1).md:373` | and keep only the newest per package. |
| TODO | `docs/ChatOps/intel_graph_release_candidate_stabilization_pack_post_merge_orchestrator.md:217` | add GraphQL introspection ping & a trivial query |
| TODO | `docs/ChatOps/intel_graph_velocity_plan_v_1_guy.md:318` | call embedding model provider |
| SPRINT | `docs/ChatOps/intel_graph_velocity_plan_v_4_v_6_combined_guys_interests.md:177` | dependencies & sequencing |
| SPRINT | `docs/ChatOps/intel_graph_velocity_plan_v_4_v_6_combined_guys_interests.md:194` | 6) on the team calendar. |
| SPRINT | `docs/ChatOps/jira_import_maestro_composer_backend_sprint_csv_json.md:4` | Window:** Sep 2–Sep 13, 2025 |
| NOTE | `docs/ChatOps/jira_import_maestro_composer_backend_sprint_csv_json.md:88` | Your site’s Epic Name field and Epic Link field IDs (e.g., `customfield_10011`, `customfield_10014`) |
| SPRINT | `docs/ChatOps/jira_import_maestro_composer_backend_sprint_csv_json.md:105` | Sep 2–Sep 13, 2025**. |
| SPRINT | `docs/ChatOps/jira_import_maestro_composer_backend_sprint_csv_json.md:107` | burndown_, _Runtime RED_, _Policy decision rate_. |
| SPRINT | `docs/ChatOps/llm_driven_issue_orchestration_system_blueprint_v_1.md:72` | slot; PM approves via Slack buttons. |
| SPRINT | `docs/ChatOps/llm_driven_issue_orchestration_system_blueprint_v_1.md:138` | based on skills & capacity. |
| NOTE | `docs/ChatOps/maestro_reference_tasks_runbooks_catalog_v_1.md:210` | mapper is a JS function body in a sandboxed new Function (trusted catalogs only) |
| SPRINT | `docs/ChatOps/repo_rapid_triage_action_plan_impact_x_effort.md:221` | persistence (Neo4j), Streamlit UI, OSINT connector (Wikipedia), temporal edges, and confidence scori |
| SPRINT | `docs/ChatOps/sprint_07_backlog_tickets_intel_graph_jira_ready.md:17` | scope) |
| SPRINT | `docs/ChatOps/sprint_07_plan_intel_graph_aug_25_sep_5_2025.md:6` | Goal:** Ship an end‑to‑end, auditable investigation flow: ingest → resolve → analyze → cite → export |
| SPRINT | `docs/ChatOps/sprint_14_implementation_scaffolding_code.md:3` | 14. Paths are relative to repo root. Each block compiles/runs with minimal stubbing so the team can  |
| TODO | `docs/ChatOps/sprint_14_implementation_scaffolding_code.md:842` | Day-1: create case C-1, insert evidence rows, add two contradictory claims |
| SPRINT | `docs/ChatOps/sprint_24_intel_graph_vertical_slice_aug_25_sep_5_2025.md:7` | Goal |
| SPRINT | `docs/ChatOps/sprint_24_intel_graph_vertical_slice_aug_25_sep_5_2025.md:25` | Scope (User Stories) |
| SPRINT | `docs/ChatOps/sprint_24_intel_graph_vertical_slice_aug_25_sep_5_2025.md:183` | Timeline & Ceremonies (America/Denver) |
| SPRINT | `docs/ChatOps/sprint_24_intel_graph_vertical_slice_aug_25_sep_5_2025.md:185` | Planning:** Mon Aug 25, 9:30–11:00 |
| SPRINT | `docs/ChatOps/sprint_24_intel_graph_vertical_slice_aug_25_sep_5_2025.md:188` | Review:** Fri Sep 5, 10:00–11:00 |
| SPRINT | `docs/ChatOps/sprint_24_intel_graph_vertical_slice_aug_25_sep_5_2025.md:195` | burndown; throughput; story carryover. |
| SPRINT | `docs/ChatOps/sprint_plan_intel_graph_aug_25_sep_5_2025.md:1` | Plan — IntelGraph (Aug 25–Sep 5, 2025) |

*(Truncated to first 1000 items. See `debt.json` for full list.)*

## Implied Enums/Interfaces & Broken Imports
The scanner now checks for broken local imports in TypeScript files, which often indicate an interface or enum that was referenced but not created.
