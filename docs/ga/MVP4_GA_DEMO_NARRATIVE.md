# MVP-4 GA Demo Narrative: "The Era of Verifiable Autonomy"

**Time:** 10 Minutes
**Audience:** Internal Engineering / Exec / Pilot Customers
**Goal:** Prove that Summit is not just a tool, but a **governed, autonomous platform**.

---

## Chapter 1: The Problem (Why Now?) [1 min]

**Script:**
"Teams today are drowning in data but starving for intelligence. They deploy 'agents' that are unguided missiles—no governance, no memory, no audit trail. MVP-4 changes that. We are shipping the first platform that combines **Autonomous Action** with **Regulatory-Grade Control**."

**Visuals:**
*   Show the "Chaos" (a mess of unmanaged logs/scripts).
*   Transition to Summit Dashboard (Order/Structure).

**Evidence Anchor:**
*   `docs/VISION_CHARTER.md` (The mission)
*   `docs/ga-readiness/GA_ORCHESTRATION_PLAYBOOK.md` (The solution)

---

## Chapter 2: The Core Workflow (Maestro + Switchboard) [3 mins]

**Script:**
"Let's look at the Golden Path. An analyst asks a complex question: 'Map the influence network of Campaign X.' Watch how Maestro breaks this down."

**Demo Steps:**
1.  **Ingest:** Show data flowing through Switchboard.
    *   *Cmd:* `bash scripts/smoke-test.cjs` (simulates ingest flow)
    *   *Evidence:* `server/src/services/SwitchboardService.ts`
2.  **Plan:** Maestro receives the intent and generates a plan.
    *   *Cmd:* `npx tsx scripts/validate-maestro-deployment.sh`
    *   *Evidence:* `server/src/maestro/planner/HTNPlanner.ts`
3.  **Execute:** Agents spawn, execute tasks, and record results.
    *   *Visual:* Graph expanding in real-time.
    *   *Evidence:* `server/src/maestro/execution/TaskExecutor.ts`

**Key Takeaway:** "It's not just a script. It's a dynamic, self-healing plan."

---

## Chapter 3: The Brain (IntelGraph) [2 mins]

**Script:**
"Data without context is noise. IntelGraph doesn't just store nodes; it understands *narratives*."

**Demo Steps:**
1.  **Query:** Run a temporal traversal query.
    *   *Cmd:* `npx tsx scripts/verify_ga_endpoints.ts` (hits the graph API)
    *   *Evidence:* `server/src/graph/algorithms.ts`
2.  **Visualize:** Show the lineage of a claim.
    *   *Evidence:* `docs/ga-ontology/ontology_model.md`

**Key Takeaway:** "We can trace any fact back to its source."

---

## Chapter 4: Governance & Security (The "Iron Dome") [2 mins]

**Script:**
"Now, the most important part. How do we know it's safe? Every action is checked against policy *before* execution."

**Demo Steps:**
1.  **Policy Check:** Show OPA rejecting an invalid request.
    *   *Cmd:* `bash scripts/test-policies.sh`
    *   *Evidence:* `policy/access/rbac.rego`
2.  **Audit Trail:** Show the immutable ledger.
    *   *Cmd:* `node scripts/verify-audit-chain.js`
    *   *Evidence:* `server/src/provenance/ledger.ts`
3.  **Supply Chain:** Verify the build artifact.
    *   *Cmd:* `bash scripts/security/verify-slsa-l3.sh <image>`
    *   *Evidence:* `docs/governance/provenance.md`

**Key Takeaway:** "Compliance isn't an afterthought; it's the kernel."

---

## Chapter 5: Operational Readiness (The "Green Board") [2 mins]

**Script:**
"We don't ship on hope. We ship on proof."

**Demo Steps:**
1.  **Run the GA Gate:** Execute the master verification script.
    *   *Cmd:* `npx tsx scripts/verify-ga.sh`
    *   *Visual:* All green checks.
2.  **Show the Evidence Bundle:**
    *   *Cmd:* `ls -la artifacts/evidence/` (simulated)
    *   *Evidence:* `docs/ga/MVP4_GA_EVIDENCE_MAP.md`

**Close:**
"MVP-4 is live. It's verifiable, scalable, and ready for the mission. Thank you."

---

## Technical Appendix (For QA)
*   **Repo State:** `git status --porcelain=v1` (Must be clean)
*   **Environment:** `NODE_ENV=production`
