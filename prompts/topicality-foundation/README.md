# Topicality Foundation - Claude Code Prompts

This directory contains 11 comprehensive, production-ready prompts for building the Topicality platform foundation using Claude Code.

## Quick Reference

| # | Prompt | Priority | Effort | Dependencies | Can Start |
|---|--------|----------|--------|--------------|-----------|
| 1 | [IntelGraph Core](01-intelgraph-core.md) | ⭐️ CRITICAL | 2 weeks | None | **Immediately** |
| 2 | [Provenance & Claim Ledger](02-provenance-claim-ledger.md) | ⭐️ CRITICAL | 1 week | #1 | After #1 |
| 3 | [Maestro Conductor](03-maestro-conductor.md) | ⭐️ HIGH | 1.5 weeks | #1, #2 | Week 3 |
| 4 | [OPA ABAC Governance](04-opa-abac-governance.md) | ⭐️ HIGH | 1 week | #1 | Week 3 |
| 7 | [Metrics & Observability](07-metrics-observability.md) | ⭐️ HIGH | 1 week | #1, #2 | Week 3 |
| 11 | [White-Label Config](11-white-label-configuration.md) | Medium | 1 week | #1, #4 | Week 5 |
| 10 | [Risk & Incident Tracker](10-risk-incident-tracker.md) | Medium | 1 week | #1, #4, #7 | Week 5 |
| 5 | [Disclosure Pack Generator](05-disclosure-pack-generator.md) | ⭐️ RELEASE | 1 week | #2, #3 | Week 7 |
| 8 | [Release Gate Checker](08-release-gate-checker.md) | ⭐️ RELEASE | 3 days | #5, #7, #10 | Week 8 |
| 6 | [CEO Daily Dispatch](06-ceo-daily-dispatch.md) | Medium | 3 days | #3, #7, #10 | Week 7 |
| 9 | [Canonical Templates](09-canonical-output-templates.md) | Medium | 4 days | #1, #3, #11 | Week 7 |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    TIER 0: FOUNDATION                       │
│  ┌──────────────────────┐    ┌────────────────────────┐    │
│  │ #1 IntelGraph Core   │───▶│ #2 Claim Ledger Lib   │    │
│  │ (Entities, Claims,   │    │ (Reusable provenance) │    │
│  │  Provenance, Policy) │    │                        │    │
│  └──────────────────────┘    └────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 TIER 1: PLATFORM SERVICES                   │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────────┐   │
│  │ #3       │  │ #4 OPA     │  │ #7 Metrics &         │   │
│  │ Maestro  │  │ ABAC       │  │    Observability     │   │
│  │ Conductor│  │ Governance │  │                      │   │
│  └──────────┘  └────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               TIER 2: APPLICATION FEATURES                  │
│  ┌─────────────────────┐    ┌──────────────────────────┐   │
│  │ #11 White-Label     │    │ #10 Risk & Incident      │   │
│  │     Configuration   │    │     Tracker              │   │
│  └─────────────────────┘    └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              TIER 3: AUTOMATION & TOOLING                   │
│  ┌──────────────┐  ┌──────────┐  ┌──────────┐             │
│  │ #5 Disclosure│  │ #6 CEO   │  │ #9 Output│             │
│  │    Pack Gen  │  │ Dispatch │  │ Templates│             │
│  └──────────────┘  └──────────┘  └──────────┘             │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────────────────────────────────────┐         │
│  │ #8 Release Gate Checker (CI/CD Blocker)      │         │
│  └──────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Strategy

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Build the core data model and provenance library

**Sequential execution required:**
1. Start with **Prompt #1 (IntelGraph Core)**
   - This is the bedrock - all other systems depend on it
   - Defines entities, claims, provenance, and policy labels
   - 2 weeks of focused effort

2. Build **Prompt #2 (Claim Ledger Library)**
   - Reusable library for recording claims
   - Integrates with IntelGraph from #1
   - 1 week

**Success criteria:**
- Can create entities with claims
- Can attach provenance to any claim
- Can query claim history with full audit trail

### Phase 2: Platform Services (Weeks 3-4)
**Goal:** Build orchestration, governance, and observability

**Parallel execution possible:**
- **Prompt #3 (Maestro)** + **Prompt #4 (OPA ABAC)** + **Prompt #7 (Metrics)**
- All three can be developed simultaneously by different Claude Code sessions
- Each has clear boundaries and integration points

**Integration points:**
- Maestro calls Claim Ledger to track run provenance
- OPA ABAC uses IntelGraph policy labels
- Metrics uses Claim Ledger for KPI provenance

**Success criteria:**
- Can create and track runs with artifacts
- Can enforce ABAC policies on resources
- Can expose and scrape KPIs

### Phase 3: Application Features (Weeks 5-6)
**Goal:** Multi-tenancy and risk tracking

**Parallel execution possible:**
- **Prompt #11 (White-Label)** + **Prompt #10 (Risk Tracker)**
- Can be developed independently

