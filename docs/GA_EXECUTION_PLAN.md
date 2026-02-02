# SUMMIT → GA RELEASE PLAN (High‑Velocity, Quality‑First)

## GA Definition (lock this first)
Summit GA means:
*   A new user can install → run → complete a real investigation without human intervention
*   No cross‑tenant data leakage is possible by construction
*   Every sensitive action is auditable
*   Agents can fail safely and deterministically
*   You can say “yes” to a security review without flinching
If a feature doesn’t support one of those, it’s post‑GA.

## PHASE 0 (Week 0–1): GA Scope Lock + Kill List
### 0.1 Freeze the GA surface area
Create a single doc: `docs/ga-scope.md`

**IN SCOPE**
*   Investigation lifecycle (create → enrich → analyze → report)
*   Entity + relationship graph (Neo4j)
*   GraphRAG retrieval
*   Agent orchestration (core loop only)
*   ABAC / OPA enforcement
*   Audit logging
*   Single deployment path (Docker Compose → K8s optional)

**OUT OF SCOPE (explicitly)**
*   Exotic connectors
*   Multi‑cloud
*   UI polish beyond usability
*   “Smart” agents that require human babysitting
*   Performance heroics not tied to correctness
*   Anything not in this doc is auto‑rejected until GA+1.

## PHASE 1 (Weeks 1–3): HARDEN THE CORE (No New Features)
### 1. Investigation lifecycle must be bulletproof
Gate: deterministic, replayable investigations

**Actions:**
*   Canonical investigation state machine (enum, not implied)
*   Idempotent investigation creation
*   Explicit “finalized / frozen” investigation state
*   Versioned investigation schema (forward‑compatible)

**Kill test**
*   Can I replay an investigation from audit logs + inputs and get the same outputs?
*   If not → fix.

### 2. Tenant isolation & policy correctness (non‑negotiable)
You already claim this. Now prove it.

**Actions:**
*   Formalize tenant boundary invariants
*   Negative tests:
    *   Cross‑tenant graph traversal
    *   Cross‑tenant vector search
    *   Cross‑tenant agent memory access
*   Policy decision tracing (OPA explain mode saved to audit log)

**Gate**
*   100% pass rate on tenant boundary tests
*   One failing test blocks release

### 3. Audit logging completeness
Rule: If it mutates state or reveals data → it logs.

**Actions:**
*   Single audit event schema
*   Required fields: actor, tenant, investigation, action, object, policy_decision_id
*   Append‑only, immutable semantics
*   Retention + export documented

**Gate**
*   Audit coverage report shows ≥ 95% coverage of sensitive paths
*   Missing audit event = CI failure

## PHASE 2 (Weeks 3–6): AGENT RELIABILITY, NOT INTELLIGENCE
### 4. Agents must be boring and predictable
GA agents do less, but never surprise.

**Actions:**
*   Single agent execution loop
*   Explicit plan → execute → verify → write
*   Hard caps:
    *   steps
    *   tokens
    *   graph writes
*   Deterministic retries (same inputs → same outputs)

**Kill test**
*   Can an agent:
    *   loop forever?
    *   write partial state?
    *   escape its investigation?
*   If yes → not GA.

### 5. GraphRAG correctness over cleverness
**Actions:**
*   Fixed retrieval pipeline (no dynamic magic)
*   Explicit hop limits
*   Explainable retrieval results (why this node/edge)
*   Snapshot‑based retrieval for investigations (no drifting context)

**Gate**
*   Every GraphRAG answer can point to graph nodes + edges
*   No “model says” without grounding

## PHASE 3 (Weeks 6–8): INSTALLABILITY & OPERATOR TRUST
### 6. One blessed install path
If users have choices, they will choose wrong.

**Actions:**
*   One docker-compose up path
*   One .env.example
*   Deterministic startup order
*   Health checks for every service

**Gate**
*   Fresh laptop → investigation completed in < 30 minutes

### 7. Operator experience (quietly critical)
**Actions:**
*   /health, /ready, /metrics
*   Startup diagnostics (what failed and why)
*   Clear fatal vs recoverable errors
*   Structured logs everywhere

**Gate**
*   On-call simulation: break Neo4j / Qdrant / Redis → system degrades, not corrupts

## PHASE 4 (Weeks 8–10): GA NARRATIVE + PROOF
### 8. Golden paths (this is what you sell)
Create 3 canonical investigations:
*   Entity enrichment & relationship discovery
*   Network analysis (2–3 hops)
*   Narrative report generation

Each must be:
*   Scriptable
*   Demoable
*   Reproducible → same inputs, same outputs

### 9. Evidence pack (this wins buyers)
Ship a `docs/ga-evidence/` folder:
*   Architecture diagram
*   Tenant isolation tests summary
*   Audit log schema + sample
*   Policy examples
*   Threat model (STRIDE‑lite is fine)

This matters more than features.

## PHASE 5 (Weeks 10–12): RELEASE & LOCKDOWN
### 10. GA release mechanics
**Actions:**
*   Version tag + changelog
*   Migration notes
*   Upgrade path from previous versions
*   Known limitations (explicit!)

### 11. Post‑GA rule
For 30 days:
*   No new features
*   Only:
    *   bug fixes
    *   security patches
    *   operator improvements

This protects trust.

## EXECUTION MODEL (How you go fast)
### Parallel tracks (no stepping on each other)
*   Track A: Core correctness (state, graph, audit)
*   Track B: Agent loop + GraphRAG
*   Track C: Installability + ops
*   Track D: Docs + evidence

Each track has its own kill gates.

## WHAT TO CUT WITHOUT REGRET
These are velocity traps pre‑GA:
*   Fancy UI polish
*   Agent creativity
*   Too many connectors
*   Multi‑cloud
*   “One more refactor”

GA buyers care about trust, not sparkle.

## THE ONE QUESTION TO ASK WEEKLY
“If this shipped today, what would embarrass us in front of a serious customer?”

Fix only those things.
