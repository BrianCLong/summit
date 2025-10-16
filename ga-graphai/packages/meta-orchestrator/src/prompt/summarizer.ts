import type { TokenEstimator } from './utils.js';
import { defaultTokenEstimator } from './utils.js';

export interface SummarizationLayer {
  maxTokens: number;
  summarizer: (text: string, layer: number) => Promise<string> | string;
}

export interface HierarchicalSummarizerOptions {
  layers: SummarizationLayer[];
  tokenEstimator?: TokenEstimator;
}

export interface HierarchicalSummaryResult {
  layers: string[];
  finalSummary: string;
}

export class HierarchicalSummarizer {
  private readonly layers: SummarizationLayer[];
  private readonly tokenEstimator: TokenEstimator;

  constructor(options: HierarchicalSummarizerOptions) {
    this.layers = options.layers;
    this.tokenEstimator = options.tokenEstimator ?? defaultTokenEstimator;
  }

  async summarize(text: string): Promise<HierarchicalSummaryResult> {
    let working = text;
    const summaries: string[] = [];

    for (let index = 0; index < this.layers.length; index += 1) {
      const layer = this.layers[index];
      if (this.tokenEstimator(working) <= layer.maxTokens) {
        summaries.push(working);
        return { layers: summaries, finalSummary: working };
      }
      working = await layer.summarizer(working, index);
      summaries.push(working);
    }

    const finalSummary = summaries.at(-1) ?? working;
    return { layers: summaries, finalSummary };
  }
}
