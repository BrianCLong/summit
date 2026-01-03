# Memory Blocks in Summit

The Memory Blocks subsystem introduces durable, labeled units of memory that can be shared across agents and compiled into LLM prompts. Blocks are persisted with a stable `block_id` in PostgreSQL, enforce size limits, and keep an audit history of edits.

## Data model

- `memory_blocks`: stores block metadata (tenant, owner, label, scope, read-only flag, size limit, timestamps).
- `memory_block_shares`: associates blocks with additional agents and permissions (`read`, `write`, `read_write`).
- `memory_block_revisions`: append-only audit of edits, including actor and request IDs.

## Service layer

`server/src/services/MemoryBlockService.ts` exposes:

- `createBlock` for provisioning new blocks (e.g., `human`, `persona`, `research_state`).
- `getBlocksForAgent` and `compilePromptSection` to deterministically format the active memory section for inference.
- `replaceBlockValue` (the "rethink" tool) with read-only and size-limit enforcement.
- `upsertShare` to make blocks available to collaborating agents.
- `reflectAndUpdateBlocks` to support background/sleep-time updates that summarize deltas into configured blocks.

Prompt compilation uses a stable bullet format and trims oversized values to stay within each block's declared limit.

## Background worker

`scripts/memory-block-reflector.ts` is a utility worker that can be triggered on a schedule or queue event:

```bash
TENANT_ID=acme AGENT_ID=planner ACTOR_ID=planner \
MEMORY_BLOCK_LABELS=research_state,human \
MEMORY_DELTA="Reviewed logs and extracted next steps" \
node --loader ts-node/esm scripts/memory-block-reflector.ts
```

This worker will fetch the target blocks for the agent, append a reflection entry within the size limit, and record an audit revision.

## Usage examples

- **Personalized assistant**: create a `human` block for user preferences and a `persona` block for the agent's behavior. Use `compilePromptSection` before inference to inject both blocks.
- **Long-running research**: maintain a `research_state` block that background workers update after each session via `reflectAndUpdateBlocks`.
- **Team collaboration**: share a `knowledge` block with `scope=SHARED` and grant additional agents `read_write` access with `upsertShare`.

## Observability

All edits are recorded in `memory_block_revisions`. Metrics and logs can be emitted by wrapping service calls; the background worker logs updated block counts for monitoring cron health.
