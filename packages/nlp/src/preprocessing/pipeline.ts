/**
 * Preprocessing pipeline for batch text processing
 */

import { TextPreprocessor } from './index';
import type { PreprocessingOptions } from '../types';

export class PreprocessingPipeline {
  private preprocessors: Array<{ name: string; fn: (text: string) => string }> = [];

  /**
   * Add a preprocessing step to the pipeline
   */
  addStep(name: string, fn: (text: string) => string): this {
    this.preprocessors.push({ name, fn });
    return this;
  }

  /**
   * Add multiple preprocessing steps
   */
  addSteps(steps: Array<{ name: string; fn: (text: string) => string }>): this {
    this.preprocessors.push(...steps);
    return this;
  }

  /**
   * Process a single text through the pipeline
   */
  process(text: string): string {
    let processed = text;
    for (const step of this.preprocessors) {
      processed = step.fn(processed);
    }
    return processed;
  }

  /**
   * Process multiple texts in batch
   */
  processBatch(texts: string[]): string[] {
    return texts.map((text) => this.process(text));
  }

  /**
   * Process texts in parallel (for large batches)
   */
  async processBatchParallel(texts: string[], batchSize: number = 100): Promise<string[]> {
    const results: string[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (text) => this.process(text))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get pipeline step names
   */
  getSteps(): string[] {
    return this.preprocessors.map((p) => p.name);
  }

  /**
   * Clear all steps
   */
  clear(): void {
    this.preprocessors = [];
  }

  /**
   * Create a standard preprocessing pipeline
   */
  static createStandard(options: PreprocessingOptions = {}): PreprocessingPipeline {
    const pipeline = new PreprocessingPipeline();
    const preprocessor = new TextPreprocessor(options);

    return pipeline
      .addStep('html-removal', (text) => text.replace(/<[^>]*>/g, ''))
      .addStep('url-removal', (text) => text.replace(/https?:\/\/\S+/gi, ''))
      .addStep('email-removal', (text) => text.replace(/[\w.-]+@[\w.-]+\.\w+/gi, ''))
      .addStep('unicode-normalization', (text) => text.normalize('NFKC'))
      .addStep('lowercase', (text) => options.lowercase !== false ? text.toLowerCase() : text)
      .addStep('whitespace-normalization', (text) => text.replace(/\s+/g, ' ').trim());
  }
}
