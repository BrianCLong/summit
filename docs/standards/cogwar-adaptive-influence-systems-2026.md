# CogWar Adaptive Influence Systems (2026)

## Purpose

Establish a governed, deterministic standard for detecting and reporting adaptive influence
campaigns targeting cognitive infrastructure (attention, trust, cohesion) and coordinating across
cyber/physical domains. This standard aligns with the Summit Readiness Assertion and treats any
exceptions as governed exceptions under policy enforcement. Reference: `docs/SUMMIT_READINESS_ASSERTION.md`.

## Scope

**In scope**
- Defensive analytics only: detection, measurement, correlation, and reporting.
- Adaptive narrative operations (closed-loop testing, variant proliferation).
- Cognitive infrastructure targeting signals (attention load, trust shock, cohesion fracture).
- Cross-domain linkage (narrative + cyber + physical incidents).
- Agent-swarm coordination indicators (timing coherence, identity persistence).

**Out of scope (intentionally constrained)**
- Automated takedown or counter-influence operations.
- Persona generation or content amplification.
- Definitive attribution to specific state actors.

## Core Artifacts

### Campaign Object
A normalized representation of a suspected influence operation.

Schema: `src/cogwar/schema/campaign-object.schema.json`

Required fields:
- `schema_version` (`cogwar.campaign.v1`)
- `campaign_id`
- `narratives[]`
- `indicators[]`
- `evidence[]`

### Evidence Bundle
A deterministic, immutable record of detector outputs and attributions.

Schema: `src/cogwar/schema/evidence-bundle.schema.json`

Required fields:
- `schema_version` (`cogwar.evidence.v1`)
- `evidence_id` (format enforced below)
- `detector`
- `run_id`
- `artifacts[]`

## Evidence ID Format (Required)

`EVD:CW26:<detector>:<fixture-or-run-id>:<8charhash>`

- `detector`: short, uppercase or underscore identifier.
- `fixture-or-run-id`: stable identifier for deterministic runs.
- `8charhash`: uppercase hexadecimal, derived from stable inputs.

## Deterministic Output Rules

- `report.json`, `metrics.json`, and `evidence.json` must be deterministic.
- `stamp.json` contains runtime metadata only; no timestamps are allowed elsewhere.
- Sorting for arrays must be stable and keyed (e.g., `evidence_id`, `campaign_id`).

## Import / Export Matrix

**Imports**
- JSONL posts/comments
- Incident timelines
- Optional platform metadata
- Summit KG entities

**Exports**
- Campaign Object JSON
- Evidence Bundle JSON
- Optional graph edges (Neo4j)
- Optional dashboard-ready metrics

**Non-goals**
- Automated moderation
- Narrative generation or optimization
- Personal data enrichment beyond defensive analytics

## Governance Alignment

- All outputs are evidence-first and traceable to sources.
- Compliance and CI gates enforce deterministic artifact production.
- Readiness posture follows Summit’s readiness assertion and governed exceptions.

## CI Gates (Additive)

- Schema validation for campaign and evidence bundles.
- Determinism checks for output artifacts.
- PII log scan gate and deny-by-default logging.
- Budget gate for fixture runtime and memory.

## Threat-Informed Requirements

| Threat | Mitigation | Gate | Test Case |
| --- | --- | --- | --- |
| Adaptive influence evasion | Detect pivot patterns + variant proliferation | Fixture regression | `adaptivity_pivot.test.ts` |
| False positives weaponized | Evidence-backed explanations + confidence bands | Explainability schema gate | `explainability_schema.test.ts` |
| Data poisoning | Input validation + anomaly flags | Schema + fuzz tests | `ingest_fuzz.test.ts` |
| PII leakage | Never-log policy + redaction | PII log scan | `ci-security.yml` step |
| Model drift | Trend thresholds | Scheduled drift check | Drift artifact gate |

## Change Control

- Feature flags default **OFF**.
- Any exception requires a governed exception record.
- All changes must preserve deterministic outputs and evidence traceability.

## MAESTRO Alignment (Defensive)

- **Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats considered**: prompt injection, tool abuse, data poisoning, identity spoofing.
- **Mitigations**: strict schema validation, evidence-first outputs, deterministic artifact checks,
  and deny-by-default logging.
