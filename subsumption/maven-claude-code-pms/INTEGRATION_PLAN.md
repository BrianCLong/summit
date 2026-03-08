# Summit Integration Plan: Claude Code for PMs (Data → Decisions)

## 1. Overview
This plan integrates AI-native PM workflows into the Summit ecosystem, specifically focusing on the `innovation` lane of the platform.

## 2. Integrated Patterns

### Pattern A: Structured Analytical Prompts
- **Summit Fit:** Adapt
- **Target:** `prompts/analytical/`
- **Implementation:** Create a registry of typed prompts for common PM tasks (SQL generation, CSV analysis, trend detection).
- **Gate:** `verify-analytical-workflow-determinism` - ensures that prompts produce stable outputs given the same data.

### Pattern B: AI-Assisted Tooling (Lightweight Dashboards)
- **Summit Fit:** Adapt
- **Target:** `apps/pm-dashboards/`
- **Implementation:** Utilize the Summit `DashboardService` to allow PMs to register Claude-generated UI components (MUI-based) in a sandboxed environment.
- **Gate:** `ui-governance-audit` - ensures MUI standards and access control are maintained.

### Pattern C: Decision Artifacts (Memos to Ledger)
- **Summit Fit:** Direct
- **Target:** `packages/decision-ledger/`
- **Implementation:** Map Claude-assisted decision memos to the `DecisionLedger` service, ensuring all conclusions carry a `ProvenanceStamp` linked to the raw data sources.

## 3. PR Stack Plan

| PR Title | Scope | Risk |
| --- | --- | --- |
| `feat(pm): initialize pm-analytical-prompts registry` | `prompts/analytical/` | Green |
| `feat(dashboard): add pm-dashboards subspace` | `apps/pm-dashboards/` | Yellow |
| `feat(governance): add decision-artifact-validator gate` | `packages/governance/` | Green |

## 4. Acceptance Criteria
- 100% of MAVEN-CLAUDE-PM claims trace back to `SOURCE_LEDGER.yml`.
- CI verifier for `pm-analytical-prompts` is active and passing.
- Evidence map includes `EVD-MAVEN-CLAUDE-PM-001`.
