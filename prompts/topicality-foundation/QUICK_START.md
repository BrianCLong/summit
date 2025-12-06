# Quick Start Guide - Topicality Foundation

**Time to first value:** 15 minutes to start Prompt #1

---

## Fastest Path to Value

### Option A: Start Immediately with Prompt #1
**Best for:** Getting started now, single-threaded execution

```bash
# 1. Navigate to your work directory
cd ~/topicality-platform

# 2. Create IntelGraph Core directory
mkdir -p intelgraph-core
cd intelgraph-core

# 3. Start Claude Code with Prompt #1
claude
# Then paste the contents of:
# /home/user/summit/prompts/topicality-foundation/01-intelgraph-core.md
```

**What happens next:**
- Claude Code will propose a stack (TypeScript/Node or Python/FastAPI)
- You'll review and approve
- Claude will implement IntelGraph Core over ~2 weeks
- You'll have a working entity/claim/provenance system

---

### Option B: Parallel Execution (Week 3+)
**Best for:** Maximum velocity after foundation is complete

**Prerequisites:**
- Prompts #1 and #2 completed
- 3 developers or 3 Claude Code sessions

**Week 3 Kickoff:**

```bash
# Terminal 1: Maestro
cd ~/topicality-platform/maestro
claude --prompt "$(cat /home/user/summit/prompts/topicality-foundation/03-maestro-conductor.md)"

# Terminal 2: Governance
cd ~/topicality-platform/governance
claude --prompt "$(cat /home/user/summit/prompts/topicality-foundation/04-opa-abac-governance.md)"

# Terminal 3: Metrics
cd ~/topicality-platform/metrics
claude --prompt "$(cat /home/user/summit/prompts/topicality-foundation/07-metrics-observability.md)"
```

---

### Option C: Use Existing Summit Infrastructure
**Best for:** Integrating with your current Summit/IntelGraph deployment

**Steps:**

1. **Audit current state:**
   ```bash
   cd /home/user/summit

   # Check existing IntelGraph components
   find . -type f -name "*entity*" -o -name "*claim*" -o -name "*provenance*" | head -20

   # Check existing Maestro components
   find . -type f -name "*maestro*" -o -name "*conductor*" | head -20
   ```

2. **Adapt prompts:**
   - Open `01-intelgraph-core.md`
   - Update "Assumptions" section to reference existing Summit stack
   - Update "Requirements" to focus on gaps/extensions

3. **Incremental approach:**
   - Start with Prompt #2 (Claim Ledger) as a library
   - Integrate into existing services
   - Backfill other prompts as needed

---

## Decision Tree: Which Approach?

```
Do you have an existing IntelGraph deployment?
│
├─ YES → Use Option C (Integrate with Summit)
│   └─ Start with Prompt #2 (Claim Ledger Library)
│
└─ NO → Starting from scratch?
    │
    ├─ YES → Use Option A (Sequential)
    │   └─ Start with Prompt #1 (IntelGraph Core)
    │
    └─ NO → Have Prompts #1 & #2 done?
        │
        ├─ YES → Use Option B (Parallel)
        │   └─ Start Week 3 with Prompts #3, #4, #7
        │
        └─ NO → Use Option A first
            └─ Then switch to Option B for Week 3+
```

---

## Common Scenarios

### Scenario 1: "I'm a new developer, never used Claude Code"

**Recommended:** Option A + Tutorial

```bash
# 1. Install Claude Code (if not already)
# Follow: https://github.com/anthropics/claude-code

# 2. Create workspace
mkdir -p ~/topicality-workspace
cd ~/topicality-workspace

# 3. Copy prompts locally
cp -r /home/user/summit/prompts/topicality-foundation ./prompts

# 4. Read the README
cat prompts/README.md

# 5. Start with Prompt #1
cat prompts/01-intelgraph-core.md
# Copy/paste into Claude Code
```

**Time investment:**
- Setup: 30 minutes
- Prompt #1 completion: 2 weeks (with Claude Code doing most work)
- Learning curve: Minimal (Claude Code guides you)

---

### Scenario 2: "I need this for a demo in 2 weeks"

**Recommended:** Fast-track critical path only

**Prompts to run:**
1. ✅ Prompt #1 (IntelGraph Core) - 2 weeks
2. ⏭️ Skip Prompt #2 for now (use inline provenance)
3. ⏭️ Skip governance/metrics (use stubs)

**Fast-track approach:**
```bash
# Modify Prompt #1 to focus on:
# - Entities and claims (skip full provenance initially)
# - In-memory storage (skip Postgres initially)
# - Hardcoded policy labels (skip OPA initially)

# This reduces 2 weeks → 1 week for a demoable MVP
```

**Demo deliverable:**
- Entity CRUD API
- Basic claim tracking
- Simple query examples
- Postman collection for demo

---

### Scenario 3: "I want to understand the architecture first"

**Recommended:** Start with documentation + sample run

```bash
# 1. Read architecture docs
cat /home/user/summit/prompts/topicality-foundation/README.md
cat /home/user/summit/prompts/topicality-foundation/MAESTRO_PLAN.md

# 2. Review Prompt #1 without executing
cat /home/user/summit/prompts/topicality-foundation/01-intelgraph-core.md

# 3. Study the dependency graph
# See README.md "Architecture Overview" section

# 4. Ask Claude Code to explain (without executing)
claude
# Prompt: "Explain the architecture in prompts/topicality-foundation/README.md
#         and how the 11 components integrate. Don't execute anything, just explain."
```

**Time investment:**
- Reading: 2 hours
- Architecture Q&A with Claude: 1 hour
- Decision to proceed: immediate

---

