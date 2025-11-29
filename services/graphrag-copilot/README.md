# GraphRAG Copilot

Graph-augmented retrieval with inline citations, policy-aware redaction, and Cypher preview.

## Features
- ✅ Natural language → Cypher preview
- ✅ Retrieved subgraph snippets with citations
- ✅ Policy-aware redaction at query-time
- ✅ Model card recording (model, params, timestamp)
- ✅ Blocks answers without resolvable citations

## Usage
```typescript
import { GraphRAGCopilot } from '@intelgraph/graphrag-copilot';

const copilot = new GraphRAGCopilot();
copilot.setPolicyRule('SECRET', ['ssn', 'email']);

const response = await copilot.query('Who is Alice?', [
  { id: 'n1', type: 'Person', properties: { name: 'Alice', ssn: '123-45-6789' }, policyLabel: 'SECRET' }
]);

console.log(response.answer); // "Based on 1 graph nodes: n1"
console.log(response.redactedFields); // ['ssn']
```
