# Severity Ledger and Zero-Tolerance Gate

The severity ledger records every P0/P1/P2 issue and is enforced by CI to prevent merges with unresolved risks or undocumented severity changes.

## Ledger location

- File: `governance/severity-ledger.yaml`
- Schema: `governance/severity-ledger.schema.json`
- Report artifact: `artifacts/severity-ledger-report.json`

## How to update the ledger

1. Add or update entries in `governance/severity-ledger.yaml` following the schema.
2. Each issue entry must include `id`, `title`, `severity`, `status`, `rationale`, `owner_agent`, and `introduced_in`.
3. Closed issues must set `resolved_in` to the closing commit SHA and optionally include `evidence` and `notes`.
4. Severity downgrades require explicit governance approval and rationale in the entry notes.
5. Keep `metadata.last_updated` in sync with edits.

## CI enforcement

The PR gate (`scripts/ci/pr-gate.sh`) now runs `scripts/ci/validate-severity-ledger.ts` to enforce:

- No open P0/P1/P2 entries (zero-tolerance).
- No severity downgrades or deletions compared to the base branch without closure records.
- Complete metadata for every issue.
- Report generation at `artifacts/severity-ledger-report.json` for auditability.

### Local run

```
pnpm exec tsx scripts/ci/validate-severity-ledger.ts --ledger governance/severity-ledger.yaml --base origin/main --report /tmp/severity-ledger-report.json
```

## Governance expectations

- New issues should be added as `closed` only when accompanied by evidence and a commit reference; otherwise, the gate will block the merge.
- All agent-owned work must reference the ledger entry ID in PR metadata.
- Any attempted removal of ledger entries without closure will hard fail the pipeline.
