# NOG Governed Agents Standard

## Summit Readiness Assertion
This standard operates under the Summit Readiness Assertion and the Constitution of the Ecosystem.

## Purpose
Define a governed Narrative Operating Graph (NOG) capability for risk assessment, forecasting, and
policy-gated recommendations. The system is defensive: it does **not** generate or execute
manipulative influence actions.

## Scope
- Lifecycle-aware narrative graph modeling.
- Specialized agents for sensing and reasoning.
- Closed-loop orchestration with policy gating and audit trails.
- Counterfactual simulation for **risk assessment** only.

## Authority & Alignment
- Governing artifacts: `docs/SUMMIT_READINESS_ASSERTION.md`, `docs/governance/CONSTITUTION.md`.
- Policy logic must be expressed as policy-as-code.
- Evidence-first outputs are mandatory.

## Definitions
- **NOG**: Narrative Operating Graph; nodes represent narrative states with lifecycle labels and
  temporal/causal relationships.
- **Governed Narrative Ops**: Risk analysis and compliance evaluation of narrative dynamics; no
  persuasion or covert influence.

## Import/Export Matrix

### Imports
- OSINT feeds and social signals (via approved adapters).
- Enterprise docs, tickets, and threat intel (via approved connectors).
- Platform telemetry (views, moderation events, anomaly signals).

### Exports (Deterministic)
- `nog.snapshot.json`
- `forecast.json`
- `counterfactuals.json`
- `policy_decisions.json`
- `audit.events.jsonl`
- `metrics.json`
- `stamp.json` (git SHA + evidence IDs; **no timestamps**)

## Non-goals
- No autonomous narrative “dominance.”
- No generation of deceptive content.
- No political targeting.
- No covert persuasion or influence execution.

## Lifecycle Labels (Required)
- `seeding`
- `propagation`
- `peak`
- `mutation`
- `decline`

## Specialized Agents (Roles)
- **Scout**: Collects candidate narrative signals (sensing only).
- **Cartographer**: Builds/updates NOG topology and lifecycle labels.
- **Forecaster**: Produces trajectory forecasts and risk estimates.
- **Strategist**: Proposes **risk assessment inputs** only (no content generation).
- **Governor**: Evaluates policy constraints and produces explainable decisions.

## Control Loop (Closed-Loop Orchestration)
1. Detect signals → 2. Map to NOG → 3. Forecast trajectories → 4. Simulate counterfactuals →
5. Policy evaluation → 6. Emit recommendation report → 7. Record outcomes (if any).

## Policy Gating (Deny-by-Default)
- `execute_intervention`: **Denied by default**.
- `generate_risk_report`: Allowed by default.
- Human approval required for any action that could alter external narratives.

## Audit & Provenance
- All decisions and outputs are recorded with a persistent, queryable audit log.
- Hash-chained audit entries provide tamper evidence.

## Evidence Discipline
- Evidence-first outputs precede narrative summaries.
- Every output includes `evidence_id` referencing inputs.

## Claim Traceability (Ground Truth)
- NOG data model → `ITEM:CLAIM-01`.
- Specialized agents → `ITEM:CLAIM-02`.
- Closed-loop orchestration → `ITEM:CLAIM-03`.
- Audit log → `ITEM:CLAIM-04`.
- Counterfactual simulation → `ITEM:CLAIM-05`.
- Policy gating → `ITEM:CLAIM-06`.
- Provider-independent provenance → `ITEM:CLAIM-07`.
- No manipulation / deny-by-default → Summit original.

## MAESTRO Security Alignment
- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered**: Goal manipulation, prompt injection, tool abuse, policy drift.
- **Mitigations**: Deny-by-default policies, evidence-first outputs, audit hash-chain,
  drift detection, and human approval gates.
