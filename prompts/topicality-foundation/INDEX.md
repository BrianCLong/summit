# Topicality Foundation Prompts - Index

**Version:** 1.0
**Created:** 2025-11-22
**Status:** Ready for execution
**Total Prompts:** 11
**Estimated Timeline:** 8 weeks
**Estimated Budget:** $85,500

---

## 📁 Files in This Directory

### 🎯 Start Here
- **[QUICK_START.md](QUICK_START.md)** - Choose your execution path (15 min read)
- **[README.md](README.md)** - Complete overview and integration guide (30 min read)
- **[MAESTRO_PLAN.md](MAESTRO_PLAN.md)** - Detailed 8-week execution plan (45 min read)

### 📝 Prompt Files

#### Tier 0: Foundation (Weeks 1-2)
1. **[01-intelgraph-core.md](01-intelgraph-core.md)** - IntelGraph Core Data Model & Service
   - **Priority:** ⭐️ CRITICAL PATH
   - **Effort:** 2 weeks
   - **Start:** Immediately

2. **[02-provenance-claim-ledger.md](02-provenance-claim-ledger.md)** - Provenance & Claim Ledger Library
   - **Priority:** ⭐️ CRITICAL PATH
   - **Effort:** 1 week
   - **Start:** After #1

#### Tier 1: Platform Services (Weeks 3-4)
3. **[03-maestro-conductor.md](03-maestro-conductor.md)** - Maestro Conductor Orchestration
   - **Priority:** ⭐️ HIGH
   - **Effort:** 1.5 weeks
   - **Start:** Week 3 (parallel)

4. **[04-opa-abac-governance.md](04-opa-abac-governance.md)** - OPA ABAC Governance Layer
   - **Priority:** ⭐️ HIGH
   - **Effort:** 1 week
   - **Start:** Week 3 (parallel)

5. **[07-metrics-observability.md](07-metrics-observability.md)** - Metrics & Observability
   - **Priority:** ⭐️ HIGH
   - **Effort:** 1 week
   - **Start:** Week 3 (parallel)

#### Tier 2: Application Features (Weeks 5-6)
6. **[11-white-label-configuration.md](11-white-label-configuration.md)** - White-Label Configuration
   - **Priority:** Medium
   - **Effort:** 1 week
   - **Start:** Week 5 (parallel)

7. **[10-risk-incident-tracker.md](10-risk-incident-tracker.md)** - Risk & Incident Tracker
   - **Priority:** Medium
   - **Effort:** 1 week
   - **Start:** Week 5 (parallel)

#### Tier 3: Automation & Tooling (Weeks 7-8)
8. **[05-disclosure-pack-generator.md](05-disclosure-pack-generator.md)** - Disclosure Pack Generator
   - **Priority:** ⭐️ RELEASE BLOCKER
   - **Effort:** 1 week
   - **Start:** Week 7

