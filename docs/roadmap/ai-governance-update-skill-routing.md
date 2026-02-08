# Daily AI Governance Update — Skill Routing & Work Plan

## Sensing (UEF)

- Source inputs:
  - User request: “Daily AI Governance Update — High-Signal Changes (Net-New Focus)”
  - Required sub-agent prompts: Architect, Security, Evals, Ops, Product
- Constraints:
  - Use Summit skill router when available; otherwise route manually.
  - Update `docs/roadmap/STATUS.json` in the same PR.

## Skill Routing (Manual Override)

**Router status:** Deferred pending availability of `summit-skill-router` skill file in the container.

### Routing Table

| Workstream | Target skill | Reason | Output artifact |
| --- | --- | --- | --- |
| Architecture plan (PR-1..PR-6, services, schemas, evidence) | `architecture-planning` (proposed) | Required to define service boundaries, event schemas, evidence IDs | `docs/roadmap/governance-ops-architecture-plan.md` |
| Security & threat model (STRIDE, dual authority, gates) | `security-threat-modeling` (proposed) | Required to meet governance mandates and MAESTRO alignment | `docs/security/governance-ops-threat-model.md` |
| Evaluations & benchmarks (MTTContain, GRI, determinism) | `evals-suite-design` (proposed) | Required to define eval harness and CI thresholds | `docs/evals/governance-ops-evals.md` |
| Ops runbooks & SRE requirements | `ops-runbook-authoring` (proposed) | Required to support incident mode and evidence export | `docs/runbooks/governance-ops-incident-mode.md` |
| GA PRD & product positioning | `product-prd-authoring` (proposed) | Required to deliver GA PRD and adoption milestones | `docs/product/governance-ops-prd.md` |

## Work Plan (Single-Zone: docs/)

1. **Create Architecture Plan**
   - Define services, package boundaries, event schemas, evidence artifacts, determinism strategy, tenancy/residency, offline mode, and performance budgets.
2. **Create Security Threat Model**
   - STRIDE table, abuse cases, controls, and CI security gates with policy-as-code hooks.
3. **Create Evals Suite**
   - Deterministic harness design, metrics schemas, thresholds, regression tests.
4. **Create Ops Runbooks**
   - Incident workflows, observability, retention, DR, key rotation, integrity verification.
5. **Create GA PRD**
   - Personas, workflows, UI views, packaging/tiering, differentiation claims, acceptance checklist.
6. **Update Roadmap Status**
   - Record initiative with current status and evidence links.

## Deliverables Checklist

- [x] Architecture plan doc
- [x] Security threat model doc
- [x] Evals suite doc
- [x] Ops runbook doc
- [x] GA PRD doc
- [x] Status update in `docs/roadmap/STATUS.json`

## MAESTRO Alignment Declaration (Planning Phase)

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security
- **Threats Considered:** Governance bypass, evidence tampering, privilege escalation, tool abuse, prompt injection
- **Mitigations (Planned):** Dual authority model, append-only evidence ledger, deterministic policy evaluation, action-boundary enforcement, redaction + hashing
