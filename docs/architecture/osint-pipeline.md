# OSINT Pipeline Architecture

This pipeline is a human-steered, evidence-first system that captures OSINT findings with
provenance, performs optional fusion/triage/verification steps, and emits governed artifacts. The
design is aligned with the Summit Readiness Assertion (`docs/SUMMIT_READINESS_ASSERTION.md`).

## Flow

1. **Playbook**
   - Human-defined inputs, sources, and stop conditions.
   - Policies specify ToS notes, rate limits, and PII handling.

2. **Collectors**
   - Adapter interface returns normalized findings with provenance.
   - Network access gated by `OSINT_ALLOW_NETWORK`.

3. **Normalization**
   - Standardized entity + attributes + provenance schema.
   - Evidence references point to immutable raw captures.

4. **Evidence & Reporting**
   - Artifacts: `report.json`, `metrics.json`, `stamp.json`, `evidence/index.json`.
   - CI gate validates structural requirements and provenance completeness.

5. **Optional (Feature-Flagged)**
   - Fusion and corroboration.
   - Triage scoring and analyst briefs.
   - Scheduled runs and delta alerts.

## Evidence IDs

Evidence IDs must use the canonical format `EVD-OSINT-<AREA>-<NNN>` and map to immutable artifacts
in `evidence/index.json`.
