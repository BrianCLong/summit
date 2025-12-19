/**
 * ETL Assistant
 *
 * Provides schema inference, PII detection, and canonical mapping capabilities.
 */

export * from './types';
export { SchemaInference } from './schema-inference';
export { PIIDetection } from './pii-detection';
export { CanonicalMapper } from './canonical-mapper';
export type { MappingConfig } from './canonical-mapper';

// Re-export for convenience
import { SchemaInference } from './schema-inference';
import { PIIDetection } from './pii-detection';
import { CanonicalMapper } from './canonical-mapper';

/**
 * ETL Assistant Facade
 *
 * Provides a unified interface to all ETL capabilities.
 */
export class ETLAssistant {
  private schemaInference: SchemaInference;
  private piiDetection: PIIDetection;
  private canonicalMapper: CanonicalMapper;

  constructor() {
    this.schemaInference = new SchemaInference();
    this.piiDetection = new PIIDetection();
    this.canonicalMapper = new CanonicalMapper();
  }

  /**
   * Analyze sample records
   */
  analyze(samples: any[], schemaHint?: string) {
    const schemaResult = this.schemaInference.inferSchema(samples, schemaHint);
    const piiResult = this.piiDetection.detectPII(samples);

    return {
      schema: schemaResult,
      pii: piiResult,
    };
  }

  /**
   * Get schema inference engine
   */
  getSchemaInference(): SchemaInference {
    return this.schemaInference;
  }

  /**
   * Get PII detection engine
   */
  getPIIDetection(): PIIDetection {
    return this.piiDetection;
  }

  /**
   * Get canonical mapper
   */
  getCanonicalMapper(): CanonicalMapper {
    return this.canonicalMapper;
  }
}
