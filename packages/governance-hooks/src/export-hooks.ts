/**
 * Export Governance Hooks
 *
 * Governance controls for data export operations.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ExportRequest {
  exportId: string;
  userId: string;
  tenantId: string;
  investigationId?: string;
  entityIds: string[];
  format: 'json' | 'csv' | 'graphml' | 'stix';
  includeRelationships: boolean;
  reason?: string;
}

export interface ExportData {
  entities: ExportEntity[];
  relationships: ExportRelationship[];
  metadata: Record<string, unknown>;
}

export interface ExportEntity {
  id: string;
  type: string;
  props: Record<string, unknown>;
  classification?: string;
  compartments?: string[];
}

export interface ExportRelationship {
  id: string;
  from: string;
  to: string;
  type: string;
  props?: Record<string, unknown>;
}

export interface ExportHook {
  /** Called before export starts */
  beforeExport?: (request: ExportRequest) => Promise<ExportRequest | null>;
  /** Called to filter/transform export data */
  transformData?: (request: ExportRequest, data: ExportData) => Promise<ExportData>;
  /** Called after export completes */
  afterExport?: (request: ExportRequest, data: ExportData) => Promise<void>;
}

// -----------------------------------------------------------------------------
// Authority Check Hook
// -----------------------------------------------------------------------------

export interface ExportAuthorityConfig {
  evaluator: any; // PolicyEvaluator from authority-compiler
  requireReason: boolean;
  maxEntities: number;
}

export function createExportAuthorityHook(config: ExportAuthorityConfig): ExportHook {
  return {
    async beforeExport(request: ExportRequest) {
      // Check reason requirement
      if (config.requireReason && !request.reason) {
        throw new ExportPolicyError('Export reason is required');
      }

      // Check entity count
      if (request.entityIds.length > config.maxEntities) {
        throw new ExportPolicyError(`Export exceeds maximum entity count of ${config.maxEntities}`);
      }

      // Evaluate export authority
      const decision = await config.evaluator.evaluate({
        user: { id: request.userId, tenantId: request.tenantId, roles: [] },
        operation: 'EXPORT',
        resource: { investigationId: request.investigationId },
        request: { timestamp: new Date(), justification: request.reason },
      });

      if (!decision.allowed) {
        throw new ExportPolicyError(decision.reason);
      }

      // Check two-person control
      if (decision.requiresTwoPersonControl) {
        throw new ExportPolicyError('This export requires two-person approval', {
          twoPersonControlId: decision.twoPersonControlId,
        });
      }

      return request;
    },
  };
}

// -----------------------------------------------------------------------------
// Classification Filter Hook
// -----------------------------------------------------------------------------

export interface ClassificationFilterConfig {
  /** User clearance getter */
  getUserClearance: (userId: string) => Promise<string>;
  /** Maximum classification level to export */
  maxExportClassification: string;
}

export function createExportClassificationHook(config: ClassificationFilterConfig): ExportHook {
  const classificationLevels: Record<string, number> = {
    UNCLASSIFIED: 0,
    CUI: 1,
    CONFIDENTIAL: 2,
    SECRET: 3,
    TOP_SECRET: 4,
  };

  return {
    async transformData(request: ExportRequest, data: ExportData) {
      const userClearance = await config.getUserClearance(request.userId);
      const userLevel = classificationLevels[userClearance] || 0;
      const maxLevel = classificationLevels[config.maxExportClassification] || 0;

      // Filter entities by classification
      const filteredEntities = data.entities.filter((entity) => {
        const entityClassification = entity.classification || 'UNCLASSIFIED';
        const entityLevel = classificationLevels[entityClassification] || 0;

        // Must be within user clearance AND max export level
        return entityLevel <= Math.min(userLevel, maxLevel);
      });

      // Get set of allowed entity IDs
      const allowedIds = new Set(filteredEntities.map((e) => e.id));

      // Filter relationships to only include those between allowed entities
      const filteredRelationships = data.relationships.filter(
        (rel) => allowedIds.has(rel.from) && allowedIds.has(rel.to)
      );

      return {
        ...data,
        entities: filteredEntities,
        relationships: filteredRelationships,
        metadata: {
          ...data.metadata,
          _filteredCount: data.entities.length - filteredEntities.length,
          _maxClassification: config.maxExportClassification,
        },
      };
    },
  };
}

// -----------------------------------------------------------------------------
// Field Redaction Hook
// -----------------------------------------------------------------------------

export interface FieldRedactionConfig {
  /** Fields to always redact */
  redactedFields: string[];
  /** PII patterns to redact */
  piiPatterns: Array<{ regex: RegExp; replacement: string }>;
}

