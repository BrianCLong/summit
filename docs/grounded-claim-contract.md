# Grounded Claim Contract (MMFormalizer-Inspired)

**Status:** Draft (Intentionally constrained to the Grounded Claim scope)
**Authority:** Summit Readiness Assertion and Governance Framework

## Operating Posture

This contract asserts the present: all grounded reasoning artifacts must terminate on evidence or
axioms and must carry policy-as-code verifications before composition. Deviations are governed
exceptions, not defects.

## Purpose

Enable a recursive grounded reasoning loop for multimodal claims (text + image + diagram) that is
strictly evidence-bound, policy-checked, and composable into higher-order conclusions.

## GroundedClaim Schema (Normative)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "GroundedClaim",
  "type": "object",
  "required": [
    "claim_id",
    "claim_text",
    "claim_type",
    "entities",
    "relations",
    "evidence",
    "rules",
    "constraints",
    "grounding",
    "confidence",
    "created_at"
  ],
  "properties": {
    "claim_id": { "type": "string" },
    "claim_text": { "type": "string" },
    "claim_type": {
      "type": "string",
      "enum": ["observation", "extraction", "alignment", "inference", "composition", "refutation"]
    },
    "entities": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["entity_id", "entity_type", "label"],
        "properties": {
          "entity_id": { "type": "string" },
          "entity_type": { "type": "string" },
          "label": { "type": "string" },
          "attributes": { "type": "object" }
        }
      }
    },
    "relations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["relation_id", "relation_type", "source", "target"],
        "properties": {
          "relation_id": { "type": "string" },
          "relation_type": { "type": "string" },
          "source": { "type": "string" },
          "target": { "type": "string" },
          "attributes": { "type": "object" }
        }
      }
    },
    "evidence": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["evidence_id", "evidence_uri", "hash", "evidence_type"],
        "properties": {
          "evidence_id": { "type": "string" },
          "evidence_uri": { "type": "string" },
          "hash": { "type": "string" },
          "evidence_type": {
            "type": "string",
            "enum": ["document", "image", "diagram", "log", "telemetry"]
          },
          "extractor_id": { "type": "string" },
          "captures": { "type": "object" }
        }
      }
    },
    "rules": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["rule_id", "rule_type"],
        "properties": {
          "rule_id": { "type": "string" },
          "rule_type": {
            "type": "string",
            "enum": ["policy", "transform", "axiom", "detector"]
          },
          "rule_version": { "type": "string" }
        }
      }
    },
    "constraints": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["constraint_id", "constraint_type", "status"],
        "properties": {
          "constraint_id": { "type": "string" },
          "constraint_type": {
            "type": "string",
            "enum": ["policy", "type", "unit", "lineage", "time", "geo"]
          },
          "status": { "type": "string", "enum": ["pass", "fail"] },
          "details": { "type": "object" }
        }
      }
    },
    "grounding": {
      "type": "object",
      "required": ["anchors", "termination"],
      "properties": {
        "anchors": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["anchor_id", "anchor_type"],
            "properties": {
              "anchor_id": { "type": "string" },
              "anchor_type": {
                "type": "string",
                "enum": ["evidence", "axiom", "detector"]
              },
              "anchor_ref": { "type": "string" }
            }
          }
        },
        "termination": {
          "type": "object",
          "required": ["status", "reason"],
          "properties": {
            "status": { "type": "string", "enum": ["grounded", "blocked"] },
            "reason": { "type": "string" }
          }
        }
      }
    },
    "confidence": {
      "type": "object",
      "required": ["score", "uncertainty"],
      "properties": {
        "score": { "type": "number", "minimum": 0, "maximum": 1 },
        "uncertainty": { "type": "number", "minimum": 0, "maximum": 1 },
        "method": { "type": "string" }
      }
    },
    "created_at": { "type": "string", "format": "date-time" },
    "provenance": { "type": "object" }
  }
}
```

## Recursive Grounding Loop (Normative)

1. **Extract** primitives from evidence (text spans, diagram tokens, image regions).
2. **Align** primitives into entities/relations.
3. **Propose** subclaims.
4. **Validate** each subclaim (schema, policy, type/unit, lineage constraints).
5. **Compose** only if validation passes.
6. **Terminate** only when all subclaims are grounded in anchors.

## Termination Rules (Grounding Contract)

A claim is grounded if it satisfies all of the following:

- Each non-axiomatic subclaim links to at least one evidence anchor.
- Every transform rule is policy-checked and versioned.
- All constraints are recorded with explicit pass/fail.
- If any subclaim is blocked, composition halts and the claim is returned as
  **Intentionally constrained**.

## 23rd-Order Imputed Intention Ladder (Operational Constraint)

Imputed intention is permitted only up to order 23, and must be marked with explicit grounding
anchors at each hop. Higher orders are **governed exceptions** and must be logged as policy
violations.

Orders 0–23 (non-exhaustive template):

- **Order 0**: Literal observation (evidence-bound).
- **Order 1**: Direct extraction (evidence-bound).
- **Order 2**: Alignment (evidence-bound).
- **Order 3**: Immediate causal link (policy-checked transform).
- **Order 4**: Aggregated inference (constraint-checked).
- **Order 5**: Temporal inference (time window constraint).
- **Order 6**: Spatial inference (geo constraint).
- **Order 7**: Identity resolution (lineage + confidence).
- **Order 8**: Intent inference (policy-limited).
- **Order 9**: Motivational inference (requires axiom anchor).
- **Order 10**: Capability inference (requires detector anchor).
- **Order 11**: Opportunity inference (requires time/geo anchors).
- **Order 12**: Risk inference (policy + uncertainty constraints).
- **Order 13**: Threat inference (policy + lineage constraints).
- **Order 14**: Multi-actor coordination inference (lineage + detector anchors).
- **Order 15**: Strategic objective inference (axiom + policy anchors).
- **Order 16**: Counterfactual inference (CCR hooks required).
- **Order 17**: Attribution inference (identity + policy + uncertainty).
- **Order 18**: Narrative inference (source tier + provenance).
- **Order 19**: Deception inference (detector + policy).
- **Order 20**: Capability escalation inference (constraint pass required).
- **Order 21**: Multi-stage campaign inference (evidence chain required).
- **Order 22**: Systemic impact inference (policy + benchmark corroboration).
- **Order 23**: Strategic intent inference (axiom + evidence bundle required).

## CI Gate (Normative)

- Fail any composition where `grounding.termination.status != grounded`.
- Fail any claim with missing evidence hashes or rule versions.
- Fail any claim with a `constraints.status == fail`.

## Benchmark Harness (Minimal)

- **Dataset**: 25–50 cases with evidence bundles across four buckets: diagrams, charts, docs,
  photos.
- **Metrics**:
  - _Syntactic validity_: schema validation and compile success rate.
  - _Semantic validity_: expert adjudication or rule-based equivalence checks.
- **Hard mode**: diagram-heavy tasks track alignment accuracy and bounding-region fidelity.

## Evidence Bundle Requirements

Every composed claim must ship with an evidence bundle that includes:

- Evidence URIs + hashes
- Rule IDs + versions
- Constraint evaluation outcomes
- Provenance chain

## Next Implementation Steps (Scoped)

1. Add JSON Schema + Zod validators in a single primary zone.
2. Build a claim composer that enforces the termination rules.
3. Wire a CI gate for constraint enforcement.
4. Create the benchmark dataset + scorer.
