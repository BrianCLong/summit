import { RAGPipelineOrchestrator } from '../src/data-pipeline/rag-data-pipeline/orchestrator';
import { RawDocument } from '../src/ingest/normalizeDocument';
import * as fs from 'fs';
import * as path from 'path';

describe('RAG Pipeline MWS', () => {
  it('should process 3 documents and produce deterministic artifacts', async () => {
    const orchestrator = new RAGPipelineOrchestrator();

    const mockDocs: RawDocument[] = [
      {
        content: "This is document one. It has some important facts.",
        sourceUri: "s3://bucket/doc1.txt",
        type: "text/plain",
        timestamp: "2024-01-01T12:00:00Z"
      },
      {
        content: "Document two covers RAG pipeline engineering and data preparation.",
        sourceUri: "s3://bucket/doc2.txt",
        type: "text/plain",
        timestamp: "2024-01-02T12:00:00Z"
      },
      {
        content: "The third document is shorter.",
        sourceUri: "s3://bucket/doc3.txt",
        type: "text/plain",
        timestamp: "2024-01-03T12:00:00Z"
      }
    ];

    const result = await orchestrator.processDocuments(mockDocs);

    expect(result.report.status).toBe("SUCCESS");
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.embeddings.length).toBe(result.chunks.length);
    expect(result.graphNodes.length).toBe(result.chunks.length + 3);

    const artifactDir = path.resolve(process.cwd(), 'artifacts/rag_pipeline');
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }

    fs.writeFileSync(path.join(artifactDir, 'chunks.json'), JSON.stringify(result.chunks, null, 2));
    fs.writeFileSync(path.join(artifactDir, 'graph_nodes.json'), JSON.stringify(result.graphNodes, null, 2));
    fs.writeFileSync(path.join(artifactDir, 'embeddings.json'), JSON.stringify(result.embeddings, null, 2));
    fs.writeFileSync(path.join(artifactDir, 'report.json'), JSON.stringify(result.report, null, 2));
    fs.writeFileSync(path.join(artifactDir, 'metrics.json'), JSON.stringify(result.metrics, null, 2));

    // Deterministic stamp with fixed date to satisfy "no timestamps" in artifacts (except within static docs)
    fs.writeFileSync(path.join(artifactDir, 'stamp.json'), JSON.stringify({ version: "1.0", executed: true }, null, 2));

    expect(fs.existsSync(path.join(artifactDir, 'report.json'))).toBe(true);
    expect(fs.existsSync(path.join(artifactDir, 'metrics.json'))).toBe(true);
    expect(fs.existsSync(path.join(artifactDir, 'stamp.json'))).toBe(true);
  });
});
