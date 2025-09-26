import { trace, SpanStatusCode } from '@opentelemetry/api';
import {
  CypherExecutor,
  GraphCypherRule,
  GraphNodePayload,
  GraphRelationshipPayload,
  GraphValidationError,
  GraphValidationOptions,
  GraphValidationPayload,
  GraphValidationResult,
} from './types.js';

const tracer = trace.getTracer('graph-validation', '1.0.0');

const DEFAULT_NODE_PROPERTIES = ['tenantId', 'kind', 'name'];
const DEFAULT_RELATIONSHIP_PROPERTIES = ['tenantId'];
const DEFAULT_RELATIONSHIP_TYPES = [
  'ASSOCIATED_WITH',
  'MENTIONS',
  'COMMUNICATED_WITH',
  'LOCATED_AT',
];

type JsonSchema = {
  type?: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean';
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  minItems?: number;
  minLength?: number;
  pattern?: string;
  enum?: string[];
};

const nodeSchema: JsonSchema = {
  type: 'object',
  required: ['id', 'labels', 'properties'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
    labels: {
      type: 'array',
      minItems: 1,
      items: { type: 'string', minLength: 1 },
    },
    properties: {
      type: 'object',
      additionalProperties: true,
    },
  },
};

const relationshipSchema: JsonSchema = {
  type: 'object',
  required: ['type', 'sourceId', 'targetId'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
    type: { type: 'string', minLength: 1, pattern: '^[A-Z_]+$' },
    sourceId: { type: 'string', minLength: 1 },
    targetId: { type: 'string', minLength: 1 },
    properties: {
      type: 'object',
      additionalProperties: true,
    },
  },
};

const payloadSchema: JsonSchema = {
  type: 'object',
  required: ['tenantId', 'nodes', 'relationships'],
  additionalProperties: false,
  properties: {
    tenantId: { type: 'string', minLength: 1 },
    nodes: {
      type: 'array',
      minItems: 1,
      items: nodeSchema,
    },
    relationships: {
      type: 'array',
      minItems: 0,
      items: relationshipSchema,
    },
  },
};

function joinPath(base: string, addition: string): string {
  if (!base) return addition;
  if (addition.startsWith('[')) {
    return `${base}${addition}`;
  }
  return `${base}.${addition}`;
}

function schemaError(path: string, message: string, code = 'SCHEMA_VALIDATION_FAILED'): GraphValidationError {
  return {
    code,
    message,
    path,
    rule: 'json-schema',
    severity: 'ERROR',
  };
}

function validateSchema(schema: JsonSchema, value: unknown, path: string, errors: GraphValidationError[]) {
  if (!schema) return;

  switch (schema.type) {
    case 'object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push(schemaError(path, `Expected object but received ${Array.isArray(value) ? 'array' : typeof value}.`, 'TYPE_MISMATCH'));
        return;
      }
      const record = value as Record<string, unknown>;
      if (schema.required) {
        for (const prop of schema.required) {
          if (!(prop in record)) {
            errors.push(schemaError(joinPath(path, prop), `Property '${prop}' is required.`));
          }
        }
      }
      if (schema.properties) {
        for (const [prop, childSchema] of Object.entries(schema.properties)) {
          if (prop in record) {
            validateSchema(childSchema, record[prop], joinPath(path, prop), errors);
          }
        }
      }
      if (schema.additionalProperties === false && schema.properties) {
        for (const key of Object.keys(record)) {
          if (!schema.properties[key]) {
            errors.push(schemaError(joinPath(path, key), `Unexpected property '${key}'.`, 'ADDITIONAL_PROPERTY_NOT_ALLOWED'));
          }
        }
      }
      break;
    }
    case 'array': {
      if (!Array.isArray(value)) {
        errors.push(schemaError(path, `Expected array but received ${typeof value}.`, 'TYPE_MISMATCH'));
        return;
      }
      if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
        errors.push(schemaError(path, `Array must contain at least ${schema.minItems} item(s).`, 'ARRAY_LENGTH_TOO_SMALL'));
      }
      if (schema.items) {
        value.forEach((item, index) => {
          validateSchema(schema.items as JsonSchema, item, joinPath(path, `[${index}]`), errors);
        });
      }
      break;
    }
    case 'string': {
      if (typeof value !== 'string') {
        errors.push(schemaError(path, `Expected string but received ${typeof value}.`, 'TYPE_MISMATCH'));
        return;
      }
      if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
        errors.push(schemaError(path, `String must be at least ${schema.minLength} character(s).`, 'STRING_TOO_SHORT'));
      }
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push(schemaError(path, `Value '${value}' does not match pattern ${schema.pattern}.`, 'PATTERN_MISMATCH'));
        }
      }
      if (schema.enum && !schema.enum.includes(value)) {
        errors.push(schemaError(path, `Value must be one of: ${schema.enum.join(', ')}.`, 'ENUM_MISMATCH'));
      }
      break;
    }
    case 'number': {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        errors.push(schemaError(path, `Expected number but received ${typeof value}.`, 'TYPE_MISMATCH'));
      }
      break;
    }
    case 'integer': {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        errors.push(schemaError(path, `Expected integer but received ${typeof value}.`, 'TYPE_MISMATCH'));
      }
      break;
    }
    case 'boolean': {
      if (typeof value !== 'boolean') {
        errors.push(schemaError(path, `Expected boolean but received ${typeof value}.`, 'TYPE_MISMATCH'));
      }
      break;
    }
    default:
      break;
  }
}

