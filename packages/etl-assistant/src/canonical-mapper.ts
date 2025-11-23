/**
 * Canonical Entity Mapper
 *
 * Maps source records to canonical entity format.
 */

import type {
  SampleRecord,
  CanonicalEntity,
  CanonicalEntityType,
  FieldMapping,
  RedactionStrategy,
} from './types';
import { PIIDetection } from './pii-detection';

export interface MappingConfig {
  entityType: CanonicalEntityType;
  fieldMappings: FieldMapping[];
  redactionRules?: Record<string, RedactionStrategy>;
  connectorId: string;
  sourceId: string;
  licenseId?: string;
}

/**
 * Canonical Entity Mapper
 */
export class CanonicalMapper {
  /**
   * Map a record to canonical format
   */
  mapToCanonical(
    record: SampleRecord,
    config: MappingConfig,
    recordIndex: number
  ): CanonicalEntity {
    const props: Record<string, unknown> = {};
    let piiRedacted = false;

    // Apply field mappings
    for (const mapping of config.fieldMappings) {
      const sourceValue = record[mapping.sourceField];

      if (sourceValue !== undefined && sourceValue !== null) {
        let mappedValue = sourceValue;

        // Apply redaction if configured
        if (config.redactionRules && config.redactionRules[mapping.sourceField]) {
          const strategy = config.redactionRules[mapping.sourceField];
          if (typeof sourceValue === 'string') {
            mappedValue = PIIDetection.redact(sourceValue, strategy);
            piiRedacted = true;
          }
        }

        // Apply transformation if specified
        if (mapping.transformation) {
          mappedValue = this.applyTransformation(
            mappedValue,
            mapping.transformation
          );
        }

        // Set property
        if (mapping.targetField.startsWith('props.')) {
          const propName = mapping.targetField.substring(6);
          props[propName] = mappedValue;
        } else {
          props[mapping.targetField] = mappedValue;
        }
      }
    }

    // Include unmapped fields as custom properties
    for (const [key, value] of Object.entries(record)) {
      const isMapped = config.fieldMappings.some((m) => m.sourceField === key);
      if (!isMapped && value !== undefined && value !== null) {
        props[key] = value;
      }
    }

    // Generate external ID
    const externalId = this.generateExternalId(
      config.connectorId,
      config.sourceId,
      record,
      recordIndex
    );

    return {
      type: config.entityType,
      externalId,
      props,
      confidence: this.calculateConfidence(config.fieldMappings, record),
      sourceMeta: {
        connectorId: config.connectorId,
        sourceId: config.sourceId,
        licenseId: config.licenseId,
        ingestedAt: new Date().toISOString(),
        piiRedacted,
      },
    };
  }

  /**
   * Map multiple records to canonical format
   */
  mapRecords(
    records: SampleRecord[],
    config: MappingConfig
  ): CanonicalEntity[] {
    return records.map((record, index) =>
      this.mapToCanonical(record, config, index)
    );
  }

  /**
   * Apply transformation to a value
   */
  private applyTransformation(value: unknown, transformation: string): unknown {
    // Simple transformations (can be extended)
    switch (transformation) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;

      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;

      case 'trim':
        return typeof value === 'string' ? value.trim() : value;

      case 'number':
        return typeof value === 'string' ? parseFloat(value) : value;

      case 'string':
        return String(value);

      case 'date':
        return typeof value === 'string' ? new Date(value).toISOString() : value;

      default:
        return value;
    }
  }

  /**
   * Generate external ID
   */
  private generateExternalId(
    connectorId: string,
    sourceId: string,
    record: SampleRecord,
    recordIndex: number
  ): string {
    // Try to use record's ID field if available
    const idFields = ['id', '_id', 'uuid', 'key'];

    for (const field of idFields) {
      if (record[field]) {
        return `${connectorId}:${sourceId}:${record[field]}`;
      }
    }

    // Fallback to index-based ID
    return `${connectorId}:${sourceId}:record_${recordIndex}`;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    mappings: FieldMapping[],
    record: SampleRecord
  ): number {
    const requiredMappings = mappings.filter((m) => m.required);

    if (requiredMappings.length === 0) {
      return 1.0;
    }

    const satisfiedRequirements = requiredMappings.filter((m) => {
      const value = record[m.sourceField];
      return value !== undefined && value !== null && value !== '';
    });

    return satisfiedRequirements.length / requiredMappings.length;
  }
}
