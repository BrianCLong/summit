import { DocumentNormalizer, RawDocument } from '../../ingest/normalizeDocument';
import { NodeBuilder, GraphNode } from '../../graphrag/nodeBuilder';
import { Chunk, Metadata } from './pipeline';
import { RAGChunker } from './chunker';
import { RAGMetadataEnricher } from './metadata';
import { RAGValidator } from './validator';
import { RAGEmbedding } from './embedding';
import { MetricsCollector, PipelineMetrics } from './metrics';

export interface PipelineResult {
  chunks: Chunk[];
  metadata: Metadata[];
  embeddings: number[][];
  graphNodes: GraphNode[];
  report: {
    status: string;
    documentsProcessed: number;
    validationPassed: boolean;
  };
  metrics: PipelineMetrics;
}

export class RAGPipelineOrchestrator {
  private normalizer = new DocumentNormalizer();
  private chunker = new RAGChunker();
  private enricher = new RAGMetadataEnricher();
  private validator = new RAGValidator();
  private embedder = new RAGEmbedding();
  private nodeBuilder = new NodeBuilder();
  private metrics = new MetricsCollector();

  async processDocuments(rawDocs: RawDocument[]): Promise<PipelineResult> {
    this.metrics.startTimer();

    let allChunks: Chunk[] = [];
    let allMetadata: Metadata[] = [];
    let allNodes: GraphNode[] = [];
    let totalTokens = 0;

    for (const [index, doc] of rawDocs.entries()) {
      const docId = `doc-${index}`;
      const normalized = this.normalizer.normalize(doc);
      const metadata = this.enricher.enrich(normalized.source, normalized.contentType, normalized.timestamp);

      allMetadata.push(metadata);

      const chunks = this.chunker.chunk(normalized.text, docId);
      allChunks = allChunks.concat(chunks);

      totalTokens += chunks.reduce((acc, chunk) => acc + (chunk.text.length / 4), 0);

      // Graph Nodes
      allNodes.push(this.nodeBuilder.buildDocumentNode(docId, metadata, normalized.timestamp));
      for (const chunk of chunks) {
        allNodes.push(this.nodeBuilder.buildChunkNode(chunk.id, docId, chunk.text));
      }
    }

    const isValid = this.validator.validate(allChunks, allMetadata);

    // In a real pipeline, we might throw or halt here. For this MWS, we document it in the report.
    let embeddings: number[][] = [];
    if (isValid) {
      embeddings = await this.embedder.embed(allChunks);
    }

    const embedTime = this.metrics.stopTimer();

    const avgTokens = allChunks.length > 0 ? totalTokens / allChunks.length : 0;
    const finalMetrics = this.metrics.generateMetrics(allChunks.length, avgTokens, embedTime);

    return {
      chunks: allChunks,
      metadata: allMetadata,
      embeddings,
      graphNodes: allNodes,
      report: {
        status: isValid ? "SUCCESS" : "VALIDATION_FAILED",
        documentsProcessed: rawDocs.length,
        validationPassed: isValid
      },
      metrics: finalMetrics
    };
  }
}
