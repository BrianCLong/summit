# Evidence Schemas (Lane 1)

This directory defines the GA-facing evidence schema contract used by the
agentic lineage rollout. The schemas are intentionally minimal and
forward-compatible so that teams can attach richer, domain-specific evidence
without breaking the gate. This aligns with the Summit Readiness Assertion
and the Law of Consistency. See `docs/SUMMIT_READINESS_ASSERTION.md` for the
authoritative readiness baseline.

## Required Files

Every evidence bundle must include the following files at the root of its
`evidence/` directory:

- `report.json` (semantic narrative)
- `metrics.json` (quantitative metrics)
- `stamp.json` (timestamps + provenance)
- `index.json` (inventory of evidence IDs → files)

## Validation

Use the CI verifier to validate an evidence bundle locally:

```bash
pnpm exec tsx .github/scripts/verify-evidence.ts --evidence-dir evidence --check schemas
pnpm exec tsx .github/scripts/verify-evidence.ts --evidence-dir evidence --check index
```

The validator enforces the following:

- Each file must conform to its schema in `docs/governance/evidence/schemas/`.
- Timestamps must live only in `stamp.json` (no timestamp fields in report,
  metrics, or index).

## Governance

All evidence schemas align with Summit governance requirements and must remain
backwards compatible. See `docs/governance/EVIDENCE.md` for the authoritative
policy context.
