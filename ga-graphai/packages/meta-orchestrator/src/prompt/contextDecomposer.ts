import type { TokenEstimator } from './utils.js';
import { clampValue, cosineSimilarity, defaultTokenEstimator } from './utils.js';

export interface ContextSegment {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface SalientSegment extends ContextSegment {
  saliency: number;
}

export interface ContextAwareDecompositionOptions {
  embed: (text: string) => Promise<number[]> | number[];
  tokenEstimator?: TokenEstimator;
  saliencyThreshold?: number;
  adaptiveThreshold?: boolean;
  maxSegments?: number;
}

export interface DecomposedContext {
  selected: SalientSegment[];
  discarded: SalientSegment[];
  threshold: number;
  tokenEstimate: number;
}

const DEFAULT_THRESHOLD = 0.6;

export class ContextAwareDecomposer {
  private readonly embed: ContextAwareDecompositionOptions['embed'];
  private readonly tokenEstimator: TokenEstimator;
  private readonly adaptiveThreshold: boolean;
  private readonly maxSegments?: number;
  private threshold: number;

  constructor(options: ContextAwareDecompositionOptions) {
    this.embed = options.embed;
    this.tokenEstimator = options.tokenEstimator ?? defaultTokenEstimator;
    this.adaptiveThreshold = options.adaptiveThreshold ?? false;
    this.threshold = options.saliencyThreshold ?? DEFAULT_THRESHOLD;
    this.maxSegments = options.maxSegments;
  }

  async decompose(task: string, segments: ContextSegment[]): Promise<DecomposedContext> {
    const taskVector = await this.embed(task);
    const scored: SalientSegment[] = [];
    for (const segment of segments) {
      const vector = await this.embed(segment.text);
      const saliency = clampValue(cosineSimilarity(taskVector, vector), 0, 1);
      scored.push({ ...segment, saliency });
    }

    let workingThreshold = this.threshold;
    if (this.adaptiveThreshold && scored.length > 0) {
      const average = scored.reduce((acc, segment) => acc + segment.saliency, 0) / scored.length;
      workingThreshold = clampValue((average + workingThreshold) / 2);
    }

    const selected = scored
      .filter(segment => segment.saliency >= workingThreshold)
      .sort((a, b) => b.saliency - a.saliency)
      .slice(0, this.maxSegments ?? scored.length);

    const discarded = scored.filter(segment => !selected.includes(segment));
    const tokenEstimate = selected.reduce((acc, segment) => acc + this.tokenEstimator(segment.text), 0);

    this.threshold = workingThreshold;

    return { selected, discarded, threshold: workingThreshold, tokenEstimate };
  }
}
