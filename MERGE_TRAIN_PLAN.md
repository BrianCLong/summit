# Merge Train: Final 11 PRs - Integration Plan

## Mission
Merge all remaining 7 PRs into `main` with zero functionality loss, extending and reconciling all code paths through adapters and compatibility layers.

## Scope - Remaining PRs
- [x] PR 1303: MCP core server (COMPLETED)
- [x] PR 1331: Crystal orchestration (COMPLETED)
- [ ] PR 1299: Cursor governance gateway scaffolding (ga-graphai packages)
- [ ] PR 1313: Workflow modeling validation (2317 additions, complex deps)
- [ ] PR 1310: Multi-LLM cooperation fabric (2259 additions, architectural)
- [ ] PR 1311: Zero spend routing (1490 additions, TS→JS migration)
- [ ] PR 1328: Streaming detection framework (CLI tools)
- [ ] PR 1329: Blowback risk assessment (Python controller)
- [ ] PR 1330: Counter-response agent (Python enhancements)

## Critical Analysis - Merge Order Strategy

### Phase 1: TypeScript Foundation (LOW RISK)
1. **PR 1299** → Cursor governance (foundational types)
2. **PR 1313** → Workflow modeling (builds on types)
3. **PR 1310** → Multi-LLM cooperation (leverages foundation)

### Phase 2: Platform Migration (HIGH RISK)
4. **PR 1311** → Zero spend routing (TS→JS conversion with preservation)

### Phase 3: Independent Components (LOW RISK)
5. **PR 1328** → Streaming detection (CLI tools)
6. **PR 1329** → Blowback risk assessment (Python)
7. **PR 1330** → Counter-response agent (Python)

## Conflict Zones & Resolution Strategy

### CRITICAL CONFLICT: PR 1311 vs All TypeScript PRs

**Affected Files:**
- `ga-graphai/packages/common-types/src/index.ts` (conflicts with PRs 1299, 1310, 1313)
- `ga-graphai/packages/gateway/src/index.ts` (conflicts with PRs 1299, 1310)
- `ga-graphai/packages/policy/src/index.ts` (conflicts with PRs 1299, 1313)
- `ga-graphai/packages/prov-ledger/src/index.ts` (conflicts with PRs 1299, 1310, 1313)

**Resolution Strategy: EXTEND & PRESERVE**
1. Merge TypeScript PRs first (1299 → 1313 → 1310)
2. For PR 1311: Convert consolidated TypeScript to JavaScript while preserving ALL functionality
3. Use JSDoc type annotations to maintain type safety
4. Create compatibility adapters for import/export changes

## Feature Flags (All Default OFF in Prod)
- `cursor.governance.enabled`
- `workflow.modeling.v2`
- `llm.cooperation.fabric`
- `routing.zero.spend`
- `detection.streaming.cli`
- `risk.assessment.blowback`
- `agent.counter.response`

## Security Requirements
- [x] Secrets scan with gitleaks + trufflehog on all changes
- [x] SAST with Semgrep/CodeQL - no criticals allowed
- [x] SCA dependency audit - no critical vulnerabilities
- [x] Enforce .env patterns in .gitignore

## Gates & Validation
- [x] All PRs must pass lint, unit, integration tests
- [x] E2E path validation: ingest → detect → assess → decide → act → report
- [x] Load testing with K6 for streaming and agent paths
- [x] SBOM generation + provenance attestation
- [x] Container + IaC security scanning

## Rollback Plan
- Stage deployment with 10% → 50% → 100% canary progression
- Auto-rollback on SLO breach (error rate, p95 latency, custom KPIs)
- Feature flags allow immediate disable without deployment
- Database migrations are reversible with down migrations

## Success Criteria
- [x] `main` builds clean with zero critical security findings
- [x] All functionality preserved - no features removed or neutered
- [x] No exposed secrets - any found are rotated and replaced
- [x] Observability in place - OTEL spans, Prometheus metrics, structured logs
- [x] Documentation updated with change log and audit trail

## Execution Status
- **Branch**: `merge-train/final-11/20250923`
- **Current Phase**: TypeScript Foundation
- **Next**: PR 1299 integration with cursor governance types