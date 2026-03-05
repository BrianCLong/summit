# repo_assumptions.md

## Verified vs Assumed (LangChain Agent Builder Memory Item)

| Area | Status | Evidence / Validation Method |
| --- | --- | --- |
| CI governance policy exists at `docs/ci/REQUIRED_CHECKS_POLICY.yml` | Verified | File present in repository.
| Branch-protection drift documentation exists at `docs/ci/BRANCH_PROTECTION_DRIFT.md` | Verified | File present in repository.
| Repository positions itself as agentic + graph/vector/provenance platform | Verified | Root `README.md` language and architecture sections.
| Memory runtime module path (`server/`, `packages/agents/`, `agentic/`, etc.) | Assumed | Validate by locating active runtime imports and wiring points.
| Existing evidence/provenance schema + Evidence ID conventions | Assumed | Validate against canonical schemas and ledger docs.
| Tool registry format + MCP integration path | Assumed | Validate against governance tool registry and runtime loader.
| OPA policy root and test workflow wiring | Assumed (likely `policy/`) | Validate workflow triggers and `opa` test scripts.
| Required-check context names vs policy expectations | Assumed | Validate GitHub required checks against policy extraction scripts.

## Validation Checklist

1. Map runtime ownership for memory retrieval/write paths.
2. Confirm canonical Evidence ID format and provenance schema references.
3. Confirm tool registry contract and any MCP adapter contracts.
4. Confirm OPA policy location, package naming, and CI invocation.
5. Diff expected check names from policy against actual branch protection contexts.

## Must-Not-Touch (Until Validation Completes)

- `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- `docs/ci/BRANCH_PROTECTION_DRIFT.md`
- Governance-linked extraction/audit scripts (for example: required-check extraction scripts)

## Notes

This file is the gating artifact for PR1. Assumptions remain intentionally constrained until each item is validated with file-backed evidence.
