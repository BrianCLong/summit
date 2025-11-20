# IP Observability & Metrics

## Purpose

This document defines the **observability framework** for tracking IP family development, coverage, and maturity across the Summit/IntelGraph monorepo.

**Goals**:
- **Quantify IP progress**: Per-family metrics on implementation status
- **Identify gaps**: Missing annotations, untested capabilities, incomplete roadmap items
- **Track trends**: Coverage over time, velocity of IP development
- **Enable data-driven decisions**: Prioritize families based on maturity and strategic value

---

## Metrics Schema

### Per-Family Metrics

For each IP family (defined in `ip-registry.yaml`):

| Metric | Definition | Target | How Measured |
|--------|------------|--------|--------------|
| **Modules Annotated (%)** | Percentage of listed modules with `@ip-family` tags or `ip.meta.json` | ≥80% | `scripts/ip-metrics.ts` |
| **Capabilities Implemented (%)** | Percentage of listed capabilities with working code + tests | ≥75% for MVP, 100% for v1 | Manual audit + test coverage |
| **Test Coverage (%)** | Percentage of IP-related code covered by tests | ≥90% | Jest/Vitest coverage reports |
| **Horizon Progress** | Count of completed epics per horizon (H0, H1, H2, H3) | H0: 100%, H1: ≥75% | GitHub issues + `IP_PROGRAM_ROADMAP.md` |
| **Invention Disclosure Exists** | Does `docs/ip/FAMILYID-*.md` exist and is it up-to-date? | Yes | Manual check |
| **Dedicated Dashboard** | Does Grafana dashboard exist for observability? | Yes (for critical families) | Manual check |
| **Runbook Exists** | Operational runbook for family-specific incidents? | Yes (for critical families) | Check `RUNBOOKS/` |
| **Security/ABAC Integration** | OPA policies or ABAC rules for family? | Yes (for compliance-critical families) | Check `policies/`, `opa/` |

### Global Metrics

Aggregated across all families:

| Metric | Definition | Target | How Measured |
|--------|------------|--------|--------------|
| **Total Families** | Count of families in registry | Trend: Increasing | `ip-registry.yaml` |
| **Average Coverage** | Mean of per-family annotation coverage | ≥70% | `scripts/ip-metrics.ts` |
| **Families Below 50%** | Count of families with <50% annotation coverage | ≤2 | `scripts/ip-metrics.ts` |
| **Status Breakdown** | Count by status (idea, partial, MVP, v1, v2+) | Trend: More v1/v2+ | `ip-registry.yaml` |
| **Total Annotations** | Count of `@ip-family` comments + `ip.meta.json` files | Trend: Increasing | `scripts/ip-metrics.ts` |

---

## Measurement Tools

### 1. Automated: `scripts/ip-metrics.ts`

**Usage**:
```bash
# Full report (markdown)
pnpm run ip:metrics

# JSON export for dashboards
pnpm run ip:metrics --format=json

# Single family detail
pnpm run ip:metrics --family=F1
```

**What it measures**:
- Per-family annotation coverage (modules found vs. listed)
- Global coverage statistics
- Suggestions for missing annotations

**Output**:
```
## Global Metrics

- **Total IP Families**: 10
- **Average Coverage**: 62%
- **Families < 50% Coverage**: 3
- **Total Annotations**: 47

## Per-Family Metrics

### ✅ F1: Provenance-First Multi-LLM Orchestration
- **Status**: mvp
- **Modules Listed**: 7
- **Modules Found**: 5
- **Coverage**: 71%
...
```

### 2. Manual: IP Family Audits

**Frequency**: Quarterly

**Process**:
1. Run `pnpm run ip:metrics` to generate coverage report
2. For each family with <75% coverage:
   - Review `modules` list in `ip-registry.yaml`—is it accurate?
   - Check if listed modules still exist (no renames/moves)
   - Add missing `@ip-family` annotations
