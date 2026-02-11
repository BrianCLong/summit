import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { TGRAGConfig, TemporalEdge, Chunk, TimeNode } from './types.js';
import { TimeScopeResolver } from './time_scope_resolver.js';
import { RelationIndex } from './relation_index.js';
import { ChunkIndex } from './chunk_index.js';
import { DynamicSubgraph } from './dynamic_subgraph.js';
import { PPR } from './ppr.js';
import { TGRAGScorer, ScoredChunk } from './scoring.js';
import { ContextPacker } from './context_packer.js';

// Mock embedding function type
type Embedder = (text: string) => Promise<number[]>;

export class TemporalGraphRAG {
  private config: TGRAGConfig;
  private timeScopeResolver: TimeScopeResolver;
  private relationIndex: RelationIndex;
  private chunkIndex: ChunkIndex;
  private embedder: Embedder;

  constructor(
    relationIndex: RelationIndex,
    chunkIndex: ChunkIndex,
    embedder: Embedder,
    config: Partial<TGRAGConfig> = {}
  ) {
    this.relationIndex = relationIndex;
    this.chunkIndex = chunkIndex;
    this.embedder = embedder;
    this.config = {
      topKEdges: 50,
      pprIterations: 20,
      pprEpsilon: 1e-6,
      tokenBudget: 2000,
      alpha: 0.15,
      ...config
    };
    this.timeScopeResolver = new TimeScopeResolver();
  }

  async retrieveLocal(query: string): Promise<{ context: string; evidenceId: string }> {
    const startTime = Date.now();
    const queryEmbedding = await this.embedder(query);
    const scope = await this.timeScopeResolver.resolve(query);
    const topEdges = await this.relationIndex.search(queryEmbedding, this.config.topKEdges);

    if (topEdges.length === 0) {
      return { context: "No relevant temporal edges found.", evidenceId: this.generateEvidenceId(query, scope) };
    }

    const adj = DynamicSubgraph.build(topEdges, scope);
    const nodes = DynamicSubgraph.getNodes(adj);
    const pprScores = PPR.calculate(adj, nodes, this.config.alpha, this.config.pprIterations);

    const chunkIds = Array.from(new Set(topEdges.flatMap(e => e.chunkIds)));
    const chunks = await this.chunkIndex.getChunks(chunkIds);

    const scoredChunks: ScoredChunk[] = chunks.map(chunk => ({
      ...chunk,
      score: TGRAGScorer.scoreChunk(chunk, topEdges, pprScores, scope)
    }));

    const packedChunks = ContextPacker.pack(scoredChunks, this.config.tokenBudget);
    const context = ContextPacker.serialize(packedChunks);
    const duration = Date.now() - startTime;
    const evidenceId = this.generateEvidenceId(query, scope);

    await this.emitArtifacts(evidenceId, query, scope, packedChunks, duration);

    return { context, evidenceId };
  }

  private generateEvidenceId(query: string, scope: any): string {
    // Deterministic ID without current date
    const hashInput = `${query}-${JSON.stringify(scope)}`;
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 10);
    return `EVID-TGRAG-${hash.toUpperCase()}`;
  }

  private async emitArtifacts(
    evidenceId: string,
    query: string,
    scope: any,
    results: ScoredChunk[],
    duration: number
  ) {
    const artifactDir = path.join('artifacts', evidenceId);
    if (!fs.existsSync(artifactDir)) {
      await fs.promises.mkdir(artifactDir, { recursive: true });
    }

    const report = {
      evidenceId,
      query,
      timeScope: scope,
      results: results.map(r => ({ chunkId: r.chunkId, score: r.score }))
    };

    const metrics = {
      durationMs: duration,
      resultCount: results.length,
      totalTokens: results.reduce((sum, r) => sum + r.tokenCount, 0)
    };

    const reportJson = JSON.stringify(report, Object.keys(report).sort(), 2);
    await fs.promises.writeFile(path.join(artifactDir, 'report.json'), reportJson);
    await fs.promises.writeFile(path.join(artifactDir, 'metrics.json'), JSON.stringify(metrics, Object.keys(metrics).sort(), 2));

    const stamp = {
      hash: crypto.createHash('sha256').update(reportJson).digest('hex'),
      version: "1.0.0"
    };
    await fs.promises.writeFile(path.join(artifactDir, 'stamp.json'), JSON.stringify(stamp, null, 2));
  }
}
