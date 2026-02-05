import { getBackendCapabilities } from '../capabilities.js';

describe('Backend capabilities snapshot', () => {
  it('matches the expected capability matrix', () => {
    const capabilities = getBackendCapabilities();
    expect(capabilities).toMatchInlineSnapshot(`
[
  {
    "agentIntegrations": false,
    "available": true,
    "graphTraversal": true,
    "graphragManaged": false,
    "graphragToolkit": false,
    "hybridSearchNative": false,
    "id": "neo4j",
    "label": "Neo4j",
    "licensing": "commercial",
    "notes": [
      "Graph traversal is available.",
      "Hybrid retrieval requires external vector store.",
      "Community Edition is GPLv3; Enterprise requires a commercial license.",
    ],
    "vectorSearch": false,
  },
  {
    "agentIntegrations": true,
    "available": false,
    "graphTraversal": true,
    "graphragManaged": true,
    "graphragToolkit": true,
    "hybridSearchNative": false,
    "id": "neptuneManaged",
    "label": "AWS Neptune (Managed GraphRAG)",
    "licensing": "managed",
    "notes": [
      "Managed GraphRAG via Bedrock Knowledge Bases.",
      "Adapter is feature-flagged and requires explicit config.",
    ],
    "vectorSearch": true,
  },
  {
    "agentIntegrations": false,
    "available": true,
    "graphTraversal": true,
    "graphragManaged": false,
    "graphragToolkit": false,
    "hybridSearchNative": true,
    "id": "tigergraph",
    "label": "TigerGraph",
    "licensing": "commercial",
    "notes": [
      "Native hybrid search combines graph and vector retrieval.",
    ],
    "vectorSearch": true,
  },
]
`);
  });
});
