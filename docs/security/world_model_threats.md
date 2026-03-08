# World-Model Threat Model

**Evidence:** EVD-WORLD_MODEL-ARCH-001
**Review required before:** `WORLD_MODEL_ENABLED=true` in any environment.

## Threat Matrix

| Threat | Description | Mitigation |
|---|---|---|
| Model hallucination | Dynamics model predicts states not grounded in reality | KG grounding required for every WorldState; `groundState()` validates node existence |
| Data leakage | Embeddings or transcripts surfaced via API | CONFIDENTIAL/RESTRICTED payloads stripped at observation layer; never logged |
| Training poisoning | Adversarial observations corrupt latent space | Provenance checks on all ingested data; observation_refs auditable |
| Simulation misuse | Planning API used to probe sensitive strategies | Policy gate (`WORLD_MODEL_ENABLED`); GraphQL resolver validates action types |

## Data Classification

Observations and states carry a classification field:

| Level | Handling |
|---|---|
| PUBLIC | Allowed in logs and API responses |
| INTERNAL | Allowed in internal services only |
| CONFIDENTIAL | Payload stripped to `[REDACTED]` at ingest |
| RESTRICTED | Payload stripped to `[REDACTED]` at ingest; requires separate audit |

## Never Log

- Customer records
- Internal embeddings (semantic_vector)
- Private transcripts

## Supply Chain

No new runtime dependencies introduced. Node.js stdlib `crypto` used for UUID
generation and hashing. All dependencies subject to existing
`.github/policies/dependency-worldmodel.yml` gate.
