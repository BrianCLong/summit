# Agent Control Plane — GA Readiness

**Item slug:** agent-fleet-control-plane-2027
**Evidence IDs:** EVD-AFCP-EVAL-005
**GA milestone file:** `.github/MILESTONES/agent-control-plane-ga.yml`

---

## GA Exit Criteria

| # | Criterion | Gate | Status |
|---|-----------|------|--------|
| 1 | Router deterministic replay passes (≥ 10 identical calls) | `router-determinism-check` | pending |
| 2 | All deny fixtures pass (registry + router + policy) | `deny-fixtures-check` | pending |
| 3 | Evidence bundle complete and valid JSON | `evidence-schema-check` | pending |
| 4 | Agent policy file present and structurally valid | `agent-policy-check` | pending |
| 5 | FlightRecorder strips NEVER_LOG_FIELDS | `deny-fixtures-check` | pending |
| 6 | compileGraphContext() resolves for all task types | `router-determinism-check` | pending |

---

## Success Metrics

| Metric | Target | Baseline |
|--------|--------|----------|
| Mean routing latency | < 50 ms | TBD |
| Deterministic replay agreement | 100% | — |
| Policy violation rate | 0 | — |
| Recovery success after failure | > 95% | — |
| Context token reduction vs naive RAG | > 40% | — |
| Audit artifact completeness | 100% | — |

---

## PR Stack

| PR | Scope | Risk | Flag |
|----|-------|------|------|
| PR1 | Evidence schema + CI scripts | green | n/a |
| PR2 | Agent registry + descriptors | green | n/a |
| PR3 | Policy PDP + deny fixtures | green | n/a |
| PR4 | Graph context compiler skeleton | yellow | `SUMMIT_GRAPH_CONTEXT_COMPILER` |
| PR5 | Deterministic router | green | `SUMMIT_DETERMINISTIC_ROUTER` |
| PR6 | Docs + GA gates | green | n/a |

---

## Rollback Protocol

1. Set `SUMMIT_AGENT_CONTROL_PLANE=false` in environment.
2. Preserve all registry descriptors and audit/evidence artifacts.
3. Disable individual subsystem flags (`SUMMIT_GRAPH_CONTEXT_COMPILER`, etc.) independently.
4. No destructive schema migrations in the foundation lane.

---

## Innovation Lane (Post-GA)

| Feature | Flag | Prerequisite |
|---------|------|-------------|
| Remediation / causation engine | `SUMMIT_CAUSATION_ENGINE` | T-001 mitigated |
| Human authority gateway | `SUMMIT_HUMAN_AUTHORITY_GATE` | HITL design review |
| Interop fabric (MCP / A2A) | `SUMMIT_INTEROP_FABRIC` | connector inventory |
| Durable saga runtime (Temporal) | `SUMMIT_DURABLE_SAGA_RUNTIME` | Temporal provisioning |
