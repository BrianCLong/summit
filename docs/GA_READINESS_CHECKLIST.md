# GA Readiness Checklist

## Phase 0: GA Scope Lock
- [x] Freeze GA surface area (`docs/ga-scope.md` created)

## Phase 1: Harden the Core
### Investigation Lifecycle
- [ ] Canonical investigation state machine defined
- [ ] Idempotent investigation creation implemented
- [ ] Explicit "finalized/frozen" state implemented
- [ ] Versioned investigation schema implemented
- [ ] **Kill Test**: Replay investigation from audit logs (Pass/Fail)

### Tenant Isolation
- [ ] Formalize tenant boundary invariants
- [ ] Negative Test: Cross-tenant graph traversal
- [ ] Negative Test: Cross-tenant vector search
- [ ] Negative Test: Cross-tenant agent memory access
- [ ] Policy decision tracing (OPA explain mode)
- [ ] **Gate**: 100% pass rate on tenant boundary tests

### Audit Logging
- [ ] Single audit event schema defined
- [ ] Required fields enforced (actor, tenant, investigation, action, object, policy_decision_id)
- [ ] Append-only, immutable semantics verified
- [ ] Retention + export documented
- [ ] **Gate**: Audit coverage ≥ 95% of sensitive paths

## Phase 2: Agent Reliability
### Agent Execution
- [ ] Single agent execution loop implemented
- [ ] Explicit plan → execute → verify → write loop
- [ ] Hard caps enforced (steps, tokens, graph writes)
- [ ] Deterministic retries verified
- [ ] **Kill Test**: Agent loop prevention verified
- [ ] **Kill Test**: Partial state write prevention verified
- [ ] **Kill Test**: Investigation escape prevention verified

### GraphRAG
- [ ] Fixed retrieval pipeline (no dynamic magic)
- [ ] Explicit hop limits enforced
- [ ] Explainable retrieval results implemented
- [ ] Snapshot-based retrieval implemented
- [ ] **Gate**: Every GraphRAG answer grounded in graph nodes/edges

## Phase 3: Installability & Operator Trust
### Install Path
- [ ] One `docker-compose up` path verified
- [ ] One `.env.example` verified
- [ ] Deterministic startup order verified
- [ ] Health checks for every service implemented
- [ ] **Gate**: Fresh laptop → investigation < 30 mins

### Operator Experience
- [ ] `/health`, `/ready`, `/metrics` endpoints implemented
- [ ] Startup diagnostics implemented
- [ ] Structured logs everywhere
- [ ] **Gate**: On-call simulation (break Neo4j/Qdrant/Redis) passed

## Phase 4: GA Narrative + Proof
### Golden Paths
- [ ] Entity enrichment & relationship discovery investigation scriptable
- [ ] Network analysis (2-3 hops) investigation scriptable
- [ ] Narrative report generation investigation scriptable

### Evidence Pack
- [ ] `docs/ga-evidence/` folder created
- [ ] Architecture diagram created
- [ ] Tenant isolation tests summary created
- [ ] Audit log schema + sample created
- [ ] Policy examples created
- [ ] Threat model created

## Phase 5: Release & Lockdown
- [ ] Version tag + changelog prepared
- [ ] Migration notes prepared
- [ ] Upgrade path documented
- [ ] Known limitations documented
- [ ] 30-day "No New Features" rule enforced
