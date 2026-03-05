## Summary

Initialize the `longhorizon` agent module within the `agents/` workspace. This PR establishes the baseline structure, schema, and initial fixtures for the LongHorizon PR-Chains evaluation track, grounded in the repo's governance and CI invariants.

## Risk & Surface (Required)

**Risk Level**:

- [x] `risk:medium` (Feature flags, backward-compatible changes)

**Surface Area**:

- [x] `area:ci`
- [x] `area:policy`
- [x] `area:docs`

## Assumption Ledger

- **Assumptions**: The `agents/*` directory is the canonical location for workspace-resident agents. PR-chains can be treated as inert JSONL data events.
- **Ambiguities**: The exact path of the evidence map file (referenced as `evidence/map.yml` in policy) needs final verification.
- **Tradeoffs**: Initial landing in `agents/` rather than a top-level taxonomy to minimize disruption.
- **Stop Condition**: Failure to pass deterministic byte-compare on artifact outputs.

## Execution Governor & Customer Impact

- [x] **Single Product Mode**: Respects active product.
- [x] **Frozen Code**: Feature flag `LONGHORIZON_PR_CHAINS_ENABLED` defaults to `false`.
- **Customer Impact**: None (feature-flagged OFF). Provides the foundation for long-horizon agent evaluation.
- **Rollback Plan**: Revert commit; the module is isolated in `agents/longhorizon`.

## Evidence Bundle

- [x] **Tests**: `agents/longhorizon/src/schema_validation.test.ts` implemented and passing.
- [ ] **Screenshots**: N/A
- [x] **Evidence Generated**: `LONGHORIZON.REPO_ASSUMPTIONS.V1` documented in `agents/longhorizon/repo_assumptions.md`.
- [ ] **Prompt Hash**: No prompts introduced in this PR.

## Security Impact

- [x] **Security Impact**: No. This PR only introduces schemas and fixtures. No auth, PII, or crypto touched.

## Green CI Contract Checklist

- [x] **Lint**: Ran `pnpm lint` and fixed Markdown errors.
- [x] **Tests**: Ran unit tests for schema validation.
- [x] **Determinism**: Schema enforces stable key ordering for PR-chain artifacts.
- [x] **Evidence**: Integrated with repo assumptions and governance artifacts.

## CI & Merge Train Rules

- [x] Behavior changes (CI fixes) are included to unblock the PR stack.

## Verification

- [x] Automated Test: Schema validation test.
- [x] Manual Verification: Verified file structure and pnpm workspace integration.

## S-AOS Governance Compliance

- **Diff Budget**: Within limits for a module initialization PR.
- **Success Criteria**: Schema validation passes; CI unblocked; Repo Assumptions verified.
- **Evidence Summary**: Initial grounding evidence captured in `agents/longhorizon/repo_assumptions.md`.

<!-- AGENT-METADATA:START -->
{
  "promptId": "longhorizon-init-v1",
  "taskId": "LONGHORIZON-AGENT-INIT",
  "tags": ["longhorizon", "initialization", "schema", "governance"]
}
<!-- AGENT-METADATA:END -->
