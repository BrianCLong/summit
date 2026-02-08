# OSINT Hallucination Mitigation Standard

## Purpose

Make hallucination resistance a first-class OSINT design goal by enforcing
traceable, checkable, degradable-to-unknown facts with deterministic evidence
artifacts.

## Non-Negotiables

1. **Provenance mandatory**: every assertion carries explicit source metadata.
2. **Degradable-to-unknown**: missing provenance downgrades facts to `unknown`.
3. **Retrieval-first**: collect raw → retrieval selects → summarizer references
   retrieved evidence IDs only.
4. **Extractive-first**: key fields (names, dates, IPs, IOCs) must prefer
   extractive resolution prior to LLM paraphrase.
5. **Two-source promotion**: `confirmed` requires ≥2 independent sources.
6. **Verifier required**: final report is audited for unsupported claims.
7. **Human sign-off**: final assessment requires human approval.

## Required Fact & Evidence Fields

Each fact MUST include provenance fields:

- `source_url`
- `source_type`
- `collected_at`
- `collector_tool`
- `verdict_confidence`

Evidence IDs are deterministic:

```
EVID:<source_type>:<sha256(normalized_source_url)>:<sha256(snippet_canonical)>
```

## Deterministic Artifacts

Artifacts must be produced per run with no unstable timestamps inside the
deterministic files:

- `artifacts/osint/<run_id>/raw/…`
- `artifacts/osint/<run_id>/retrieved.json`
- `artifacts/osint/<run_id>/facts.jsonl`
- `artifacts/osint/<run_id>/report.md`
- `artifacts/osint/<run_id>/verification.json`
- `artifacts/osint/<run_id>/metrics.json`

## Import / Export Matrix

**Imports**

- Collector raw blobs (JSON/HTML/text)
- External tool ID + version in `collector_tool`

**Exports**

- `retrieved.json`: evidence selection list
- `facts.jsonl`: fact records with provenance
- `verification.json`: verifier outputs
- `report.md`: narrative with inline Evidence IDs

**Non-goals**

- No automatic truth adjudication without provenance
- No single-source confirmation
- No silent backfilling of missing fields

## MAESTRO Security Alignment

**MAESTRO Layers:** Data, Agents, Tools, Observability, Security.  
**Threats Considered:** prompt injection, unsupported claims, single-source
misinformation, evidence tampering.  
**Mitigations:** provenance-required facts, deterministic Evidence IDs, two-source
promotion gate, verifier audit, human approval.

## References

- Summit Readiness Assertion
- MAESTRO Threat Modeling Framework
