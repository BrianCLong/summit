# LangChain Agent Builder Memory — Summit Standard Mapping

## Scope
This standard captures Summit's interoperable memory contract derived from the LangChain Agent Builder memory model, with Summit-specific governance additions for OSINT and provenance controls.

## Grounded Inputs
- LangChain Agent Builder memory implementation: file-based memory primitives and schema validation behavior.
- LangChain memory guidance: compaction/generalization and reflection roadmap.
- OpenPlanter persistence model: workspace/session persistence and resume semantics.
- AutoDev execution posture: Docker-constrained tool execution with explicit allow/deny command controls.

## Import/Export Matrix

| Artifact | Import | Export | Notes |
| --- | --- | --- | --- |
| Skills (frontmatter + markdown body) | Yes | Yes | Schema-gated before write.
| Tool registries (JSON schema) | Yes | Yes | Tier-scoped allowlists.
| Episode events (JSONL) | Yes | Yes | Append-only with deterministic IDs.
| Claim/Evidence/Source bundle | Assumption pending format validation | Yes (planned) | Summit original mapping to IntelGraph contract.
| Provenance ledger entries | Assumption pending interface validation | Yes (planned) | Summit original governance hook.

## Summit Positioning Constraints
- Diffable, policy-governed memory contract is required.
- Case-tier memory isolation is Summit original and non-optional for OSINT workloads.
- Proposal-first writes are required for governed scopes.
- Retrieved memory is untrusted input and cannot override tool/policy gates.

## Non-Goals
- No ungoverned general-purpose personal memory store.
- No automatic writes to org/case memory without explicit approval.
- No direct indexing of raw untrusted artifacts into retrieval memory.

## Status Labels
- **Grounded**: Behavior backed by listed external sources.
- **Summit original**: Controls and tiers added by Summit governance.
- **Assumption**: Interface/path contract not yet validated in repo runtime.
