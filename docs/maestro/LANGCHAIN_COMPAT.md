````md
# LangChain Compatibility (Server Adapters)

**Goal:** allow LangChain agents/tools to call IntelGraph GraphQL endpoints with guardrails.

## REST/GraphQL Tool Adapter (TypeScript)

```ts
// server/src/ai/langchain/IntelGraphTool.ts
import { Tool } from 'langchain/tools';
import fetch from 'node-fetch';
export class IntelGraphTool extends Tool {
  name = 'intelgraph-graphql';
  description = 'Query IntelGraph GraphQL with persisted queries only.';
  constructor(private opts: { endpoint: string; token: string }) {
    super();
  }
  async _call(input: string) {
    const res = await fetch(this.opts.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.opts.token}`,
      },
      body: JSON.stringify({
        operationName: 'pathsPolicyAware',
        extensions: { persistedQuery: { version: 1, sha256Hash: input } },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }
}
```
````

## Guardrails

- **Persisted queries only**; depth/cost guard enforced; tenant context required.
- Tool runs under **service account** with minimum scopes; audit logging enabled.

```

```