### Scenario 4: "I have a team of 3, we want maximum velocity"

**Recommended:** Parallel execution plan

**Team assignment:**

| Developer | Week 1-2 | Week 3-4 | Week 5-6 | Week 7-8 |
|-----------|----------|----------|----------|----------|
| Dev 1 (Backend) | Prompt #1 | Prompt #3 (Maestro) | Integration | Prompt #8 (Release Gate) |
| Dev 2 (Security) | Support #1 | Prompt #4 (OPA) | Prompt #6 (Config) | Prompt #9 (Templates) |
| Dev 3 (Infra) | Support #1 | Prompt #7 (Metrics) | Prompt #10 (Risk) | Prompt #11 (CEO Dispatch) |

**Coordination points:**
- Daily standups (15 min)
- End-of-week integration sessions (2 hours)
- Week 2, 4, 6 gates (must pass before next phase)

**Delivery:**
- End of Week 2: IntelGraph Core + Claim Ledger
- End of Week 4: Platform services integrated
- End of Week 6: Full system ready
- End of Week 8: Release automation live

---

## Troubleshooting

### "Claude Code keeps suggesting a different stack than I want"

**Fix:**
1. Edit the prompt file (e.g., `01-intelgraph-core.md`)
2. Update "Assumptions" section to be more prescriptive:
   ```markdown
   Assumptions:
   - MUST use TypeScript + Node.js + PostgreSQL (no alternatives)
   - MUST use Express for HTTP server
   - MUST use Prisma for database ORM
   ```
3. Re-run prompt with updated constraints

---

### "I completed Prompt #1 but Prompt #2 won't integrate"

**Fix:**
1. Check Prompt #1 deliverables:
   - Does `intelgraph-core/` have an HTTP API?
   - Is there a `/entities` and `/claims` endpoint?
   - Is there API documentation?

2. Update Prompt #2 assumptions:
   ```markdown
   Assumptions:
   - IntelGraph API is at http://localhost:3000
   - Endpoints: POST /entities, POST /claims, GET /entities/:id
   ```

3. If integration still fails, create adapter layer:
   ```bash
   claude
   # Prompt: "Create an adapter that makes the IntelGraph API from Prompt #1
   #         compatible with the Claim Ledger expectations from Prompt #2"
   ```

---

### "I'm stuck on Week 3 - too many parallel tasks"

**Fix:**
1. **Reduce parallelism:**
   - Do Prompt #3 (Maestro) first (Week 3)
   - Do Prompts #4 + #7 together (Week 4)

2. **Stub dependencies:**
   - Use in-memory stores instead of real Postgres
   - Use hardcoded policies instead of OPA
   - Use fake metrics instead of real observability

3. **Sequential fallback:**
   - Follow Option A path (sequential)
   - Accept 12-week timeline instead of 8-week

---

### "Our compliance team needs to review everything"

**Fix:**
1. **Add review gates:**
   - After Prompt #1: Architecture review
   - After Prompt #4: Security/ABAC policy review
   - After Prompt #8: Release process review

2. **Generate review artifacts:**
   ```bash
   claude
   # Prompt: "Generate a security review document for the IntelGraph Core
   #         from Prompt #1, focusing on: data classification, access controls,
   #         audit logging, encryption at rest/transit"
   ```

3. **Build buffer time:**
   - Add 1 week per review gate
   - 8-week plan becomes 11-week plan

---

## Success Metrics

Track these to know you're on track:

### Week 2 (after Prompt #1)
- [ ] Can create an entity via API
- [ ] Can add a claim to an entity
- [ ] Can query claim history with provenance
- [ ] Tests pass with >70% coverage

### Week 4 (after Prompts #2, #3, #4, #7)
- [ ] Can create a Maestro run
- [ ] Can attach claim ledger manifest to run
- [ ] ABAC policies block unauthorized access
- [ ] Metrics endpoint returns KPIs

### Week 6 (after Prompts #6, #10)
- [ ] Can configure tenant-specific settings
- [ ] Can record and query incidents
- [ ] Risk summary generates correctly

### Week 8 (after Prompts #5, #8, #9, #11)
- [ ] Can generate disclosure pack for a release
- [ ] Release gate blocks non-compliant releases
- [ ] CEO dispatch generates from live data
- [ ] End-to-end golden path validated

---

## What to Do Right Now

**If you have 5 minutes:**
- Read `README.md` in this directory
- Decide which option (A/B/C) fits your situation

**If you have 30 minutes:**
- Read `README.md` and `MAESTRO_PLAN.md`
- Review Prompt #1 (`01-intelgraph-core.md`)
- Set up your workspace directory

**If you have 2 hours:**
- Do all of the above
- Start Prompt #1 with Claude Code
- Complete stack selection and architecture design (STEP-001)

**If you're ready to commit 2 weeks:**
- Execute Prompt #1 end-to-end
- Get IntelGraph Core to production-ready state
- Then decide on next phase

---

## Getting Help

**Prompt-specific questions:**
- Each prompt has a "Context" and "Requirements" section
- Read these carefully before starting
- If unclear, ask Claude Code: "Explain the requirements for this prompt"

**Integration questions:**
- See `README.md` "Integration Points" section
- Check `MAESTRO_PLAN.md` for run dependencies

**Architecture questions:**
- Review the architecture diagram in `README.md`
- Ask Claude Code to explain: "Explain how Prompt X integrates with Prompt Y"

**Stuck on implementation:**
- Share error messages with Claude Code
- Ask for: "Debug this error in the context of Prompt #X"
- Check tests - they often reveal integration issues

---

**Ready to start?** → Go to Option A, B, or C above and begin! 🚀