9. **[08-release-gate-checker.md](08-release-gate-checker.md)** - Release Gate Checker
   - **Priority:** ⭐️ RELEASE BLOCKER
   - **Effort:** 3 days
   - **Start:** Week 8 (after #5)

10. **[06-ceo-daily-dispatch.md](06-ceo-daily-dispatch.md)** - CEO Daily Dispatch Generator
    - **Priority:** Medium
    - **Effort:** 3 days
    - **Start:** Week 7 (parallel)

11. **[09-canonical-output-templates.md](09-canonical-output-templates.md)** - Canonical Output Templates
    - **Priority:** Medium
    - **Effort:** 4 days
    - **Start:** Week 7 (parallel)

---

## 🚀 Quick Start Commands

### Check Current Location
```bash
pwd
# Should output: /home/user/summit/prompts/topicality-foundation
```

### Read Documentation (choose one)
```bash
# Quick start guide
cat QUICK_START.md

# Complete overview
cat README.md

# Detailed execution plan
cat MAESTRO_PLAN.md
```

### Start Prompt #1 (Sequential Approach)
```bash
# Create workspace
mkdir -p ~/topicality-platform/intelgraph-core
cd ~/topicality-platform/intelgraph-core

# Launch Claude Code with Prompt #1
cat /home/user/summit/prompts/topicality-foundation/01-intelgraph-core.md
# Copy/paste the above into Claude Code
```

### Start Week 3 (Parallel Approach)
```bash
# Terminal 1: Maestro
cd ~/topicality-platform/maestro
cat /home/user/summit/prompts/topicality-foundation/03-maestro-conductor.md

# Terminal 2: Governance
cd ~/topicality-platform/governance
cat /home/user/summit/prompts/topicality-foundation/04-opa-abac-governance.md

# Terminal 3: Metrics
cd ~/topicality-platform/metrics
cat /home/user/summit/prompts/topicality-foundation/07-metrics-observability.md
```

---

## 📊 Execution Matrix

| Week | Focus | Prompts | Parallelizable? | Gate |
|------|-------|---------|-----------------|------|
| 1-2 | Foundation | #1, #2 | No (sequential) | IntelGraph Core working |
| 3-4 | Platform | #3, #4, #7 | **Yes (3 parallel)** | Platform services integrated |
| 5-6 | Features | #6, #10, #11 | **Yes (2-3 parallel)** | Application features ready |
| 6 | Integration | Testing | N/A | System hardened |
| 7-8 | Automation | #5, #6, #8, #9 | **Partial (3 parallel)** | Release automation live |

---

## 🎯 Success Criteria

### By Week 2
- ✅ Can create entities with claims
- ✅ Can attach provenance to claims
- ✅ Can query claim history

### By Week 4
- ✅ Can orchestrate runs with Maestro
- ✅ Can enforce ABAC policies
- ✅ Can expose KPI metrics

### By Week 6
- ✅ Multi-tenant configuration working
- ✅ Risk tracking operational

### By Week 8
- ✅ Can generate disclosure packs
- ✅ Release gates enforced in CI
- ✅ CEO dispatch auto-generated
- ✅ **Golden path validated end-to-end**

---

## 🔗 Integration Flow

```
Prompt #1 (IntelGraph Core)
    │
    ├─→ Prompt #2 (Claim Ledger) ─→ Used by all services
    │
    ├─→ Prompt #3 (Maestro) ──────→ Orchestrates workflows
    │       │
    │       └─→ Prompt #5 (Disclosure Pack)
    │               │
    │               └─→ Prompt #8 (Release Gate)
    │
    ├─→ Prompt #4 (OPA ABAC) ─────→ Secures all services
    │
    ├─→ Prompt #7 (Metrics) ──────→ Tracks KPIs
    │       │
    │       └─→ Prompt #6 (CEO Dispatch)
    │
    ├─→ Prompt #11 (White-Label) ─→ Multi-tenancy
    │       │
    │       └─→ Prompt #9 (Templates)
    │
    └─→ Prompt #10 (Risk Tracker) → Governance reporting
            │
            └─→ Prompt #8 (Release Gate)
```

---

## 📈 Progress Tracking

Use this checklist as you execute:

### Foundation Tier
- [ ] Prompt #1: IntelGraph Core (Week 1-2)
- [ ] Prompt #2: Claim Ledger Library (Week 2-3)

### Platform Tier
- [ ] Prompt #3: Maestro Conductor (Week 3-4)
- [ ] Prompt #4: OPA ABAC Governance (Week 3-4)
- [ ] Prompt #7: Metrics & Observability (Week 3-4)

### Application Tier
- [ ] Prompt #11: White-Label Configuration (Week 5)
- [ ] Prompt #10: Risk & Incident Tracker (Week 5)

### Automation Tier
- [ ] Prompt #5: Disclosure Pack Generator (Week 7)
- [ ] Prompt #8: Release Gate Checker (Week 8)
- [ ] Prompt #6: CEO Daily Dispatch (Week 7)
- [ ] Prompt #9: Canonical Templates (Week 7-8)

### Final Validation
- [ ] End-to-end integration tests pass
- [ ] Security review completed
- [ ] Documentation finalized
- [ ] Demo prepared

---

## 💡 Pro Tips

1. **Read QUICK_START.md first** - It has decision trees for your situation
2. **Follow the tier sequence** - Don't skip Tier 0
3. **Use parallel execution** - Weeks 3-8 have parallel opportunities
4. **Track with Maestro** - Once Prompt #3 is done, use it to track remaining prompts
5. **Commit frequently** - Each prompt completion should be committed
6. **Test integrations early** - Don't wait until Week 8

---

## 🆘 Getting Help

**Before starting:**
- Read: `QUICK_START.md` → `README.md` → Specific prompt file

**During execution:**
- Stuck on a prompt? Check its "Requirements" and "Deliverables" sections
- Integration issues? See `README.md` "Integration Points"
- Timeline slipping? See `MAESTRO_PLAN.md` "Risk Management"

**After completion:**
- Generate claim ledger manifests for each artifact
- Document any deviations in a RETROSPECTIVE.md
- Share learnings with the team

---

## 📦 Deliverables Summary

By the end of this plan, you will have:

1. **Services:**
   - IntelGraph Core API
   - Maestro Conductor
   - Risk & Incident Tracker
   - White-Label Configuration Service

2. **Libraries:**
   - Claim Ledger Library (`@topicality/claim-ledger`)
   - OPA ABAC Adapter (`@topicality/opa-adapter`)
   - Metrics Module (`@topicality/metrics`)

3. **CLI Tools:**
   - Disclosure Pack Generator
   - Release Gate Checker

4. **Automation:**
   - CEO Daily Dispatch Generator
   - Canonical Output Templates Engine

5. **Documentation:**
   - README for each component
   - Integration guides
   - API documentation
   - Deployment guides

6. **Testing:**
   - Unit tests (80%+ coverage per component)
   - Integration tests
   - End-to-end golden path test

---

## 🎬 Next Action

**Right now:**
```bash
cat QUICK_START.md
```

**In 30 minutes:**
```bash
cat 01-intelgraph-core.md
# Then paste into Claude Code to begin
```

**In 2 weeks:**
- Have IntelGraph Core running
- Be ready for parallel execution in Week 3

---

**Last Updated:** 2025-11-22
**Maintained By:** Topicality Engineering
**Questions?** See QUICK_START.md troubleshooting section
