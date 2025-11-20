/**
 * Transformer registry for managing transformers
 */

import { ITransformer } from './ITransformer';
import { TransformationType } from '@intelgraph/data-integration';

/**
 * Registry for transformers
 */
export class TransformerRegistry {
  private transformers: Map<string, ITransformer> = new Map();

  /**
   * Register a transformer
   */
  register(type: string, transformer: ITransformer): void {
    this.transformers.set(type, transformer);
  }

  /**
   * Get a transformer by type
   */
  get(type: string | TransformationType): ITransformer | undefined {
    return this.transformers.get(type.toString());
  }

  /**
   * Check if transformer exists
   */
  has(type: string | TransformationType): boolean {
    return this.transformers.has(type.toString());
  }

  /**
   * Unregister a transformer
   */
  unregister(type: string): void {
    this.transformers.delete(type);
  }

  /**
   * Get all registered transformer types
   */
  getTypes(): string[] {
    return Array.from(this.transformers.keys());
  }

  /**
   * Clear all transformers
   */
  clear(): void {
    this.transformers.clear();
  }
}