3. For each family, audit:
   - Are all capabilities in `ip-registry.yaml` implemented?
   - Are tests present for each capability?
   - Is `docs/ip/FAMILYID-*.md` up-to-date?
4. Update `status` in registry (idea → partial → MVP → v1)

### 3. CI Integration (Future)

**Proposal**: Add lightweight PR checks

- **On PR**: Run `pnpm run ip:metrics --format=json`, compare to main branch
- **If**: New code in critical paths (orchestrator, prov-ledger, etc.) and no `@ip-family` annotation
- **Then**: Comment on PR: "Consider adding @ip-family annotation—affected modules: X, Y, Z"
- **No block**: Just a suggestion, not a hard requirement (avoid process theater)

---

## Dashboards & Visualization

### Grafana Dashboard (Future)

**Panel 1: IP Coverage Over Time**
- Line chart: Average coverage % (weekly)
- Target line at 70%
- Data source: CI runs of `ip-metrics.ts --format=json`

**Panel 2: Status Distribution**
- Pie chart: Count by status (idea, partial, MVP, v1, v2+)
- Goal: More families in MVP/v1/v2+ over time

**Panel 3: Families Needing Attention**
- Table: Families with <50% coverage
- Sortable by coverage %, last updated date

**Panel 4: Annotation Velocity**
- Bar chart: # of new `@ip-family` annotations per week
- Tracks developer engagement with IP system

**Implementation**:
- Store `ip-metrics.ts` JSON output in time-series DB (TimescaleDB or Prometheus)
- Provision Grafana dashboard via `observability/grafana/provisioning/`

### Weekly Reports (Automated)

**Script**: `scripts/ip-weekly-report.ts` (to be created)

**Outputs**:
- Slack/email summary of:
  - Families that changed status this week
  - New annotations added
  - Families below threshold
  - Roadmap epics completed

**Trigger**: GitHub Actions cron (every Monday 9am)

---

## Per-Family Observability Details

### F1: Provenance-First Multi-LLM Orchestration

**Key Metrics**:
- Provenance manifest write latency (p95 < 50ms)
- Orchestrator task dispatch success rate (>99%)
- LLM provider failover count (trend: decreasing)

**Where Tracked**:
- Grafana: `summit-golden-path.json` dashboard
- OTel spans: `orchestrator.dispatch`, `prov-ledger.record-step`

### F6: Graph-Native Investigation Workflow

**Key Metrics**:
- Investigation load time (p95 < 3s)
- Task completion rate (>80%)
- Copilot query success rate (>95%)

**Where Tracked**:
- Grafana: `intelgraph-ux.json` dashboard (to be created)
- Telemetry: User journey events (`investigation:created`, `copilot:query`, etc.)

### F8: Real-Time Observability

**Key Metrics**:
- SLO compliance (latency, availability, error rates)
- Alert fatigue rate (<1% false positives)
- DORA metrics (deployment frequency, lead time, MTTR)

**Where Tracked**:
- Grafana: Existing SLO dashboards
- Prometheus: All service metrics

### F9: Export Controls & Governance

**Key Metrics**:
- Policy evaluation latency (p95 < 100ms)
- Policy violation rate (trend: decreasing)
- Audit log completeness (100%)

**Where Tracked**:
- OPA metrics: `opa_evaluation_duration_ns`
- Provenance ledger: All policy decisions logged

---

## Test Coverage Tracking

### Current State

- **Overall**: ~75% coverage (Jest + Vitest)
- **IP-critical paths**: Varies by family (50-90%)

### Target

- **All families at MVP+**: ≥90% coverage for family-specific code
- **Critical paths**: 100% coverage (orchestrator core, prov-ledger, policy enforcement)

### How to Track

1. **Run coverage**: `pnpm test --coverage`
2. **Filter by IP family**: Use `@ip-family` annotations to tag tests
   ```typescript
   // @ip-family: F1
   describe('LaunchableOrchestrator', () => { ... });
   ```
