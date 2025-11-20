/**
 * Map transformer - transforms records using field mappings
 */

import { BaseTransformer } from '../engine/ITransformer';
import { get, set } from 'lodash';

export interface MapConfig {
  mappings: Array<{
    source: string;
    target: string;
    transform?: string | ((value: any) => any);
    defaultValue?: any;
  }>;
  keepUnmapped?: boolean;
}

export class MapTransformer extends BaseTransformer {
  constructor() {
    super('map');
  }

  async transform(record: any, config: MapConfig): Promise<any> {
    const result: any = config.keepUnmapped ? { ...record } : {};

    for (const mapping of config.mappings) {
      let value = get(record, mapping.source);

      // Apply default value if source is undefined
      if (value === undefined && mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      }

      // Apply transformation function
      if (mapping.transform) {
        if (typeof mapping.transform === 'function') {
          value = mapping.transform(value);
        } else if (typeof mapping.transform === 'string') {
          // Evaluate transformation expression
          value = this.evaluateExpression(mapping.transform, value, record);
        }
      }

      set(result, mapping.target, value);
    }

    return result;
  }

  private evaluateExpression(expression: string, value: any, record: any): any {
    try {
      // Create a safe evaluation context
      const context = { value, record };
      const func = new Function('context', `with(context) { return ${expression}; }`);
      return func(context);
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${expression}`);
    }
  }

  async validate(config: MapConfig): Promise<boolean> {
    if (!config.mappings || !Array.isArray(config.mappings)) {
      throw new Error('Mappings must be an array');
    }

    for (const mapping of config.mappings) {
      if (!mapping.source || !mapping.target) {
        throw new Error('Each mapping must have source and target fields');
      }
    }

    return true;
  }
}
