/**
 * Aggregate transformer - aggregates records by key
 */

import { BaseTransformer } from '../engine/ITransformer';
import { get } from 'lodash';

export interface AggregateConfig {
  groupBy: string | string[];
  aggregations: Array<{
    field: string;
    operation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'first' | 'last' | 'collect';
    outputField: string;
  }>;
}

export class AggregateTransformer extends BaseTransformer {
  constructor() {
    super('aggregate');
  }

  async transform(record: any, config: AggregateConfig): Promise<any> {
    throw new Error('AggregateTransformer must be used with transformBatch');
  }

  async transformBatch(records: any[], config: AggregateConfig): Promise<any[]> {
    const groups = new Map<string, any[]>();

    // Group records
    for (const record of records) {
      const key = this.getGroupKey(record, config.groupBy);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    }

    // Aggregate each group
    const results: any[] = [];
    for (const [key, groupRecords] of groups) {
      const aggregated = this.aggregateGroup(groupRecords, config);
      results.push(aggregated);
    }

    return results;
  }

  private getGroupKey(record: any, groupBy: string | string[]): string {
    const fields = Array.isArray(groupBy) ? groupBy : [groupBy];
    const values = fields.map(field => get(record, field));
    return JSON.stringify(values);
  }

  private aggregateGroup(records: any[], config: AggregateConfig): any {
    const result: any = {};

    // Add group by fields to result
    const groupByFields = Array.isArray(config.groupBy) ? config.groupBy : [config.groupBy];
    for (const field of groupByFields) {
      result[field] = get(records[0], field);
    }

    // Perform aggregations
    for (const agg of config.aggregations) {
      const values = records.map(r => get(r, agg.field)).filter(v => v !== undefined && v !== null);

      switch (agg.operation) {
        case 'sum':
          result[agg.outputField] = values.reduce((sum, val) => sum + Number(val), 0);
          break;
        case 'avg':
          result[agg.outputField] = values.reduce((sum, val) => sum + Number(val), 0) / values.length;
          break;
        case 'min':
          result[agg.outputField] = Math.min(...values.map(Number));
          break;
        case 'max':
          result[agg.outputField] = Math.max(...values.map(Number));
          break;
        case 'count':
          result[agg.outputField] = values.length;
          break;
        case 'first':
          result[agg.outputField] = values[0];
          break;
        case 'last':
          result[agg.outputField] = values[values.length - 1];
          break;
        case 'collect':
          result[agg.outputField] = values;
          break;
      }
    }

    return result;
  }

  async validate(config: AggregateConfig): Promise<boolean> {
    if (!config.groupBy) {
      throw new Error('groupBy is required');
    }
    if (!config.aggregations || !Array.isArray(config.aggregations)) {
      throw new Error('aggregations must be an array');
    }
    return true;
  }
}
