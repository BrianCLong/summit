/**
 * Filter transformer - filters records based on conditions
 */

import { BaseTransformer } from '../engine/ITransformer';
import { get } from 'lodash';

export interface FilterConfig {
  condition: string | ((record: any) => boolean);
  invert?: boolean; // If true, keeps records that DON'T match
}

export class FilterTransformer extends BaseTransformer {
  constructor() {
    super('filter');
  }

  async transform(record: any, config: FilterConfig): Promise<any> {
    let matches: boolean;

    if (typeof config.condition === 'function') {
      matches = config.condition(record);
    } else {
      matches = this.evaluateCondition(config.condition, record);
    }

    // Apply invert logic
    if (config.invert) {
      matches = !matches;
    }

    // Return record if it matches, null otherwise
    return matches ? record : null;
  }

  async transformBatch(records: any[], config: FilterConfig): Promise<any[]> {
    const results: any[] = [];
    for (const record of records) {
      const result = await this.transform(record, config);
      if (result !== null) {
        results.push(result);
      }
    }
    return results;
  }

  private evaluateCondition(condition: string, record: any): boolean {
    try {
      const func = new Function('record', `with(record) { return ${condition}; }`);
      return func(record);
    } catch (error) {
      throw new Error(`Failed to evaluate condition: ${condition}`);
    }
  }

  async validate(config: FilterConfig): Promise<boolean> {
    if (!config.condition) {
      throw new Error('Filter condition is required');
    }
    return true;
  }
}
