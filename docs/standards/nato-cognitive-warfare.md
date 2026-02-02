# NATO Cognitive Warfare (Defensive-Only) — Summit Interop Standard

**Escalation anchor:** Summit Readiness Assertion in
`docs/SUMMIT_READINESS_ASSERTION.md` governs readiness posture and evidence
requirements.

## Scope (Defensive-Only)

Summit models cognitive-ops campaigns as coordinated operations targeting
cognition, trust, identity, and institutions. The output is detection and
resilience analytics only. No offensive capabilities are permitted.

## Grounding Claims (Evidence-First)

- ACT framing: “Cognitive Warfare Exploratory Concept… part of the larger
  Warfare Development Agenda.”
- ACT LOE: “educates, collaborates, protects, and shapes… guidance on awareness,
  civil-military cooperation, societal resilience, and data sharing.”
- Chief Scientist report: AI + hybrid attacks manipulating public opinion;
  collaboration between civilian and defence stakeholders is essential to
  detect/mitigate/respond.
- Conceptual analysis: scope exceeds InfoOps/PsyOps/cyber; aims to alter behavior
  through cognitive effects with advanced technologies, often below armed
  conflict thresholds.
- INSS commentary: target set expands to trust networks, identity narratives,
  institutional legitimacy; measures of effectiveness shift to durable change.

## Import Matrix

| Input Type | Examples | Required Fields |
| --- | --- | --- |
| Graph edges | Actor → Narrative, Narrative → Surface | `source`, `target`, `edge_type`, `confidence` |
| Social posts | Text, links, channel IDs | `post_id`, `source_ref`, `timestamp_window`, `hash` |
| Media files | Images/video/audio | `media_hash`, `provenance_ref`, `license` |
| Fact-check items | Verified corrections | `claim_ref`, `rating`, `source_ref` |
| Provenance attestations | C2PA/SBOM-like manifests | `artifact_hash`, `issuer`, `signature` |

## Export Matrix

| Output | Purpose | Determinism |
| --- | --- | --- |
| Campaign bundles | Evidence-first analytic snapshot | Deterministic JSON |
| Indicator lists | Coordination/provenance flags | Deterministic JSON |
| Resilience scorecards | Proxy metrics for trust/identity/institutions | Deterministic JSON |
| Audit events | Governance trace | Schema-governed |

## Non-Goals (Explicit)

- Persuasion automation or targeting optimization.
- Influence execution tooling or “cognitive advantage” claims.
- Micro-targeting delivery or engagement manipulation.

## Evidence ID Convention

All outputs use deterministic evidence IDs:

```
EVID-COGOPS-<sha256_12>
```

Hash input (deterministic):

```
sha256(source_ref + "::" + selector + "::" + normalized_observation)
```

## Conceptual Data Model

- Actor (operator, proxy org)
- Narrative (claim/frame)
- IdentitySurface (group/identity targeted)
- InstitutionSurface (elections, courts, media, health agencies)
- TrustNetwork (communities, influencers, channels)
- Technique (automation, synthetic media, brigading)
- Indicator (bot-likeness, coordination, provenance gaps)
- EffectProxy (polarization delta, trust erosion delta)

## MAESTRO Security Alignment

- **MAESTRO Layers:** Data, Agents, Tools, Observability, Security.
- **Threats Considered:** prompt injection, tool abuse, evidence tampering,
  provenance forgery.
- **Mitigations:** deny-by-default capability gate, deterministic evidence IDs,
  schema validation, audit-event minimization.

## Policy Posture

- **Deny-by-default** analytics only.
- **Governed exceptions** only via governance authority files.
- **Evidence-first** outputs with explicit uncertainty boundaries.

