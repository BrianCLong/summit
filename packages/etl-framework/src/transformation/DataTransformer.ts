/**
 * Data transformation engine
 */

import { Logger } from 'winston';
import { TransformationConfig, Transformation } from '@intelgraph/data-integration/src/types';

export class DataTransformer {
  private config: TransformationConfig | undefined;
  private logger: Logger;

  constructor(config: TransformationConfig | undefined, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Transform data according to configured transformations
   */
  async transform(data: any[]): Promise<any[]> {
    if (!this.config || !this.config.transformations || this.config.transformations.length === 0) {
      return data;
    }

    let transformedData = [...data];

    // Apply transformations in order
    const sortedTransformations = [...this.config.transformations].sort((a, b) => a.order - b.order);

    for (const transformation of sortedTransformations) {
      this.logger.debug(`Applying transformation: ${transformation.name}`);
      transformedData = await this.applyTransformation(transformedData, transformation);
    }

    return transformedData;
  }

  private async applyTransformation(data: any[], transformation: Transformation): Promise<any[]> {
    switch (transformation.type) {
      case 'map':
        return this.applyMapping(data, transformation.config);
      case 'filter':
        return this.applyFilter(data, transformation.config);
      case 'aggregate':
        return this.applyAggregation(data, transformation.config);
      case 'join':
        return this.applyJoin(data, transformation.config);
      case 'flatten':
        return this.applyFlatten(data, transformation.config);
      case 'normalize':
        return this.applyNormalization(data, transformation.config);
      case 'typecast':
        return this.applyTypeCasting(data, transformation.config);
      case 'custom':
        return this.applyCustom(data, transformation.config);
      default:
        this.logger.warn(`Unknown transformation type: ${transformation.type}`);
        return data;
    }
  }

  private applyMapping(data: any[], config: any): any[] {
    const fieldMapping = config.fieldMapping || {};

    return data.map(record => {
      const mapped: any = {};

      for (const [targetField, sourceField] of Object.entries(fieldMapping)) {
        if (typeof sourceField === 'string') {
          mapped[targetField] = this.getNestedValue(record, sourceField);
        } else if (typeof sourceField === 'function') {
          mapped[targetField] = sourceField(record);
        }
      }

      // Include unmapped fields if configured
      if (config.includeUnmapped) {
        for (const [key, value] of Object.entries(record)) {
          if (!Object.values(fieldMapping).includes(key)) {
            mapped[key] = value;
          }
        }
      }

      return mapped;
    });
  }

  private applyFilter(data: any[], config: any): any[] {
    const filterFn = config.filterFunction || (() => true);
    return data.filter(filterFn);
  }

  private applyAggregation(data: any[], config: any): any[] {
    const groupBy = config.groupBy || [];
    const aggregations = config.aggregations || {};

    if (groupBy.length === 0) {
      return data;
    }

    const groups = new Map<string, any[]>();

    // Group records
    for (const record of data) {
      const key = groupBy.map((field: string) => record[field]).join('|');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    }

    // Apply aggregations
    const results: any[] = [];
    for (const [key, records] of groups.entries()) {
      const result: any = {};

      // Add group by fields
      groupBy.forEach((field: string, idx: number) => {
        result[field] = records[0][field];
      });

      // Apply aggregation functions
      for (const [field, aggType] of Object.entries(aggregations)) {
        const values = records.map(r => r[field]).filter(v => v != null);

        switch (aggType) {
          case 'sum':
            result[`${field}_sum`] = values.reduce((sum, val) => sum + Number(val), 0);
            break;
          case 'avg':
            result[`${field}_avg`] = values.reduce((sum, val) => sum + Number(val), 0) / values.length;
            break;
          case 'count':
            result[`${field}_count`] = values.length;
            break;
          case 'min':
            result[`${field}_min`] = Math.min(...values.map(Number));
            break;
          case 'max':
            result[`${field}_max`] = Math.max(...values.map(Number));
            break;
        }
      }

      results.push(result);
    }

    return results;
  }

  private applyJoin(data: any[], config: any): any[] {
    // Placeholder for join implementation
    // Would implement various join types (inner, left, right, full outer)
    return data;
  }

  private applyFlatten(data: any[], config: any): any[] {
    const nestedField = config.nestedField;

    return data.flatMap(record => {
      const nestedValue = this.getNestedValue(record, nestedField);

      if (Array.isArray(nestedValue)) {
        return nestedValue.map(item => ({
          ...record,
          [nestedField]: item
        }));
      }

      return record;
    });
  }

  private applyNormalization(data: any[], config: any): any[] {
    const dateFields = config.dateFields || [];
    const stringFields = config.stringFields || [];
    const numericFields = config.numericFields || [];

    return data.map(record => {
      const normalized = { ...record };

      // Normalize date fields
      for (const field of dateFields) {
        if (normalized[field]) {
          normalized[field] = new Date(normalized[field]).toISOString();
        }
      }

      // Normalize string fields
      for (const field of stringFields) {
        if (typeof normalized[field] === 'string') {
          normalized[field] = normalized[field].trim().toLowerCase();
        }
      }

      // Normalize numeric fields
      for (const field of numericFields) {
        if (normalized[field] != null) {
          normalized[field] = Number(normalized[field]);
        }
      }

      return normalized;
    });
  }

  private applyTypeCasting(data: any[], config: any): any[] {
    const typeMapping = config.typeMapping || {};

    return data.map(record => {
      const casted = { ...record };

      for (const [field, targetType] of Object.entries(typeMapping)) {
        if (casted[field] == null) continue;

        switch (targetType) {
          case 'string':
            casted[field] = String(casted[field]);
            break;
          case 'number':
            casted[field] = Number(casted[field]);
            break;
          case 'boolean':
            casted[field] = Boolean(casted[field]);
            break;
          case 'date':
            casted[field] = new Date(casted[field]);
            break;
        }
      }

      return casted;
    });
  }

  private applyCustom(data: any[], config: any): any[] {
    const customFn = config.transformFunction;

    if (typeof customFn === 'function') {
      return data.map(customFn);
    }

    return data;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }
}
