import type { SimilarityFunction } from './types.js';

export interface CandidateGenerationOptions {
  prompt: string;
  variants: number;
  generator: (prompt: string, variant: number) => Promise<string> | string;
  embed: (text: string) => Promise<number[]> | number[];
}

export interface ConsensusCluster {
  centroid: number[];
  members: string[];
}

export interface ConsensusResult {
  consensus: string;
  clusters: ConsensusCluster[];
}

const DEFAULT_SIMILARITY_THRESHOLD = 0.85;

export class SelfConsensusEngine {
  private readonly similarity: SimilarityFunction;
  private readonly similarityThreshold: number;

  constructor(similarity: SimilarityFunction, threshold = DEFAULT_SIMILARITY_THRESHOLD) {
    this.similarity = similarity;
    this.similarityThreshold = threshold;
  }

  async generateConsensus(options: CandidateGenerationOptions): Promise<ConsensusResult> {
    const embeddings: number[][] = [];
    const outputs: string[] = [];

    for (let index = 0; index < options.variants; index += 1) {
      const text = await options.generator(options.prompt, index);
      outputs.push(text);
      embeddings.push(await options.embed(text));
    }

    const clusters: ConsensusCluster[] = [];
    for (let index = 0; index < outputs.length; index += 1) {
      const embedding = embeddings[index];
      const text = outputs[index];
      let assigned = false;
      for (const cluster of clusters) {
        const similarity = this.similarity(cluster.centroid, embedding);
        if (similarity >= this.similarityThreshold) {
          cluster.members.push(text);
          cluster.centroid = this.recalculateCentroid(cluster.centroid, embedding, cluster.members.length);
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        clusters.push({ centroid: embedding.slice(), members: [text] });
      }
    }

    const bestCluster = clusters.reduce((largest, cluster) =>
      cluster.members.length > largest.members.length ? cluster : largest
    );
    const consensus = bestCluster.members[0] ?? '';

    return { consensus, clusters };
  }

  private recalculateCentroid(existing: number[], incoming: number[], count: number): number[] {
    const length = Math.min(existing.length, incoming.length);
    const result: number[] = [];
    for (let index = 0; index < length; index += 1) {
      const updated = (existing[index] * (count - 1) + incoming[index]) / count;
      result.push(updated);
    }
    return result;
  }
}