**Success criteria:**
- Can configure tenant-specific settings
- Can track incidents and policy violations

### Phase 4: Automation & Tooling (Weeks 7-8)
**Goal:** CI/CD automation and operational reporting

**Mixed execution:**
- **Prompt #5, #6, #9** can be done in parallel
- **Prompt #8** must wait for #5 to complete

**Success criteria:**
- Can generate disclosure packs automatically
- Can gate releases based on policy compliance
- Can generate daily executive reports

## How to Use These Prompts

### Option 1: Sequential (Safest)
Copy/paste prompts one at a time into Claude Code, following the dependency order.

```bash
# Week 1-2
claude --prompt "$(cat 01-intelgraph-core.md)"
claude --prompt "$(cat 02-provenance-claim-ledger.md)"

# Week 3-4
claude --prompt "$(cat 03-maestro-conductor.md)"
claude --prompt "$(cat 04-opa-abac-governance.md)"
claude --prompt "$(cat 07-metrics-observability.md)"

# etc.
```

### Option 2: Parallel (Faster, requires coordination)
Run multiple Claude Code sessions in parallel for independent prompts:

**Week 3 example:**
```bash
# Terminal 1
cd topicality-maestro/
claude --prompt "$(cat ../prompts/topicality-foundation/03-maestro-conductor.md)"

# Terminal 2
cd topicality-governance/
claude --prompt "$(cat ../prompts/topicality-foundation/04-opa-abac-governance.md)"

# Terminal 3
cd topicality-metrics/
claude --prompt "$(cat ../prompts/topicality-foundation/07-metrics-observability.md)"
```

### Option 3: Maestro-Orchestrated (Most sophisticated)
Once Maestro is built (Prompt #3), use it to orchestrate the remaining prompts as Maestro runs.

## Integration Points

### Between Prompts

| From Prompt | To Prompt | Integration Type | Example |
|-------------|-----------|------------------|---------|
| #1 → #2 | IntelGraph Core → Claim Ledger | HTTP API | Claim Ledger calls `/entities/{id}` |
| #2 → #3 | Claim Ledger → Maestro | Library import | Maestro imports `@topicality/claim-ledger` |
| #1 → #4 | IntelGraph → OPA | Policy labels | OPA policies read `policy_labels` from resources |
| #3 → #5 | Maestro → Disclosure Pack | Run metadata | Disclosure pack includes `run_id` |
| #5 → #8 | Disclosure Pack → Release Gate | File dependency | Release gate validates pack exists |

### With Existing Summit Infrastructure

These prompts are designed to integrate with the existing Summit/IntelGraph codebase:

- **Neo4j**: IntelGraph Core (#1) can use existing Neo4j for graph storage
- **PostgreSQL**: Maestro (#3) and Risk Tracker (#10) use existing Postgres
- **OPA**: ABAC Governance (#4) integrates with existing OPA deployment
- **Prometheus**: Metrics (#7) exports to existing Prometheus instance

## Success Metrics

Track these KPIs as you implement:

- **Time to First Value**: How long until #1 can store and query a claim?
- **Provenance Coverage**: % of claims with full provenance trail
- **Policy Compliance**: % of resources with ABAC enforcement
- **Release Quality**: % of releases with complete disclosure packs
- **Operational Visibility**: Mean time to generate CEO dispatch

## Customization Guide

Each prompt is designed to be customized. Common customizations:

### Technology Stack
- Default: TypeScript/Node + Postgres
- Alternative: Python/FastAPI + Postgres
- Update in each prompt's "Assumptions" section

### Policy Labels
- Default: origin/sensitivity/legal_basis
- Add: data_classification, retention_policy, geo_restrictions
- Update in Prompt #1, propagate to others

### KPIs
- Default: Product/Business/Governance KPIs
- Add: Customer Success, Engineering, Finance KPIs
- Update in Prompt #7

## Troubleshooting

### "Dependencies not clear"
Each prompt lists dependencies at the top. Read the "Context" section to understand why those dependencies exist.

### "Output format mismatch"
Prompts #2, #3, #5 all define manifest formats. Ensure consistency by:
1. Implementing #2 first (defines base format)
2. Extending in #3 and #5

### "Integration points unclear"
See the "Integration Points" section above and the architecture diagram.

## Next Steps

1. **Review the 8-week plan** in `MAESTRO_PLAN.md`
2. **Start with Prompt #1** - it's the critical path
3. **Track progress** using the provided Maestro plan format
4. **Iterate** - these are v1 slices, meant to evolve

## Questions?

These prompts are living documents. If you encounter issues or need clarification:

1. Check the prompt's "Requirements" section for detailed specs
2. Review the "Deliverables" section for expected outputs
3. Consult the architecture diagram for system boundaries
4. Update the prompt and commit improvements

---

**Last Updated:** 2025-11-22
**Version:** 1.0
**Maintainer:** Topicality Engineering
