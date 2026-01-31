Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Evidence ID Consistency Gate

The Evidence ID Consistency gate ensures that all `Evidence-IDs` references in governance documentation have corresponding entries in the evidence registry, maintaining traceability and completeness of governance artifacts.

## Purpose

This gate validates that:

- All Evidence-IDs in governance documents follow the correct format
- Each referenced Evidence-ID has a corresponding mapping in the evidence registry
- Governance documents contain properly formatted Evidence-IDs headers
- Evidence-IDs are not malformed or improperly structured

## Configuration

The gate is configured via:

- `docs/governance/EVIDENCE_ID_POLICY.yml` - Policy definitions and validation rules
- `evidence/map.yml` - Registry mapping Evidence-IDs to their locations

## Execution

Run locally:

```bash
npm run ci:evidence-id-consistency
```

The gate produces artifacts in:

- `artifacts/governance/evidence-id-consistency/<sha>/report.json` - Deterministic JSON report (content-only, no runtime timestamps)
- `artifacts/governance/evidence-id-consistency/<sha>/report.md` - Human-readable markdown report
- `artifacts/governance/evidence-id-consistency/<sha>/stamp.json` - Runtime metadata including timestamp, exit status, and generator info

Note: To ensure build determinism, timestamps are included in `stamp.json` only and not in the main `report.json` file.

## Policy Rules

- Evidence-IDs must follow format: `/^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*$/`
- Maximum of 50 Evidence-IDs per document
- All Evidence-IDs must exist in the evidence registry (except "none")
- Documents must have properly formatted Evidence-IDs header

## Failure Conditions

The gate fails when:

- Invalid Evidence-ID format is detected
- Referenced Evidence-ID has no mapping in registry
- Document contains too many Evidence-IDs (>50)
- File size exceeds limits (10MB)
