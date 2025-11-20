/**
 * Transformer interface
 */

export interface ITransformer {
  /**
   * Get transformer name
   */
  getName(): string;

  /**
   * Transform a single record
   */
  transform(record: any, config?: any): Promise<any>;

  /**
   * Transform a batch of records (optional optimization)
   */
  transformBatch?(records: any[], config?: any): Promise<any[]>;

  /**
   * Validate transformer configuration
   */
  validate(config: any): Promise<boolean>;
}

/**
 * Base transformer implementation
 */
export abstract class BaseTransformer implements ITransformer {
  constructor(protected name: string) {}

  getName(): string {
    return this.name;
  }

  abstract transform(record: any, config?: any): Promise<any>;

  async transformBatch(records: any[], config?: any): Promise<any[]> {
    // Default implementation: transform each record individually
    const results: any[] = [];
    for (const record of records) {
      results.push(await this.transform(record, config));
    }
    return results;
  }

  async validate(config: any): Promise<boolean> {
    return true;
  }
}
