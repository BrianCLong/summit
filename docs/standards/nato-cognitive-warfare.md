# NATO Cognitive Warfare Alignment (Defensive-Only)

## Purpose

This standard establishes a defensive-only CogOps (cognitive operations) alignment for Summit, treating human cognition and social systems as decisive terrain while enforcing deny-by-default protections. This work is anchored to the Summit Readiness Assertion and governed by the repository’s evidence-first posture. See `docs/SUMMIT_READINESS_ASSERTION.md`.

## Scope (Defensive-Only)

- **In scope:** detection, resilience analytics, provenance, and auditability for influence operations targeting cognition, trust, identity, and institutions.
- **Out of scope:** persuasion, targeting optimization, influence execution, or any “cognitive advantage” operational claims. These are explicitly disallowed and remain governed exceptions if encountered in legacy artifacts.

## Grounded claims (source-aligned)

- Cognitive warfare is positioned as a broader construct than traditional info ops and includes technology-enabled influence on cognition and behavior.
- Whole-of-society collaboration, civil-military cooperation, and data sharing are core to resilience.
- Campaign targets include trust networks, identity narratives, and institutional legitimacy.

## Import / Export matrices

### Import matrix

| Input type | Required fields | Notes |
| --- | --- | --- |
| Graph edges | `source`, `target`, `relationship`, `weight` | Deterministic ordering required for reproducible outputs. |
| Social posts | `source_ref`, `timestamp_bucket`, `content_hash` | Raw content never logged; hashes only. |
| Media files | `source_ref`, `media_hash`, `provenance_ref` | Missing provenance becomes an indicator. |
| Fact-check items | `source_ref`, `claim_hash`, `rating` | Used as evidence references only. |
| Provenance attestations | `source_ref`, `provenance_ref`, `attestation_hash` | Required to clear provenance gaps. |

### Export matrix

| Output type | Description | Determinism |
| --- | --- | --- |
| Campaign bundles | Structured report of CogOps indicators + evidence references | Deterministic JSON without wall-clock timestamps. |
| Indicator lists | Coordination/provenance indicators with confidence | Deterministic ordering and bounded scores. |
| Resilience scorecards | Aggregate metrics and effect proxies | Deterministic; deltas computed from fixed windows. |
| Audit events | Governed audit trail with never-log enforcement | Redacted fields only. |

## Data model (Summit-facing)

- **Actor**: Suspected operator or proxy organization.
- **Narrative**: Claims/frames mapped to surfaces.
- **IdentitySurface**: Groups or identities targeted.
- **InstitutionSurface**: Elections, courts, media, health agencies, etc.
- **TrustNetwork**: Communities, influencers, channels.
- **Technique**: Automation, synthetic media, brigading.
- **Indicator**: Bot-likeness, coordination, provenance gaps.
- **EffectProxy**: Polarization delta, trust erosion delta.

## Evidence ID standard

- **Pattern:** `EVID-COGOPS-<sha256_12>`
- **Input:** `sha256(source_ref + "::" + selector + "::" + normalized_observation)` (first 12 hex)
- **Policy:** Evidence IDs must be deterministic and stable across runs given identical inputs.

## Governance constraints

- **Deny-by-default:** CogOps must not expose offensive tooling or optimization capabilities.
- **Never-log list:** raw message content, identifiers, emails/phones, precise location, private tokens, and media bytes.
- **Governed Exceptions:** Any legacy bypasses are recorded as governed exceptions and tracked as compliance debt until removed.

## MAESTRO alignment

- **MAESTRO Layers:** Data, Agents, Tools, Observability, Security.
- **Threats Considered:** coordination abuse, synthetic credibility, identity/institution targeting, model/feature misuse, audit log leakage.
- **Mitigations:** deterministic evidence IDs, provenance gap indicators, deny-by-default routing, audit redaction, and evidence bundles for review.

## Status

- CogOps implementation is **Deferred pending** module placement confirmation and alignment with `schemas/index_catalog.yaml`.
- This standard is active for defensive-only schema and documentation work.
