# Context Engineering Core (CEP Core)

CEP Core provides deterministic context budgeting, eviction, compression, and
manifesting for Maestro. It treats context as a managed resource with explicit
stream budgets, provenance tracking, and auditable decisions.

## API Surface

```ts
import { buildContext, updateContextOnToolResult } from '@summit/context-engineering';

const { messages, manifest, metrics } = buildContext({
  system: [...],
  user: [...],
  history: [...],
  toolOutputs: [...],
  policies: { ... },
});
```

## Manifest Guarantees

Every build emits a manifest that lists:

- Stream membership
- Source + provenance
- Policy labels + sensitivity tags
- Token cost, TTL, compression state
- Eviction events with reasons
- Schema version for validation

The schema is published via `ContextManifestSchema` and uses version `1.0.0`.
Use `validateManifest` to ensure emitted manifests conform to the contract
before bundling evidence.

## Local Profiling

```bash
pnpm cep:profile
```

This prints token utilization, eviction frequency, and top token sinks for a
sample run.
