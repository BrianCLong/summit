# NATO Cognitive Warfare (Defensive) — Summit Mapping Standard

## Scope
This standard governs **defensive-only** cognitive-operations analytics in Summit. It codifies
import/export expectations, evidence ID conventions, and non-goals. It is aligned to
`docs/SUMMIT_READINESS_ASSERTION.md` and Summit governance controls.

## Import Matrix (Accepted Inputs)
| Input Type | Description | Required Fields |
| --- | --- | --- |
| Graph edges | Relationships between actors, narratives, surfaces, and techniques | `source_ref`, `edge_type`, `confidence` |
| Social posts | Public OSINT posts or public statements | `source_ref`, `selector`, `normalized_observation` |
| Media files | Media hashes and provenance attestations | `source_ref`, `hash`, `provenance_ref` |
| Fact-check items | Claims and verification outcomes | `source_ref`, `claim_id`, `verdict` |
| Provenance attestations | Evidence of origin/chain of custody | `source_ref`, `attestation_id`, `issuer` |

## Export Matrix (Generated Outputs)
| Output | Description | Determinism |
| --- | --- | --- |
| Campaign bundle (`report.json`) | Findings, indicators, and evidence references | Deterministic, no wall-clock timestamps |
| Indicator list (`metrics.json`) | Scores, aggregates, and confidence | Deterministic, no wall-clock timestamps |
| Resilience scorecard | Proxy metrics for trust/polarization/decision disruption | Deterministic, bounded |
| Audit events | Governance-only, redacted entries | Deterministic event structure |

## Evidence ID Convention
Evidence IDs must follow:

```
EVID-COGOPS-<sha256_12>
```

Where `<sha256_12>` is the first 12 hex chars of:

```
sha256(source_ref + "::" + selector + "::" + normalized_observation)
```

## Non-Goals (Explicit Denials)
- Persuasion, targeting optimization, or influence execution.
- “Cognitive advantage” claims.
- Any offensive or micro-targeting automation.

## Defensive Posture
- **Deny-by-default**: `COGOPS_ENABLED=false` unless explicitly enabled by governance.
- **Evidence-first**: findings require traceable evidence IDs and provenance.
- **Auditability**: all outputs map to evidence bundles and policy controls.