3. **Generate per-family report**:
   - Parse coverage JSON + `@ip-family` annotations
   - Aggregate by family ID
   - Output table: Family | Lines Covered | % Coverage

### Coverage Report Script (Future)

**Script**: `scripts/ip-coverage-report.ts`

**Logic**:
1. Run `pnpm test --coverage --json`
2. Parse `coverage/coverage-final.json`
3. For each covered file, check for `@ip-family` annotation
4. Aggregate by family ID
5. Output markdown table

---

## Roadmap Progress Tracking

### Current State

- **Horizons defined**: All families have H0-H3 roadmaps in registry
- **Tracking**: Manual review of `IP_PROGRAM_ROADMAP.md`

### Target

- **Automated tracking**: Link GitHub issues to epics → families
- **Burndown charts**: Show progress per theme per quarter

### How to Track

1. **Tag GitHub issues** with IP family labels: `ip:F1`, `ip:F6`, etc.
2. **Link epics** in roadmap to issue numbers
3. **Generate burndown**: Query GitHub API, filter by label, group by family
4. **Visualize**: Grafana dashboard or GitHub Projects board

### Issue Labeling Scheme

- `ip:F1` → Provenance & Multi-LLM Orchestration
- `ip:F2` → Cognitive Targeting & Active Measures
- `ip:F3` → Adversarial Misinformation Defense
- `ip:F4` → Cloud Arbitrage & FinOps
- `ip:F5` → GraphRAG & Explainable Retrieval
- `ip:F6` → Graph-Native Investigation Workflow
- `ip:F7` → Multi-Modal AI Extraction
- `ip:F8` → Observability & SLO-Driven Ops
- `ip:F9` → Export Controls & Governance
- `ip:F10` → Universal Data Connector SDK

---

## Alerts & Notifications

### Coverage Degradation Alert

**Trigger**: If average coverage drops below 60% for 2 consecutive weeks

**Action**: Slack notification to `#ip-platform` channel

**Owner**: Eng lead responsible for IP program

### Family Stagnation Alert

**Trigger**: If a family stays in "partial" status for >6 months with no code changes

**Action**: Email to family owner + eng lead

**Owner**: Product/IP strategy lead

---

## Maintenance Workflow

### Weekly

- Run `pnpm run ip:metrics` and review output
- Share summary in team standup or Slack

### Monthly

- Review roadmap progress: Which epics completed? Which blocked?
- Update `status` in registry if families advanced (partial → MVP → v1)
- Add new families to registry if novel work emerged

### Quarterly

- **Full IP audit**: Coverage, capabilities, tests, docs
- **Roadmap refresh**: Adjust H1-H3 based on progress and market intel
- **Competitive review**: Update `docs/competitive/IP_PLATFORM_MOAT.md`

---

## Integration with Provenance Ledger (F1)

**Vision**: Every IP family development activity should be traceable via provenance.

**How**:
- When code is committed: `prov-ledger` records (`type: 'transform'`, `tool: 'git commit'`, `params: { family: 'F1', epic: 'P1.1' }`)
- When tests run: `prov-ledger` records (`type: 'policy-check'`, `tool: 'jest', `params: { family: 'F1', coverage: 92% }`)
- When metrics are generated: `prov-ledger` records (`type: 'export'`, `tool: 'ip-metrics', `params: { global_coverage: 62% }`)

**Benefit**: Full audit trail of IP development for patent prosecution and compliance.

---

## Summary

- **Run `ip-metrics.ts`** weekly to track coverage
- **Target ≥70% average coverage**, no families below 50%
- **Quarterly audits** to verify capabilities, tests, docs
- **Future**: CI integration, Grafana dashboards, GitHub issue tracking
- **Ultimate goal**: Provenance-linked IP observability—every line of code traceable to an IP family and strategic intent

This observability framework makes IP development **measurable, accountable, and acceleratable**.
