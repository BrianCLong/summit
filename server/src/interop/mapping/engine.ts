import { MappingSpec, FieldMapping, TransformType, MappingResult } from './schema.js';

export class MappingEngine {
  private spec: MappingSpec;

  constructor(spec: MappingSpec) {
    this.spec = spec;
  }

  /**
   * Applies the mapping to the input object.
   * Deterministic execution is ensured by sorting mappings by target field.
   */
  public execute(input: Record<string, any>): MappingResult {
    const output: Record<string, any> = {};
    const quarantined: Record<string, any> = {};
    const errors: string[] = [];

    // 1. Identify all keys in input (shallow, for quarantine purposes)
    const inputKeys = new Set(Object.keys(input));
    const usedSourceRoots = new Set<string>();

    // 2. Sort mappings for determinism
    const sortedMappings = [...this.spec.mappings].sort((a, b) =>
      a.target.localeCompare(b.target)
    );

    // 3. Process mappings
    for (const mapping of sortedMappings) {
      // Mark the root key as used if the source path starts with it
      const rootKey = mapping.source.split('.')[0];
      if (inputKeys.has(rootKey)) {
        usedSourceRoots.add(rootKey);
      }

      const value = this.getDeepValue(input, mapping.source);

      if (value !== undefined) {
        try {
          const transformedValue = this.applyTransform(value, mapping.transform);
          this.setDeepValue(output, mapping.target, transformedValue);
        } catch (err: any) {
          errors.push(`Transform error for field ${mapping.source}: ${err.message}`);
          if (mapping.required) {
             // Continue processing other fields but record error
          }
        }
      } else if (mapping.required) {
        if (mapping.defaultValue !== undefined) {
          this.setDeepValue(output, mapping.target, mapping.defaultValue);
        } else {
          errors.push(`Missing required field: ${mapping.source}`);
        }
      } else if (mapping.defaultValue !== undefined) {
         this.setDeepValue(output, mapping.target, mapping.defaultValue);
      }
    }

    // 4. Handle unknown fields (Top-level only)
    // Deep quarantine is complex because a nested object might be partially mapped.
    // For now, we quarantine top-level keys that were not touched by any mapping.
    const unknownKeys = Array.from(inputKeys).filter(k => !usedSourceRoots.has(k)).sort();

    if (unknownKeys.length > 0) {
      if (this.spec.unknownFields === 'error') {
        errors.push(`Unknown fields found: ${unknownKeys.join(', ')}`);
      } else if (this.spec.unknownFields === 'quarantine') {
        for (const key of unknownKeys) {
          quarantined[key] = input[key];
        }
      }
      // 'ignore' does nothing
    }

    // Add metadata
    output._metadata = {
      specOwner: this.spec.owner,
      specVersion: this.spec.version,
      sourceSystem: this.spec.sourceSystem,
      license: this.spec.license,
      mappedAt: new Date().toISOString()
    };

    return { output, quarantined, errors };
  }

  private applyTransform(value: any, transform?: TransformType): any {
    if (!transform) return value;

    switch (transform) {
      case 'string': return String(value);
      case 'number':
        const n = Number(value);
        if (isNaN(n)) throw new Error(`Cannot convert "${value}" to number`);
        return n;
      case 'boolean': return Boolean(value);
      case 'trim': return String(value).trim();
      case 'uppercase': return String(value).toUpperCase();
      case 'lowercase': return String(value).toLowerCase();
      case 'isoDate': return new Date(value).toISOString();
      case 'json': return typeof value === 'string' ? JSON.parse(value) : value;
      case 'uuid':
        // Simple UUID validation, not generation
        if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
           return value;
        }
        throw new Error(`Value "${value}" is not a valid UUID`);
      default: return value;
    }
  }

  private getDeepValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  private setDeepValue(obj: any, path: string, value: any) {
    const parts = path.split('.');

    // Prevent prototype pollution
    if (parts.some(p => p === '__proto__' || p === 'constructor' || p === 'prototype')) {
      throw new Error('Invalid path: contains forbidden properties');
    }

    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) current[part] = {};
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  }
}