export function createExportFieldRedactionHook(config: FieldRedactionConfig): ExportHook {
  return {
    async transformData(request: ExportRequest, data: ExportData) {
      const redactedEntities = data.entities.map((entity) => ({
        ...entity,
        props: redactProps(entity.props, config),
      }));

      const redactedRelationships = data.relationships.map((rel) => ({
        ...rel,
        props: rel.props ? redactProps(rel.props, config) : undefined,
      }));

      return {
        ...data,
        entities: redactedEntities,
        relationships: redactedRelationships,
      };
    },
  };
}

function redactProps(props: Record<string, unknown>, config: FieldRedactionConfig): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    // Check if field should be redacted
    if (config.redactedFields.includes(key)) {
      result[key] = '[REDACTED]';
      continue;
    }

    // Check for PII patterns in string values
    if (typeof value === 'string') {
      let redactedValue = value;
      for (const pattern of config.piiPatterns) {
        redactedValue = redactedValue.replace(pattern.regex, pattern.replacement);
      }
      result[key] = redactedValue;
    } else {
      result[key] = value;
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// Audit Hook
// -----------------------------------------------------------------------------

export interface ExportAuditLogger {
  log(event: ExportAuditEvent): Promise<void>;
}

export interface ExportAuditEvent {
  eventType: 'export_started' | 'export_completed' | 'export_failed';
  exportId: string;
  userId: string;
  tenantId: string;
  investigationId?: string;
  entityCount: number;
  relationshipCount: number;
  format: string;
  reason?: string;
  timestamp: Date;
  error?: string;
}

export function createExportAuditHook(logger: ExportAuditLogger): ExportHook {
  return {
    async beforeExport(request: ExportRequest) {
      await logger.log({
        eventType: 'export_started',
        exportId: request.exportId,
        userId: request.userId,
        tenantId: request.tenantId,
        investigationId: request.investigationId,
        entityCount: request.entityIds.length,
        relationshipCount: 0,
        format: request.format,
        reason: request.reason,
        timestamp: new Date(),
      });
      return request;
    },

    async afterExport(request: ExportRequest, data: ExportData) {
      await logger.log({
        eventType: 'export_completed',
        exportId: request.exportId,
        userId: request.userId,
        tenantId: request.tenantId,
        investigationId: request.investigationId,
        entityCount: data.entities.length,
        relationshipCount: data.relationships.length,
        format: request.format,
        reason: request.reason,
        timestamp: new Date(),
      });
    },
  };
}

// -----------------------------------------------------------------------------
// Manifest Generation Hook
// -----------------------------------------------------------------------------

export interface ManifestConfig {
  /** Include hash tree */
  includeHashTree: boolean;
  /** Sign manifest */
  signManifest: boolean;
  /** Signing key ID */
  signingKeyId?: string;
}

export function createExportManifestHook(config: ManifestConfig): ExportHook {
  return {
    async afterExport(request: ExportRequest, data: ExportData) {
      // Generate manifest (would use ExportManifestBuilder in production)
      const manifest = {
        version: '1.0',
        exportId: request.exportId,
        exportedAt: new Date().toISOString(),
        exportedBy: request.userId,
        tenantId: request.tenantId,
        contents: {
          entityCount: data.entities.length,
          relationshipCount: data.relationships.length,
          format: request.format,
        },
        // Hash tree would be generated here
      };

      // Attach manifest to metadata
      data.metadata._manifest = manifest;
    },
  };
}

// -----------------------------------------------------------------------------
// Composite Hook
// -----------------------------------------------------------------------------

export function composeExportHooks(...hooks: ExportHook[]): ExportHook {
  return {
    async beforeExport(request: ExportRequest) {
      let current: ExportRequest | null = request;

      for (const hook of hooks) {
        if (hook.beforeExport && current) {
          current = await hook.beforeExport(current);
        }
      }

      return current;
    },

    async transformData(request: ExportRequest, data: ExportData) {
      let current = data;

      for (const hook of hooks) {
        if (hook.transformData) {
          current = await hook.transformData(request, current);
        }
      }

      return current;
    },

    async afterExport(request: ExportRequest, data: ExportData) {
      for (const hook of hooks) {
        if (hook.afterExport) {
          await hook.afterExport(request, data);
        }
      }
    },
  };
}

// -----------------------------------------------------------------------------
// Error Types
// -----------------------------------------------------------------------------

export class ExportPolicyError extends Error {
  public details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ExportPolicyError';
    this.details = details;
  }
}
