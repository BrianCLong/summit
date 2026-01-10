import { newDb } from 'pg-mem';
import { PgVectorStore } from '../core/vectorStore.js';
import { RAGOrchestrator } from '../core/orchestrator.js';

function setupDb() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  pool.query(
    `CREATE TABLE rag_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      content TEXT NOT NULL,
      position INT NOT NULL,
      start_offset INT NOT NULL,
      end_offset INT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      embedding_array DOUBLE PRECISION[] NOT NULL DEFAULT '{}',
      workspace_id TEXT,
      corpus_version TEXT
    );`
  );
  return pool;
}

describe('Agentic RAG integration', () => {
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterAll(() => {
    (console.log as jest.Mock).mockRestore();
  });

  it('ingests and answers with citations', async () => {
    const pool = setupDb();
    const vectorStore = new PgVectorStore({ pool });
    const orchestrator = new RAGOrchestrator({ vectorStore });

    await vectorStore.upsert(
      [
        {
          id: 'chunk-1',
          documentId: 'sample-doc',
          content: 'sample document with number 5',
          position: 0,
          startOffset: 0,
          endOffset: 10,
          metadata: { title: 'Sample' },
          embedding: [0.1, 0.2, 0.3],
        },
      ],
      'ws1',
      'v1'
    );

    const response = await orchestrator.answer({ query: 'sample', topK: 2, useHyde: false, useTools: true });
    expect(response.citations.length).toBeGreaterThan(0);
    expect(response.answer).toContain('sample');
  });
});