function ensureRule(appliedRules: string[], rule: string) {
  if (!appliedRules.includes(rule)) {
    appliedRules.push(rule);
  }
}

export class GraphValidationService {
  private readonly requiredNodeProperties: string[];
  private readonly requiredRelationshipProperties: string[];
  private readonly allowedRelationshipTypes: string[];
  private readonly cypherRules: GraphCypherRule[];
  private readonly cypherExecutor?: CypherExecutor;

  constructor(options: GraphValidationOptions = {}) {
    this.requiredNodeProperties = options.requiredNodeProperties ?? DEFAULT_NODE_PROPERTIES;
    this.requiredRelationshipProperties =
      options.requiredRelationshipProperties ?? DEFAULT_RELATIONSHIP_PROPERTIES;
    this.allowedRelationshipTypes = options.allowedRelationshipTypes ?? DEFAULT_RELATIONSHIP_TYPES;
    this.cypherRules = options.cypherRules ?? [];
    this.cypherExecutor = options.cypherExecutor;
  }

  async validate(payload: GraphValidationPayload): Promise<GraphValidationResult> {
    return tracer.startActiveSpan('graph.validation', async (span) => {
      const errors: GraphValidationError[] = [];
      const warnings: string[] = [];
      const appliedRules: string[] = [];

      try {
        ensureRule(appliedRules, 'json-schema');
        validateSchema(payloadSchema, payload, 'input', errors);

        const nodes: GraphNodePayload[] = Array.isArray(payload.nodes) ? payload.nodes : [];
        const relationships: GraphRelationshipPayload[] = Array.isArray(payload.relationships)
          ? payload.relationships
          : [];

        ensureRule(appliedRules, 'node-required-properties');
        const nodeIds = new Set<string>();

        nodes.forEach((node, index) => {
          const nodePath = `nodes[${index}]`;
          if (nodeIds.has(node.id)) {
            errors.push({
              code: 'DUPLICATE_NODE_ID',
              message: `Duplicate node id '${node.id}' detected.`,
              path: `${nodePath}.id`,
              rule: 'node-required-properties',
              severity: 'ERROR',
            });
          } else {
            nodeIds.add(node.id);
          }

          const props = (node && typeof node === 'object' ? node.properties : undefined) as
            | Record<string, unknown>
            | undefined;

          for (const property of this.requiredNodeProperties) {
            const propertyValue = props?.[property];
            if (propertyValue === undefined || propertyValue === null || propertyValue === '') {
              errors.push({
                code: 'NODE_PROPERTY_REQUIRED',
                message: `Node '${node.id}' is missing required property '${property}'.`,
                path: `${nodePath}.properties.${property}`,
                rule: 'node-required-properties',
                severity: 'ERROR',
              });
            }
          }

          const tenantId = props?.tenantId;
          if (tenantId !== undefined && tenantId !== payload.tenantId) {
            errors.push({
              code: 'TENANT_ID_MISMATCH',
              message: `Node '${node.id}' tenantId '${tenantId}' does not match payload tenant '${payload.tenantId}'.`,
              path: `${nodePath}.properties.tenantId`,
              rule: 'node-required-properties',
              severity: 'ERROR',
            });
          }
        });

        ensureRule(appliedRules, 'relationship-structure');
        const allowedTypes = new Set(this.allowedRelationshipTypes);

        relationships.forEach((relationship, index) => {
          const relationshipPath = `relationships[${index}]`;

          if (!allowedTypes.has(relationship.type)) {
            errors.push({
              code: 'RELATIONSHIP_TYPE_NOT_ALLOWED',
              message: `Relationship '${relationship.type}' is not permitted.`,
              path: `${relationshipPath}.type`,
              rule: 'relationship-structure',
              severity: 'ERROR',
            });
          }

          for (const property of this.requiredRelationshipProperties) {
            const value = relationship.properties?.[property];
            if (value === undefined || value === null || value === '') {
              errors.push({
                code: 'RELATIONSHIP_PROPERTY_REQUIRED',
                message: `Relationship '${relationship.type}' is missing required property '${property}'.`,
                path: `${relationshipPath}.properties.${property}`,
                rule: 'relationship-structure',
                severity: 'ERROR',
              });
            }
            if (property === 'tenantId' && value !== undefined && value !== payload.tenantId) {
              errors.push({
                code: 'TENANT_ID_MISMATCH',
                message: `Relationship tenantId '${value}' does not match payload tenant '${payload.tenantId}'.`,
                path: `${relationshipPath}.properties.tenantId`,
                rule: 'relationship-structure',
                severity: 'ERROR',
              });
            }
          }

          if (!nodeIds.has(relationship.sourceId)) {
            errors.push({
              code: 'RELATIONSHIP_SOURCE_NOT_FOUND',
              message: `Source node '${relationship.sourceId}' not present in payload nodes.`,
              path: `${relationshipPath}.sourceId`,
              rule: 'relationship-structure',
              severity: 'ERROR',
            });
          }

          if (!nodeIds.has(relationship.targetId)) {
            errors.push({
              code: 'RELATIONSHIP_TARGET_NOT_FOUND',
              message: `Target node '${relationship.targetId}' not present in payload nodes.`,
              path: `${relationshipPath}.targetId`,
              rule: 'relationship-structure',
              severity: 'ERROR',
            });
          }

          if (relationship.sourceId === relationship.targetId) {
            errors.push({
              code: 'RELATIONSHIP_SELF_REFERENCE',
              message: `Self-referential relationship on node '${relationship.sourceId}' is not allowed.`,
              path: relationshipPath,
              rule: 'relationship-structure',
              severity: 'ERROR',
            });
          }
        });

        if (this.cypherRules.length > 0) {
          if (!this.cypherExecutor) {
            warnings.push('Cypher rules configured but no executor was provided; skipped rule evaluation.');
          } else {
            const params = {
              tenantId: payload.tenantId,
              nodes,
              relationships,
              allowedRelationshipTypes: this.allowedRelationshipTypes,
            };

            for (const rule of this.cypherRules) {
              ensureRule(appliedRules, rule.name);
              try {
                const result = await this.cypherExecutor.run(rule.statement, params);
                const record = result.records[0] as Record<string, any> | undefined;
                const violations = Array.isArray(record?.violations) ? record?.violations : [];

                span.addEvent('graph.validation.rule', {
                  rule: rule.name,
                  violations: violations.length,
                });

                if (violations.length > 0) {
                  for (const violation of violations) {
                    const error = rule.buildError(violation, payload);
                    error.rule = error.rule ?? rule.name;
                    error.code = error.code || rule.errorCode;
                    error.severity = error.severity ?? rule.severity ?? 'ERROR';
                    errors.push(error);
                  }
                }
              } catch (error) {
                const message = (error as Error).message;
                span.addEvent('graph.validation.rule_error', { rule: rule.name, message });
                warnings.push(`Rule '${rule.name}' execution failed: ${message}`);
              }
            }
          }
        }

        warnings.forEach((warning) => {
          span.addEvent('graph.validation.warning', { message: warning });
        });

        if (errors.length > 0) {
          errors.forEach((error) => {
            span.addEvent('graph.validation.error', {
              code: error.code,
              message: error.message,
              path: error.path,
              rule: error.rule ?? 'unknown',
            });
          });
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'Graph validation failed' });
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }

        return {
          valid: errors.length === 0,
          errors,
          warnings,
          appliedRules,
        };
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

export default GraphValidationService;
