# Prompt: CTI Subsumption Pipeline Documentation (v1)

Produce a governed, evidence-first documentation package that specifies the Summit CTI Subsumption Pipeline. The output must include architecture, security threat model, evaluation plan, operations plan, and product spec with GA-ready guardrails. It must reference the Summit Readiness Assertion and enforce the dual-path model (deterministic enforcement vs probabilistic hypothesis). Provide explicit file paths, APIs, schemas, and CI gates. Use pointer-linked provenance for every claim and define offline determinism requirements.

## Required Sections

1. Readiness Assertion Escalation
2. Scope Statement
3. MAESTRO Security Alignment (Layers, Threats, Mitigations)
4. Architecture (services/APIs/schemas/dataflow/tenant scoping)
5. PR-by-PR dependency graph
6. Security threat model (STRIDE-style) with controls + test cases
7. Evaluation strategy + metrics schema
8. Ops plan (SLOs, dashboards, runbooks, rollback, OFFLINE flags)
9. Product spec (personas, UX flow, packaging, TTG benchmark, MVP scope)
10. Deferred pending confirmations

## Constraints

- No speculative claims: use “Deferred pending X” for unknowns.
- No policy bypasses.
- Evidence artifacts must be reproducible offline.
