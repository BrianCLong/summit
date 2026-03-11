# Pre-authored starter set of 15 Summit-specific session titles

1. [LANE:CI] [SURFACE:.github/workflows/security-gates + scripts/policy] [BOUNDARY:no deploy workflows] [OUTCOME:workflow family merge-ready] Harden PR security policy gate
2. [LANE:EVIDENCE] [SURFACE:schemas/evidence + scripts/determinism] [BOUNDARY:no CI workflow edits] [OUTCOME:evidence schema family validated] Finalize deterministic evidence contracts
3. [LANE:OBS] [SURFACE:observability/dashboards + alerts] [BOUNDARY:no shared UI shell edits] [OUTCOME:dashboard family merge-ready] Add post-deploy health dashboards
4. [LANE:TEST] [SURFACE:tests/evaluation + tests/benchmarks] [BOUNDARY:no feature code edits] [OUTCOME:evaluation tests passing and merge-ready] Write benchmarks for counter-AI sensors
5. [LANE:DOCS] [SURFACE:docs/architecture] [BOUNDARY:no code edits] [OUTCOME:architecture docs updated and merge-ready] Update Engineering Intelligence Stack architecture docs
6. [LANE:INFRA] [SURFACE:infra/terraform/modules/rds] [BOUNDARY:no app code edits] [OUTCOME:terraform plan succeeds and merge-ready] Upgrade RDS instance class in staging
7. [LANE:FEATURE] [SURFACE:services/ingest-orchestrator] [BOUNDARY:no shared graph schemas] [OUTCOME:ingest workers implemented and merge-ready] Implement narrative ingest batch processor
8. [LANE:UI] [SURFACE:apps/web/src/components/dashboard] [BOUNDARY:no backend API edits] [OUTCOME:dashboard components rendering with mock data] Build narrative risk widget UI
9. [LANE:TEST] [SURFACE:apps/web/src/components/__tests__] [BOUNDARY:no UI component edits] [OUTCOME:all UI tests passing] Add unit tests for narrative risk widget
10. [LANE:CI] [SURFACE:.github/workflows/ui-tests.yml] [BOUNDARY:no other workflows] [OUTCOME:UI test workflow executes in PRs] Enable automated UI tests in CI
11. [LANE:EVIDENCE] [SURFACE:schemas/provenance] [BOUNDARY:no workflow edits] [OUTCOME:provenance ledger schema updated] Extend provenance ledger schema for SLSA compliance
12. [LANE:FEATURE] [SURFACE:src/counter_ai/hooks.ts] [BOUNDARY:no graph schema edits] [OUTCOME:risk observations emitted asynchronously] Implement lightweight counter-AI risk observation hooks
13. [LANE:FEATURE] [SURFACE:src/personas/] [BOUNDARY:no UI edits] [OUTCOME:adversarial persona graph populated] Model PersonaHypothesis for adversarial identities
14. [LANE:DOCS] [SURFACE:summit/persona/playbooks/] [BOUNDARY:no test edits] [OUTCOME:defensive playbooks merged] Draft CTI phase defensive playbooks
15. [LANE:FEATURE] [SURFACE:src/automation/router] [BOUNDARY:no policy registry edits] [OUTCOME:automation routing enforced] Enforce governance tier routing in SAFE_AUTOMATION
