import { TemporalGraphRAG } from '../../packages/intelgraph/graphrag/temporal/tg_rag.js';
import { RelationIndex } from '../../packages/intelgraph/graphrag/temporal/relation_index.js';
import { ChunkIndex } from '../../packages/intelgraph/graphrag/temporal/chunk_index.js';

async function runEval() {
  console.log("Starting TG-RAG Evaluation...");

  const relationIndex = new RelationIndex([
    { v1: "Company A", v2: "100M", rel: "has_revenue", timestamp: "2023-06-01T00:00:00Z", chunkIds: ["c1"] },
    { v1: "Company A", v2: "150M", rel: "has_revenue", timestamp: "2024-06-01T00:00:00Z", chunkIds: ["c2"] },
    { v1: "IntelGraph", v2: "Alice", rel: "held_by", timestamp: "2024-01-01T00:00:00Z", chunkIds: ["c3"] }
  ]);

  const chunkIndex = new ChunkIndex([
    { chunkId: "c1", text: "In 2023, Company A reported 100M revenue.", tokenCount: 10, edgeIds: ["Company A-has_revenue-100M-2023-06-01T00:00:00Z"] },
    { chunkId: "c2", text: "In 2024, Company A reported 150M revenue.", tokenCount: 10, edgeIds: ["Company A-has_revenue-150M-2024-06-01T00:00:00Z"] },
    { chunkId: "c3", text: "Alice was the CEO of IntelGraph in 2024.", tokenCount: 10, edgeIds: ["IntelGraph-held_by-Alice-2024-01-01T00:00:00Z"] }
  ]);

  // Mock embedder
  const embedder = async (text: string) => new Array(1536).fill(0.1);

  const tgrag = new TemporalGraphRAG(relationIndex, chunkIndex, embedder);

  const queries = [
    { query: "What was the revenue of Company A in 2023?", expectedChunk: "c1" },
    { query: "Who was the CEO of IntelGraph in 2024?", expectedChunk: "c3" },
    { query: "2025-10-27 events", expectedChunk: null } // testing granular date parsing
  ];

  for (const { query, expectedChunk } of queries) {
    console.log(`\nQuery: ${query}`);
    const result = await tgrag.retrieveLocal(query);
    console.log(`Evidence ID: ${result.evidenceId}`);
    console.log(`Context:\n${result.context}`);

    if (expectedChunk) {
      if (result.context.includes(`[Chunk ${expectedChunk}]`) && result.context.indexOf(`(Score: 0.0000)`) === -1) {
         // This is a bit naive but okay for a simple check
         console.log(`✅ Time-consistency check passed for ${expectedChunk}.`);
      } else {
         console.log(`❌ Time-consistency check failed for ${expectedChunk}.`);
      }
    } else {
      console.log("✅ Granular query executed.");
    }
  }
}

runEval().catch(err => {
  console.error(err);
  process.exit(1);
});
