# Summit Memory Layer

This module introduces a persistent memory layer for Summit AI chat flows. It captures user and project facts, provides semantic retrieval, and builds a structured preamble to inject relevant context into LLM calls.

## Capabilities

- **Scoped storage**: Every memory is tagged with `tenantId`, `userId`, and a `scope` (`user` or `project`).
- **Types**: `project-config`, `architecture`, `error-solution`, `preference`, `learned-pattern`, `conversation`, `profile`.
- **Redaction**: Text inside `<private>...</private>` is replaced with `[redacted]` before persistence or embedding.
- **Providers**: Local in-memory store by default, with optional Supermemory HTTPS provider when `MEMORY_PROVIDER=supermemory` and `SUPERMEMORY_API_KEY` are set.
- **Context builder**: Generates a `[SUMMIT_MEMORY]` preamble with profile facts, project knowledge, and relevant search hits (bounded to ~1,200 tokens).
- **Keyword capture**: Detects intents such as “remember”, “save this”, “don’t forget”, “note that”, or “for next time” and chooses project or user scope ("for me everywhere").

## API shape

The `MemoryService` facade provides:

- `addMemory(input)`
- `searchMemories(input)`
- `listMemories(tenantId, userId, scope?, projectId?, limit?)`
- `forgetMemory(tenantId, userId, memoryId)`
- `upsertProfileFact(tenantId, userId, scope, projectId, content, metadata?)`

`buildMemoryPreamble` formats stored memories for LLM context injection.

## Storage providers

### Local provider

- Stores memories and embeddings in-memory for fast iteration.
- Uses lightweight token-based cosine similarity with a recency boost.

### Supermemory provider (optional)

- Requires `SUPERMEMORY_API_KEY` and `MEMORY_PROVIDER=supermemory`.
- Creates documents via `POST https://api.supermemory.ai/v3/documents` and searches via `/search`.
- Containers are tagged using `summit_user_<sha256>` or `summit_project_<sha256>` derived from tenant/project identifiers.

## Usage examples

```ts
import { MemoryService, buildMemoryPreamble } from '@intelgraph/memory';

const memory = new MemoryService();
await memory.addMemory({
  tenantId: 'acme',
  userId: 'analyst-1',
  scope: 'project',
  projectId: 'workspace-42',
  type: 'project-config',
  content: 'This project uses Bun for builds',
});

const relevant = await memory.searchMemories({
  query: 'bun build command',
  tenantId: 'acme',
  userId: 'analyst-1',
  scope: 'project',
  projectId: 'workspace-42',
});

const preamble = buildMemoryPreamble({
  profileMemories: [],
  projectMemories: [],
  relevantMemories: relevant,
});
```

## Scoping and privacy rules

- Always provide `tenantId` and `userId`. Project scope additionally includes `projectId`.
- Content within `<private>...</private>` is never stored or embedded.
- Prefer project scope for chat-triggered captures unless the user explicitly asks to save it “for me everywhere”.

## Testing

Run the focused test suite for this package:

```bash
pnpm test -- --runTestsByPath packages/memory/__tests__
```
