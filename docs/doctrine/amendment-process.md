DOCTRINE_LOCKED = true

# Amendment Process

Doctrine changes require explicit, auditable approval to prevent semantic drift.

## Steps

1. **Proposal**: Draft an amendment referencing the affected doctrine file and rationale.
2. **Custodian Review**: Custodian council reviews for alignment with the Constitution and governance mandates.
3. **Impact Analysis**: Identify required changes to runtime enforcement, CI gates, and evidence artifacts.
4. **Approval**: Supermajority approval recorded in provenance ledger with change ID and timestamp.
5. **Implementation**: Update doctrine, code, and CI simultaneously; attach evidence of verification.
6. **Audit**: Post-change audit ensures invariants remain intact and drift detectors are updated.

## Non-Bypassable Controls

- Emergency changes still require ledger entries and post-facto audit within 24 hours.
- No silent edits; all modifications must link to a ticket and evidence bundle.

## Outputs

- Updated doctrine file with change summary and version note.
- Evidence bundle containing review notes, test results, and CI gate outcomes.
