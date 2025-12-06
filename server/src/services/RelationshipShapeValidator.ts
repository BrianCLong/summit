import { RELATIONSHIP_SCHEMA, RelationshipTypeConfig } from '../graph/relationship-schema.js';
import { Driver } from 'neo4j-driver';
import { getNeo4jDriver } from '../config/database.js';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalizedProperties?: Record<string, any>;
  relationshipType?: RelationshipTypeConfig;
}

export interface DriftRecord {
  id: string;
  type: string;
  source: { id: string; labels: string[] };
  target: { id: string; labels: string[] };
  violation: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class RelationshipShapeValidator {
  private schema: Record<string, RelationshipTypeConfig>;

  constructor() {
    this.schema = RELATIONSHIP_SCHEMA;
  }

  /**
   * Validate a relationship creation/update request
   */
  validate(
    sourceType: string,
    relationshipType: string,
    targetType: string,
    properties: Record<string, any> = {}
  ): ValidationResult {
    const relConfig = this.schema[relationshipType];

    if (!relConfig) {
      return { valid: false, error: `Invalid relationship type: ${relationshipType}` };
    }

    // 1. Validate Directionality & Node Pairs
    const isValidPair = relConfig.constraints.some(
      (constraint) =>
        (constraint.source === sourceType && constraint.target === targetType)
    );

    // If not strict match, check if bidirectional usage is implied or allowed?
    // Given we are writing a shape validator, we should be strict.

    if (!isValidPair) {
       return {
         valid: false,
         error: `Invalid node pair: ${sourceType}->${targetType} for relationship ${relationshipType}. Allowed: ${relConfig.constraints.map(c => `${c.source}->${c.target}`).join(', ')}`
       };
    }

    // 2. Validate Properties (Required/Forbidden)
    const allowedProps = new Set(relConfig.properties.map(p => p.name));
    allowedProps.add('weight');
    allowedProps.add('created_at');
    allowedProps.add('updated_at');

    const propKeys = Object.keys(properties);
    const unknownProps = propKeys.filter(k => !allowedProps.has(k));

    if (unknownProps.length > 0) {
       return {
         valid: false,
         error: `Forbidden properties detected: ${unknownProps.join(', ')}`
       };
    }

    // Check required properties
    const requiredProps = relConfig.properties.filter(p => p.required).map(p => p.name);
    const missingProps = requiredProps.filter(p => !(p in properties));

    if (missingProps.length > 0) {
      return {
        valid: false,
        error: `Missing required properties: ${missingProps.join(', ')}`
      };
    }

    return {
      valid: true,
      relationshipType: relConfig,
      normalizedProperties: this.normalizeProperties(relConfig, properties)
    };
  }

  normalizeProperties(config: RelationshipTypeConfig, properties: Record<string, any>) {
    const normalized = { ...properties };

    // Default weight
    if (!normalized.weight) {
      normalized.weight = config.weight;
    }

    // Creation timestamp
    if (!normalized.created_at) {
      normalized.created_at = new Date().toISOString();
    }

    // Validate dates
    config.properties.forEach(prop => {
       if (prop.name.includes('date') && normalized[prop.name]) {
         try {
           normalized[prop.name] = new Date(normalized[prop.name]).toISOString();
         } catch (e) {
           // ignore or warn
         }
       }
    });

    return normalized;
  }

  /**
   * Detect "Drift": existing relationships that violate the schema
   */
  async detectDrift(limit = 1000): Promise<DriftRecord[]> {
    const driver = getNeo4jDriver();
    const session = driver.session();
    const violations: DriftRecord[] = [];

    try {
      const query = `
        MATCH (s)-[r]->(t)
        RETURN
          id(r) as id,
          type(r) as type,
          labels(s) as sLabels,
          labels(t) as tLabels,
          keys(r) as propKeys
        LIMIT toInteger($limit)
      `;

      const result = await session.run(query, { limit });

      for (const record of result.records) {
        const id = record.get('id').toString();
        const type = record.get('type');
        const sLabels = record.get('sLabels') as string[];
        const tLabels = record.get('tLabels') as string[];
        const propKeys = record.get('propKeys') as string[];

        const config = this.schema[type];

        // 1. Unknown Type
        if (!config) {
          violations.push({
            id, type,
            source: { id: '?', labels: sLabels },
            target: { id: '?', labels: tLabels },
            violation: `Unknown relationship type: ${type}`,
            severity: 'HIGH'
          });
          continue;
        }

        // 2. Constraint Violation
        const isValidPair = config.constraints.some(c =>
          sLabels.includes(c.source) && tLabels.includes(c.target)
        );

        if (!isValidPair) {
          violations.push({
             id, type,
             source: { id: '?', labels: sLabels },
             target: { id: '?', labels: tLabels },
             violation: `Invalid node pair: [${sLabels.join('|')}]->[${tLabels.join('|')}]`,
             severity: 'HIGH'
          });
        }

        // 3. Property Drift
        const allowedProps = new Set(config.properties.map(p => p.name));
        allowedProps.add('weight');
        allowedProps.add('created_at');
        allowedProps.add('updated_at');

        const extraProps = propKeys.filter(k => !allowedProps.has(k));
        if (extraProps.length > 0) {
           violations.push({
             id, type,
             source: { id: '?', labels: sLabels },
             target: { id: '?', labels: tLabels },
             violation: `Forbidden properties: ${extraProps.join(', ')}`,
             severity: 'MEDIUM'
          });
        }
      }

    } finally {
      await session.close();
    }

    return violations;
  }
}

export const relationshipShapeValidator = new RelationshipShapeValidator();
